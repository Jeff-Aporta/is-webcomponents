// tests/slots-pg-contract.test.mjs — Guardián del helper <iswc-slots-pg>.
//
// Por qué un test de contrato (no runtime):
//   - El slots-pg se monta dentro del playground de cada componente con slots.
//   - El contrato es: (a) existe el helper, (b) lo usan >= 10 componentes con
//     slots, (c) cada componente mantiene la sintaxis esperada. Esto se puede
//     verificar parseando los JSON y contando las secciones con `slots-pg`.
//   - Sin dev server arriba; test puro de archivos.
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `slots-pg-contract.test.mjs: PASS — N componentes usan slots-pg`
//   - Exit 1 si el helper no existe o no llega al mínimo (10) exigido por W11.
//
// Phase W11 (2026-10-03-zod-migration): brief exige mínimo 10 componentes con
// slots usando el helper. Lista corta objetivo:
//   button, card, dialog, fab, dropdown, callout, tag, badge, tooltip,
//   confirm-modal, popconfirm, stat, tab, breadcrumb-item, toast-item,
//   select, input.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const MANIFEST = join(root, 'src', 'manifest.ts');
const SLOTS_PG_TS = join(root, 'src', 'components', 'preview', 'slots-pg.ts');
const SLOTS_PG_CSS = join(root, 'src', 'components', 'preview', 'slots-pg.css');
const SLOTS_PG_JSON = join(root, 'src', 'components', 'preview', 'slots-pg.json');
const SLOTS_PG_MD = join(root, 'src', 'components', 'preview', 'slots-pg.md');
const COMPONENTS_ROOT = join(root, 'src', 'components');

// ─── 1. Fuentes del helper existen ───────────────────────────────────────────
for (const rel of [SLOTS_PG_TS, SLOTS_PG_CSS, SLOTS_PG_JSON, SLOTS_PG_MD]) {
  await readFile(rel, 'utf8'); // throws si falta
}

// ─── 2. Helper registrado en el manifest ───────────────────────────────────
const manifestSrc = await readFile(MANIFEST, 'utf8');
assert.match(
  manifestSrc,
  /tag:\s*'iswc-slots-pg'/,
  'manifest.ts debe declarar `tag: \'iswc-slots-pg\'`',
);
assert.match(
  manifestSrc,
  /script:\s*'components\/preview\/slots-pg\.js'/,
  'manifest.ts debe apuntar script a components/preview/slots-pg.js',
);
assert.match(
  manifestSrc,
  /page:\s*'components\/preview\/slots-pg\.json'/,
  'manifest.ts debe apuntar page a components/preview/slots-pg.json',
);

// ─── 3. Helper define el CE ────────────────────────────────────────────────
const slotsPgSrc = await readFile(SLOTS_PG_TS, 'utf8');
assert.match(slotsPgSrc, /defineElement\(\s*'iswc-slots-pg'/, 'defineElement iswc-slots-pg');
assert.match(slotsPgSrc, /class IswcSlotsPg/, 'clase IswcSlotsPg');
// dos tabs
assert.match(slotsPgSrc, /data-tab="simple"/, 'tab simple');
assert.match(slotsPgSrc, /data-tab="slots"/, 'tab slots');
// shadow template + impl editable (split horizontal)
assert.match(slotsPgSrc, /data-role="shadow-template"/, 'panel shadow template (read-only)');
assert.match(slotsPgSrc, /data-role="impl-code"/, 'panel impl code (editable)');
// per-slot dropdown editors + restart
assert.match(slotsPgSrc, /data-role="drops-list"/, 'lista de drops por slot');
assert.match(slotsPgSrc, /data-role="restart"/, 'botón restart');

// ─── 4. Al menos 10 componentes con slots usan slots-pg ────────────────────
const MIN_COMPONENTS = 10;

async function buscarJsonRecursivo(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      await buscarJsonRecursivo(p, results);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(p);
    }
  }
  return results;
}

const allJson = await buscarJsonRecursivo(COMPONENTS_ROOT);
const usuarios = []; // { tag, path, slotsCount }
for (const jsonPath of allJson) {
  let def;
  try {
    def = JSON.parse(await readFile(jsonPath, 'utf8'));
  } catch {
    continue;
  }
  if (!def || !Array.isArray(def.sections)) continue;
  const slotPgSection = def.sections.find((s) => s && s.id === 'slots-pg');
  if (!slotPgSection) continue;
  const blocks = slotPgSection.blocks ?? [];
  const demosConSlotsPg = blocks.filter((b) => {
    if (!b || b.kind !== 'demo') return false;
    const html = b.html || '';
    return /<iswc-slots-pg\b/.test(html);
  });
  if (demosConSlotsPg.length === 0) continue;
  usuarios.push({ tag: def.tag, path: jsonPath, sections: def.sections.length });
}

assert.ok(
  usuarios.length >= MIN_COMPONENTS,
  `W11 exige ≥ ${MIN_COMPONENTS} componentes con slots-pg; hay ${usuarios.length}. Faltan: ${usuarios.map((u) => u.tag).join(', ')}`,
);

// ─── 5. Cada uso incluye `tag="..."` apuntando a sí mismo ───────────────────
for (const u of usuarios) {
  const def = JSON.parse(await readFile(u.path, 'utf8'));
  const slotPgSection = def.sections.find((s) => s && s.id === 'slots-pg');
  const html = (slotPgSection.blocks ?? [])
    .filter((b) => b && b.kind === 'demo')
    .map((b) => b.html || '')
    .join('\n');
  assert.match(
    html,
    new RegExp(`<iswc-slots-pg[^>]*tag=["']${u.tag}["']`),
    `${u.tag}: el uso de <iswc-slots-pg> debe llevar tag="${u.tag}"`,
  );
}

// ─── 6. Resumen ────────────────────────────────────────────────────────────
const tags = usuarios.map((u) => u.tag).sort();
const resumen = `slots-pg-contract.test.mjs: PASS — ${usuarios.length} componentes usan slots-pg [${tags.join(', ')}]`;
console.log(resumen);
process.exit(0);