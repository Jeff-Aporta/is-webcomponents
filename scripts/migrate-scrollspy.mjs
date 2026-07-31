/**
 * scripts/migrate-scrollspy.mjs
 *
 * Reemplaza en cada preview el IntersectionObserver inline por el componente
 * <is-scrollspy>. No toca el resto del <script>.
 *
 * Idempotente: si el archivo ya está migrado (no quedan IntersectionObserver
 * ni <nav> en el sidebar), se salta.
 *
 *  1. Añade el import del componente scrollspy.js si no está.
 *  2. En el <aside class="sidebar">, convierte <nav>...</nav> en
 *     <is-scrollspy target="is-main">...</is-scrollspy>.
 *  3. Borra el primer bloque Active-section-in-sidebar del <script> embebido.
 *
 * Uso:  node scripts/migrate-scrollspy.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const previewsDir = join(root, 'previews');

const SIDEBAR_NAV_OPEN = /(\s*)<nav>(\s*)/g;
const SIDEBAR_NAV_CLOSE = /(\s*)<\/nav>/g;
const SC_SCRIPT_IMPORT = /<script type="module" src="\.\.\/components\/layout\/scrollspy\.js"><\/script>/;

// Bloques de IntersectionObserver a borrar (variantes encontradas en los previews).
// Captura: declaración del observer + bucle observe(). Es tolerante con formato
// (una línea, multilínea, indentado, con nombre distinto al de "obs").
const IO_BLOCKS = [
  // Captura "const <id> = new IntersectionObserver(...);" + observe('section.section') en un solo bloque.
  // Permite cualquier cosa entre `;` y `document.querySelectorAll(...)` (newlines, comentarios).
  /const\s+(\w+)\s*=\s*new\s+IntersectionObserver\([\s\S]*?\)\s*;[\s\S]*?querySelectorAll\('section\.section'\)\.forEach\(\(?s\)?\s*=>\s*\1\.observe\(s\)\)\s*;?[\s\n]*/,
];

async function migrate(file) {
  const src = await readFile(file, 'utf8');
  const hasNav = /<nav>/.test(src);
  const hasImport = SC_SCRIPT_IMPORT.test(src);
  const hasIO = /new\s+IntersectionObserver/.test(src);
  if (hasImport && !hasNav && !hasIO) return { changed: false, reason: 'already' };

  let out = src;

  // 1. Insertar el import si falta.
  if (!SC_SCRIPT_IMPORT.test(out)) {
    out = out.replace(
      /(<script type="module" src="\.\.\/components\/layout\/main\.js"><\/script>)/,
      '$1\n  <script type="module" src="../components/layout/scrollspy.js"></script>',
    );
  }

  // 2. <nav> → <is-scrollspy target="is-main"> … </is-scrollspy>
  if (hasNav) {
    out = out.replace(SIDEBAR_NAV_OPEN, '$1<is-scrollspy target="is-main">$2');
    out = out.replace(SIDEBAR_NAV_CLOSE, '$1</is-scrollspy>');
  }

  // 3. Eliminar el bloque Active section in sidebar.
  let removed = false;
  for (const re of IO_BLOCKS) {
    if (re.test(out)) {
      out = out.replace(re, '');
      removed = true;
      break;
    }
  }

  if (out !== src) {
    await writeFile(file, out, 'utf8');
    return { changed: true, removed };
  }
  return { changed: false, reason: 'no-match' };
}

const entries = await readdir(previewsDir, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile() && e.name.startsWith('is-') && e.name.endsWith('.html'))
  .map((e) => join(previewsDir, e.name));

let nChanged = 0;
let nAlready = 0;
for (const f of files) {
  const r = await migrate(f);
  if (r.changed) {
    nChanged += 1;
    console.log(`  ${f.split(/[\\/]/).pop()}  changed${r.removed ? ' (IO block removed)' : ''}`);
  } else if (r.reason === 'already') {
    nAlready += 1;
  }
}
console.log(`migrated ${nChanged} (${nAlready} already done, ${files.length - nChanged - nAlready} no-match)`);
