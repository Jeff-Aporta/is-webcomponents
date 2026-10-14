// tests/w29-shape-icons.test.mjs — Guardián W29: cada opción de `shape` (incluido `pill`)
//                                debe tener `icon` declarado en el JSON de la demo Y en el
//                                mapa canónico que enriquece selects en runtime.
//
// Por qué este test (no runtime):
//   - El brief W29 reportó que `pill` en el `attr:shape` del demo de `<iswc-button>`
//     no mostraba icono en el panel de controles.
//   - El render del panel consulta el JSON de la demo (`opcionesDe` en controles.ts) y,
//     si el JSON omite `icon`, lo enriquece con `iconForSelectOption` que mira
//     `BUTTON_SHAPE_ICON` (button-shape.ts) y `MEDIA_SHAPE_ICON` (media-shape.ts).
//   - Para evitar que cualquier cambio manual (p. ej. reescritura del JSON con
//     `--fix` del audit-preview-controls, o un edit del fuente TS) deje el icono
//     huérfano, verificamos las dos fuentes de verdad y exigimos icon para
//     TODOS los valores del shape enum.
//
// Convenciones (AGENTS.md §7 / §8):
//   - Salida: `w29-shape-icons.test.mjs: PASS — N selects, 0 sin icon en JSON, 0 sin icon en mapa`
//   - Exit 1 si cualquier `attr:shape` en un JSON de demo tiene una opción sin `icon`
//     o si el mapa canónico omite algún valor de `BUTTON_SHAPE` / `MEDIA_SHAPE`.
//
// Aceptación del brief W29:
//   1. `attr:shape` en `src/components/actions/button.json` incluye `pill` con `icon: mdi:capsule`.
//   2. `BUTTON_SHAPE_ICON` y `MEDIA_SHAPE_ICON` declaran icon para todos los valores
//      de `BUTTON_SHAPE` y `MEDIA_SHAPE` respectivamente.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const COMPONENTS_ROOT = join(root, 'src', 'components');
const SHARED = join(COMPONENTS_ROOT, '_shared');

async function walk(dir, results = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, results);
    else if (e.isFile() && e.name.endsWith('.json')) results.push(p);
  }
  return results;
}

function optionIcon(opt) {
  if (typeof opt === 'string') return undefined;
  if (!opt || typeof opt !== 'object') return undefined;
  const icon = typeof opt.icon === 'string' ? opt.icon.trim() : '';
  return icon ? icon : undefined;
}

function walkControls(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const x of node) walkControls(x, visit);
    return;
  }
  if (Array.isArray(node.controls)) visit(node.controls);
  for (const v of Object.values(node)) walkControls(v, visit);
}

const all = await walk(COMPONENTS_ROOT);
const jsonViolations = [];
let shapeSelects = 0;
let shapeOptions = 0;

for (const path of all) {
  let def;
  try { def = JSON.parse(await readFile(path, 'utf8')); } catch { continue; }
  if (!def || !Array.isArray(def.sections)) continue;

  walkControls(def, (controls) => {
    for (const c of controls) {
      if (!c || c.control !== 'select') continue;
      if (c.prop !== 'attr:shape') continue;
      const opts = Array.isArray(c.options) ? c.options : [];
      shapeSelects++;
      for (const o of opts) {
        shapeOptions++;
        const icon = optionIcon(o);
        if (!icon) {
          const value = typeof o === 'string' ? o : (o && o.value) || '?';
          jsonViolations.push({
            tag: def.tag || '?',
            path: path.replace(root + '\\', ''),
            value,
          });
        }
      }
    }
  });
}

// 2) Verificar que los mapas canónicos declaran TODOS los valores del enum.
const buttonShapeTs = await readFile(join(SHARED, 'button-shape.ts'), 'utf8');
const mediaShapeTs = await readFile(join(SHARED, 'media-shape.ts'), 'utf8');

function extractEnumArray(src, name) {
  // `export const BUTTON_SHAPE = Object.freeze([...] as const)`
  const re = new RegExp(
    `export\\s+const\\s+${name}\\s*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\s*as\\s+const\\)`,
  );
  const m = re.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}
function extractIconMap(src, name) {
  // `export const BUTTON_SHAPE_ICON: Record<X, string> = Object.freeze({ ... })`
  const re = new RegExp(`export\\s+const\\s+${name}[^=]*=\\s*Object\\.freeze\\(\\{\\s*([\\s\\S]*?)\\}\\s*\\)`);
  const m = re.exec(src);
  if (!m) return null;
  const entries = {};
  // Acepta claves con o sin comillas (p. ej. `pill: 'mdi:capsule'` o `'arrow-left': 'mdi:…'`).
  for (const kv of m[1].matchAll(/(?:^|\s)(?:'([^']+)'|"([^"]+)"|([A-Za-z_][\w-]*))\s*:\s*'([^']+)'/g)) {
    const key = kv[1] || kv[2] || kv[3];
    entries[key] = kv[4];
  }
  return entries;
}

const buttonShapeValues = extractEnumArray(buttonShapeTs, 'BUTTON_SHAPE') || [];
const mediaShapeValues = extractEnumArray(mediaShapeTs, 'MEDIA_SHAPE') || [];
const buttonShapeIcon = extractIconMap(buttonShapeTs, 'BUTTON_SHAPE_ICON') || {};
const mediaShapeIcon = extractIconMap(mediaShapeTs, 'MEDIA_SHAPE_ICON') || {};

const mapViolations = [];
for (const v of buttonShapeValues) {
  if (!buttonShapeIcon[v]) mapViolations.push(`BUTTON_SHAPE_ICON falta para "${v}"`);
}
for (const v of mediaShapeValues) {
  if (!mediaShapeIcon[v]) mapViolations.push(`MEDIA_SHAPE_ICON falta para "${v}"`);
}

// 3) Aserción específica del brief: `pill` debe tener `mdi:capsule` en button.json.
const buttonJsonPath = join(COMPONENTS_ROOT, 'actions', 'button.json');
const buttonDef = JSON.parse(await readFile(buttonJsonPath, 'utf8'));
let pillIcon = null;
walkControls(buttonDef, (controls) => {
  for (const c of controls) {
    if (!c || c.control !== 'select') continue;
    if (c.prop !== 'attr:shape') continue;
    for (const o of (c.options || [])) {
      if (typeof o === 'object' && o && o.value === 'pill') {
        pillIcon = optionIcon(o);
      }
    }
  }
});
assert.ok(
  pillIcon,
  `W29: el option "pill" del shape select en src/components/actions/button.json no tiene icon. ` +
    `Se esperaba mdi:capsule.`,
);

assert.equal(
  jsonViolations.length,
  0,
  `W29: hay ${jsonViolations.length} opciones de shape sin icon en el JSON de la demo:\n` +
    jsonViolations.map((v) => `  - ${v.tag} [${v.path}]: valor "${v.value}"`).join('\n'),
);

assert.equal(
  mapViolations.length,
  0,
  `W29: el mapa canónico tiene gaps:\n  - ${mapViolations.join('\n  - ')}`,
);

assert.equal(
  pillIcon,
  'mdi:capsule',
  `W29: el option "pill" en button.json tiene icon "${pillIcon}", se esperaba "mdi:capsule".`,
);

console.log(
  `w29-shape-icons.test.mjs: PASS — ${shapeSelects} shape select(s), ${shapeOptions} opción(es), ` +
    `pill → ${pillIcon}, mapas canónicos completos (button:${buttonShapeValues.length}, media:${mediaShapeValues.length})`,
);
process.exit(0);
