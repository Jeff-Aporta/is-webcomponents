// Run extract-parts.mjs logic and verify zero issues remain.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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

function normalize(lineending) {
  return lineending.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

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

function extractExportedParts(src) {
  const found = new Set();
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

function extractDocumentedParts(md) {
  const lines = normalize(md).split('\n');
  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,6}\s*(?:css\s+parts|partes\s+css)\s*$/i);
    if (m) { headingIdx = i; break; }
  }
  if (headingIdx === -1) return [];
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
const report = [];
for (const tsPath of allTs) {
  const base = basename(tsPath, '.ts');
  const mdPath = join(dirname(tsPath), `${base}.md`);
  let hasMd = true;
  try { statSync(mdPath); } catch { hasMd = false; }
  if (!hasMd) continue;

  const src = readFileSync(tsPath, 'utf8');
  const declared = extractDeclaredParts(src);
  const exported = extractExportedParts(src);
  const exposed = [...new Set([...declared, ...exported])].sort();
  if (exposed.length === 0) continue;
  const md = readFileSync(mdPath, 'utf8');
  const documentedRows = extractDocumentedParts(md);
  const documented = documentedRows.map((r) => r.part).sort();

  const missing = exposed.filter((p) => !documented.includes(p));
  const undocumented = documented.filter((p) => !exposed.includes(p));

  report.push({
    component: `iswc-${base}`,
    missing,
    undocumented,
  });
}

const issues = report.filter((r) => r.missing.length > 0 || r.undocumented.length > 0);
console.log('Total components with parts:', report.length);
console.log('Components with issues:', issues.length);
for (const i of issues) console.log('  ', i.component, 'missing:', i.missing, 'undocumented:', i.undocumented);

if (issues.length === 0) {
  console.log('\nCSS Parts audit: PASS — 0 issues remain.');
  process.exit(0);
} else {
  console.log('\nCSS Parts audit: FAIL — issues detected.');
  process.exit(1);
}