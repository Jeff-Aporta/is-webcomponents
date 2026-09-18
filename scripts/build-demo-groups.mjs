#!/usr/bin/env node
// scripts/build-demo-groups.mjs
//
// F0.2 variante: agrupa por CATEGORÍA DE DEMO (no por path de archivo).
// Esto le da a cada sub-agente un dominio cohesivo (todos los forms, todos los
// charts, etc.) y produce propuestas exhaustivas para "cada demo, cada botón".
//
// Output: .audit/demo-groups.json
//
// Uso: node scripts/build-demo-groups.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DISCOVERY = JSON.parse(readFileSync(join(ROOT, '.audit/discovery.json'), 'utf8'));
const DIST = join(ROOT, 'dist/previews');

// Listar todos los demo bundles organizados por categoría.
const cats = readdirSync(DIST, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const groups = [];
let idx = 1;
for (const cat of cats) {
  const catDir = join(DIST, cat);
  const demos = readdirSync(catDir)
    .filter(f => f.endsWith('.preview.min.js'))
    .map(f => f.replace('.preview.min.js', ''))
    .sort();
  if (demos.length === 0) continue;

  // Recolectar testables que caen dentro de esta categoría.
  // Por simplicidad, filtra los testables cuyo path incluya el nombre de la categoría
  // o de cualquiera de los demos.
  const catTestables = DISCOVERY.testables.filter(t => {
    const fp = (t.file || '').toLowerCase();
    return fp.includes(`/${cat}/`) || demos.some(d => fp.includes(`/${d}.preview.ts`) || fp.includes(`/${d}.json`));
  });

  groups.push({
    id: `demo-g${String(idx).padStart(2, '0')}`,
    label: `${cat} (${demos.length} demos: ${demos.join(', ')})`,
    category: cat,
    demos,
    testables: catTestables
  });
  idx++;
}

// Grupo extra: páginas (home, theming, ecosystem) + gallery SPA.
const pages = readdirSync(join(ROOT, 'dist/pages'))
  .filter(f => f.endsWith('.min.js'))
  .map(f => f.replace('.min.js', ''));

const pageTestables = DISCOVERY.testables.filter(t => {
  const fp = (t.file || '').toLowerCase();
  return fp.includes('pages/') || fp.includes('gallery') || fp.includes('app.ts');
});

groups.push({
  id: `demo-g${String(idx).padStart(2, '0')}`,
  label: `pages + gallery (${pages.length} pages + gallery SPA: ${pages.join(', ')})`,
  category: 'pages-gallery',
  demos: pages,
  extras: ['gallery-app.min.js (SPA, navbar, theme switcher, view toggles)'],
  testables: pageTestables
});

const out = {
  profile: DISCOVERY.profile,
  source: 'custom-by-demo-category',
  totalDemos: groups.reduce((s, g) => s + g.demos.length, 0),
  totalTestables: groups.reduce((s, g) => s + g.testables.length, 0),
  groups
};

writeFileSync(join(ROOT, '.audit/demo-groups.json'), JSON.stringify(out, null, 2));
console.log(`[F0.2-demo] ${groups.length} grupos → ${out.totalDemos} demos, ${out.totalTestables} testables`);
for (const g of groups) {
  console.log(`  ${g.id}: ${g.demos.length} demos, ${g.testables.length} testables — ${g.label.slice(0, 80)}`);
}
