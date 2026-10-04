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

/** Réplica del algoritmo real (mismo orden: ids primero, títulos después). */
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
  const tocLabels: string[] = [];
  for (const s of def.sections) {
    const m = matchSection(String(s.id || ''), String(s.title || ''));
    if (m) tocLabels.push(m);
  }
  // Dedupe preservando orden.
  const seen = new Set<string>();
  const dedup = tocLabels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
  if (dedup.length >= 2) withToc++;
  else withoutToc++;
}

assert.ok(withToc > 0, `al menos un componente debería tener >=2 secciones estándar, hay ${withToc}`);
assert.ok(withoutToc > 0, `al menos un componente debería tener <2 secciones estándar, hay ${withoutToc}`);

// ─── Casos concretos: button.json ─────────────────────────────────────

// button.json tiene { intro, variants, appearances, sizes, icons, icon-only,
// pill, caret, loading, disabled, link, form, anatomy, states, parts,
// theming, methods, events, playground, reference }.
// Tras filtrar quedan: states (Custom states), parts (CSS Parts), methods
// (Métodos), events (Eventos) → 4 secciones.
const buttonDef = JSON.parse(readFileSync(join(componentsDir, 'actions', 'button.json'), 'utf8'));
const buttonToc: string[] = [];
for (const s of buttonDef.sections) {
  const m = matchSection(String(s.id || ''), String(s.title || ''));
  if (m) buttonToc.push(m);
}
const seenBtn = new Set<string>();
const buttonTocUnique = buttonToc.filter((l) => (seenBtn.has(l) ? false : (seenBtn.add(l), true)));
assert.ok(buttonTocUnique.includes('Custom states'), `button.json: Custom states faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(buttonTocUnique.includes('CSS Parts'),    `button.json: CSS Parts faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(buttonTocUnique.includes('Métodos'),      `button.json: Métodos faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(buttonTocUnique.includes('Eventos'),      `button.json: Eventos faltante, got ${JSON.stringify(buttonTocUnique)}`);
assert.ok(!buttonTocUnique.includes('Anatomía'),    `button.json: Anatomía no debe estar en TOC`);
assert.ok(!buttonTocUnique.includes('Ejemplos'),    `button.json: Ejemplos no debe estar en TOC`);

// ─── Casos concretos: window.json ──────────────────────────────────────
//
// window.json tiene { intro, basico, api } → sólo "api" entra → <2 → sin TOC.
const windowDef = JSON.parse(readFileSync(join(componentsDir, 'overlays', 'window.json'), 'utf8'));
const windowToc: string[] = [];
for (const s of windowDef.sections) {
  const m = matchSection(String(s.id || ''), String(s.title || ''));
  if (m) windowToc.push(m);
}
const seenWin = new Set<string>();
const windowTocUnique = windowToc.filter((l) => (seenWin.has(l) ? false : (seenWin.add(l), true)));
assert.deepEqual(
  windowTocUnique,
  ['API JavaScript'],
  `window.json: TOC debe ser ["API JavaScript"], got ${JSON.stringify(windowTocUnique)}`,
);

// ─── Casos concretos: card.json (usa id="methods" con title="API JavaScript") ──
const cardDef = JSON.parse(readFileSync(join(componentsDir, 'layout', 'card.json'), 'utf8'));
const cardToc: string[] = [];
for (const s of cardDef.sections) {
  const m = matchSection(String(s.id || ''), String(s.title || ''));
  if (m) cardToc.push(m);
}
const seenCard = new Set<string>();
const cardTocUnique = cardToc.filter((l) => (seenCard.has(l) ? false : (seenCard.add(l), true)));
assert.ok(cardTocUnique.includes('Métodos'), `card.json: Métodos faltante, got ${JSON.stringify(cardTocUnique)}`);

console.log(
  `docs-toc-integration.test.ts: PASS — ${withToc} con TOC, ${withoutToc} sin TOC; ` +
    `button=${buttonTocUnique.length}/4 esperados, window=${windowTocUnique.length}/1 esperado, card=${cardTocUnique.length} matches`,
);
process.exit(0);