// tests/llm-links.test.mjs
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
// que sí apunta a la carpeta real — igual que hace preview-chrome.js.
//
// Uso:  node tests/llm-links.test.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const failures = [];
const { default: manifest } = await import(new URL('../manifest.js', import.meta.url));

// 1) Cada componente del manifest debe poder resolver el LLM.md de su carpeta.
const checked = new Set();
for (const c of manifest) {
  if (!c.script) continue;
  const folder = c.script.replace(/\/[^/]+\.js$/, '').replace(/^\.\.\/\.\.\//, '');
  const rel = `${folder}/LLM.md`;
  if (checked.has(rel)) continue;
  checked.add(rel);
  if (!existsSync(join(root, rel))) {
    failures.push(`${c.tag} (categoría ${c.category}): falta ${rel} — el botón "LLM · Categoría" daría 404`);
  }
}

// 2) El índice global existe: es el destino del botón "LLM · Todos".
if (!existsSync(join(root, 'LLM.md'))) failures.push('falta LLM.md en la raíz del repo');

// 3) preview-chrome.js no debe volver a componer la ruta desde la categoría ni
//    apuntar a previews/LLM.md.
//    Se analiza el código SIN comentarios: este mismo test documenta la ruta
//    mala en prosa, y si no se quitan los comentarios se delata a sí mismo.
const chrome = readFileSync(join(root, 'scripts', 'preview-chrome.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
if (/['"]\.\.\/LLM\.md['"]/.test(chrome)) {
  failures.push('preview-chrome.js enlaza `../LLM.md` = previews/LLM.md, que no existe');
}
if (/components\/\$\{[^}]*categor/i.test(chrome)) {
  failures.push('preview-chrome.js compone la ruta del LLM.md desde la categoría; debe derivarla del `script` del manifest');
}

// 4) El build tiene que publicar los .md en dist/cdn/llm y forzarles el
//    text/plain: sin el `_headers` el navegador los descarga en vez de
//    mostrarlos, que es justo lo que se quería evitar.
const distLlm = join(root, 'dist', 'cdn', 'llm');
if (existsSync(join(root, 'dist', 'cdn'))) {
  for (const rel of checked) {
    if (!existsSync(join(distLlm, rel))) failures.push(`falta dist/cdn/llm/${rel} — corre \`node scripts/build.mjs\``);
  }
  if (!existsSync(join(distLlm, 'LLM.md'))) failures.push('falta dist/cdn/llm/LLM.md');
  const headersFile = join(root, 'dist', 'cdn', '_headers');
  if (!existsSync(headersFile)) {
    failures.push('falta dist/cdn/_headers — sin él Cloudflare no sirve los .md como texto plano');
  } else {
    const h = readFileSync(headersFile, 'utf8');
    if (!/\/llm\/\*/.test(h) || !/text\/plain/.test(h)) {
      failures.push('dist/cdn/_headers no fuerza text/plain en /llm/*');
    }
  }
}

if (failures.length) {
  console.error(`llm-links.test.mjs: FAIL — ${failures.length} problema(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`llm-links.test.mjs: PASS — ${checked.size} LLM.md de categoría + índice global alcanzables`);
