// tests/preview-json-contract.test.mjs
//
// Todos los previews son JSON homogéneos (is-preview/v1) listados en catalog.js.
// Guardián anti-regresión: no volver a HTML por componente.
//
// Uso: node tests/preview-json-contract.test.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import catalog from '../src/previews/catalog.js';
import { default as manifest } from '../manifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const previews = join(root, 'src', 'previews');
const failures = [];

const KINDS = new Set(['demo', 'callout', 'code', 'html', 'table', 'lede']);

for (const [tag, entry] of Object.entries(catalog)) {
  const jsonPath = join(previews, entry.json.replace(/^\.\//, ''));
  if (!existsSync(jsonPath)) {
    failures.push(`${tag}: falta ${entry.json}`);
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
    const beh = join(previews, (entry.behavior || `./behaviors/${tag}.js`).replace(/^\.\//, ''));
    if (!existsSync(beh)) failures.push(`${tag}: hasBehavior pero falta ${beh}`);
  }
}

for (const m of manifest) {
  if (!m.page) continue;
  if (!m.page.endsWith('.json')) {
    failures.push(`manifest ${m.tag}: page debe ser .json (tiene ${m.page})`);
  }
  if (!catalog[m.tag]) failures.push(`manifest ${m.tag}: no está en catalog.js`);
  const expected = m.page;
  const entry = catalog[m.tag];
  if (entry && entry.json.replace(/^\.\//, '') !== expected) {
    failures.push(`manifest ${m.tag}: page=${expected} vs catalog ${entry.json}`);
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
  console.error(`preview-json-contract.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  … y ${failures.length - 40} más`);
  process.exit(1);
}

console.log(
  `preview-json-contract.test.mjs: PASS — ${Object.keys(catalog).length} JSON v1 + catalog ↔ manifest`,
);
