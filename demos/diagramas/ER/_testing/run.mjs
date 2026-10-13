// run.mjs: runner de los tests exhaustivos de los demos. Levanta el servidor
// de demos (scripts/serve-demos.mjs) en puerto libre, corre las suites de
// cada demo (Playwright + Stagehand) y baja el servidor al terminar.
//
// Uso:
//   deno run -A --no-check demos/_testing/run.mjs                  
//   deno run -A --no-check demos/_testing/run.mjs --only=editor   
//   DEMOS_PORT=8501 deno run -A --no-check demos/_testing/run.mjs 
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatMs, testCooldownFromEnv, testId } from '../../../../src/vendor-distributions/shared/testing/test-cooldown.ts';
import { runQueue } from '../../../../src/vendor-distributions/shared/testing/test-cooldown.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..');

const only = (process.argv.find((a, i) => a === '--only' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null);

const PORT = Number(process.env.DEMOS_PORT) || 8491;
const HOST = process.env.DEMOS_HOST || '127.0.0.1';

// Detectar Playwright en node_modules (devDep ya declarada).
async function hasPlaywright() {
  try {
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}

const hasPW = await hasPlaywright();
if (!hasPW) {
  console.error('[demos-test] Falta playwright. Corre `pnpm i` primero.');
  process.exit(1);
}

console.log(`[demos-test] puerto=${PORT} host=${HOST} only=${only ?? '(todos)'}`);

// Subir el servidor de demos en background solo si no hay uno ya corriendo.
// Si E2E_AUTOSERVE=0 o DEMOS_BASE_URL está seteado, no subimos nada: el caller
// es responsable de tener el servidor arriba.
const useExternal = process.env.DEMOS_AUTOSERVE === '0' || !!process.env.DEMOS_BASE_URL;
let serverProc = null;
if (!useExternal) {
  serverProc = spawn(
    process.execPath,
    ['scripts/serve-demos.mjs', String(PORT)],
    { cwd: repoRoot, stdio: ['ignore', 'inherit', 'pipe'] },
  );
  serverProc.once('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.warn(`[demos-test] puerto ${PORT} ya estaba ocupado; reusando el servidor existente.`);
    } else {
      console.error('[demos-test] error arrancando server:', err?.message);
    }
  });
}

async function killServer() {
  if (!serverProc || serverProc.killed) return;
  serverProc.kill();
  return new Promise((r) => {
    if (!serverProc) return r();
    serverProc.once('exit', () => r());
    setTimeout(() => r(), 1500); // no bloquear forever si no muere
  });
}
process.on('SIGINT', () => { killServer().finally(() => { process.exit(130); }); });
process.on('SIGTERM', () => { killServer().finally(() => { process.exit(143); }); });

// Esperar a que el servidor esté listo haciendo health check.
async function waitForServer(maxMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/demos/diagramas/ER/index.html`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const ok = await waitForServer(8000);
if (!ok) {
  console.error('[demos-test] servidor no respondió en 8000 ms');
  await killServer().catch(() => {});
  process.exit(1);
}

// Recoger tests: demos/<nombre>/_testing/*.test.mjs
const entries = readdirSync(join(here), { withFileTypes: true });
const testFiles = entries
  .filter((e) => e.isFile() && e.name.endsWith('.test.mjs'))
  .map((e) => join(here, e.name));
const dirEntries = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_global'));
const nested = [];
for (const d of dirEntries) {
  const sub = readdirSync(join(here, d.name)).filter((f) => f.endsWith('.test.mjs'));
  for (const f of sub) nested.push(join(here, d.name, f));
}
const all = [...testFiles, ...nested].filter((f) => !only || f.includes(only));
console.log(`[demos-test] ${all.length} suite(s) a correr:`);
all.forEach((f) => console.log('   -', f.replace(repoRoot, '')));

// Runner estándar is-*: cola de 3 suites a la vez + cooldown (src/vendor-distributions/shared/testing/).
// Rojo a la primera: se reintenta de a uno (TEST_REINTENTOS, 1 por defecto), como deno-test.ts y pruebas.ts:
// dos Chromium lanzados a la vez desde Deno en Windows pueden caer con "os error 6" sin que el demo esté mal.
process.env.DEMOS_BASE_URL = `http://${HOST}:${PORT}`;
const cooldown = testCooldownFromEnv();
const reintentos = Math.max(0, Number(process.env.TEST_REINTENTOS ?? 1) || 0);
const relDe = (f) => relative(repoRoot, f).replace(/\\/g, '/');
async function correrSuite(f) {
  const proc = spawn(process.execPath, ['run', '-A', '--no-check', f], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DEMOS_BASE_URL: process.env.DEMOS_BASE_URL },
  });
  const code = await new Promise((r) => proc.once('exit', r));
  if (code !== 0) throw new Error(`exit ${code}`);
}
let rojos = [];
await runQueue(all, async (f) => {
  try {
    const r = await cooldown.run(testId(relDe(f), '*'), async () => {
      console.log(`\n[demos-test] corriendo ${relDe(f)} ...`);
      await correrSuite(f);
    });
    if (r.skipped) console.log(`[cooldown] ~ ${relDe(f)} (faltan ${formatMs(r.remainingMs)})`);
  } catch {
    rojos.push(f);
  }
});
for (let k = 0; k < reintentos && rojos.length; k++) {
  const pendientes = rojos;
  rojos = [];
  for (const f of pendientes) {
    try {
      await cooldown.run(testId(relDe(f), '*'), async () => {
        console.log(`\n[demos-test] ↻ ${relDe(f)}: rojo a la primera, se reintenta de a uno`);
        await correrSuite(f);
      });
    } catch {
      rojos.push(f);
    }
  }
}
const failures = rojos.length;

console.log(`\n[demos-test] ${failures === 0 ? 'OK' : `${failures} suite(s) fallaron`}`);
await killServer().catch(() => {});
process.exit(failures === 0 ? 0 : 1);