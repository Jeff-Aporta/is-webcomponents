/**
 * solo-edge.test.ts — ningún script ni test versionado lanza el Chrome del usuario (plan carga modular, F7 tarea 3).
 *
 * Regla del repo: los navegadores de pruebas y mediciones son siempre Edge headless (`channel: 'msedge'`), nunca
 * `chrome.exe` (ni el del sistema ni el Chromium que descarga Playwright, que tampoco está instalado aquí). En todo
 * archivo de código versionado (fuera de `dist/`, que es generado), sin contar las líneas de comentario:
 *
 *   1. ninguna ruta a Chrome (`chrome.exe`, `google-chrome`, `Google Chrome.app`, `Google/Chrome`);
 *   2. ningún canal `chrome` (ni `channel: 'chrome'` ni las listas `[undefined, 'chrome', 'msedge']` de antes);
 *   3. cada `chromium.launch(…)` lleva `msedge` en sus argumentos (salvo `lanzarChromium` de tests/_shared/navegador.ts,
 *      que recorre `CANALES_CHROMIUM = ['msedge']`);
 *   4. cada `localBrowser.launch(…)` de Stagehand lleva `executablePath` (sin ruta, Stagehand busca el Chrome del
 *      usuario): `rutaEdge()` de tests/_shared/navegador.ts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const CODIGO = /\.(?:m?js|cjs|ts|py|sh|ps1)$/;
const PROPIO = 'tests/gobernanza/solo-edge.test.ts';
const LANZADOR = 'tests/_shared/navegador.ts';

const RUTA_CHROME = /chrome\.exe|google-chrome|Google Chrome\.app|Google[\\/]Chrome/i;
const CANAL_CHROME = /channel\s*[:=]\s*['"]chrome['"]|\[\s*undefined\s*,\s*['"]chrome['"]|['"]chrome['"]\s*,\s*['"]msedge['"]/;

function versionados(): string[] {
  const r = new Deno.Command('git', { args: ['ls-files'], cwd: RAIZ, stdout: 'piped' }).outputSync();
  return new TextDecoder().decode(r.stdout).split('\n').map((l) => l.trim())
    .filter((l) => l && CODIGO.test(l) && !l.startsWith('dist/') && !l.includes('node_modules/') && l !== PROPIO);
}

/** El texto sin las líneas de comentario (`//`, `/*`, ` *`, `#`). */
const sinComentarios = (texto: string) => texto.split('\n').map((l) => (/^\s*(?:\/\/|\/\*|\*|#)/.test(l) ? '' : l)).join('\n');

/** Argumentos de cada llamada `<prefijo>(…)` (paréntesis balanceados). */
function argumentos(texto: string, prefijo: RegExp): string[] {
  const out: string[] = [];
  for (const m of texto.matchAll(prefijo)) {
    let i = m.index! + m[0].length;
    let nivel = 1;
    const desde = i;
    while (i < texto.length && nivel > 0) {
      if (texto[i] === '(') nivel++;
      else if (texto[i] === ')') nivel--;
      i++;
    }
    out.push(texto.slice(desde, i - 1));
  }
  return out;
}

test('gobernanza/solo-edge: ningún script ni test versionado lanza Chrome; Playwright con msedge y Stagehand con executablePath', () => {
  const fallos: string[] = [];
  let lanzamientos = 0;
  for (const ruta of versionados()) {
    let texto: string;
    try { texto = sinComentarios(readFileSync(join(RAIZ, ruta), 'utf8')); } catch { continue; }
    if (RUTA_CHROME.test(texto)) fallos.push(`${ruta}: ruta a Chrome`);
    if (CANAL_CHROME.test(texto)) fallos.push(`${ruta}: canal chrome`);
    for (const a of argumentos(texto, /\bchromium\.launch\(/g)) {
      lanzamientos++;
      if (!/msedge/.test(a) && ruta !== LANZADOR) fallos.push(`${ruta}: chromium.launch(${a.replace(/\s+/g, ' ').slice(0, 80)}) sin channel 'msedge'`);
    }
    for (const a of argumentos(texto, /\blocalBrowser\.launch\(/g)) {
      lanzamientos++;
      if (!/executablePath/.test(a)) fallos.push(`${ruta}: localBrowser.launch sin executablePath (Stagehand buscaría Chrome)`);
    }
  }
  console.log(`  ${lanzamientos} lanzamientos de navegador revisados · ${fallos.length} fuera de la regla`);
  assert.ok(lanzamientos > 100, `solo ${lanzamientos} lanzamientos encontrados: ¿cambió la forma de lanzar?`);
  assert.deepEqual(fallos, [], 'lanzamientos que no son Edge');
});

export default lista();
