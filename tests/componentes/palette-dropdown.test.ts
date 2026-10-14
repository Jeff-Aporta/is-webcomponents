// El dropdown de paleta del shell es <iswc-palette-selector scope="root">.
// El look (pastilla + menu) vive en palette-selector.css:
//   opacidad en los items no activos, check solo en el activo,
//   swatch con --iswc-color-brand.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const html = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.css'), 'utf8');
const src = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.ts'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(/<iswc-palette-selector\b[^>]*\bid="brandPalette"[^>]*\bscope="root"/.test(html),
  'index.html: falta <iswc-palette-selector id="brandPalette" scope="root">');
check(/<iswc-theme-toggle\b[^>]*\bid="themeToggle"[^>]*\bscope="root"/.test(html),
  'index.html: falta <iswc-theme-toggle id="themeToggle" scope="root">');

check(/scope === 'closest'/.test(src) || /mode === 'closest'/.test(src),
  'palette-selector: scope=closest debe buscar el ancestro');
check(/document\.documentElement/.test(src),
  'palette-selector: scope=root debe escribir documentElement');
check(/findPaletteContainer/.test(src),
  'palette-selector: closest no debe usar el propio host como target');

check(/\.menu \[role="option"\]\s*\{[^}]*opacity:\s*0\.55/.test(css),
  'CSS: items no seleccionados con opacity 0.55');
check(/\.menu__check\s*\{[^}]*visibility:\s*hidden/.test(css),
  'CSS: .menu__check oculto por defecto');
check(/\[aria-selected="true"\] \.menu__check\s*\{[^}]*visibility:\s*visible/.test(css),
  'CSS: check visible solo con aria-selected=true');
check(/\.menu__swatch\s*\{[^}]*background:\s*var\(--iswc-color-brand\)/.test(css),
  'CSS: swatch usa --iswc-color-brand');
check(/background:\s*var\(--iswc-logo-bg/.test(css),
  'CSS: el trigger usa --iswc-logo-bg (pastilla del shell)');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('palette-dropdown.test.ts: PASS');
process.exit(0);
