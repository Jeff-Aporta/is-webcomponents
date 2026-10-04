// tests/docs-toc-integration.test.ts
//
// Verifica contra JSONs reales del repo que `standardTocSections()` filtra
// correctamente. Lee varios `<tag>.json` de `src/components/` y aplica el
// mismo algoritmo; comprueba que el resultado coincide con lo esperado.
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

/** Réplica del algoritmo real (Phase W1): estándar + no estándar. */
function matchSection(id: string, title: string): string | null {
  if (!id) return null;
  const idN = normId(id);
  if (excludedIds.has(idN)) return null;
  for (const entry of STANDARD_TOC) {
    if (entry.ids.includes(idN)) return entry.label;
  }
  const tN = normTitle(title || '');
  if (tN) {
    for (const entry of STANDARD_TOC) {
      if (entry.titles.includes(tN)) return entry.label;
    }
  }
  return null;
}

/**
 * Réplica de `standardTocSections(def)` (Phase W1): pasada 1 estándar en
 * orden canónico + pasada 2 con cualquier sección navegable no excluida.
 */
function buildToc(def: any): string[] {
  if (!Array.isArray(def?.sections)) return [];
  const labels: string[] = [];
  const used = new Set<string>();
  // Pasada 1 — estándar
  for (const entry of STANDARD_TOC) {
    for (const s of def.sections) {
      const id = String(s?.id || '');
      if (!id || used.has(id)) continue;
      if (excludedIds.has(normId(id))) continue;
      const idN = normId(id);
      const tN = normTitle(String(s?.title || ''));
      if (entry.ids.includes(idN) || (tN && entry.titles.includes(tN))) {
        labels.push(entry.label);
        used.add(id);
        break;
      }
    }
  }
  // Pasada 2 — resto
  for (const s of def.sections) {
    const id = String(s?.id || '');
    if (!id || used.has(id)) continue;
    if (excludedIds.has(normId(id))) continue;
    labels.push(String(s?.title || id));
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
// orden del JSON. Esperado: las 4 estándar + 11 no estándar (variants,
// appearances, sizes, icons, icon-only, pill, caret, loading, disabled,
// link, form, theming, playground, reference) — anatomía, ejemplos excluidos.
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

// ─── Casos concretos: window.json ──────────────────────────────────────
//
// window.json tiene { intro, basico, api }. Phase O: solo `api` → 1 item →
// <2 → sin TOC. Phase W1: `basico` se añade con su título → 2 items.
const windowDef = JSON.parse(readFileSync(join(componentsDir, 'overlays', 'window.json'), 'utf8'));
const windowTocUnique = buildToc(windowDef);
assert.ok(windowTocUnique.includes('API JavaScript'), `window.json: API JavaScript faltante, got ${JSON.stringify(windowTocUnique)}`);
assert.ok(windowTocUnique.length >= 2, `window.json: TOC debe tener al menos 2 items (Phase W1), got ${windowTocUnique.length}`);

// ─── Casos concretos: card.json (usa id="methods" con title="API JavaScript") ──
const cardDef = JSON.parse(readFileSync(join(componentsDir, 'layout', 'card.json'), 'utf8'));
const cardTocUnique = buildToc(cardDef);
assert.ok(cardTocUnique.includes('API JavaScript'), `card.json: API JavaScript faltante, got ${JSON.stringify(cardTocUnique)}`);

// ─── Casos concretos: button-group.json (Phase W1: ya no es 0 items) ──
//
// Antes: `{ intro, appearance, orientation, select, modifiers, split,
// toolbar, native, keyboard, api, reference }` → solo `api` (1 item) →
// < 2 → TOC vacío. Phase W1: incluye las 10 no excluidas.
const buttonGroupDef = JSON.parse(readFileSync(join(componentsDir, 'actions', 'button-group.json'), 'utf8'));
const bgTocUnique = buildToc(buttonGroupDef);
assert.ok(bgTocUnique.includes('API JavaScript'), `button-group.json: API JavaScript faltante, got ${JSON.stringify(bgTocUnique)}`);
assert.ok(bgTocUnique.length >= 2, `button-group.json: TOC debe tener al menos 2 items (Phase W1), got ${bgTocUnique.length}`);

console.log(
  `docs-toc-integration.test.ts: PASS — ${withToc} con TOC, ${withoutToc} sin TOC; ` +
    `button=${buttonTocUnique.length} (≥4), window=${windowTocUnique.length} (≥2), ` +
    `button-group=${bgTocUnique.length} (≥2), card=${cardTocUnique.length} matches`,
);
process.exit(0);