// run.mjs: runner de los tests exhaustivos de los demos ISP.
// Levanta el servidor de demos (scripts/serve-demos.mjs) en puerto libre,
// corre las suites de cada demo (Playwright + Stagehand) y baja el servidor
// al terminar.
//
// Uso:
//   node --experimental-strip-types demos/isp/_testing/run.mjs
//   node --experimental-strip-types demos/isp/_testing/run.mjs --only=heading
//   DEMOS_PORT=8501 node --experimental-strip-types demos/isp/_testing/run.mjs
//   DEMOS_AUTOSERVE=0 node --experimental-strip-types demos/isp/_testing/run.mjs   # usar servidor externo
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..', '..', '..');

const only = (process.argv.find((a, i) => a === '--only' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null);

const PORT = Number(process.env.DEMOS_PORT) || 8491;
const HOST = process.env.DEMOS_HOST || '127.0.0.1';

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
  console.error('[isp-demos-test] Falta playwright. Corre `pnpm i` primero.');
  process.exit(1);
}

console.log(`[isp-demos-test] puerto=${PORT} host=${HOST} only=${only ?? '(todos)'}`);

// Subir el servidor de demos en background solo si no hay uno ya corriendo.
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
      console.warn(`[isp-demos-test] puerto ${PORT} ya estaba ocupado; reusando el servidor existente.`);
    } else {
      console.error('[isp-demos-test] error arrancando server:', err?.message);
    }
  });
}

async function killServer() {
  if (!serverProc || serverProc.killed) return;
  serverProc.kill();
  return new Promise((r) => {
    if (!serverProc) return r();
    serverProc.once('exit', () => r());
    setTimeout(() => r(), 1500);
  });
}
process.on('SIGINT', () => { killServer().finally(() => { process.exit(130); }); });
process.on('SIGTERM', () => { killServer().finally(() => { process.exit(143); }); });

async function waitForServer(maxMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const res = await fetch(`http://${HOST}:${PORT}/demos/isp/heading/heading.html`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const ok = await waitForServer(8000);
if (!ok) {
  console.error('[isp-demos-test] servidor no respondió en 8000 ms');
  await killServer().catch(() => {});
  process.exit(1);
}

// Recoger tests: demos/isp/<componente>/_testing/*.test.mjs (subcarpetas).
const entries = readdirSync(join(here), { withFileTypes: true });
const nested = [];
for (const d of entries) {
  if (!d.isDirectory() || d.name.startsWith('lib') || d.name.startsWith('_')) continue;
  const sub = readdirSync(join(here, d.name)).filter((f) => f.endsWith('.test.mjs'));
  for (const f of sub) nested.push(join(here, d.name, f));
}
const all = nested.filter((f) => !only || f.includes(only));
console.log(`[isp-demos-test] ${all.length} suite(s) a correr:`);
all.forEach((f) => console.log('   -', f.replace(repoRoot, '')));

let failures = 0;
process.env.DEMOS_BASE_URL = `http://${HOST}:${PORT}`;
for (const f of all) {
  console.log(`\n[isp-demos-test] corriendo ${f.replace(repoRoot, '')} ...`);
  const proc = spawn(process.execPath, ['--experimental-strip-types', f], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DEMOS_BASE_URL: process.env.DEMOS_BASE_URL },
  });
  const code = await new Promise((r) => proc.once('exit', r));
  if (code !== 0) failures++;
}

console.log(`\n[isp-demos-test] ${failures === 0 ? 'OK' : `${failures} suite(s) fallaron`}`);
await killServer().catch(() => {});
process.exit(failures === 0 ? 0 : 1);
