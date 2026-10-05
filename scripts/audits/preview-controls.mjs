/**
 * Audita y homogeneiza controles de demos (iswc-preview/v1) contra el API del CE.
 *
 * Reglas:
 *  1. Si el CE declara VALID_SHAPE y el demo tiene attr:pill boolean → shape select.
 *  2. Enums VALID_* → control select con esas options (si ya hay control del attr).
 *  3. No dejar attr:pill si existe shape en el CE (alias deprecado en playground).
 *  4. color/variant: alinear options a INTENT/TONE del kit cuando el CE los usa.
 *
 * Uso:
 *   node scripts/audit-preview-controls.mjs           # solo reporte
 *   node scripts/audit-preview-controls.mjs --fix     # aplica cambios
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/components');
const FIX = process.argv.includes('--fix');

/** intent.js — color semántico (kit: brand default + info/error). */
const INTENT = ['brand', 'neutral', 'success', 'warning', 'danger', 'info', 'error'];
/** tone.js — peso visual compartido (tag/badge/card…). Button usa otro set en docstring. */
const TONE = ['accent', 'filled', 'outlined', 'filled-outlined', 'plain'];
const TYPE_WORDS = new Set(['number', 'string', 'boolean', 'object', 'array', 'null', 'undefined', 'any']);

