// tests/helpers-homogeneity.test.mjs
//
// Toda utilería pública en helpers/ debe tener tab (manifest.page) + JSON
// presentador bajo src/previews/helpers/ (is-preview/v1).
//
// Uso: node tests/helpers-homogeneity.test.mjs

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const helpersDir = join(root, 'src', 'components', 'helpers');
const previewsDir = join(root, 'src', 'previews', 'helpers');

const { default: manifest } = await import('../manifest.js');
const failures = [];

const INTERNAL_JS = new Set(['floating.js']); // documentado como internal

const helperJs = readdirSync(helpersDir).filter((f) => f.endsWith('.js'));
for (const file of helperJs) {
  if (INTERNAL_JS.has(file)) continue;
  const entry = manifest.find((m) => (m.script || '').replace(/\\/g, '/').endsWith(`helpers/${file}`));
  if (!entry) {
    failures.push(`${file}: falta en manifest.js (tab de Utilerías)`);
    continue;
  }
  if (!entry.page) {
    failures.push(`${entry.tag}: sin page — necesita JSON presentador`);
    continue;
  }
  if (!entry.page.startsWith('helpers/') || !entry.page.endsWith('.json')) {
    failures.push(`${entry.tag}: page="${entry.page}" debería ser helpers/*.json`);
  }
  const json = join(root, 'src', 'previews', entry.page);
  if (!existsSync(json)) {
    failures.push(`${entry.tag}: falta preview ${entry.page}`);
  }
  const md = join(helpersDir, file.replace(/\.js$/, '.md'));
  if (!existsSync(md)) {
    failures.push(`${file}: falta ${file.replace(/\.js$/, '.md')}`);
  }
}

const navHelpers = manifest.filter((m) => m.category === 'helpers' && m.page);
for (const entry of navHelpers) {
  const json = join(root, 'src', 'previews', entry.page);
  if (!existsSync(json)) failures.push(`nav ${entry.tag}: JSON ausente ${entry.page}`);
}

for (const name of readdirSync(previewsDir).filter((f) => f.endsWith('.json'))) {
  const page = `helpers/${name}`;
  if (!manifest.some((m) => m.page === page)) {
    failures.push(`preview huérfano ${page}: no está en manifest`);
  }
}

if (failures.length) {
  console.error(`helpers-homogeneity.test.mjs: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `helpers-homogeneity.test.mjs: PASS — ${helperJs.length - INTERNAL_JS.size} módulos + ${navHelpers.length} tabs Utilerías`,
);
