// tests/sibling-css-href.test.ts
//
// adoptCss / siblingCssHref deben mapear el hermano CSS conservando `.min`:
//   foo.js → foo.css
//   foo.min.js → foo.min.css
//
// Paso de verdad: diagram-lightbox hardcodeaba `./diagram-lightbox.css`, así
// que al cargar diagram-lightbox.min.mjs pedía un .css sin .min (404 en CDN).
//
// Uso:  node tests/sibling-css-href.test.ts

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

test('componentes/sibling-css-href', async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = dirname(dirname(here));
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };
  
  // El core es TypeScript: un `.mjs` no lo importa directo. Se prueba el
  // artefacto publicado, que ademas es lo que consumen los componentes.
  // Desde F9a siblingCssHref vive con el molde (core/iswc-element), que declara `extends HTMLElement`
  // al cargar: en Deno (sin DOM) basta una clase vacía para evaluar el módulo.
  (globalThis as { HTMLElement?: unknown }).HTMLElement ??= class {};
  const { siblingCssHref } = await import(
    pathToFileURL(join(root, 'dist/cdn/core/iswc-element.min.mjs')).href
  );
  
  check(
    siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.js')
      === 'http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.css',
    'foo.js debe mapear a foo.css',
  );
  check(
    siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.min.mjs')
      === 'http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.min.css',
    'foo.min.js debe mapear a foo.min.css (no a foo.css)',
  );
  check(
    siblingCssHref('http://127.0.0.1:8391/dist/cdn/data-viz/chart.min.mjs')
      === 'http://127.0.0.1:8391/dist/cdn/data-viz/chart.min.css',
    'chart.min.mjs → chart.min.css',
  );
  check(
    siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/sequence-diagram.min.mjs')
      === 'http://127.0.0.1:8391/dist/cdn/diagrams/sequence-diagram.min.css',
    'sequence-diagram.min.mjs → sequence-diagram.min.css',
  );
  
  const src = readFileSync(
    join(root, 'src/components/diagrams/diagram-lightbox.ts'),
    'utf8',
  );
  check(
    !/new URL\(\s*['"]\.\/diagram-lightbox\.css['"]/.test(src),
    'diagram-lightbox.ts no debe hardcodear ./diagram-lightbox.css',
  );
  // Molde IswcElement: la hoja viaja dentro del módulo (`import css from 'iswc:css'`), sin pedir ningún .css.
  check(
    /static (?:override )?css = css;/.test(src) && /import css from 'iswc:css';/.test(src) && !/siblingCssHref\s*\(/.test(src),
    'diagram-lightbox.ts debe llevar su CSS por iswc:css (static css), no por siblingCssHref',
  );
  
  const distJs = join(root, 'dist/cdn/diagrams/diagram-lightbox.min.mjs');
  if (existsSync(distJs)) {
    const bundled = readFileSync(distJs, 'utf8');
    check(
      !/new URL\(\s*["']\.\/diagram-lightbox\.css["']/.test(bundled),
      'dist diagram-lightbox.min.mjs no debe pedir ./diagram-lightbox.css sin .min',
    );
    check(
      existsSync(join(root, 'dist/cdn/diagrams/diagram-lightbox.min.css')),
      'debe existir dist/cdn/diagrams/diagram-lightbox.min.css',
    );
  }
  
  if (failures.length) {
    console.error('sibling-css-href.test.ts: FAIL');
    for (const f of failures) console.error('  -', f);
    { const salida = 1; if (salida) throw new Error(`salida ${salida}`); return; }
  }
  
  console.log('sibling-css-href.test.ts: PASS — .min.js ↔ .min.css y sin hardcode en diagram-lightbox');
  return;
});

export default lista();
