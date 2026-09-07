#!/usr/bin/env node
/**
 * scripts/migrate-tests.mjs
 *
 * Migración única: tests/ → src/utils/health/<categoria>/
 * TAREA 3 del handoff 2026-09-07-v2.
 *
 * Categorías:
 *   - meta/      → estructurales (layout, contratos, manifiestos, invariantes)
 *   - diagrams/  → diagramas (sequence, er, flowchart, block, edge)
 *   - domain/    → componentes y features específicos
 *   - e2e/       → (ya existe; no tocamos)
 *
 * Uso: node scripts/migrate-tests.mjs
 */
import { readdirSync, statSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const META = new Set([
  'src-layout.test.ts',
  'dist-cdn-layout.test.ts',
  'cdn-folders.test.ts',
  'cdn-mirrors.test.ts',
  'cdn-snippet-match.test.ts',
  'cdn-loader.test.ts',
  'cdn-icons.test.ts',
  'manifest-paths.test.ts',
  'preview-paths.test.ts',
  'preview-json-contract.test.ts',
  'preview-blocks.test.ts',
  'specs-sdd.test.ts',
  'deps-snippet.test.ts',
  'helpers-homogeneity.test.ts',
  'gallery-sources-meta.test.ts',
  'llm-contract.test.ts',
  'llm-links.test.ts',
  'component-audit.test.ts',
  'component-sources.test.ts',
  'brand-casing.test.ts',
  'default-brand.test.ts',
  'sidebar-brand.test.ts',
  'assets-copia-unica.test.ts',
  'home-invariants.test.ts',
  'ux-gallery-invariants.test.ts',
  'url-nav.test.ts',
  'robots-sitemap.test.ts',
  'nav-home-item.test.ts',
  'skills-cdn.test.ts',
  'theme-contract.test.ts',
  'theme-toggle-icon.test.ts',
  'smoke-runtime.test.ts',
  'smoke-runtime.html',
  'visual-check-icon-button.html',
  'visual-copy-button.html',
  'visual-fab.html',
]);

const DIAGRAMS = new Set([
  'diagram-text-wrap.test.ts',
  'diagram-wrap-integration.test.ts',
  'diagram-edge-actors.test.ts',
  'component-diagram-ifaces.test.ts',
  'sequence-legend-grid.test.ts',
  'sequence-self-loop.test.ts',
  'er-clusters.test.ts',
]);

// resto → domain/

function categorize(name) {
  if (META.has(name)) return 'meta';
  if (DIAGRAMS.has(name)) return 'diagrams';
  return 'domain';
}

const srcDir = join(root, 'tests');
const dstRoot = join(root, 'src', 'utils', 'health');

const files = readdirSync(srcDir).filter((n) => {
  const p = join(srcDir, n);
  return statSync(p).isFile();
});

const moves = [];
for (const name of files) {
  const cat = categorize(name);
  const dstDir = join(dstRoot, cat);
  mkdirSync(dstDir, { recursive: true });
  const src = join(srcDir, name);
  const dst = join(dstDir, name);
  renameSync(src, dst);
  moves.push({ name, cat, src, dst });
}

console.log(`movidos: ${moves.length}`);
for (const m of moves) console.log(`  ${m.name} -> ${m.cat}/`);

// limpia tests/ vacío
try {
  const rest = readdirSync(srcDir);
  if (rest.length === 0) {
    renameSync(srcDir, join(root, 'tests.bak'));
    console.log('tests/ renombrado a tests.bak (vacío)');
  } else {
    console.log(`tests/ aún tiene ${rest.length} entradas: ${rest.join(', ')}`);
  }
} catch (e) {
  console.log(`tests/ ya no existe: ${e.message}`);
}