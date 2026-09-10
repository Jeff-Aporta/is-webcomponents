// tests/helpers-homogeneity.test.ts
//
// Toda utilería pública en helpers/ debe tener tab (manifest.page) + JSON
// presentador junto al componente (src/components/helpers/, is-preview/v1).
//
// Uso: node tests/helpers-homogeneity.test.ts

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));
const helpersDir = join(root, 'src', 'components', 'helpers');
const previewsDir = join(root, 'src', 'components', 'helpers');

const { default: manifest } = await import('../../../manifest.js');
const failures = [];

const INTERNAL_TS = new Set([
  'floating.ts', // building block interno
  'md-lite.ts', // util compartida (no tag)
  'md-editor-api.ts', // cliente CRUD del editor (no tag)
  'response-cache.ts', // util interna (no tag)
]);

// Consolidación 2026-09-07: helpers/ fuente es .ts; el manifest script apunta
// a '../../components/helpers/<x>.js' (extensión de import; en disco .ts).
const helperTs = readdirSync(helpersDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.preview.ts') && !f.endsWith('.d.ts') && !f.includes('.selfcheck.'));
for (const file of helperTs) {
  if (INTERNAL_TS.has(file)) continue;
  const baseFile = file.replace(/\.ts$/, '.js');
  const entry = manifest.find((m) => (m.script || '').replace(/\\/g, '/').endsWith(`helpers/${baseFile}`));
  if (!entry) {
    failures.push(`${file}: falta en manifest.js (tab de Utilerías)`);
    continue;
  }
  if (!entry.page) {
    failures.push(`${entry.tag}: sin page — necesita JSON presentador`);
    continue;
  }
  if (!entry.page.startsWith('components/helpers/') || !entry.page.endsWith('.json')) {
    failures.push(`${entry.tag}: page="${entry.page}" debería ser components/helpers/*.json`);
  }
  const json = join(root, 'src', entry.page);
  if (!existsSync(json)) {
    failures.push(`${entry.tag}: falta preview ${entry.page}`);
  }
  const md = join(helpersDir, file.replace(/\.ts$/, '.md'));
  if (!existsSync(md)) {
    failures.push(`${file}: falta ${file.replace(/\.ts$/, '.md')}`);
  }
}

const navHelpers = manifest.filter((m) => m.category === 'helpers' && m.page);
for (const entry of navHelpers) {
  const json = join(root, 'src', entry.page);
  if (!existsSync(json)) failures.push(`nav ${entry.tag}: JSON ausente ${entry.page}`);
}

for (const name of readdirSync(previewsDir).filter((f) => f.endsWith('.json'))) {
  const page = `components/helpers/${name}`;
  if (!manifest.some((m) => m.page === page)) {
    failures.push(`preview huérfano ${page}: no está en manifest`);
  }
}

if (failures.length) {
  console.error(`helpers-homogeneity.test.ts: FAIL — ${failures.length}\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `helpers-homogeneity.test.ts: PASS — ${helperTs.length - INTERNAL_TS.size} módulos + ${navHelpers.length} tabs Utilerías`,
);
