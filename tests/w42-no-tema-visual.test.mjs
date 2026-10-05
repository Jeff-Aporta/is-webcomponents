// tests/w42-no-tema-visual.test.mjs — Guardián W42: las secciones "Tema visual"
//                                       y "Demo interactivo" NO deben volver a
//                                       aparecer en el JSON de <iswc-button>.
//
// Por qué este test (no runtime):
//   - El usuario reportó DOS veces (W34 y W42) que esas secciones deben estar
//     fuera del demo porque el sistema de estilos y los estándares ya cubren
//     esa información.
//   - W34 eliminó "Demo interactivo" de la sección Loading.
//   - W42 elimina DEFINITIVAMENTE la sección completa "Tema visual" (id:
//     "theming") del JSON de <iswc-button>.
//   - Como el brief es DRY-run (regresión), este guardián parsea ambos
//     `button.json` (src y dist) y verifica:
//       1. Ninguna sección tiene `id: "theming"` o `title: "Tema visual"`.
//       2. Ninguna sección tiene `title: "Demo interactivo"` o un `id`
//          relacionado (`demo-interactivo`, `interactive-demo`).
//       3. Ningún bloque dentro de una sección `loading` incluye la cadena
//          "Demo interactivo" en su `html`/`title`/`lede` (defensa por si
//          alguien reintroduce el placeholder).
//       4. En TODO `src/components/**/*.json` y `dist/previews/**/*.json`,
//          `tema visual` / `demo interactivo` no aparecen en ningún campo de
//          texto (`title`, `lede`, `html`, `code`, `equivNote`, `equivHtml`).
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `w42-no-tema-visual.test.mjs: PASS — N JSONs escaneados, 0 referencias prohibidas`
//   - Exit 1 si cualquier JSON tiene un `title`/`lede`/`html` que contenga
//     "Tema visual" o "Demo interactivo", o si la sección `theming`
//     reaparece.
//
// Aceptación del brief W42:
//   1. grep -ri "tema visual" src/components/ dist/previews/ → 0 matches.
//   2. grep -ri "demo interactivo" src/components/ dist/previews/ → 0 matches.
//   3. La sección `theming` se borró de button.json (src y dist).
//   4. NO hay una sección `loading` con bloque "Demo interactivo".

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const SRC_ROOT = join(root, 'src', 'components');
const DIST_ROOT = join(root, 'dist', 'previews');

// Cadenas prohibidas (case-insensitive). El brief exige coincidencia textual
// contra los strings del usuario.
const FORBIDDEN_TITLE = [
  'tema visual',
  'demo interactivo',
];
const FORBIDDEN_IDS = new Set([
  'theming',
  'demo-interactivo',
  'interactive-demo',
]);

// Algunos demos podrían, legítimamente, mencionar la palabra "theme" en su
// contenido (p.ej. "<code>is-base.css</code> tokens del tema"). Por eso
// prohibimos específicamente las frases completas, no las palabras sueltas.

async function walk(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.name === '_shared') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, results);
    else if (e.isFile() && e.name.endsWith('.json')) results.push(p);
  }
  return results;
}

function gatherTextFields(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const x of node) gatherTextFields(x, out);
    return out;
  }
  if (typeof node.title === 'string') out.push({ field: 'title', value: node.title });
  if (typeof node.lede === 'string') out.push({ field: 'lede', value: node.lede });
  if (typeof node.html === 'string') out.push({ field: 'html', value: node.html });
  if (typeof node.code === 'string') out.push({ field: 'code', value: node.code });
  if (typeof node.equivNote === 'string') out.push({ field: 'equivNote', value: node.equivNote });
  if (typeof node.equivHtml === 'string') out.push({ field: 'equivHtml', value: node.equivHtml });
  if (typeof node.id === 'string') out.push({ field: 'id', value: node.id });
  for (const v of Object.values(node)) gatherTextFields(v, out);
  return out;
}

const allJson = [
  ...(await walk(SRC_ROOT)),
  ...(await walk(DIST_ROOT)),
];

const violations = [];

for (const path of allJson) {
  let def;
  try {
    def = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    continue;
  }
  if (!def || !Array.isArray(def.sections)) continue;

  for (const [sIdx, section] of def.sections.entries()) {
    if (!section || typeof section !== 'object') continue;

    // 1) id prohibido.
    if (typeof section.id === 'string' && FORBIDDEN_IDS.has(section.id.toLowerCase())) {
      violations.push({
        file: path.replace(root + '\\', ''),
        sectionIdx: sIdx,
        field: 'id',
        value: section.id,
        reason: `id "${section.id}" está prohibido (W42)`,
      });
    }

    // 2) title / lede / html con frase prohibida.
    const textFields = gatherTextFields(section);
    for (const f of textFields) {
      if (f.field === 'id') continue; // ya manejado arriba
      const lower = f.value.toLowerCase();
      for (const phrase of FORBIDDEN_TITLE) {
        if (lower.includes(phrase)) {
          violations.push({
            file: path.replace(root + '\\', ''),
            sectionIdx: sIdx,
            field: f.field,
            value: f.value.slice(0, 120),
            reason: `contiene la frase prohibida "${phrase}"`,
          });
          break;
        }
      }
    }
  }
}

// 3) Aserción específica del brief: `button.json` (src y dist) NO debe tener
//    la sección `theming` ni el título "Tema visual".
const buttonFiles = [
  join(SRC_ROOT, 'actions', 'button.json'),
  join(DIST_ROOT, 'actions', 'button.json'),
];
for (const bf of buttonFiles) {
  let def;
  try {
    def = JSON.parse(await readFile(bf, 'utf8'));
  } catch (err) {
    violations.push({
      file: bf.replace(root + '\\', ''),
      sectionIdx: -1,
      field: '<file>',
      value: '<unreadable>',
      reason: `no se pudo parsear ${bf}: ${err.message}`,
    });
    continue;
  }
  const sections = Array.isArray(def.sections) ? def.sections : [];
  const theming = sections.find((s) => s && s.id === 'theming');
  assert.equal(
    theming,
    undefined,
    `W42: ${bf.replace(root + '\\', '')} aún contiene una sección con id "theming". ` +
      `Bórrala completa (es la sección "Tema visual" que el usuario pidió eliminar).`,
  );
  const temaVisual = sections.find((s) => s && (s.title === 'Tema visual' || s.title === 'tema visual'));
  assert.equal(
    temaVisual,
    undefined,
    `W42: ${bf.replace(root + '\\', '')} aún contiene una sección con title "Tema visual".`,
  );
}

assert.equal(
  violations.length,
  0,
  `W42: hay ${violations.length} referencia(s) prohibida(s) a "Tema visual" o "Demo interactivo":\n` +
    violations.map((v) =>
      `  - [${v.file}] sección #${v.sectionIdx} ${v.field}=${JSON.stringify(v.value)} — ${v.reason}`,
    ).join('\n'),
);

console.log(
  `w42-no-tema-visual.test.mjs: PASS — ${allJson.length} JSONs escaneados, 0 referencias prohibidas a "Tema visual" / "Demo interactivo"`,
);
process.exit(0);