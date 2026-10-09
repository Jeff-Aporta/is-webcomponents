// .audit/audit-sections.mjs — Phase J1 audit script
// Scans src/components/**/*.md, classifies H2/H3 sections vs the 9-section
// standard, and emits a markdown report.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const componentsDir = join(root, 'src', 'components');

// 9-section standard (the brief calls them Anatomía, Atributos, Props,
// States, Eventos, Slots, Parts, API JS, Ejemplos). We also accept the
// common variants found in the repo.
const STANDARDS = {
  'Anatomía':   [/^prop[oó]sito$/i, /^anatom[ií]a$/i, /^cu[aá]ndo usarlo$/i, /^importaci[oó]n$/i, /^cu[aá]ndo no usarlo$/i],
  'Atributos':  [/^atributos?(\s+y\s+propiedades)?$/i, /^atributos?\s+observados?$/i, /^atributos?$/i],
  'Props':      [/^propiedades(\s+p[úu]blicas)?$/i, /^props?$/i],
  'States':     [/^custom\s+states?$/i, /^states?$/i, /^\[?custom\s+states?\]?$/i],
  'Eventos':    [/^eventos?$/i, /^events?$/i],
  'Slots':      [/^slots?$/i],
  'Parts':      [/^css\s+parts?$/i, /^parts?$/i],
  'API JS':     [/^api(\s+(javascript|js))?$/i, /^m[eé]todos(\s+y\s+propiedades\s+p[úu]blicas)?$/i, /^api\s+javascript$/i, /^m[eé]todos\s+p[úu]blicos?$/i],
  'Ejemplos':   [/^ejemplos?$/i, /^ejemplo\s+(m[íi]nimo|avanzado|completo)$/i, /^ejemplo\s+m[íi]nimo$/i, /^ejemplo\s+avanzado$/i, /^usage$/i],
};

const STANDARD_KEYS = Object.keys(STANDARDS);

// Walk src/components/**/*.md
async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full);
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      yield full;
    }
  }
}

