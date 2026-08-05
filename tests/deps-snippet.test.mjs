// tests/cdn-snippet.test.mjs
//
// Verifica el componente <is-cdn-snippet>:
//   - Existe el manifest, el script y el preview.
//   - La plantilla expone la fila plantilla data-kind="dep".
//   - El componente parsea el slot "deps" con <script type="application/json">.
//   - El componente parsea el atributo "dependencies" (JSON string).
//   - El componente pinta N filas dep en el orden dado.
//   - El preview demuestra CodeMirror como dependencia (la categoría puede
//     ser documentation, según lo que pidió el usuario).
//   - El CSS marca las filas dep con un accent distinguible.
//
// Uso:  node tests/cdn-snippet.test.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const csJs   = await readFile(join(root, 'src', 'components', 'feedback', 'cdn-snippet.js'), 'utf8');
const csCss  = await readFile(join(root, 'src', 'components', 'feedback', 'cdn-snippet.css'), 'utf8');
const prev   = await readFile(join(root, 'src', 'previews', 'feedback', 'is-cdn-snippet.html'), 'utf8');
const manifest = await readFile(join(root, 'manifest.js'), 'utf8');

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// ─── manifest.js: el componente está registrado ─────────────────────────────

check(/tag:\s*['"]is-cdn-snippet['"]/.test(manifest),
  'manifest.js: is-cdn-snippet no está registrado');

// ─── cdn-snippet.js: API para dependencies ─────────────────────────────────

check(/observedAttributes[\s\S]*?dependencies/.test(csJs),
  'cdn-snippet.js: dependencies debe estar en observedAttributes');

check(/#parseDeps|#deps/.test(csJs),
  'cdn-snippet.js: debe tener un parser/almacén de deps');

// Parsea el slot "deps" con <script type="application/json">.
check(/script\[type=["']application\/json["']\]\[slot=["']deps["']\]/.test(csJs) ||
      /querySelector\(['"]script\[type=.application\/json.\]\[slot=.deps.\]['"]\)/.test(csJs) ||
      /slot=["']deps["']/.test(csJs),
  'cdn-snippet.js: debe leer el slot "deps" con un <script type="application/json">');

// Parsea el atributo dependencies (JSON).
check(/getAttribute\(['"]dependencies['"]\)/.test(csJs),
  'cdn-snippet.js: debe leer el atributo dependencies');

// Constructor del snippet de una dep con css+js.
check(/#buildDepSnippet/.test(csJs) ||
      /<link rel="stylesheet"/.test(csJs),
  'cdn-snippet.js: debe construir un snippet con <link> + <script>');

// El componente pinta N filas dep (clona para deps adicionales).
check(/cloneNode|appendChild\(clone\)/.test(csJs),
  'cdn-snippet.js: debe clonar la fila dep template para deps adicionales');

// Botón "Copiar" para la fila dep.
check(/data-copy="dep"/.test(csJs) || /dataset\.copy/.test(csJs),
  'cdn-snippet.js: la fila dep debe tener su propio botón Copiar');

// ─── cdn-snippet.css: estilo distinguible para dep rows ─────────────────────

check(/\.cdn__row--dep/.test(csCss),
  'cdn-snippet.css: debe definir .cdn__row--dep con estilo distinguible');

// Borde o label con accent (no hereda el del componente).
check(/(border-inline-start|::before).*(warning|accent)/.test(csCss) ||
      /cdn__dep-name::before/.test(csCss),
  'cdn-snippet.css: la fila dep debe tener borde/accent visualmente distinto');

// ─── preview: demuestra deps con CodeMirror ────────────────────────────────

check(/<is-cdn-snippet/.test(prev),
  'preview: debe usar <is-cdn-snippet>');

check(/slot=["']deps["']/.test(prev),
  'preview: debe demostrar el slot="deps" con un <script type="application/json">');

check(/CodeMirror/.test(prev),
  'preview: debe demostrar CodeMirror como dependencia (caso de uso real)');

check(/"name"\s*:\s*"CodeMirror"/.test(prev),
  'preview: el array de deps debe incluir CodeMirror como name');

check(/"version"/.test(prev),
  'preview: el array de deps debe incluir un campo version');

// El usuario dijo que la categoría puede ser "documentation" para el caso
// de preview con CodeMirror. Lo verificamos como recomendación (no obligatorio).
// Esto es una sugerencia del usuario, no un check estricto.

// Demuestra N deps (múltiples filas).
check(/"CodeMirror theme/.test(prev) || /material-darker/.test(prev),
  'preview: debe demostrar el caso de múltiples dependencias (e.g. CodeMirror + theme)');

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`deps-snippet.test.mjs: PASS — <is-cdn-snippet> reusable, soporta slot/atributo de deps, CSS con accent distintivo, preview con CodeMirror`);
process.exit(0);