/** Extrae arrays string literales: const VALID_X = ["a","b"] */
function parseValidMaps(src) {
  const maps = {};
  const re = /(?:const|let)\s+(VALID_[A-Z0-9_]+)\s*=\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src))) {
    const vals = [...m[2].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
    if (vals.length) maps[m[1]] = vals;
  }
  // VALID_COLOR = INTENT (+ extras en el mismo archivo)
  if (/VALID_COLOR\s*=\s*INTENT/.test(src) && !maps.VALID_COLOR) {
    maps.VALID_COLOR = [...INTENT];
  }
  if (/VALID_COLOR\s*=\s*\[\s*\.\.\.INTENT/.test(src) && !maps.VALID_COLOR) {
    maps.VALID_COLOR = [...INTENT];
    const extra = /VALID_COLOR\s*=\s*\[\s*\.\.\.INTENT\s*,\s*["']([^"']+)["']/.exec(src);
    if (extra) maps.VALID_COLOR.push(extra[1]);
  }
  if (/VALID_VARIANT\s*=\s*TONE/.test(src) && !maps.VALID_VARIANT) {
    maps.VALID_VARIANT = [...TONE];
    const filter = /VALID_VARIANT\s*=\s*TONE\.filter\(\(t\)\s*=>\s*t\s*!==\s*['"](\w+)['"]\)/.exec(src);
    if (filter) maps.VALID_VARIANT = maps.VALID_VARIANT.filter((t) => t !== filter[1]);
  }
  // VALID_COLOR = [...INTENT, 'info'] etc.
  const spread = /VALID_COLOR\s*=\s*\[\s*\.\.\.INTENT\s*,([^\]]+)\]/.exec(src);
  if (spread) {
    maps.VALID_COLOR = [
      ...INTENT,
      ...[...spread[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]),
    ];
  }
  return maps;
}

function parseObserved(src) {
  const attrs = new Set();
  for (const block of src.matchAll(/(?:const|let)\s+OBSERVED\s*=\s*\[([^\]]*)\]/gs)) {
    for (const a of block[1].matchAll(/["']([\w-]+)["']/g)) attrs.add(a[1]);
  }
  for (const block of src.matchAll(/observedAttributes\(\)[^{]*\{([^}]*)\}/gs)) {
    for (const a of block[1].matchAll(/["']([\w-]+)["']/g)) attrs.add(a[1]);
  }
  // Docblock "Atributos" lines like `shape        round | rect | pill`
  return attrs;
}

function parseDocEnums(src) {
  const maps = {};
  // Solo líneas de docstring de attrs: `shape        round | rect | pill`
  for (const m of src.matchAll(/^\s*\*\s+([a-z][\w-]*)\s{2,}((?:[a-z][\w-]*\s*\|\s*)+[a-z][\w-]*)/gim)) {
    const name = m[1];
    const vals = m[2].split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
    if (vals.length < 2) continue;
    if (vals.every((v) => TYPE_WORDS.has(v))) continue;
    if (new Set(vals).size < 2) continue; // id|id
    maps[name] = vals;
  }
  return maps;
}

function walkControls(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const x of node) walkControls(x, visit);
    return;
  }
  if (Array.isArray(node.controls)) visit(node.controls, node);
  for (const v of Object.values(node)) walkControls(v, visit);
}

function controlAttr(c) {
  const p = String(c.prop || '');
  if (p.startsWith('attr:')) return p.slice(5);
  if (p.startsWith('prop:')) return null;
  return p || null;
}

function sameOptions(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const norm = (xs) => xs.map((o) => (typeof o === 'string' ? o : String(o?.value))).join('\0');
  return norm(a) === norm(b);
}

const findings = [];
let filesFixed = 0;

function auditPair(tsPath, jsonPath) {
  const tag = path.basename(tsPath, path.extname(tsPath));
  if (!fs.existsSync(jsonPath)) return;
  const src = fs.readFileSync(tsPath, 'utf8');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  let def;
  try {
    def = JSON.parse(raw);
  } catch {
    findings.push({ tag, severity: 'error', msg: 'JSON inválido' });
    return;
  }

  const valids = parseValidMaps(src);
  const observed = parseObserved(src);
  const docEnums = parseDocEnums(src);
  // Prefer VALID_* del CE; si no, enums del docstring del mismo archivo.
  // No mezclar TONE/INTENT globales salvo que el CE los declare en VALID_*.
  const shapeVals = valids.VALID_SHAPE || docEnums.shape;
  const hasShape = observed.has('shape') || !!shapeVals;
  const variantVals = valids.VALID_VARIANT || docEnums.variant;
  const colorVals = valids.VALID_COLOR || docEnums.color;

  let changed = false;

  walkControls(def, (controls) => {
    // 1) pill boolean → shape select
    if (hasShape && shapeVals) {
      const pillIdx = controls.findIndex((c) => controlAttr(c) === 'pill' && c.control === 'boolean');
      const shapeIdx = controls.findIndex((c) => controlAttr(c) === 'shape');
      if (pillIdx >= 0) {
        findings.push({
          tag,
          severity: 'fix',
          msg: `attr:pill boolean → attr:shape select [${shapeVals.join('|')}]`,
        });
        if (FIX) {
          const shapeCtrl = {
            control: 'select',
            prop: 'attr:shape',
            label: 'shape',
            options: [...shapeVals],
          };
          if (shapeIdx >= 0) {
            controls[shapeIdx] = shapeCtrl;
            controls.splice(pillIdx, 1);
          } else {
            controls[pillIdx] = shapeCtrl;
          }
          changed = true;
        }
      } else if (shapeIdx < 0 && controls.some((c) => ['color', 'variant', 'disabled'].includes(controlAttr(c) || ''))) {
        // Intro-like panel with appearance knobs but no shape
        findings.push({
          tag,
          severity: 'warn',
          msg: `falta attr:shape select (CE tiene shape)`,
        });
        if (FIX) {
          // Insert after variant or color
          let at = controls.findIndex((c) => controlAttr(c) === 'variant');
          if (at < 0) at = controls.findIndex((c) => controlAttr(c) === 'color');
          const shapeCtrl = {
            control: 'select',
            prop: 'attr:shape',
            label: 'shape',
            options: [...shapeVals],
          };
          if (at >= 0) controls.splice(at + 1, 0, shapeCtrl);
          else controls.unshift(shapeCtrl);
          changed = true;
        }
      }
    }

    // 2) Align select options for known enums (solo si hay fuente fiable)
    for (const c of controls) {
      const attr = controlAttr(c);
      if (!attr || c.control !== 'select') continue;
      const validKey = `VALID_${attr.toUpperCase().replace(/-/g, '_')}`;
      let expected = null;
      let source = null;
      if (attr === 'shape' && shapeVals) { expected = shapeVals; source = 'shape'; }
      else if (valids[validKey]) { expected = valids[validKey]; source = validKey; }
      else if (attr === 'variant' && variantVals) { expected = variantVals; source = 'variant'; }
      else if (attr === 'color' && colorVals) { expected = colorVals; source = 'color'; }
      else if (docEnums[attr] && ['type', 'placement', 'orientation', 'position', 'resize', 'effect', 'select', 'from', 'attention', 'lang'].includes(attr)) {
        expected = docEnums[attr];
        source = 'doc';
      }
      if (!expected) continue;

      if (attr === 'color') {
        // Conservar hex / valores custom del JSON; asegurar tokens del CE.
        const cur = (c.options || []).map((o) => (typeof o === 'string' ? o : String(o?.value ?? '')));
        const extras = cur.filter((v) => v && !expected.includes(v));
        expected = [...expected, ...extras];
      }

      if (sameOptions(c.options, expected)) continue;
      // Evitar “mejoras” ruidosas: si el select actual ya contiene todos los
      // valores esperados (solo faltan quitar extras), no tocar salvo shape/type.
      const curVals = (c.options || []).map((o) => (typeof o === 'string' ? o : String(o?.value ?? '')));
      const missing = expected.filter((v) => !curVals.includes(v));
      const strict = source === 'shape' || source?.startsWith('VALID_') || attr === 'type' || attr === 'variant';
      if (!strict && missing.length === 0) continue;

      findings.push({
        tag,
        severity: 'fix',
        msg: `attr:${attr} options → [${expected.join('|')}] (${source})`,
      });
      if (FIX) {
        // Conservar icon/html/description si ya había objetos ricos.
        const prev = new Map(
          (c.options || []).map((o) => {
            if (typeof o === 'string') return [o, { value: o, label: o }];
            return [String(o?.value ?? ''), o];
          }),
        );
        c.options = expected.map((v) => {
          const old = prev.get(v);
          if (old && typeof old === 'object') {
            return { ...old, value: v, label: old.label || v };
          }
          return v;
        });
        changed = true;
      }
    }

    // 3) boolean on enum attr (misuse)
    for (const c of controls) {
      const attr = controlAttr(c);
      if (!attr || c.control !== 'boolean') continue;
      const enumVals = valids[`VALID_${attr.toUpperCase().replace(/-/g, '_')}`] || docEnums[attr];
      if (enumVals && enumVals.length > 2) {
        findings.push({
          tag,
          severity: 'fix',
          msg: `attr:${attr} era boolean → select [${enumVals.join('|')}]`,
        });
        if (FIX) {
          c.control = 'select';
          c.options = [...enumVals];
          changed = true;
        }
      }
    }
  });

  if (FIX && changed) {
    fs.writeFileSync(jsonPath, `${JSON.stringify(def, null, 2)}\n`, 'utf8');
    // espejo dist
    const dist = path.join('dist/previews', path.relative(root, jsonPath));
    try {
      fs.mkdirSync(path.dirname(dist), { recursive: true });
      fs.copyFileSync(jsonPath, dist);
    } catch { /* ok */ }
    filesFixed++;
  }
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '_shared' || ent.name === 'node_modules') continue;
      walk(p);
      continue;
    }
    if (!/\.(ts|js)$/.test(ent.name)) continue;
    if (ent.name.endsWith('.d.ts') || ent.name.includes('.test.')) continue;
    const base = ent.name.replace(/\.(ts|js)$/, '');
    const json = path.join(dir, `${base}.json`);
    auditPair(p, json);
  }
}

walk(root);

const bySev = { fix: 0, warn: 0, error: 0 };
for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;

console.log(JSON.stringify({
  mode: FIX ? 'fix' : 'report',
  filesFixed,
  counts: bySev,
  findings: findings.slice(0, 200),
  truncated: findings.length > 200,
  total: findings.length,
}, null, 2));
