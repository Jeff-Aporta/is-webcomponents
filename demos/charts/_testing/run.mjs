// run.mjs: runner de los tests exhaustivos de los demos de la categoría
// `charts`. Igual que el runner de `demos/diagramas/ER/`, levanta el servidor
// de demos (scripts/serve-demos.mjs) en puerto libre, corre las suites de
// cada demo (Playwright puro, sin Stagehand LLM) y baja el servidor.
//
// Uso:
//   node --experimental-strip-types demos/charts/_testing/run.mjs
//   node --experimental-strip-types demos/charts/_testing/run.mjs --only=bar-chart
//   DEMOS_PORT=8501 node --experimental-strip-types demos/charts/_testing/run.mjs
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
  console.error('[charts-test] Falta playwright. Corre `pnpm i` primero.');
  process.exit(1);
}

console.log(`[charts-test] puerto=${PORT} host=${HOST} only=${only ?? '(todos)'}`);

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
      console.warn(`[charts-test] puerto ${PORT} ya estaba ocupado; reusando el servidor existente.`);
    } else {
      console.error('[charts-test] error arrancando server:', err?.message);
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
      const res = await fetch(`http://${HOST}:${PORT}/demos/charts/index.html`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const ok = await waitForServer(8000);
if (!ok) {
  console.error('[charts-test] servidor no respondió en 8000 ms');
  await killServer().catch(() => {});
  process.exit(1);
}

// Recoger tests: demos/charts/<nombre>/_testing/*.test.mjs
// Excluir el directorio _global (comparte harness, no tests).
const chartsDir = join(repoRoot, 'demos', 'charts');
const entries = readdirSync(chartsDir, { withFileTypes: true });
const componentDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_'));

const all = [];
for (const d of componentDirs) {
  const sub = readdirSync(join(chartsDir, d.name)).filter((f) => f.endsWith('.test.mjs'));
  for (const f of sub) all.push(join(chartsDir, d.name, f));
}
const filtered = all.filter((f) => !only || f.includes(only));
console.log(`[charts-test] ${filtered.length} suite(s) a correr:`);
filtered.forEach((f) => console.log('   -', f.replace(repoRoot, '')));

let failures = 0;
process.env.DEMOS_BASE_URL = `http://${HOST}:${PORT}`;
for (const f of filtered) {
  console.log(`\n[charts-test] corriendo ${f.replace(repoRoot, '')} ...`);
  const proc = spawn(process.execPath, ['--experimental-strip-types', f], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DEMOS_BASE_URL: process.env.DEMOS_BASE_URL },
  });
  const code = await new Promise((r) => proc.once('exit', r));
  if (code !== 0) failures++;
}

console.log(`\n[charts-test] ${failures === 0 ? 'OK' : `${failures} suite(s) fallaron`}`);
await killServer().catch(() => {});
process.exit(failures === 0 ? 0 : 1);