// smoke-runtime.test.ts — el único test de la batería que ejecuta los
// componentes en un DOM real.
//
// El resto de tests son análisis estático sobre el texto de los .js. Eso
// vigila contratos (qué atributos hay, qué eventos se documentan) pero no ve
// nada de lo que sólo falla al ejecutar: un import roto, un custom element
// que no llega a registrarse, un `attributeChangedCallback` que lanza, o un
// componente que no sobrevive a que le muevan el nodo de sitio.
//
// Levanta Chrome headless contra `tests/smoke-runtime.html`, que monta CADA
// componente del manifest y anota lo que pasa. Sin dependencias nuevas: usa
// `--dump-dom`, que imprime el DOM final por stdout.
//
// Si no hay Chrome o no hay servidor, el test se salta (no falla): la
// batería tiene que seguir corriendo en una máquina pelada.
//
// Uso:  node scripts/serve.mjs &  node tests/smoke-runtime.test.ts

import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT) || 8391;
const URL_SMOKE = `http://localhost:${PORT}/tests/smoke-runtime.html`;

const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) {
  console.log('SKIP smoke-runtime — no se encontró Chrome (define CHROME_PATH)');
  process.exit(0);
}

/** Arranca el servidor de previews si no hay uno escuchando ya. */
async function ensureServer() {
  const responde = await fetch(`http://localhost:${PORT}/`, { method: 'HEAD' })
    .then(() => true).catch(() => false);
  if (responde) return null;
  const proc = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs'), String(PORT)], {
    stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const ok = await fetch(`http://localhost:${PORT}/`, { method: 'HEAD' }).then(() => true).catch(() => false);
    if (ok) return proc;
  }
  proc.kill();
  return undefined; // no levantó
}

const server = await ensureServer();
if (server === undefined) {
  console.log(`SKIP smoke-runtime — no hay servidor en :${PORT} y no se pudo levantar`);
  process.exit(0);
}

let dom;
try {
  dom = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=60000', '--dump-dom', URL_SMOKE,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} finally {
  server?.kill();
}

const bloque = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!bloque || bloque[1].trim() === 'PENDIENTE') {
  console.log('FAIL smoke-runtime — la página no llegó a terminar (¿un componente se colgó?)');
  process.exit(1);
}

const crudo = bloque[1]
  .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const { filas } = JSON.parse(crudo);

// Se comprueba lo que un fallo de verdad rompe: cargar y registrarse. Lo
// demás (avisos de "sin shadowRoot") es informativo: hay componentes de
// light DOM y helpers que legítimamente no montan nada.
const rotos = filas.filter((f) => !f.ok);
const avisos = filas.filter((f) => f.ok && f.notas.length);

for (const f of rotos) console.log(`  ✗ ${f.tag}: ${f.notas.join('; ')}`);
for (const f of avisos) console.log(`  · ${f.tag}: ${f.notas.join('; ')}`);

if (rotos.length) {
  console.log(`\nFAIL smoke-runtime — ${rotos.length} de ${filas.length} componentes no arrancan`);
  process.exit(1);
}
console.log(`OK smoke-runtime — ${filas.length} componentes montan, aceptan un atributo y sobreviven a moverse de padre`);