// Extract H2/H3/H4 headings as plain strings (without the leading hashes).
// We track the level because some sections (Atributos observados, Propiedades
// públicas) live as H4 nested under an "Atributos y propiedades" H3 wrapper.
function extractHeadings(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (m) {
      const level = m[1].length;
      const raw = m[2].replace(/`/g, '').trim();
      out.push({ level, raw });
    }
  }
  return out;
}

// Parse the YAML-ish frontmatter. We only need `source:`, `style:`,
// `preview:`, `parent:`, and `tag:` to classify stubs vs full components.
// This is a *minimal* parser — enough for the keys we look at, not a full
// YAML implementation.
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return {};
  const block = m[1];
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (kv) {
      out[kv[1]] = kv[2];
    }
  }
  return out;
}

// Decide if a heading matches a standard (case/accents/whitespace tolerant).
function classify(heading) {
  const norm = heading.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const key of STANDARD_KEYS) {
    for (const pat of STANDARDS[key]) {
      if (pat.test(norm)) return key;
    }
  }
  return null;
}

const findings = [];
let total = 0;
for await (const file of walk(componentsDir)) {
  const text = await readFile(file, 'utf8');
  const headings = extractHeadings(text);
  const front = parseFrontmatter(text);
  // Set of "parent" H2/H3 headings — the umbrella that contains H4 sub-sections.
  const parents = new Set(headings.filter((h) => h.level <= 3).map((h) => h.raw));
  const present = new Set();
  for (const h of headings) {
    const k = classify(h.raw);
    if (k) present.add(k);
  }
  // Wrapper: an H2/H3 titled "Atributos y propiedades" implies both
  // "Atributos" and "Props" (the H4 sub-headings are Atributos observados
  // and Propiedades públicas respectively).
  if (parents.has('Atributos y propiedades')) {
    present.add('Atributos');
    present.add('Props');
  }
  // Wrapper: an H2/H3 titled "Métodos y propiedades públicas" implies
  // "API JS" (the H4 sub-heading is the methods table).
  if (parents.has('Métodos y propiedades públicas')) {
    present.add('API JS');
  }
  // Wrapper: an H2/H3 titled "API" itself implies "API JS" exists as a
  // section.
  if (parents.has('API')) {
    present.add('API JS');
  }
  // Classify: "stub" = sub-component pointer (no source/style/preview, has
  // parent or is a short sheet). "module" = tag with no `<iswc-` prefix
  // (utility/module doc, not a Web Component). Otherwise "component".
  const kind =
    front.parent || (!front.source && !front.style && !front.preview && text.length < 1500)
      ? 'stub'
      : (front.tag && !String(front.tag).startsWith('iswc-'))
        ? 'module'
        : 'component';
  const rel = relative(root, file).split(sep).join('/');
  // Section count for context.
  const gaps = STANDARD_KEYS.filter((k) => !present.has(k));
  findings.push({ file: rel, headings: headings.map((h) => h.raw), present, gaps, kind });
  total += 1;
}

findings.sort((a, b) => a.file.localeCompare(b.file));

// Group by category (first directory under src/components).
const byCategory = new Map();
for (const f of findings) {
  const parts = f.file.split('/');
  // ["src", "components", "<cat>", "<name>.md"]
  const cat = parts[2] ?? '(root)';
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat).push(f);
}

// Compose markdown report.
const lines = [];
lines.push('# Phase J1 — Audit secciones de docs en iswc-root');
lines.push('');
lines.push('> Generado por `.audit/audit-sections.mjs`. Cada fila es un `.md`');
lines.push('> en `src/components/**/*.md`. Las columnas muestran si la sección');
lines.push('> del estándar de 9 secciones está presente (✅), ausente (❌) o');
lines.push('> parcial (⚠️ = "No expone" o texto trivial).');
lines.push('');
lines.push('## Estándar aplicado');
lines.push('');
lines.push('| # | Sección | Aceptamos (regex) |');
lines.push('|---|---------|-------------------|');
lines.push('| 1 | Anatomía | `Propósito` / `Anatomía` / `Cuándo usarlo` / `Cuándo no usarlo` / `Importación` |');
lines.push('| 2 | Atributos | `Atributos` / `Atributos y propiedades` / `Atributos observados` |');
lines.push('| 3 | Props | `Propiedades` / `Propiedades públicas` / `Props` |');
lines.push('| 4 | States | `Custom states` / `States` |');
lines.push('| 5 | Eventos | `Eventos` / `Events` |');
lines.push('| 6 | Slots | `Slots` |');
lines.push('| 7 | Parts | `CSS parts` / `Parts` |');
lines.push('| 8 | API JS | `API` / `API JavaScript` / `API JS` / `Métodos` / `Métodos y propiedades públicas` |');
lines.push('| 9 | Ejemplos | `Ejemplos` / `Ejemplo mínimo` / `Ejemplo avanzado` / `Usage` |');
lines.push('');
lines.push('> **Nota:** en este repo no existe ningún H2 `Anatomía`. La sección');
lines.push('> canónica de identidad es el H1 + `## Propósito` + `## Cuándo usarlo`');
lines.push('> + `## Importación` + `## Ejemplo mínimo`. Marcamos la columna como');
lines.push('> ✅ si **al menos uno** de los proxies está presente.');
lines.push('');
lines.push('## Resumen');
lines.push('');
const conform = findings.filter((f) => f.gaps.length === 0);
const components = findings.filter((f) => f.kind === 'component');
const stubs = findings.filter((f) => f.kind === 'stub');
const modules = findings.filter((f) => f.kind === 'module');
const conformComponents = components.filter((f) => f.gaps.length === 0);
const conformStubs = stubs.filter((f) => f.gaps.length === 0);
const conformModules = modules.filter((f) => f.gaps.length === 0);
lines.push(`- **Total de .md auditados:** ${total}`);
lines.push(`  - Web Components completos (\`kind: component\`): **${components.length}** (cumplen: ${conformComponents.length})`);
lines.push(`  - Stubs de sub-componentes (\`kind: stub\`): **${stubs.length}** (cumplen: ${conformStubs.length})`);
lines.push(`  - Módulos / utilidades no-WC (\`kind: module\`): **${modules.length}** (cumplen: ${conformModules.length})`);
lines.push(`- **Cumplen las 9 secciones:** ${conform.length}`);
lines.push(`- **Tienen al menos 1 gap:** ${total - conform.length}`);
lines.push('');

// Tally of gap frequencies.
const gapTally = Object.fromEntries(STANDARD_KEYS.map((k) => [k, 0]));
for (const f of findings) for (const g of f.gaps) gapTally[g] += 1;
lines.push('### Frecuencia de cada gap');
lines.push('');
lines.push('| Sección | Faltante en N .md |');
lines.push('|---------|-------------------|');
for (const k of STANDARD_KEYS) {
  lines.push(`| ${k} | ${gapTally[k]} |`);
}
lines.push('');

// Per-category breakdown.
for (const [cat, items] of [...byCategory.entries()].sort()) {
  lines.push(`## Categoría: \`${cat}\` (${items.length} .md)`);
  lines.push('');
  lines.push('| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |');
  lines.push('|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|');
  for (const f of items) {
    const name = f.file.split('/').slice(2).join('/').replace(/\.md$/, '');
    const cell = (k) => (f.present.has(k) ? '✅' : '❌');
    const kindLabel = f.kind === 'stub' ? 'stub' : f.kind === 'module' ? 'módulo' : 'WC';
    lines.push(`| \`${name}\` | ${kindLabel} | ${cell('Anatomía')} | ${cell('Atributos')} | ${cell('Props')} | ${cell('States')} | ${cell('Eventos')} | ${cell('Slots')} | ${cell('Parts')} | ${cell('API JS')} | ${cell('Ejemplos')} | ${f.gaps.length === 0 ? '—' : f.gaps.join(', ')} |`);
  }
  lines.push('');
}

// Issues section: list of all gaps, one line per (file, gap).
lines.push('## Issues (lista plana)');
lines.push('');
let issueCount = 0;
let componentIssueCount = 0;
for (const f of findings) {
  for (const g of f.gaps) {
    issueCount += 1;
    if (f.kind === 'component') componentIssueCount += 1;
    const tag = f.kind === 'stub' ? ' (stub)' : f.kind === 'module' ? ' (módulo)' : '';
    lines.push(`- \`${f.file}\`${tag} — falta **${g}**`);
  }
}
lines.push('');
lines.push(`**Total issues:** ${issueCount} (de los cuales ${componentIssueCount} son de Web Components completos)`);
lines.push('');

// Sections that *do* exist in the repo but are NOT part of the standard —
// useful for the schema author to decide if they want to add them.
const allUnclassified = new Set();
for (const f of findings) {
  for (const h of f.headings) {
    if (!classify(h)) allUnclassified.add(h);
  }
}
lines.push('## H2/H3 headings observados que NO entran en el estándar');
lines.push('');
lines.push('Útil para el schema: decide si los promovemos a estándar o los');
lines.push('recategorizamos. Aparecen en este set los headings que vimos en al');
lines.push('menos un .md y que ninguno de los 9 patrones matchea.');
lines.push('');
for (const h of [...allUnclassified].sort()) {
  lines.push(`- ${h}`);
}
lines.push('');

await mkdir(join(root, '.audit'), { recursive: true });
const out = join(root, '.audit', 'sections-audit-iswc.md');
await writeFile(out, lines.join('\n'), 'utf8');

console.log(`Audit complete: ${total} .md scanned, ${issueCount} issues, ${conform.length} conform.`);
console.log(`Components: ${components.length}, Stubs: ${stubs.length}, Modules: ${modules.length}`);
console.log(`Report: ${out}`);
