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

const e2eDir = dirname(fileURLToPath(import.meta.url));
const archivos = readdirSync(e2eDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort()
  .map((f) => join(e2eDir, f));

const autoserve = process.env.E2E_AUTOSERVE !== '0' && !process.env.E2E_BASE_URL;
let servidor: ServidorE2E | null = null;
let base = process.env.E2E_BASE_URL;

if (autoserve) {
  servidor = await levantarServidor({});
  base = servidor.url;
  console.log(`[e2e] servidor local levantado: ${servidor.url}`);
}

const child = spawn(
  process.execPath,
  ['--experimental-strip-types', '--test', '--test-concurrency=1', ...archivos],
  { stdio: 'inherit', env: { ...process.env, E2E_BASE_URL: String(base) } },
);

const codigo: number | null = await new Promise((res) => child.on('exit', res));
if (servidor) {
  await servidor.cerrar();
  console.log('[e2e] servidor local apagado');
}
process.exit(codigo ?? 1);
