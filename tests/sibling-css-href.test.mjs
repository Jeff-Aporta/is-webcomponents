// tests/sibling-css-href.test.mjs
//
// adoptCss / siblingCssHref deben mapear el hermano CSS conservando `.min`:
//   foo.js → foo.css
//   foo.min.js → foo.min.css
//
// Paso de verdad: diagram-lightbox hardcodeaba `./diagram-lightbox.css`, así
// que al cargar diagram-lightbox.min.js pedía un .css sin .min (404 en CDN).
//
// Uso:  node tests/sibling-css-href.test.mjs

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

const { siblingCssHref } = await import(
  pathToFileURL(join(root, 'src/components/_shared/adopt-css.js')).href
);

check(
  siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.js')
    === 'http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.css',
  'foo.js debe mapear a foo.css',
);
check(
  siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.min.js')
    === 'http://127.0.0.1:8391/dist/cdn/diagrams/diagram-lightbox.min.css',
  'foo.min.js debe mapear a foo.min.css (no a foo.css)',
);
check(
  siblingCssHref('http://127.0.0.1:8391/dist/cdn/data-viz/chart.min.js')
    === 'http://127.0.0.1:8391/dist/cdn/data-viz/chart.min.css',
  'chart.min.js → chart.min.css',
);
check(
  siblingCssHref('http://127.0.0.1:8391/dist/cdn/diagrams/sequence-diagram.min.js')
    === 'http://127.0.0.1:8391/dist/cdn/diagrams/sequence-diagram.min.css',
  'sequence-diagram.min.js → sequence-diagram.min.css',
);

const src = readFileSync(
  join(root, 'src/components/diagrams/diagram-lightbox.js'),
  'utf8',
);
check(
  !/new URL\(\s*['"]\.\/diagram-lightbox\.css['"]/.test(src),
  'diagram-lightbox.js no debe hardcodear ./diagram-lightbox.css',
);
check(
  /siblingCssHref\s*\(\s*import\.meta\.url\s*\)/.test(src),
  'diagram-lightbox.js debe usar siblingCssHref(import.meta.url)',
);

const distJs = join(root, 'dist/cdn/diagrams/diagram-lightbox.min.js');
if (existsSync(distJs)) {
  const bundled = readFileSync(distJs, 'utf8');
  check(
    !/new URL\(\s*["']\.\/diagram-lightbox\.css["']/.test(bundled),
    'dist diagram-lightbox.min.js no debe pedir ./diagram-lightbox.css sin .min',
  );
  check(
    existsSync(join(root, 'dist/cdn/diagrams/diagram-lightbox.min.css')),
    'debe existir dist/cdn/diagrams/diagram-lightbox.min.css',
  );
}

if (failures.length) {
  console.error('sibling-css-href.test.mjs: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log('sibling-css-href.test.mjs: PASS — .min.js ↔ .min.css y sin hardcode en diagram-lightbox');
process.exit(0);
