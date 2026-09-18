// bundle-scripts.mjs — bundlea los gallery scripts (../scripts/*.js),
// las pages (../src/pages/*.ts) Y los *.preview.ts de cada componente
// a ../dist/{scripts,pages,previews}/*.min.js. Necesario porque los
// originales hacen `import '../src/...` (TypeScript source paths)
// que NO se sirven en GitHub Pages. Tras esto, los pages y previews
// del registry cargan rutas dist/... que sí están publicadas.
import { build } from 'esbuild';
import { mkdir, copyFile, readdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

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

// ── Componentes: bundlear todos los *.preview.ts a dist/previews/ ───────
// El catalog.ts referencia '../components/<cat>/<tag>.preview.js' (TS
// source) para los behaviors. Bundleamos uno por uno al deployable path.
const componentsRoot = 'src/components';
const previewsOut = 'dist/previews';
await mkdir(previewsOut, { recursive: true });

const allPreviews = [];
for (const cat of await readdir(componentsRoot, { withFileTypes: true })) {
  if (!cat.isDirectory() || cat.name.startsWith('_')) continue;
  const catDir = join(componentsRoot, cat.name);
  for (const entry of await readdir(catDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.preview.ts')) continue;
    const name = entry.name.replace(/\.preview\.ts$/, '');
    allPreviews.push({ category: cat.name, name });
  }
}

console.log(`\n${allPreviews.length} componentes con *.preview.ts detectados:`);

for (const { category, name } of allPreviews) {
  const src = join(componentsRoot, category, `${name}.preview.ts`);
  const dstFolder = join(previewsOut, category);
  const dstFile = join(dstFolder, `${name}.preview.min.js`);
  try {
    await mkdir(dstFolder, { recursive: true });
    await build({
      entryPoints: [src],
      outfile: dstFile,
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
    ok++;
  } catch (err) {
    // Capture but don't abort: si 1 preview falla, los demás siguen.
    console.warn(`  ⚠ ${category}/${name}.preview.min.js — ${String(err).slice(0, 90)}`);
  }
}

// ── JSONs de definitions: copiar TODOS los src/components/<cat>/<name>.json
// a dist/previews/<cat>/<name>.json. Cubrimos tanto los que tienen preview
// como los que NO (masked-input, mention, etc.).
let jsonCount = 0;
for (const cat of await readdir(componentsRoot, { withFileTypes: true })) {
  if (!cat.isDirectory() || cat.name.startsWith('_')) continue;
  const catDir = join(componentsRoot, cat.name);
  for (const entry of await readdir(catDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const name = entry.name.replace(/\.json$/, '');
    const jsonSrc = join(catDir, entry.name);
    const jsonDst = join(previewsOut, cat.name, entry.name);
    try {
      await mkdir(dirname(jsonDst), { recursive: true });
      await copyFile(jsonSrc, jsonDst);
      jsonCount++;
    } catch (err) {
      // ignore
    }
  }
}
ok += jsonCount;

// ── Skills: src/skills/** ya está copiado por build.mjs → dist/cdn/skills/.
// Aquí evitamos duplicar; el build principal es quien lo hace. Solo
// verificamos.
try {
  const skillsList = await readdir('dist/cdn/skills');
  console.log(`\nskills/ ${skillsList.length} → dist/cdn/skills/ (verificado)`);
} catch {
  console.error('  ⚠ dist/cdn/skills no existe — ¿corrió `npm run build`?');
}

console.log(`\nOK ${ok} bundleados/copiados (${failed} fallaron) en total.`);
console.log(`  - ${scripts.length} scripts → dist/scripts/`);
console.log(`  - ${pages.length * 2} pages → dist/pages/`);
console.log(`  - ${allPreviews.length} previews → dist/previews/`);
console.log(`  - ${jsonCount} JSONs → dist/previews/`);

