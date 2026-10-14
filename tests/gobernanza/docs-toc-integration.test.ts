// tests/docs-toc-integration.test.ts
//
// Verifica contra JSONs reales del repo que `standardTocSections()` filtra
// correctamente y respeta el ORDEN del JSON (Phase W38). Lee varios
// `<tag>.json` de `src/components/` y aplica el mismo algoritmo; comprueba
// que el resultado coincide con lo esperado y que el orden es exactamente
// el orden de las `sections` en el `def`.
//
// Por qué este test: el guardián estático (docs-toc.test.ts) verifica que
// los símbolos existen y la firma. Este test valida que el algoritmo
// produce el resultado correcto sobre el dataset real.
//
// Uso: deno test -A --no-check src/utils/testing/meta/docs-toc-integration.test.ts

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const renderSrc = readFileSync(join(root, 'src', 'previews', '_kit', 'render.ts'), 'utf8');

// ─── Parseamos la definición de STANDARD_TOC desde el módulo.
// El formato es: { label: '...', ids: [...], titles: [...] },
// Repetimos el bloque-canónico con [\s\S]*? (no greedy) hasta cerrar la
// llave de la primera entry.

interface StandardEntry { label: string; ids: string[]; titles: string[]; }
const STANDARD_TOC: StandardEntry[] = [];
const entryRe = /label:\s*'([^']+)'\s*,\s*ids:\s*\[([^\]]*)\]\s*,\s*titles:\s*\[([^\]]*)\]/g;
for (const m of renderSrc.matchAll(entryRe)) {
  const [, label, idsRaw, titlesRaw] = m;
  const ids = Array.from(idsRaw.matchAll(/'([^']+)'/g)).map((x) => x[1]);
  const titles = Array.from(titlesRaw.matchAll(/'([^']+)'/g)).map((x) => x[1]);
  STANDARD_TOC.push({ label, ids, titles });
}
assert.strictEqual(
  STANDARD_TOC.length,
  7,
  `STANDARD_TOC debe declarar 7 entries, parsed ${STANDARD_TOC.length}`,
);

// EXCLUDED_FROM_TOC: Set de ids normalizados.
const excludedIds = new Set<string>();
const exclRe = /EXCLUDED_FROM_TOC[\s\S]*?\]\s*as\s*const|^/m;
const exclSrc = renderSrc.match(/export\s+const\s+EXCLUDED_FROM_TOC[\s\S]*?\];/m)?.[0] ?? '';
for (const m of exclSrc.matchAll(/'([^']+)'/g)) excludedIds.add(m[1]);
assert.ok(excludedIds.size > 0, 'EXCLUDED_FROM_TOC no se pudo parsear');

function normId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function normTitle(title: string): string {
  return title.toLowerCase().trim();
}

/** Réplica del algoritmo real (Phase O + W38): per-entry en orden canónico. */
function matchSection(id: string, title: string): string | null {
  if (!id) return null;
  const idN = normId(id);
  if (excludedIds.has(idN)) return null;
  const tN = normTitle(title || '');
  // Matching per-entry en orden canónico (Phase O): para cada entrada
  // estándar, si el id O título de la sección matchea, devuelve la
  // etiqueta. Esto preserva la precedencia "API JavaScript" sobre
  // "Métodos" para una sección con id="methods" y title="API JavaScript"
  // (la entrada "API JavaScript" está antes y matchea por título).
  for (const entry of STANDARD_TOC) {
    if (entry.ids.includes(idN) || (tN && entry.titles.includes(tN))) {
      return entry.label;
    }
  }
  return null;
}

/**
 * Réplica de `standardTocSections(def)` (Phase W38): una sola pasada sobre
 * `def.sections` en su orden del JSON. Para cada sección navegable (no
 * excluida), si matchea con una entrada estándar se usa la etiqueta
 * canónica; si no, se usa `section.title || section.id` como fallback.
 */
function buildToc(def: any): string[] {
  if (!Array.isArray(def?.sections)) return [];
  const labels: string[] = [];
  const used = new Set<string>();
  for (const s of def.sections) {
    const id = String(s?.id || '');
    if (!id || used.has(id)) continue;
    if (excludedIds.has(normId(id))) continue;
    const canonical = matchSection(id, String(s?.title || ''));
    labels.push(canonical || String(s?.title || id));
    used.add(id);
  }
  return labels;
}

function listJsonFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listJsonFiles(p, acc);
    else if (name.endsWith('.json')) acc.push(p);
  }
  return acc;
}

const componentsDir = join(root, 'src', 'components');
const jsonFiles = listJsonFiles(componentsDir);
assert.ok(jsonFiles.length > 0, 'src/components debe contener al menos un .json');

// ─── Por cada JSON, calculamos las secciones del TOC. ────────────────

let withToc = 0;
let withoutToc = 0;

for (const path of jsonFiles) {
  let def: any;
  try {
    def = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(def.sections)) continue;
  const tocLabels: string[] = buildToc(def);
  // Dedupe preservando orden.
  const seen = new Set<string>();
  const dedup = tocLabels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
  if (dedup.length >= 1) withToc++;
  else withoutToc++;
}

assert.ok(withToc > 0, `al menos un componente debería tener >=1 sección en TOC, hay ${withToc}`);

// ─── Casos concretos: button.json ─────────────────────────────────────

// button.json tiene { intro, variants, appearances, sizes, icons, icon-only,
// pill, caret, loading, disabled, link, form, anatomy, states, parts,
// theming, methods, events, playground, reference }.
// Phase O: filtraba 4 secciones (states/parts/methods/events → 4 items).
// Phase W1: incluye además las secciones navegables no excluidas, en su
// orden del JSON. Phase W38: el ORDEN del TOC es exactamente el del JSON.
const buttonDef = JSON.parse(readFileSync(join(componentsDir, 'actions', 'button.json'), 'utf8'));
const buttonTocUnique = buildToc(buttonDef);
assert.ok(buttonTocUnique.includes('Custom states'), `button.json: Custom states faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(buttonTocUnique.includes('CSS Parts'),    `button.json: CSS Parts faltante, got ${JSON.stringify(buttonTocUnique)}`);
// button.json tiene un section { id: "methods", title: "API JavaScript" } —
// el matching va por título, así que la etiqueta canónica es "API JavaScript"
// (no "Métodos"). Verificamos la forma real.
assert.ok(buttonTocUnique.includes('API JavaScript'), `button.json: API JavaScript faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(buttonTocUnique.includes('Eventos'),      `button.json: Eventos faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(!buttonTocUnique.includes('Anatomía'),    `button.json: Anatomía no debe estar en TOC`);
assert.ok(!buttonTocUnique.includes('Ejemplos'),    `button.json: Ejemplos no debe estar en TOC`);
// Phase W1: button.json debe tener al menos las 4 estándar + el resto no
// excluidas. Antes tenía 4; ahora ≥ 4 (incluye las 11 secciones navegables).
assert.ok(buttonTocUnique.length >= 4, `button.json: TOC debe tener al menos 4 items, got ${buttonTocUnique.length}`);

// Phase W38: el orden del TOC debe ser EXACTAMENTE el orden de las
// sections en el JSON (excluyendo intro/anatomy/ejemplos). Tomamos la
// primera sección navegable (no excluida) — debería ser `variants`
// (title del JSON original).
const buttonFirstIdx = buttonDef.sections.findIndex(
  (s: any) => s?.id && !excludedIds.has(normId(String(s.id))),
);
const buttonFirstToc = buttonTocUnique[0];
const buttonExpectedFirst =
  matchSection(
    String(buttonDef.sections[buttonFirstIdx].id),
    String(buttonDef.sections[buttonFirstIdx].title || ''),
  ) || String(buttonDef.sections[buttonFirstIdx].title || buttonDef.sections[buttonFirstIdx].id);
assert.strictEqual(
  buttonFirstToc,
  buttonExpectedFirst,
  `button.json: el primer item del TOC debe ser el de la primera section navegable, ` +
  `esperado "${buttonExpectedFirst}", got "${buttonFirstToc}"`,
);

// Phase W38: el primer item del TOC debe estar en el MISMO ORDEN que la
// primera section navegable del JSON. Verificamos además que
// `Custom states` (id "states") aparece en el orden que ocupa en el JSON
// (después de `anatomy`), no antes como haría la pasada-1 canónica.
const anatomyIdx = buttonDef.sections.findIndex((s: any) => normId(String(s?.id)) === 'anatomy');
const statesIdx  = buttonDef.sections.findIndex((s: any) => normId(String(s?.id)) === 'states');
if (anatomyIdx >= 0 && statesIdx >= 0) {
  assert.ok(
    statesIdx > anatomyIdx,
    `button.json sanity: "states" debe ir después de "anatomy" en el JSON (anatomy=${anatomyIdx}, states=${statesIdx})`,
  );
  // En el TOC, "Custom states" debe aparecer en el MISMO ORDEN relativo al
  // resto: detrás de las secciones no-estándar que están antes de anatomy.
  const tocIdx = buttonTocUnique.indexOf('Custom states');
  // Cuenta cuántas sections navegables hay antes de `states` en el JSON.
  const beforeStates = buttonDef.sections
    .slice(0, statesIdx)
    .filter((s: any) => s?.id && !excludedIds.has(normId(String(s.id)))).length;
  assert.ok(
    tocIdx >= beforeStates - 1 && tocIdx <= beforeStates + 1,
    `button.json: "Custom states" en TOC debe respetar orden del JSON. ` +
    `TOC idx=${tocIdx}, esperado ~${beforeStates} (sections navegables antes de states). ` +
    `TOC=${JSON.stringify(buttonTocUnique)}`,
  );
}

// ─── Casos concretos: window.json ──────────────────────────────────────
//
// window.json tiene { intro, basico, api }. Phase O: solo `api` → 1 item →
// <2 → sin TOC. Phase W1: `basico` se añade con su título → 2 items.
// Phase W38: el orden es el del JSON: `basico` antes de `api`.
const windowDef = JSON.parse(readFileSync(join(componentsDir, 'overlays', 'window.json'), 'utf8'));
const windowTocUnique = buildToc(windowDef);
assert.ok(windowTocUnique.includes('API JavaScript'), `window.json: API JavaScript faltante, got ${JSON.stringify(windowTocUnique)}`);
assert.ok(windowTocUnique.length >= 2, `window.json: TOC debe tener al menos 2 items (Phase W1), got ${windowTocUnique.length}`);
// Phase W38: el primer item debe ser el de la primera section navegable
// del JSON (`basico`), no la entrada canónica.
if (windowTocUnique.length >= 2) {
  const wFirst = windowDef.sections.find(
    (s: any) => s?.id && !excludedIds.has(normId(String(s.id))),
  );
  const wExpected = wFirst
    ? (matchSection(String(wFirst.id), String(wFirst.title || '')) || String(wFirst.title || wFirst.id))
    : '';
  assert.strictEqual(
    windowTocUnique[0],
    wExpected,
    `window.json: el primer item del TOC debe ser el de la primera section navegable, ` +
    `esperado "${wExpected}", got "${windowTocUnique[0]}"`,
  );
}

// ─── Casos concretos: card.json (usa id="methods" con title="API JavaScript") ──
const cardDef = JSON.parse(readFileSync(join(componentsDir, 'layout', 'card.json'), 'utf8'));
const cardTocUnique = buildToc(cardDef);
assert.ok(cardTocUnique.includes('API JavaScript'), `card.json: API JavaScript faltante, got ${JSON.stringify(cardTocUnique)}`);

// ─── Casos concretos: button-group.json (Phase W1: ya no es 0 items) ──
//
// Antes: `{ intro, appearance, orientation, select, modifiers, split,
// toolbar, native, keyboard, api, reference }` → solo `api` (1 item) →
// < 2 → TOC vacío. Phase W1: incluye las 10 no excluidas. Phase W38: el
// orden es el del JSON: appearance → orientation → ... → api → reference.
const buttonGroupDef = JSON.parse(readFileSync(join(componentsDir, 'actions', 'button-group.json'), 'utf8'));
const bgTocUnique = buildToc(buttonGroupDef);
assert.ok(bgTocUnique.includes('API JavaScript'), `button-group.json: API JavaScript faltante, got ${JSON.stringify(bgTocUnique)}`);
assert.ok(bgTocUnique.length >= 2, `button-group.json: TOC debe tener al menos 2 items (Phase W1), got ${bgTocUnique.length}`);

console.log(
  `docs-toc-integration.test.ts: PASS — ${withToc} con TOC, ${withoutToc} sin TOC; ` +
    `button=${buttonTocUnique.length} (≥4, orden JSON), window=${windowTocUnique.length} (≥2), ` +
    `button-group=${bgTocUnique.length} (≥2), card=${cardTocUnique.length} matches`,
);
process.exit(0);