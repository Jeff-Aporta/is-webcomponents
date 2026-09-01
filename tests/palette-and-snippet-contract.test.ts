// tests/palette-and-snippet-contract.test.ts
//
// Contrato aprendido (paleta default ContaPyme + snippets con contexto +
// canvas de la app, no del kit):
//
//   1. Default palette = contapyme (CSS :root, HTML, fallbacks JS).
//   2. is-base NO pone color-scheme en :root (solo .theme-dark/.theme-light).
//   3. is-base / palettes NO pintan html|body { background }.
//   4. demo-code.js sella data-theme + data-palette + .theme-* y reacciona
//      a cambios de contexto.
//
// Uso:  node tests/palette-and-snippet-contract.test.ts

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

const isBase = await readFile(join(root, 'src', 'styles', 'is-base.css'), 'utf8');
const palettes = await readFile(join(root, 'src', 'styles', 'palettes.css'), 'utf8');
const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
const previewBoot = await readFile(join(root, 'scripts', 'preview-boot.js'), 'utf8');
const previewChrome = await readFile(join(root, 'scripts', 'preview-chrome.js'), 'utf8');
const demoCode = await readFile(join(root, 'scripts', 'demo-code.js'), 'utf8');
const chartPalette = await readFile(join(root, 'src', 'components', '_shared', 'chart-palette.ts'), 'utf8');
const paletteSelector = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.ts'), 'utf8');

// ─── 1. Default = contapyme ─────────────────────────────────────────────────

check(
  /<html\b[^>]*\bdata-palette="contapyme"/.test(indexHtml),
  'index.html: <html> debe abrir con data-palette="contapyme"',
);

check(
  /aria-selected="true"[^>]*data-palette="contapyme"|data-palette="contapyme"[^>]*aria-selected="true"/.test(indexHtml)
    || /data-palette="contapyme"[^>]*>[\s\S]*?aria-selected="true"/.test(
      indexHtml.match(/<ul[^>]*id="brandMenu"[\s\S]*?<\/ul>/)?.[0] || '',
    ),
  'index.html: el item ContaPyme del brand-menu debe ser el seleccionado por defecto',
);

const brandMenu = indexHtml.match(/<ul[^>]*id="brandMenu"[\s\S]*?<\/ul>/)?.[0] || '';
const selectedPalette = brandMenu.match(/<li[^>]*aria-selected="true"[^>]*data-palette="([^"]+)"|<li[^>]*data-palette="([^"]+)"[^>]*aria-selected="true"/);
const sel = selectedPalette?.[1] || selectedPalette?.[2];
check(sel === 'contapyme', `index.html brand-menu: seleccionado="${sel || '?'}", esperaba contapyme`);

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

check(
  /CATEGORICAL\[attr\]\s*\?\s*attr\s*:\s*['"]contapyme['"]/.test(chartPalette),
  'chart-palette.ts: resolvePaletteKey fallback = contapyme',
);

const defaultPalettesBlock = paletteSelector.match(/const DEFAULT_PALETTES\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const firstValue = defaultPalettesBlock.match(/value:\s*['"]([^'"]+)['"]/)?.[1];
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

// Bloque `:root, .theme-dark { … }` no debe declarar color-scheme.
const rootThemeBlock = isBase.match(/:root\s*,\s*\.theme-dark\s*\{([\s\S]*?)\n\}/)?.[1]
  || isBase.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1]
  || '';
check(
  !/color-scheme\s*:/.test(rootThemeBlock),
  'is-base.css: el bloque :root (.theme-dark compartido) NO debe tener color-scheme',
);
check(
  /\.theme-dark\s*\{[^}]*color-scheme\s*:\s*dark/.test(isBase),
  'is-base.css: color-scheme: dark debe vivir en .theme-dark',
);
check(
  /\.theme-light\s*\{[^}]*color-scheme\s*:\s*light/.test(isBase),
  'is-base.css: color-scheme: light debe vivir en .theme-light',
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
  /classList\.add\([^)]*theme-light|classList\.add\([^)]*theme-dark/.test(demoCode)
    || /\.theme-light|\.theme-dark/.test(demoCode),
  'demo-code.js: debe sellar clase .theme-dark / .theme-light en la raíz',
);
check(
  /is-theme-change/.test(demoCode) && /is-palette-change/.test(demoCode),
  'demo-code.js: debe escuchar is-theme-change e is-palette-change',
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
  /buildDemoSnippetStyles/.test(demoCode),
  'demo-code.js: debe inyectar CSS de layout en snippets pegables',
);

// ─── report ─────────────────────────────────────────────────────────────────

if (failures.length) {
  console.log('FAIL palette-and-snippet-contract:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(
  'palette-and-snippet-contract.test.ts: PASS — default contapyme, sin color-scheme en :root, canvas libre, snippets con contexto reactivo',
);
process.exit(0);
