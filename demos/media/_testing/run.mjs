// run.mjs: runner de los tests exhaustivos de los demos de la categoría
// `media`. Levanta el servidor de demos (scripts/serve-demos.mjs) en puerto
// libre, corre las suites de cada demo (Playwright + Stagehand) y baja el
// servidor al terminar.
//
// Uso:
//   node --experimental-strip-types demos/media/_testing/run.mjs
//   node --experimental-strip-types demos/media/_testing/run.mjs --only=avatar
//   DEMOS_PORT=8501 node --experimental-strip-types demos/media/_testing/run.mjs
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
// here = demos/media/_testing
// parent of here = demos/media (donde viven <Avatar>/<Barcode>/etc.)
const mediaRoot = join(here, '..');
const repoRoot = join(here, '..', '..', '..');

const only = (process.argv.find((a, i) => a === '--only' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null);

const PORT = Number(process.env.DEMOS_PORT) || 8492;
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
      const res = await fetch(`http://${HOST}:${PORT}/demos/media/Avatar/avatar.html`);
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

// Recoger tests: demos/media/<Componente>/_testing/*.test.mjs
const entries = readdirSync(mediaRoot, { withFileTypes: true });
const dirEntries = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'node_modules');
const all = [];
for (const d of dirEntries) {
  const testingDir = join(mediaRoot, d.name, '_testing');
  let sub = [];
  try {
    sub = readdirSync(testingDir);
  } catch {
    continue; // no tiene _testing, skip
  }
  for (const f of sub) {
    if (f.endsWith('.test.mjs')) all.push(join(testingDir, f));
  }
}
const filtered = all.filter((f) => !only || f.includes(only));
console.log(`[demos-test] ${filtered.length} suite(s) a correr:`);
filtered.forEach((f) => console.log('   -', f.replace(repoRoot, '')));

// Correrlas secuencialmente.
let failures = 0;
process.env.DEMOS_BASE_URL = `http://${HOST}:${PORT}`;
for (const f of filtered) {
  console.log(`\n[demos-test] corriendo ${f.replace(repoRoot, '')} ...`);
  const proc = spawn(process.execPath, ['--experimental-strip-types', f], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DEMOS_BASE_URL: process.env.DEMOS_BASE_URL },
  });
  const code = await new Promise((r) => proc.once('exit', r));
  if (code !== 0) failures++;
}

console.log(`\n[demos-test] ${failures === 0 ? 'OK' : `${failures} suite(s) fallaron`}`);
await killServer().catch(() => {});
process.exit(failures === 0 ? 0 : 1);
