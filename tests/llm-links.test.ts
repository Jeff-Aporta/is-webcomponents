// tests/llm-links.test.ts
//
// El bloque "Documentación para LLM" de cada preview enlaza al LLM.md de la
// categoría y al índice global. Esos enlaces deben devolver el .md en crudo:
// un agente hace fetch y lee el texto plano.
//
// Paso de verdad: el enlace apuntaba a `../LLM.md` desde
// `previews/<cat>/is-x.html`, o sea `previews/LLM.md`, que NUNCA existió. La
// página salía en blanco y nadie se enteraba porque un <a> roto no avisa.
//
// Y no vale componer `components/<categoria>/LLM.md`: la categoría LÓGICA del
// manifest no es la carpeta. Los tags de `data-viz` viven repartidos entre
// `components/charts/` y `components/data-viz/`. La ruta se deriva del `script`,
// que sí apunta a la carpeta real — igual que hace cdn-panel.js.
//
// Uso:  node tests/llm-links.test.ts

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const failures = [];
const { default: manifest } = await import(new URL('../src/manifest.js', import.meta.url));

// 1) Cada componente del manifest debe poder resolver el LLM.md de su carpeta.
const checked = new Set();
for (const c of manifest) {
  if (!c.script) continue;
  const folder = c.script.replace(/\/[^/]+\.js$/, '').replace(/^\.\.\/\.\.\//, '');
  const rel = `${folder}/LLM.md`;
  if (checked.has(rel)) continue;
  checked.add(rel);
  // script del manifest = ../../components/... → disco en src/components/...
  if (!existsSync(join(root, 'src', rel))) {
    failures.push(`${c.tag} (categoría ${c.category}): falta src/${rel} — el botón "LLM · Categoría" daría 404`);
  }
}

// 2) Índice global del catálogo (CDN docs) + convenciones del repo.
if (!existsSync(join(root, 'src', 'components', 'LLM.md'))) {
  failures.push('falta src/components/LLM.md (índice global del catálogo)');
}
if (!existsSync(join(root, 'LLM.md'))) failures.push('falta LLM.md en la raíz del repo');

// 3) cdn-panel.js —dueño del panel «Consumo por CDN»— no debe volver a componer
//    la ruta desde la categoría ni apuntar a previews/LLM.md.
//    Se analiza el código SIN comentarios: este mismo test documenta la ruta
//    mala en prosa, y si no se quitan los comentarios se delata a sí mismo.
const panel = readFileSync(join(root, 'scripts', 'cdn-panel.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
if (/['"]\.\.\/LLM\.md['"]/.test(panel)) {
  failures.push('cdn-panel.js enlaza `../LLM.md` = previews/LLM.md, que no existe');
}
if (/components\/\$\{[^}]*categor/i.test(panel)) {
  failures.push('cdn-panel.js compone la ruta del LLM.md desde la categoría; debe derivarla del `script` del manifest');
}

// 4) Los .md se exponen desde el FUENTE, sin copia en dist: nada de duplicar.
if (existsSync(join(root, 'dist', 'cdn', 'llm'))) {
  failures.push('dist/cdn/llm/ duplica los .md del repo; se exponen desde el fuente');
}

// 5) La base debe ser raw.githubusercontent: es la única que devuelve
//    `text/plain`, o sea la única con la que el navegador MUESTRA el texto al
//    entrar. jsDelivr y GitHub Pages lo mandan como `text/markdown` y el
//    navegador lo descarga. (jsDelivr sí es la base del CÓDIGO, no de los .md.)
const base = panel.match(/const LLM_BASE = '([^']+)'/)?.[1] || '';
if (!base.startsWith('https://raw.githubusercontent.com/')) {
  failures.push(`LLM_BASE es "${base}"; debe ser raw.githubusercontent para que responda text/plain`);
}
if (!base.endsWith('/src')) {
  failures.push(`LLM_BASE es "${base}"; tras el move a src/ debe terminar en /src`);
}
if (/pages\.dev/.test(panel)) {
  failures.push('cdn-panel.js aún apunta a Cloudflare Pages; el proyecto se desvinculó');
}

// 6) Los enlaces van en `config` → se fusionan en el prompt único de
//    <is-cdn-snippet> (sin lista de filas con Copiar por enlace).
if (!/setAttribute\('config'/.test(panel)) {
  failures.push('cdn-panel.js no pasa los enlaces al <is-cdn-snippet> por `config`');
}
const snippet = readFileSync(join(root, 'src', 'components', 'feedback', 'cdn-snippet.ts'), 'utf8');
if (!/buildLlmPrompt/.test(snippet)) {
  failures.push('cdn-snippet.ts debe construir un prompt único con buildLlmPrompt');
}
if (/cdn__docs-list|#renderDocs/.test(snippet)) {
  failures.push('cdn-snippet.ts no debe pintar lista de referencias con Copiar por fila');
}
if (!/data-copy="llm-prompt"/.test(snippet)) {
  failures.push('cdn-snippet.ts debe tener un único botón Copiar del prompt LLM');
}

if (failures.length) {
  console.error(`llm-links.test.ts: FAIL — ${failures.length} problema(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`llm-links.test.ts: PASS — ${checked.size} LLM.md de categoría + índice global alcanzables`);
