// .audit/phase-u-forms-scan.mjs (refinado)
// Una violacion ocurre cuando un bloque "demo" tiene multiples ejemplares del MISMO
// tag en el mismo demo y los `controls` los aplican a uno solo.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = 'src/components/forms';

function countByTag(html) {
  const counts = new Map();
  if (typeof html !== 'string') return counts;
  for (const m of html.matchAll(/<iswc-([a-z][a-z0-9-]*)\b[^>]*?(?:\/?)>/gi)) {
    const tag = `iswc-${m[1].toLowerCase()}`;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

function extractProps(html, tagName) {
  const out = [];
  if (typeof html !== 'string') return out;
  const re = new RegExp(`<${tagName}\\b([^>]*)>`, 'gi');
  for (const m of html.matchAll(re)) {
    const attrs = m[1] || '';
    // Atributos booleanos sin valor: presencia detectada por regex mas simple.
    const obj = {};
    for (const a of attrs.matchAll(/([a-zA-Z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g)) {
      const key = a[1].toLowerCase();
      // Si NO hay grupo de captura con valor (indica atributo sin valor = boolean), usar empty string.
      const val = (a[2] ?? a[3] ?? a[4]);
      obj[key] = val === undefined ? '' : val;
    }
    out.push(obj);
  }
  return out;
}

function diffsAcrossSpecimens(propsList) {
  if (propsList.length < 2) return new Set();
  const keys = new Set();
  for (const p of propsList) for (const k of Object.keys(p)) keys.add(k);
  const diff = new Set();
  for (const k of keys) {
    // Distinguir entre "presente con valor" y "ausente".
    const seen = new Set();
    for (const p of propsList) {
      const present = Object.prototype.hasOwnProperty.call(p, k);
      seen.add(present ? `p:${p[k]}` : 'absent');
    }
    if (seen.size > 1) diff.add(k);
  }
  return diff;
}

// Dimensiones que el principio declara como "valor compartido".
const SHARED_PROP_DIMS = new Set([
  'color', 'variant', 'size', 'shape', 'appearance', 'tone', 'intent',
  'disabled', 'readonly', 'required', 'error', 'loading',
  'checked', 'indeterminate', 'pill', 'with-caret', 'bordered',
  'block', 'compact', 'inline',
]);

function isSharedDim(key) {
  return SHARED_PROP_DIMS.has(key);
}

function targetTag(targetSel, html) {
  // Si target="#id" -> ese elemento
  if (targetSel) {
    const re = new RegExp(`<([a-z][a-z0-9-]*)((?:\\s+[^>]*)?\\s+id=[\\"']${targetSel.slice(1)}[\\"'])`, 'i');
    const m = re.exec(html);
    if (m) return m[1].toLowerCase();
    return null;
  }
  // Si no target -> primer iswc-*
  const m = /<iswc-([a-z][a-z0-9-]*)/i.exec(html);
  if (m) return `iswc-${m[1].toLowerCase()}`;
  return null;
}

async function main() {
  const files = await (await import('node:fs/promises')).readdir(DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const violations = [];
  const suspectDemos = [];

  for (const file of jsonFiles) {
    const raw = await readFile(join(DIR, file), 'utf8');
    const json = JSON.parse(raw);
    const sections = json.sections ?? [];
    for (const section of sections) {
      const blocks = section.blocks ?? [];
      for (const block of blocks) {
        if (block?.kind !== 'demo') continue;
        const html = block.html ?? '';
        const counts = countByTag(html);
        const controls = block.controls ?? [];
        const targetSel = block.target ?? '';
        if (!controls || controls.length === 0) continue;
        const hostTag = targetTag(targetSel, html);
        if (!hostTag) continue;
        // Casos donde multi-specimen + controls, mismo host: probable violacion.
        for (const [tag, count] of counts) {
          if (count < 2) continue;
          if (tag !== hostTag) continue;
          const props = extractProps(html, tag);
          const diff = diffsAcrossSpecimens(props);
          const sharedDiffs = [...diff].filter(isSharedDim);
          if (sharedDiffs.length === 0) continue;
          violations.push({
            file,
            section: section.id ?? section.title ?? '?',
            tag,
            count,
            target: targetSel || '(primer is-*)',
            hostTag,
            sharedDiffs,
          });
        }
        // Cualquier demo con controls + multi-specimen de cualquier tipo:
        // sospechoso (revision manual).
        const multiTags = [...counts.entries()].filter(([, c]) => c >= 2).map(([t]) => t);
        if (multiTags.length > 0) {
          suspectDemos.push({
            file,
            section: section.id ?? section.title ?? '?',
            multiTags,
            hostTag,
            target: targetSel || '(primer is-*)',
          });
        }
      }
    }
  }

  console.log(`Archivos escaneados: ${jsonFiles.length}`);
  console.log(`Violaciones detectadas: ${violations.length}`);
  for (const v of violations) {
    console.log(`- ${v.file} :: ${v.section} :: ${v.tag} x${v.count} [target=${v.target}, host=${v.hostTag}] diff=${v.sharedDiffs.join(',')}`);
  }

  console.log(`\nDemos sospechosos (multi-specimen + controls):`);
  for (const s of suspectDemos) {
    console.log(`- ${s.file} :: ${s.section} :: multi=${s.multiTags.join(',')} host=${s.hostTag}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});