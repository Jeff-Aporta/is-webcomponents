// tests/preview-json-contract.test.ts
//
// Todos los previews son JSON homogéneos (is-preview/v1) listados en catalog.ts.
// Guardián anti-regresión: no volver a HTML por componente.
//
// Uso: node tests/preview-json-contract.test.ts

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import catalog from '../../../previews/catalog.ts';
import { default as manifest } from '../../../manifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const previews = join(root, 'src', 'previews');
// Consolidación 2026-09-07: los paths del catalog ahora son relativos a src/
// ("./home.json" → src/previews/home.json; "../components/x.json" → src/components/x.json;
//  "../pages/x.json" → src/pages/x.json). Resolvemos contra src/ normalizando.
const srcDir = join(root, 'src');
function resolveCatalogPath(p) {
  const clean = p.replace(/^\.\.\//, '');   // quita el primer ../ (paths que suben a src/)
  return join(srcDir, clean);
}
const failures = [];

const KINDS = new Set(['demo', 'callout', 'code', 'html', 'table', 'lede']);

for (const [tag, entry] of Object.entries(catalog)) {
  const jsonPath = resolveCatalogPath(entry.json);
  if (!existsSync(jsonPath)) {
    failures.push(`${tag}: falta ${entry.json} → ${jsonPath}`);
    continue;
  }
  let def;
  try {
    def = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    failures.push(`${tag}: JSON inválido — ${err.message}`);
    continue;
  }
  if (def.$schema !== 'is-preview/v1') failures.push(`${tag}: $schema != is-preview/v1`);
  if (def.tag !== tag) failures.push(`${tag}: def.tag="${def.tag}"`);
  if (!Array.isArray(def.sections)) failures.push(`${tag}: sections[] obligatorio`);
  else {
    for (const sec of def.sections) {
      if (!sec.id || !sec.title) failures.push(`${tag}: section sin id/title`);
      if (!Array.isArray(sec.blocks)) failures.push(`${tag}#${sec.id}: blocks[]`);
      else {
        for (const b of sec.blocks) {
          if (!KINDS.has(b.kind)) failures.push(`${tag}: kind inválido "${b.kind}"`);
        }
      }
    }
  }
  if (entry.behavior || def.hasBehavior) {
    const behRel = (entry.behavior || `./behaviors/${tag}.js`).replace(/\.js$/, '.ts');
    const beh = resolveCatalogPath(behRel);
    if (!existsSync(beh)) failures.push(`${tag}: hasBehavior pero falta ${behRel} → ${beh}`);
  }
}

for (const m of manifest) {
  if (!m.page) continue;
  if (!m.page.endsWith('.json')) {
    failures.push(`manifest ${m.tag}: page debe ser .json (tiene ${m.page})`);
  }
  if (!catalog[m.tag]) failures.push(`manifest ${m.tag}: no está en catalog.ts`);
  const entry = catalog[m.tag];
  if (entry) {
    // manifest.page es relativo a catalog (antes ./<cat>/is-x.json). Normalizar ambos.
    const norm = (p) => p.replace(/^\.\//, '').replace(/^\.\.\//, '').replace(/^components\//, '').replace(/^previews\//, '').replace(/^pages\//, '');
    const pageNorm = norm(m.page);
    const catNorm = norm(entry.json);
    const equivalent =
      pageNorm === catNorm ||
      `components/${pageNorm}` === catNorm ||
      pageNorm === `components/${catNorm}` ||
      `pages/${pageNorm}` === catNorm ||
      pageNorm === `pages/${catNorm}`;
    if (!equivalent) {
      failures.push(`manifest ${m.tag}: page=${m.page} vs catalog ${entry.json}`);
    }
  }
}

function walkHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, acc);
    else if (name.endsWith('.html')) acc.push(p);
  }
  return acc;
}
const htmls = walkHtml(previews).filter((p) => !p.endsWith('_shell.html'));
if (htmls.length) {
  for (const h of htmls.slice(0, 10)) failures.push(`HTML residual: ${h.slice(root.length + 1)}`);
  if (htmls.length > 10) failures.push(`… y ${htmls.length - 10} HTML más`);
}

if (failures.length) {
  console.error(`preview-json-contract.test.ts: FAIL — ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  … y ${failures.length - 40} más`);
  process.exit(1);
}

console.log(
  `preview-json-contract.test.ts: PASS — ${Object.keys(catalog).length} JSON v1 + catalog ↔ manifest`,
);
