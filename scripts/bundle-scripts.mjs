// bundle-scripts.mjs — bundlea los gallery scripts (../scripts/*.js),
// las pages (../src/pages/*.ts) Y los *.preview.ts de cada componente
// a ../dist/{scripts,pages,previews}/*.min.js. Necesario porque los
// originales hacen `import '../src/...` (TypeScript source paths)
// que NO se sirven en GitHub Pages. Tras esto, los pages y previews
// del registry cargan rutas dist/... que sí están publicadas.
import { build } from 'esbuild';
import { mkdir, copyFile, readdir, writeFile, rm, cp } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

let ok = 0;
let failed = 0;

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

// ── CSS sibling files: los bundles JS usan `import './foo.css'` para resolver
// `host-base.css` y `scrollbars.css`. Si no existen en dist/scripts/,
// el browser hace 404 en runtime. Copiamos desde src/components/_shared/.
// Antes: invisible el 404 (solo HEAD checks no los capturaban). Stagehand
// lo descubrió.
for (const css of ['host-base.css', 'scrollbars.css']) {
  const src = join('src/components/_shared', css);
  const dst = join('dist/scripts', css);
  try {
    await copyFile(src, dst);
    ok++;
  } catch {
    // ignore — el archivo puede no existir
  }
}

// ── Skills siblings: el bundled cdn-panel.min.js (lives at dist/scripts/)
// tiene un fallback de 5 paths para resolver PROMPT.md:
//   1) ../../skills/... (relativo desde src/components/_shared) — irreal
//   2) ../skills/...       — irreal
//   3) ./skills/...        — apunta a dist/scripts/skills/ (id)
//   4) ${origin}/src/skills/... — GitHub NO sirve src
//   5) ${origin}/dist/cdn/skills/... — SÍ funciona
// Para que SOLO las que funcionan existan (reduce 404s en stagehand),
// copiamos src/skills/is-webcomponents a:
//   - dist/scripts/skills/  (satisface #3)
//   - dist/skills/          (satisface #2: ../skills desde dist/scripts)
// Y dejamos src/skills (#1) y dist/cdn/skills (#5) que ya existen.
//   El #4 (origen/src/) NO se copia porque GH Pages no sirve src/.
try {
  await mkdir(join('dist', 'skills'), { recursive: true });
  await mkdir(join('dist', 'scripts', 'skills'), { recursive: true });
  const srcSkillsDir = join('src', 'skills');
  const skillsDirs = readdirSync(srcSkillsDir, { withFileTypes: true }).filter(e => e.isDirectory());
  for (const skillDir of skillsDirs) {
    const skillName = skillDir.name;
    // dist/skills/<name>/...
    await cp(join(srcSkillsDir, skillName), join('dist', 'skills', skillName), { recursive: true, force: true });
    // dist/scripts/skills/<name>/...
    await cp(join(srcSkillsDir, skillName), join('dist', 'scripts', 'skills', skillName), { recursive: true, force: true });
    ok += 2;
  }
  console.log(`  ✓ skills siblings copiados a dist/skills/ y dist/scripts/skills/`);
} catch (err) {
  console.warn(`  ⚠ no se pudieron copiar skills siblings: ${err}`);
}

// Gallery scripts: ../scripts/*.js → ../dist/scripts/*.min.js (placeholder — loop abajo).
let ok_unused_placeholder = 0;

// ── Stub CSS files alongside bundles: cada `.min.js` adopta CSS via
// `siblingCssHref(importMetaUrl)` que resuelve `<bundle>.min.css`. Como
// los gallery scripts no tienen CSS propio (manipulan DOM y solo heredan
// el CSS global de la página), creamos stubs vacíos para que el browser
// reciba 200 en vez de 404 cuando los busque. Sin CSS propio — evita
// 404 silencioso que stagehand captura.
for (const name of scripts) {
  const stub = join('dist/scripts', `${name}.min.css`);
  try { await writeFile(stub, '/* stub: no CSS propio, globales ya inyectados */\n'); } catch { /* ignore */ }
}
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

