// tests/no-iconify.test.mjs
//
// El proyecto NO depende del web component `<iconify-icon>` ni de scripts o
// endpoints de Iconify en runtime. La unica API de iconos es <is-icon>, que
// resuelve el SVG desde el sistema propio (assets/icons -> dist/cdn/assets).
//
// Falla si aparece:
//   - el tag <iconify-icon> (markup, template o selector CSS)
//   - el script code.iconify.design
//   - una llamada a api.iconify.design en codigo ejecutable
//     (los .md y los comentarios que explican la migracion sí pueden citarla)
//
// scripts/download-icons.mjs SÍ usa la API: es la herramienta offline que
// puebla assets/icons/, no corre en el navegador.
//
// Uso:  node tests/no-iconify.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const SCAN_DIRS = ['components', 'scripts', 'previews', 'styles'];
const SCAN_EXT = /\.(js|mjs|css|html)$/;
// Herramienta offline: descarga los SVG desde la API para poblar assets/.
// Mismo caso que download-icons.mjs: herramientas offline de mantenimiento del
// catalogo, se corren a mano y dejan el resultado en assets/. Nada de esto se
// ejecuta en runtime ni entra al bundle.
// Herramientas de build/CLI: se ejecutan a mano en Node para llenar
// `assets/icons`, nunca en el navegador. La regla es sobre RUNTIME.
const ALLOWED_API_FILES = new Set([
  'scripts/download-iconify.mjs',
  'scripts/download-icons.mjs',
  'scripts/fix-icon-viewbox.mjs',
  'scripts/sync-icon-collections.mjs',
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(name)) out.push(full);
  }
  return out;
};

const files = [];
for (const d of SCAN_DIRS) {
  try { walk(join(root, d), files); } catch { /* carpeta ausente */ }
}
files.push(join(root, 'index.html'));

/** Quita comentarios de bloque, de linea y JSDoc para no leer prosa. */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/<!--[\s\S]*?-->/g, '');

const failures = [];

for (const file of files) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const rel = relative(root, file).replaceAll('\\', '/');
  const code = stripComments(src);

  if (/<iconify-icon|iconify-icon['"\s.,)>]|customElements\.get\(\s*['"]iconify-icon/.test(code)) {
    failures.push(`${rel}: usa el web component <iconify-icon> — el kit usa <is-icon>`);
  }
  if (/code\.iconify\.design/.test(code)) {
    failures.push(`${rel}: carga el script de iconify desde CDN — eliminado del proyecto`);
  }
  if (/api\.iconify\.design/.test(code) && !ALLOWED_API_FILES.has(rel)) {
    failures.push(`${rel}: pega a api.iconify.design en runtime — usa el sistema propio de iconos`);
  }
}

// El loader debe seguir exponiendo la resolucion propia.
const loader = readFileSync(join(root, 'src/components/_shared/icon-loader.js'), 'utf8');
if (!/export async function resolveIconRaw/.test(loader)) {
  failures.push('icon-loader.js: falta resolveIconRaw (is-icon depende de él)');
}
if (/export function ensureIconify/.test(loader)) {
  failures.push('icon-loader.js: ensureIconify debe estar eliminado (cargaba el CDN de iconify)');
}


// Nomenclatura: los modulos y exports ya no se llaman "iconify". Se permite la
// palabra solo en prosa (comentarios/md) y en el alias legacy del token
// `{{iconify:}}`, que sigue aceptandose por compatibilidad de specs.
const BANNED_IDENTIFIERS = [
  'iconify-loader.js',
  'tk-iconify-inline.js',
  'iconifyApiPath',
  'iconifyInlineHtmlWeb',
  'replaceIconifyTokens',
  'hasIconifyJsonSugar',
  'tk-inline-iconify',
  'ensureIconify',
];
for (const file of files) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const rel = relative(root, file).split(sep).join('/');
  if (rel === 'tests/no-iconify.test.mjs') continue;
  for (const id of BANNED_IDENTIFIERS) {
    if (src.includes(id)) {
      failures.push(`${rel}: referencia el identificador obsoleto "${id}"`);
    }
  }
}

if (failures.length) {
  console.log('FAIL:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log(`no-iconify.test.mjs: PASS — ${files.length} archivos sin <iconify-icon> ni CDN de Iconify en runtime`);
process.exit(0);
