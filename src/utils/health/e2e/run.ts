// run.ts: runner de la suite E2E de is-webcomponents. Levanta un servidor
// estatico con la galeria (transpilando TS al vuelo, igual que serve.mjs) al
// empezar, corre `node --test` sobre los *.test.ts y apaga el servidor al
// terminar (pase o falle). Para apuntar a un host externo:
//   E2E_AUTOSERVE=0 E2E_BASE_URL=http://127.0.0.1:8391/index.html npm run test:e2e
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { levantarServidor, type ServidorE2E } from './lib/server.ts';
import { ENV } from './lib/env.ts';
import { descargarConfigE2E } from './lib/vendor-e2e-config.ts';

const e2eDir = dirname(fileURLToPath(import.meta.url));

/** `--only=dropdown` o `--only=is-dropdown,is-button` → filtro de archivos/tags. */
function parseOnly(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only' && argv[i + 1]) {
      out.push(...String(argv[++i]).split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a.startsWith('--only=')) {
      out.push(...a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean));
    }
  }
  return out;
}

const only = parseOnly(process.argv.slice(2));
if (only.length) {
  process.env.E2E_ONLY = only.join(',');
  // Compat con suites que ya leen E2E_TAGS
  if (!process.env.E2E_TAGS) process.env.E2E_TAGS = only.map((t) => (t.startsWith('is-') ? t : `is-${t}`)).join(',');
  console.log(`[e2e] --only → E2E_ONLY/E2E_TAGS=${process.env.E2E_TAGS}`);
}

const archivos = readdirSync(e2eDir)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => {
    if (!only.length) return true;
    // Archivo dedicado (05-dropdown) o nombre que mencione el tag/slug
    const base = f.toLowerCase();
    return only.some((t) => {
      const slug = t.replace(/^is-/, '').toLowerCase();
      return base.includes(slug) || base.includes(t.toLowerCase());
    });
  })
  .sort()
  .map((f) => join(e2eDir, f));

if (only.length && archivos.length === 0) {
  console.error(`[e2e] --only=${only.join(',')} no matcheo ningun *.test.ts en ${e2eDir}`);
  process.exit(1);
}

const autoserve = process.env.E2E_AUTOSERVE !== '0' && !process.env.E2E_BASE_URL;
let servidor: ServidorE2E | null = null;
let base = process.env.E2E_BASE_URL;

if (autoserve) {
  // Puerto controlado: E2E_PORT (0 = libre) en E2E_HOST; si está ocupado,
  // falla con aviso claro (nunca colisiona con otros servicios).
  try {
    servidor = await levantarServidor({ puerto: ENV.puerto, host: ENV.host });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'EADDRINUSE') {
      console.error(
        `[e2e] el puerto ${ENV.puerto} ya está en uso (otro servicio). ` +
        `Indica otro con E2E_PORT (p. ej. 8450) o usa E2E_AUTOSERVE=0 con E2E_BASE_URL.`,
      );
    } else {
      console.error('[e2e] no se pudo levantar el servidor local:', err?.message ?? err);
    }
    process.exit(1);
  }
  base = servidor.url;
  console.log(`[e2e] servidor local levantado: ${servidor.url} (E2E_PORT=${ENV.puerto || 'libre'})`);
}

// El servidor SIEMPRE se apaga: al terminar el runner (pase o falle) y ante
// SIGINT/SIGTERM/exit.
async function apagar(): Promise<void> {
  if (servidor) {
    const s = servidor;
    servidor = null;
    await s.cerrar();
    console.log('[e2e] servidor local apagado');
  }
}
const apagarSync = (): void => { void apagar(); };
process.once('exit', apagarSync);
process.once('SIGINT', () => { apagarSync(); process.exit(130); });
process.once('SIGTERM', () => { apagarSync(); process.exit(143); });

// La config E2E estándar (título de pestaña) se refresca ANTES de correr:
// vendor DL con timestamp — nunca vuelve a una versión más vieja que la local.
await descargarConfigE2E();

const child = spawn(
  process.execPath,
  ['--experimental-strip-types', '--test', '--test-concurrency=1', ...archivos],
  { stdio: 'inherit', env: { ...process.env, E2E_BASE_URL: String(base) } },
);

const codigo: number | null = await new Promise((res) => child.on('exit', res));
await apagar();
process.exit(codigo ?? 1);
