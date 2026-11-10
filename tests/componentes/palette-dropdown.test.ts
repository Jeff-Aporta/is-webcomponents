// @contexto INDICE.md · tests/componentes/README.md
// El dropdown de paleta del shell es <iswc-palette-selector scope="root">.
// El look vive en palette-selector.css: panel con buscador + Panda, opciones
// agrupadas con 5 muestras (bg, papel, main, contraste, texto), check solo en
// el activo y todas las medidas en em.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCssCompilado } from './_css-compilado.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/palette-dropdown', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  
  // index.html solo monta <iswc-doc-demo>: la barra del shell (paleta + tema)
  // vive en la plantilla de doc-demo.ts.
  const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
  const html = await readFile(join(root, 'src', 'components', 'layout', 'doc-demo.ts'), 'utf8');
  // CSS compilado normalizado (Sass emite `[role=option]` sin comillas).
  const css = leerCssCompilado(root, 'src/components/feedback/palette-selector.css');
  const src = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.ts'), 'utf8');
  
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };
  
  check(/<iswc-palette-selector\b[^>]*\bid="brandPalette"[^>]*\bscope="root"/.test(html),
    'doc-demo.ts: falta <iswc-palette-selector id="brandPalette" scope="root">');
  check(/<iswc-doc-demo\b/.test(indexHtml), 'index.html: el shell debe montar <iswc-doc-demo>');
  check(/<iswc-theme-toggle\b[^>]*\bid="themeToggle"[^>]*\bscope="root"/.test(html),
    'doc-demo.ts: falta <iswc-theme-toggle id="themeToggle" scope="root">');
  
  check(/scope === 'closest'/.test(src) || /mode === 'closest'/.test(src),
    'palette-selector: scope=closest debe buscar el ancestro');
  check(/document\.documentElement/.test(src),
    'palette-selector: scope=root debe escribir documentElement');
  check(/findPaletteContainer/.test(src),
    'palette-selector: closest no debe usar el propio host como target');
  
  check(/\.option__check\s*\{[^}]*visibility:\s*hidden/.test(css),
    'CSS: .option__check oculto por defecto');
  check(/\[aria-selected="true"\] \.option__check\s*\{[^}]*visibility:\s*visible/.test(css),
    'CSS: check visible solo con aria-selected=true');
  for (const k of ['bg', 'paper', 'main', 'contrast', 'font']) {
    check(css.includes(`.sw--${k} {`) && new RegExp(`sw--${k} [{][^}]*background:`).test(css), `CSS: muestra .sw--${k}`);
  }
  check(/\[data-set="sd"\]/.test(css), 'CSS: las muestras cambian al juego oscuro (data-set="sd")');
  check(/role="switch"/.test(src) && /iswc-panda-change/.test(src), 'palette-selector: interruptor Panda (role=switch + iswc-panda-change)');
  check(/type="search"/.test(src), 'palette-selector: buscador');
  check(/PALETTE_FAMILIES/.test(src) && /role', 'group'/.test(src), 'palette-selector: grupos por familia de tono');
  // Escala: todo en em (solo 1px para hairlines), sin rem ni px.
  const scss = await readFile(join(root, 'src', 'components', 'feedback', 'palette-selector.scss'), 'utf8');
  const medidas = scss.replace(/\/\*[\s\S]*?\*\//g, '').match(/-?\d*\.?\d+(?:px|rem)\b/g) ?? [];
  check(medidas.every((m) => m === '1px'), `palette-selector.scss: medidas en em (encontrado ${medidas.filter((m) => m !== '1px').join(', ')})`);

  if (failures.length) {
    console.log('FAIL:');
    for (const f of failures) console.log(`  - ${f}`);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log('palette-dropdown.test.ts: PASS');
  return;
});

export default lista();
