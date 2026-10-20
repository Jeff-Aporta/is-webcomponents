// tests/palette-and-snippet-contract.test.ts
//
// Contrato aprendido (paleta default ContaPyme + snippets con contexto +
// canvas de la app, no del kit):
//
//   1. Default palette = contapyme (CSS :root, HTML, fallbacks JS).
//   2. is-base NO pone color-scheme en :root (solo [data-theme]).
//   3. is-base / palettes NO pintan html|body { background }.
//   4. demo-code.js sella data-theme + data-palette y reacciona
//      a cambios de contexto.
//
// Uso:  node tests/palette-and-snippet-contract.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCssCompilado } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/palette-and-snippet-contract', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };
  
  // CSS compilado normalizado (Sass emite `[data-palette=contapyme]` sin comillas).
  const isBase = leerCssCompilado(root, 'src/styles/is-base.css');
  const palettes = leerCssCompilado(root, 'src/styles/palettes.css');
  const docDemo = await readFile(join(root, 'src', 'components', 'layout', 'doc-demo.ts'), 'utf8');
  const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
  const previewBoot = await readFile(join(root, 'scripts', 'preview-boot.js'), 'utf8');
  const previewChrome = await readFile(join(root, 'scripts', 'preview-chrome.js'), 'utf8');
  const demoCode = await readFile(join(root, 'scripts', 'demo-code.js'), 'utf8');
  const paletteSelector = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.ts'), 'utf8');
  
  // ─── 1. Default = contapyme ─────────────────────────────────────────────────
  
  check(
    /<html\b[^>]*\bdata-palette="contapyme"/.test(indexHtml),
    'index.html: <html> debe abrir con data-palette="contapyme"',
  );
  
  // El shell de la galería es <iswc-doc-demo> (index.html solo lo monta); el
  // selector de paleta vive en su plantilla.
  check(/<iswc-doc-demo\b/.test(indexHtml), 'index.html: el shell debe montar <iswc-doc-demo>');
  check(
    /<iswc-palette-selector\b[^>]*\bid="brandPalette"[^>]*\bscope="root"/.test(docDemo),
    'doc-demo.ts: el shell usa <iswc-palette-selector id="brandPalette" scope="root">',
  );
  
  check(
    /dataset\.palette\s*\|\|\s*['"]contapyme['"]/.test(previewBoot)
      || /\|\|\s*['"]contapyme['"]/.test(previewBoot),
    'preview-boot.js: fallback de paleta debe ser contapyme',
  );
  check(!/\|\|\s*['"]insoft['"]/.test(previewBoot), 'preview-boot.js: no debe quedar fallback insoft');
  
  check(
    (previewChrome.match(/\|\|\s*['"]contapyme['"]/g) || []).length >= 2,
    'preview-chrome.js: fallbacks de paleta deben ser contapyme',
  );
  check(!/\|\|\s*['"]insoft['"]/.test(previewChrome), 'preview-chrome.js: no debe quedar fallback insoft');
  
  // WHAT: se ejecuta el fallback real en vez de buscar su texto.
  const { resolvePaletteKey } = await import(new URL('../../src/components/charts/utils/chart-palette.ts', import.meta.url).href);
  check(
    resolvePaletteKey(undefined) === 'contapyme' && resolvePaletteKey('no-existe') === 'contapyme',
    'chart-palette.ts: resolvePaletteKey fallback = contapyme',
  );
  check(resolvePaletteKey('insoft') === 'insoft', 'chart-palette.ts: resolvePaletteKey respeta una paleta válida');

  // DEFAULT_PALETTES del selector = PALETTES de palette-build (mismo orden).
  check(
    /DEFAULT_PALETTES[^=]*=\s*PALETTES\.map\(/.test(paletteSelector),
    'palette-selector: DEFAULT_PALETTES debe derivarse de PALETTES (palette-build)',
  );
  const { PALETTES } = await import(new URL('../../src/styles/palette-build.ts', import.meta.url).href);
  const firstValue = PALETTES?.[0]?.value;
  check(firstValue === 'contapyme', `palette-selector DEFAULT_PALETTES[0] = "${firstValue || '?'}", esperaba contapyme`);
  
  check(
    /:root,\s*\[data-palette="contapyme"\]/.test(palettes),
    'palettes.css: contapyme debe aplicarse en :root como default',
  );
  check(
    /Default palette\s*=\s*contapyme/i.test(palettes),
    'palettes.css: el comentario de cabecera debe decir Default = contapyme',
  );
  
  const cpIdx = palettes.indexOf('[data-palette="contapyme"]');
  const insoftIdx = palettes.indexOf('[data-palette="insoft"]');
  const agrowinIdx = palettes.indexOf('[data-palette="agrowin"]');
  check(cpIdx >= 0 && insoftIdx > cpIdx, 'palettes.css: bloque contapyme debe ir antes que insoft');
  check(agrowinIdx > insoftIdx, 'palettes.css: insoft antes que agrowin');
  
  // ─── 2. color-scheme no en :root ────────────────────────────────────────────
  
  // Bloque `:root { … }` no debe declarar color-scheme.
  const rootThemeBlock = isBase.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  check(
    !/color-scheme\s*:/.test(rootThemeBlock),
    'is-base.css: el bloque :root NO debe tener color-scheme',
  );
  check(
    /\[data-theme=["']dark["']\][\s\S]*?\{[^}]*color-scheme\s*:\s*dark/.test(isBase),
    'is-base.css: color-scheme: dark debe vivir en [data-theme=dark]',
  );
  check(
    /\[data-theme=["']light["']\][\s\S]*?\{[^}]*color-scheme\s*:\s*light/.test(isBase),
    'is-base.css: color-scheme: light debe vivir en [data-theme=light]',
  );
  
  // ─── 3. Sin pintar canvas en base/palettes ──────────────────────────────────
  
  const paintsCanvas = (css) => (
    /(?:^|[,}\s])(?:html|body)\s*(?:,\s*(?:html|body)\s*)*\{[^}]*\bbackground\s*:/m.test(css)
    || /(?:^|[,}\s])(?:html|body)\s*(?:,\s*(?:html|body)\s*)*\{[^}]*\bbackground-color\s*:/m.test(css)
  );
  check(!paintsCanvas(isBase), 'is-base.css: no debe pintar html/body { background }');
  check(!paintsCanvas(palettes), 'palettes.css: no debe pintar html/body { background }');
  
  // ─── 4. demo-code.js: contexto en snippets + reactividad ────────────────────
  
  check(/withSnippetContext/.test(demoCode), 'demo-code.js: falta withSnippetContext');
  check(/stampContext/.test(demoCode), 'demo-code.js: falta stampContext');
  check(
    /setAttribute\(\s*['"]data-theme['"]/.test(demoCode)
      && /setAttribute\(\s*['"]data-palette['"]/.test(demoCode),
    'demo-code.js: stampContext debe setear data-theme y data-palette',
  );
  check(
    !/classList\.add\([^)]*theme-light|classList\.add\([^)]*theme-dark/.test(demoCode)
      && !/\.theme-light|\.theme-dark/.test(demoCode),
    'demo-code.js: no debe sellar clases .theme-* (contrato data-theme)',
  );
  check(
    /iswc-theme-change/.test(demoCode) && /iswc-palette-change/.test(demoCode),
    'demo-code.js: debe escuchar iswc-theme-change e iswc-palette-change',
  );
  check(
    /MutationObserver/.test(demoCode)
      && /attributeFilter:\s*\[[^\]]*data-theme[^\]]*data-palette/.test(demoCode),
    'demo-code.js: MutationObserver en <html> data-theme/data-palette',
  );
  check(
    /currentPalette[\s\S]*contapyme|dataset\.palette\s*\|\|\s*['"]contapyme['"]/.test(demoCode),
    'demo-code.js: fallback de paleta en snippet = contapyme',
  );
  check(
    !/buildDemoSnippetStyles/.test(demoCode),
    'demo-code.js: NO debe inyectar CSS de layout en snippets pegables (Phase E: minimal)',
  );
  
  // ─── report ─────────────────────────────────────────────────────────────────
  
  if (failures.length) {
    console.log('FAIL palette-and-snippet-contract:');
    for (const f of failures) console.log(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log(
    'palette-and-snippet-contract.test.ts: PASS — default contapyme, sin color-scheme en :root, canvas libre, snippets con contexto reactivo',
  );
  return;
});

export default lista();
