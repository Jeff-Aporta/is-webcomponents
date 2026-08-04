// tests/theme-contract.test.mjs
//
// Reemplazo del antiguo scripts/verify-theme-contract.cjs.
//
// Verifica que el contrato de tema/paleta se mantiene:
//   1. <html> tiene data-theme y data-palette por defecto.
//   2. is-base.css + palettes.css declaran .theme-light, .theme-dark.
//   3. is-base.css + palettes.css declaran las 3 paletas (insoft, contapyme, agrowin).
//   4. No hay tokens con prefijo --pg- legacy.
//   5. Componentes no usan <svg>/<use>/<symbol> inline.
//   6. Componentes no usan size= hardcodeado (usar tokens em).
//   7. Ningun preview menciona Web Awesome (wa-*, WebAwesome, Web Awesome).
//
// Uso:  node tests/theme-contract.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const html = await readFile(join(root, 'index.html'), 'utf8');
const isBase = await readFile(join(root, 'styles', 'is-base.css'), 'utf8');
const palettes = await readFile(join(root, 'styles', 'palettes.css'), 'utf8');
const styles = `${isBase}\n${palettes}`;
const component = await readFile(join(root, 'components', 'actions', 'button.js'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(styles.includes('.theme-light'), 'missing .theme-light');
check(styles.includes('.theme-dark'), 'missing .theme-dark');
for (const p of ['insoft', 'contapyme', 'agrowin']) {
  check(styles.includes(`[data-palette="${p}"]`), `missing ${p} palette`);
}
check(html.includes('data-palette="insoft"'), 'missing root palette on <html>');

check(!/<(?:svg|symbol|use)\b/i.test(html), 'index.html contiene <svg>/<use>/<symbol> inline');
check(!/<(?:svg|symbol|use)\b/i.test(component), 'components/actions/button.js contiene <svg>/<use>/<symbol> inline');

check(!/--pg-/.test(styles), 'tokens legacy --pg- encontrados');
check(styles.includes('--is-bg:'), 'missing --is-bg: token');

// 8. Tokens de estado de campo: deben existir en AMBOS temas de is-base.css
//    (los componentes los consumen sin fallback literal, asi que si una
//    paleta futura los olvida el campo se queda sin borde).
const FIELD_TOKENS = ['--is-b-required', '--is-b-optional', '--is-b-readonly', '--is-bg-readonly'];
// Bloque dark = ':root,\n.theme-dark {…}'  /  bloque light = '.theme-light {…}'
const darkBlock = isBase.slice(isBase.indexOf(':root'));
const lightBlocks = isBase.split('.theme-light').slice(1).join('\n');
for (const t of FIELD_TOKENS) {
  check(darkBlock.includes(`${t}:`), `is-base.css: falta ${t} en tema dark`);
  check(lightBlocks.includes(`${t}:`), `is-base.css: falta ${t} en tema light`);
}

// 9. La paleta contapyme debe usar la marca real de ISP (#1a6eb0 / #00598a)
//    y NO dodgerblue #1e90ff, que era el valor placeholder anterior.
const cp = palettes.slice(palettes.indexOf('[data-palette="contapyme"]'), palettes.indexOf('[data-palette="agrowin"]'));
check(!/dodgerblue|#1e90ff/i.test(cp), 'paleta contapyme aun usa dodgerblue/#1e90ff');
check(/#1a6eb0/i.test(cp), 'paleta contapyme no usa el primary real #1a6eb0');
check(/#00598a/i.test(cp), 'paleta contapyme no usa el primary oscuro real #00598a');
check(/#00bcff/i.test(cp), 'paleta contapyme no conserva #00bcff como brand-text dark');

check(!/\bsize\s*=|["']size["']|pgSize|small\s*\|\s*medium\s*\|\s*large/.test(`${html}\n${component}`), 'size API legacy encontrada');

check(!/\b(?:height|padding(?:-inline)?|gap):\s*\d+(?:\.\d+)?px/.test(component), 'componente usa px en geometry (deberia ser em)');

check(/<iframe\b/.test(html), '<iframe> del preview no encontrado en index.html');
check(/id="themeToggle"/.test(html), '#themeToggle no encontrado');
check(/id="fullscreenBtn"/.test(html), '#fullscreenBtn no encontrado');
check(/<is-theme-toggle\b[^>]*id="themeToggle"/.test(html), '#themeToggle debe ser <is-theme-toggle>');

const WA_RE = /webawesome|Web Awesome|\bwa-[a-z]/i;
check(!WA_RE.test(html), 'index.html contiene Web Awesome');

// Verifica todos los previews contra Web Awesome.
import { readdir } from 'node:fs/promises';
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const previewsDir = join(root, 'previews');
const previews = await walk(previewsDir);
let previewCount = 0;
for (const f of previews) {
  previewCount++;
  const body = await readFile(f, 'utf8');
  if (WA_RE.test(body)) failures.push(`Web Awesome en preview: ${f.replace(root + '\\', '')}`);
}

console.log(`previews escaneados: ${previewCount}`);

if (failures.length) {
  console.log('\nFAIL:');
  for (const f of failures.slice(0, 20)) console.log(`  - ${f}`);
  if (failures.length > 20) console.log(`  ... y ${failures.length - 20} mas`);
  process.exit(1);
}

console.log(`theme-contract.test.mjs: PASS — 2 temas, 3 paletas, tokens --is-*, sin Web Awesome`);