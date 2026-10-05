// tests/theme-contract.test.ts
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
// Uso:  node tests/theme-contract.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const html = await readFile(join(root, 'index.html'), 'utf8');
const isBase = await readFile(join(root, 'src', 'styles', 'is-base.css'), 'utf8');
const palettes = await readFile(join(root, 'src', 'styles', 'palettes.css'), 'utf8');
const styles = `${isBase}\n${palettes}`;
const component = await readFile(join(root, 'src', 'components', 'actions', 'button.ts'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(styles.includes('.theme-light'), 'missing .theme-light');
check(styles.includes('.theme-dark'), 'missing .theme-dark');
check(
  /\[data-theme=["']light["']\]/.test(isBase) && /\[data-theme=["']light["']\]/.test(palettes),
  'is-base.css y palettes.css deben reaccionar a [data-theme=light], no solo a .theme-light',
);
for (const p of ['insoft', 'contapyme', 'agrowin']) {
  check(styles.includes(`[data-palette="${p}"]`), `missing ${p} palette`);
}
check(html.includes('data-palette="contapyme"'), 'missing root palette contapyme on <html>');

check(!/<(?:svg|symbol|use)\b/i.test(html), 'index.html contiene <svg>/<use>/<symbol> inline');
check(!/<(?:svg|symbol|use)\b/i.test(component), 'components/actions/button.ts contiene <svg>/<use>/<symbol> inline');

check(!/--pg-/.test(styles), 'tokens legacy --pg- encontrados');
check(styles.includes('--iswc-bg:'), 'missing --iswc-bg: token');

// 8. Los tokens legacy de estado de campo (--iswc-b-required, --iswc-b-optional,
//    --iswc-b-readonly, --iswc-bg-readonly) fueron eliminados en W48 —
//    los consumidores en components/ usan sus fallbacks literales.
//    Verificamos que NO esten en is-base.css ni palettes.css.
const REMOVED_FIELD_TOKENS = ['--iswc-b-required', '--iswc-b-optional', '--iswc-b-readonly', '--iswc-bg-readonly'];
for (const t of REMOVED_FIELD_TOKENS) {
  check(!isBase.includes(`${t}:`), `is-base.css ya no debe declarar ${t}`);
  check(!palettes.includes(`${t}:`), `palettes.css ya no debe declarar ${t}`);
}

// 9. ContaPyme = hsl(210 100% 56%), que es dodgerblue. El brand no se escribe a mano.
const cp = palettes.slice(palettes.indexOf('[data-palette="contapyme"]'), palettes.indexOf('[data-palette="insoft"]'));
check(/--iswc-brand-h:\s*210/.test(cp), 'contapyme --iswc-brand-h debe ser 210 (dodgerblue)');
check(/--iswc-brand-s:\s*100%/.test(cp), 'contapyme --iswc-brand-s debe ser 100%');
check(/--iswc-brand-b:\s*56%/.test(cp), 'contapyme --iswc-brand-b debe ser 56%');
check(!/--iswc-color-brand:\s*(?:dodgerblue|#[0-9a-f]{3,8})/i.test(cp), 'contapyme no debe fijar --iswc-color-brand a mano');
check(/--iswc-color-brand:\s*hsl\(calc\(var\(--iswc-brand-h\)/.test(palettes), 'el brand se deriva de h, s y b');
check(/rgb\(from var\(--iswc-accent\) r g b \/ 12%\)/.test(palettes), 'el alpha del acento sale de rgb(from var(--iswc-accent))');
check(/--iswc-hue-rotate:\s*calc\(\(var\(--iswc-brand-h\) - var\(--iswc-logo-h\)\) \* 1deg\)/.test(palettes), 'falta --iswc-hue-rotate');
check(/:root,\s*\[data-palette="contapyme"\]/.test(palettes), 'contapyme debe aplicarse en :root como default');
const catalog = JSON.parse(await readFile(join(root, 'src', 'styles', 'palettes.json'), 'utf8'));
for (const p of catalog) {
  check(palettes.includes(`--iswc-brand-h: ${p.h};`), `palettes.css no tiene el h de ${p.value}`);
  check(palettes.includes(`--iswc-brand-s: ${p.s};`), `palettes.css no tiene la s de ${p.value}`);
  check(palettes.includes(`--iswc-brand-b: ${p.b};`), `palettes.css no tiene la b de ${p.value}`);
}

check(!/\bsize\s*=|["']size["']|pgSize|small\s*\|\s*medium\s*\|\s*large/.test(`${html}\n${component}`), 'size API legacy encontrada');

check(!/\b(?:height|padding(?:-inline)?|gap):\s*\d+(?:\.\d+)?px/.test(component), 'componente usa px en geometry (deberia ser em)');

check(/<iframe\b/.test(html), '<iframe> del preview no encontrado en index.html');
check(/id="themeToggle"/.test(html), '#themeToggle no encontrado');
check(/id="fullscreenBtn"/.test(html), '#fullscreenBtn no encontrado');
check(/<iswc-theme-toggle\b[^>]*id="themeToggle"/.test(html), '#themeToggle debe ser <iswc-theme-toggle>');

const WA_RE = /webawesome|Web Awesome|\bwa-[a-z]/i;
check(!WA_RE.test(html), 'index.html contiene Web Awesome');

// Verifica todos los previews contra Web Awesome.
import { readdir } from 'node:fs/promises';
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.isFile() && (e.name.endsWith('.html') || e.name.endsWith('.json'))) out.push(p);
  }
  return out;
}
const previewsDir = join(root, 'src', 'previews');
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

console.log(`theme-contract.test.ts: PASS — 2 temas, 3 paletas, tokens --iswc-*, sin Web Awesome`);