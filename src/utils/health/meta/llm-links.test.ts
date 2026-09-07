// tests/llm-links.test.ts — versión post-consolidación 2026-09-07.
//
// Antes este test verificaba:
//   1. Cada componente del manifest resolvía `src/components/<cat>/LLM.md`.
//   2. Existía `src/components/LLM.md` (índice global del catálogo).
//   3. Existía `LLM.md` raíz.
//   4. `scripts/cdn-panel.js` no enlazaba `../LLM.md` (previews/LLM.md).
//   5. `dist/cdn/llm/` no existía (sin duplicados).
//   6. La base del panel era raw.githubusercontent.
//   7. <is-cdn-snippet> tenía el contrato de prompt único.
//
// Consolidación 2026-09-07: las LLM.md per-categoría y la raíz se eliminaron.
// El contenido vive ahora en specs/componentes.md (índice global consolidado),
// specs/lessons.md (catálogo de errores), specs/<área>/spec.md.
//
// El guardián verifica que la consolidación esté vigente: existe
// `specs/componentes.md` como índice, y NO quedan LLM.md huérfanos en
// `src/components/<cat>/` (el contrato "cada componente tiene su LLM.md
// de carpeta" se descontinuó).
//
// Los demás puntos (cdn-panel.js, base, snippet) se mantienen como
// guardián de invariantes del panel.

import { existsSync, readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const failures = [];

// 1) El índice global consolidado vive en specs/componentes.md.
const componentes = join(root, 'specs', 'componentes.md');
if (!existsSync(componentes)) {
  failures.push('falta specs/componentes.md (índice global consolidado post-2026-09-07)');
}

// 2) NO deben existir LLM.md per-categoría (consolidación eliminó este contrato).
const categories = readdirSync(join(root, 'src', 'components'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
for (const cat of categories) {
  const llm = join(root, 'src', 'components', cat, 'LLM.md');
  if (existsSync(llm)) {
    failures.push(`src/components/${cat}/LLM.md existe — consolidación 2026-09-07 eliminó este patrón`);
  }
}

// 3) Tampoco debe existir el LLM.md raíz ni el de src/components/.
for (const legacy of [
  join(root, 'LLM.md'),
  join(root, 'src', 'components', 'LLM.md'),
  join(root, 'dist', 'cdn', 'LLM.md'),
]) {
  if (existsSync(legacy)) {
    failures.push(`${legacy.replace(root + '\\', '')} existe — consolidación 2026-09-07 lo eliminó`);
  }
}

// 4) dist/cdn/llm/ no debe existir (sin duplicados de .md).
if (existsSync(join(root, 'dist', 'cdn', 'llm'))) {
  failures.push('dist/cdn/llm/ duplica los .md del repo; se exponen desde el fuente');
}

// 5) cdn-panel.js — dueño del panel «Consumo por CDN».
//    La consolidación 2026-09-07 cambió la ruta del catálogo: ya no es
//    `${LLM_BASE}/${folder}/LLM.md` sino `${LLM_BASE}/specs/componentes.md`.
//    El guardián SOLO verifica que cdn-panel.js NO use rutas rotas conocidas
//    (`../LLM.md` = previews/LLM.md que nunca existió). Las URLs a
//    `/components/LLM.md` que aún existen en código son deuda técnica
//    documentada pero fuera del alcance de este guardián.
const panel = readFileSync(join(root, 'scripts', 'cdn-panel.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
if (/['"]\.\.\/LLM\.md['"]/.test(panel)) {
  failures.push('cdn-panel.js enlaza `../LLM.md` = previews/LLM.md, que no existe');
}

// 6) La base debe ser raw.githubusercontent: es la única que devuelve
//    `text/plain`, o sea la única con la que el navegador MUESTRA el texto al
//    entrar. jsDelivr y GitHub Pages lo mandan como `text/markdown` y el
//    navegador lo descarga. (jsDelivr sí es la base del CÓDIGO, no de los .md.)
const base = panel.match(/const LLM_BASE = '([^']+)'/)?.[1] || '';
if (!base.startsWith('https://raw.githubusercontent.com/')) {
  failures.push(`LLM_BASE es "${base}"; debe ser raw.githubusercontent para que responda text/plain`);
}
if (/pages\.dev/.test(panel)) {
  failures.push('cdn-panel.js aún apunta a Cloudflare Pages; el proyecto se desvinculó');
}

// 7) <is-cdn-snippet> contrato: prompt único (sin lista de filas con Copiar).
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

console.log(`llm-links.test.ts: PASS — consolidación post-2026-09-07 vigente (${categories.length} categorías sin LLM.md huérfanos)`);