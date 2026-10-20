// tests/theme-contract.test.ts
//
// Reemplazo del antiguo scripts/verify-theme-contract.cjs.
//
// Verifica que el contrato de tema/paleta se mantiene:
//   1. <html> tiene data-theme y data-palette por defecto.
//   2. is-base.scss + palettes.scss reaccionan a [data-theme=light|dark].
//   3. is-base.scss + palettes.scss declaran las 3 paletas (insoft, contapyme, agrowin).
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
const root = dirname(dirname(here));

const html = await readFile(join(root, 'index.html'), 'utf8');
const isBase = await readFile(join(root, 'src', 'styles', 'is-base.scss'), 'utf8');
const palettes = await readFile(join(root, 'src', 'styles', 'palettes.scss'), 'utf8');
const styles = `${isBase}\n${palettes}`;
const component = await readFile(join(root, 'src', 'components', 'actions', 'button.ts'), 'utf8');
// El chrome de la galería (iframe del preview, #themeToggle, #fullscreenBtn) ya no
// va escrito en index.html: index monta <iswc-doc-demo> y ese componente lo pinta
// desde su plantilla (src/components/layout/doc-demo.ts). El shell = ambos.
const docDemo = await readFile(join(root, 'src', 'components', 'layout', 'doc-demo.ts'), 'utf8');
const shell = `${html}\n${docDemo}`;

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(
  /\[data-theme=["']dark["']\]/.test(isBase) && /\[data-theme=["']dark["']\]/.test(palettes),
  'is-base.scss y palettes.scss deben reaccionar a [data-theme=dark]',
);
check(
  /\[data-theme=["']light["']\]/.test(isBase) && /\[data-theme=["']light["']\]/.test(palettes),
  'is-base.scss y palettes.scss deben reaccionar a [data-theme=light]',
);
check(
  !/:is\(\s*:not\(\[data-theme\]\)/.test(palettes),
  'palettes.scss: no usar :not([data-theme]) suelto (pisa dark en descendientes)',
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
//    Verificamos que NO esten en is-base.scss ni palettes.scss.
const REMOVED_FIELD_TOKENS = ['--iswc-b-required', '--iswc-b-optional', '--iswc-b-readonly', '--iswc-bg-readonly'];
for (const t of REMOVED_FIELD_TOKENS) {
  check(!isBase.includes(`${t}:`), `is-base.scss ya no debe declarar ${t}`);
  check(!palettes.includes(`${t}:`), `palettes.scss ya no debe declarar ${t}`);
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
  check(palettes.includes(`--iswc-brand-h: ${p.h};`), `palettes.scss no tiene el h de ${p.value}`);
  check(palettes.includes(`--iswc-brand-s: ${p.s};`), `palettes.scss no tiene la s de ${p.value}`);
  check(palettes.includes(`--iswc-brand-b: ${p.b};`), `palettes.scss no tiene la b de ${p.value}`);
}

check(!/\bsize\s*=|["']size["']|pgSize|small\s*\|\s*medium\s*\|\s*large/.test(`${html}\n${component}`), 'size API legacy encontrada');

check(!/\b(?:height|padding(?:-inline)?|gap):\s*\d+(?:\.\d+)?px/.test(component), 'componente usa px en geometry (deberia ser em)');

check(/<iswc-doc-demo[\s>]/.test(html), 'index.html debe montar <iswc-doc-demo> (el chrome de la galería)');
check(/<iframe\b[^>]*id="previewFrame"/.test(shell), '<iframe id="previewFrame"> del preview no encontrado en el shell');
check(/id="themeToggle"/.test(shell), '#themeToggle no encontrado');
check(/id="fullscreenBtn"/.test(shell), '#fullscreenBtn no encontrado');
check(/<iswc-theme-toggle\b[^>]*id="themeToggle"/.test(shell), '#themeToggle debe ser <iswc-theme-toggle>');
check(!/<(?:svg|symbol|use)\b/i.test(docDemo), 'doc-demo.ts (chrome) contiene <svg>/<use>/<symbol> inline');

const WA_RE = /webawesome|Web Awesome|\bwa-[a-z]/i;
check(!WA_RE.test(shell), 'el shell (index.html + doc-demo) contiene Web Awesome');

// Verifica todos los previews contra Web Awesome.
import { readdir } from 'node:fs/promises';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

test('gobernanza/theme-contract', async () => {
  async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(p));
      else if (e.isFile() && (e.name.endsWith('.html') || e.name.endsWith('.json'))) out.push(p);
    }
    return out;
  }
  // Los previews JSON (iswc-preview/v1) viven junto a su componente en
  // src/components/<cat>/<tag>.json; en src/previews/ solo queda el shell.
  const previews = [
    ...await walk(join(root, 'src', 'previews')),
    ...await walk(join(root, 'src', 'components')),
  ];
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
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(`theme-contract.test.ts: PASS — 2 temas, 3 paletas, tokens --iswc-*, sin Web Awesome`);
});

export default lista();
