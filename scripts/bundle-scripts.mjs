// bundle-scripts.mjs — bundlea los gallery scripts (../scripts/*.js) Y las
// pages (../src/pages/*.ts) como ESM a ../dist/scripts/*.min.js y
// ../dist/pages/*.min.js. Necesario porque los originales hacen
// `import '../src/...` (TypeScript source paths) que NO se sirven en
// GitHub Pages. Tras esto, los pages del registry cargan rutas dist/...,
// que sí están publicadas.
import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

const scripts = [
  'highlight-pre',
  'demo-code',
  'docs-chrome',
  'cdn-panel',
  'view-sources',
  'demo-file-meta',
];

const pages = [
  'home',
  'theming',
  'ecosystem',
];

await mkdir('dist/scripts', { recursive: true });
await mkdir('dist/pages', { recursive: true });

let ok = 0;
let failed = 0;

// Gallery scripts: ../scripts/*.js → ../dist/scripts/*.min.js
for (const name of scripts) {
  try {
    await build({
      entryPoints: [`scripts/${name}.js`],
      outfile: `dist/scripts/${name}.min.js`,
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      legalComments: 'none',
      sourcemap: false,
      treeShaking: true,
      resolveExtensions: ['.ts', '.js', '.tsx', '.mjs'],
      loader: { '.ts': 'ts', '.js': 'js' },
    });
    console.log(`  ✓ dist/scripts/${name}.min.js`);
    ok++;
  } catch (err) {
    console.error(`  ✗ dist/scripts/${name}.min.js — ${err}`);
    failed++;
  }
}

// Page behaviors: ../src/pages/*.ts → ../dist/pages/*.min.js
// + JSON definitions: ../src/pages/*.json → ../dist/pages/*.json (copia).
for (const name of pages) {
  try {
    await build({
      entryPoints: [`src/pages/${name}.ts`],
      outfile: `dist/pages/${name}.min.js`,
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      legalComments: 'none',
      sourcemap: false,
      treeShaking: true,
      resolveExtensions: ['.ts', '.js', '.tsx', '.mjs'],
      loader: { '.ts': 'ts', '.js': 'js' },
    });
    console.log(`  ✓ dist/pages/${name}.min.js`);
    ok++;
  } catch (err) {
    console.error(`  ✗ dist/pages/${name}.min.js — ${err}`);
    failed++;
  }
  // Copiar el JSON al dist para que el registry pueda fetcharlo.
  try {
    await copyFile(`src/pages/${name}.json`, `dist/pages/${name}.json`);
    console.log(`  ✓ dist/pages/${name}.json`);
    ok++;
  } catch (err) {
    console.error(`  ✗ dist/pages/${name}.json — ${err}`);
    failed++;
  }
}

console.log(`\nOK ${ok}/${scripts.length + pages.length * 2} bundleados/copiados${failed ? ` (${failed} fallaron)` : ''}.`);
