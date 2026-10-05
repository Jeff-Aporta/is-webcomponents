// Audit script: extracts CSS Parts declared in .ts components and documented in .md files.
// Robust against CRLF line endings, mixed-case headings, and varied table formats.
//
// Usage:  node .audit/extract-parts.mjs > .audit/parts-raw.json
// Output: JSON array of { component, file, declared: [...], documented: [...], missing, undocumented }.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const componentsRoot = join(root, 'src', 'components');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Normalize CRLF / CR / LF to LF so regexes are portable. */
function normalize(lineending) {
  return lineending.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Extract every `part="..."` token + every `setAttribute('part', '...')` argument from source. */
function extractDeclaredParts(src) {
  const found = new Set();
  const attrRe = /part\s*=\s*"([^"]+)"|part\s*=\s*'([^']+)'/g;
  for (const m of src.matchAll(attrRe)) {
    const val = m[1] ?? m[2];
    val.split(/\s+/).filter(Boolean).forEach((p) => found.add(p));
  }
  const setRe = /setAttribute\s*\(\s*['"]part['"]\s*,\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(setRe)) {
    m[1].split(/\s+/).filter(Boolean).forEach((p) => found.add(p));
  }
  return [...found].sort();
}

/**
 * Extract the EXTERNAL part names exposed via `exportparts` attributes.
 * Format: "internal:external, internal:external, ..." or just "internal" (external same as internal).
 */
function extractExportedParts(src) {
  const found = new Set();
  // string-literal form (templates) and dynamic setAttribute form are both fine
  const attrRe = /exportparts\s*=\s*"([^"]+)"|exportparts\s*=\s*'([^']+)'/g;
  for (const m of src.matchAll(attrRe)) {
    const val = (m[1] ?? m[2]).trim();
    if (!val) continue;
    for (const entry of val.split(/[,\s]+/).filter(Boolean)) {
      const [internal, external] = entry.split(':');
      const exposed = (external ?? internal).trim();
      if (exposed) found.add(exposed);
    }
  }
  return [...found].sort();
}

/**
 * Find the markdown table under the "CSS Parts" heading (case-insensitive).
 * Returns an array of { part, description }.
 */
function extractDocumentedParts(md) {
  const lines = normalize(md).split('\n');
  // locate heading
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,6}\s*(?:css\s+parts|partes\s+css)\s*$/i);
    if (m) { headingIdx = i; break; }
  }
  if (headingIdx === -1) return [];
  // locate next table starting within ~30 lines
  for (let i = headingIdx + 1; i < Math.min(lines.length, headingIdx + 60); i++) {
    const header = lines[i];
    const sep = lines[i + 1] ?? '';
    if (
      header.trim().startsWith('|') &&
      /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(sep)
    ) {
      const rows = [];
      for (let j = i + 2; j < lines.length; j++) {
        const row = lines[j];
        if (!row.trim().startsWith('|')) break;
        const cells = row.split('|').map((c) => c.trim()).filter((c) => c !== '');
        if (cells.length < 2) continue;
        const description = cells.slice(1).join(' | ');
        // The first cell may contain a single part or multiple parts separated by ` / `.
        const firstRaw = cells[0].replace(/^`+|`+$/g, '');
        const candidates = firstRaw.split(/\s*\/\s*/);
        for (const cand of candidates) {
          const trimmed = cand.trim();
          const partMatch = trimmed.match(/^::part\(["']?([\w-]+)["']?\)$/) || trimmed.match(/^([\w-]+)$/);
          if (!partMatch) continue;
          rows.push({ part: partMatch[1], description });
        }
      }
      return rows;
    }
  }
  return [];
}

const allTs = walk(componentsRoot);
const interesting = allTs.filter((p) => {
  const base = basename(p, '.ts');
  const md = join(dirname(p), `${base}.md`);
  try { statSync(md); return true; } catch { return false; }
});

const report = [];
for (const tsPath of interesting) {
  const src = readFileSync(tsPath, 'utf8');
  const declared = extractDeclaredParts(src);
  const exported = extractExportedParts(src);
  // Combined set: parts declared directly + parts exposed via exportparts.
  const exposed = [...new Set([...declared, ...exported])].sort();
  if (exposed.length === 0) continue; // skip components with no parts
  const base = basename(tsPath, '.ts');
  const mdPath = join(dirname(tsPath), `${base}.md`);
  const md = readFileSync(mdPath, 'utf8');
  const documentedRows = extractDocumentedParts(md);
  const documented = documentedRows.map((r) => r.part).sort();
  const documentedMap = Object.fromEntries(documentedRows.map((r) => [r.part, r.description]));

  const exposedSet = new Set(exposed);
  const documentedSet = new Set(documented);

  const missing = exposed.filter((p) => !documentedSet.has(p));
  const undocumented = documented.filter((p) => !exposedSet.has(p));

  report.push({
    component: `iswc-${base}`,
    file: relative(root, tsPath).replace(/\\/g, '/'),
    declared,        // part="..." tokens (own template + dynamic)
    exported,        // external names from exportparts
    exposed,         // union, what consumers can target via ::part()
    documented,
    documentedDescriptions: documentedMap,
    missing,         // in .ts but not in .md
    undocumented,    // in .md but not in .ts
    hasCssPartsSection: documentedRows.length > 0,
  });
}

report.sort((a, b) => a.file.localeCompare(b.file));

console.log(JSON.stringify(report, null, 2));