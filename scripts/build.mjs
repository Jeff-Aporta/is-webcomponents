// build.mjs — CDN artifacts folderizados: dist/cdn/{categoria}/{tag}.min.js
// + {tag}.min.css + is-base.min.css/palettes.min.css en la raiz.
// Ademas genera bundles por categoria (categoria.min.js) y all.min.js para
// poder cargar varios componentes con un solo <script type="module" src="..."></script>.
import { access, readdir, mkdir, stat, rm, writeFile } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'components');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const bundleJs = (entry, outfile) =>
  build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
  });

// bundle:false — los .min.js de cada tag ya están compilados y minificados;
// aquí solo generamos un archivo que los importa. Si se hiciera bundle:true
// esbuild inlinearía todo en un único módulo y `import.meta.url` (usado por
// adoptCss para localizar el .css hermano de cada componente) apuntaría al
// archivo de categoría/all en vez del componente, rompiendo el CSS.
const bundleVirtual = async (outfile, virtualEntry, sourcefile) => {
  const r = await build({
    bundle: false,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    write: false,
    stdin: { contents: virtualEntry, resolveDir: dist, loader: 'js', sourcefile },
  });
  const fs = await import('node:fs/promises');
  await fs.writeFile(outfile, r.outputFiles[0].text);
};

const bundleCss = (entry, outfile) => build({ entryPoints: [entry], outfile, minify: true });

async function walk(dir, out = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared') continue;
      await walk(p, out);
    } else if (/\.js$/.test(name.name) && name.name !== 'index.js') {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();

// Componentes por categoria segun manifest.js (single source of truth).
const manifestMod = await import('../manifest.js');
const manifest = manifestMod.default;
const byCategory = new Map();
for (const m of manifest) {
  if (!byCategory.has(m.category)) byCategory.set(m.category, []);
  byCategory.get(m.category).push(m);
}

// Mapa tag → componente
const tagToComponent = new Map();
for (const e of entries) {
  const tag = basename(e).replace(/\.js$/, '');
  tagToComponent.set(tag, e);
}

// Carpeta de salida por tag: la categoria del manifest manda; los modulos
// internos (marks, specs, datagrid-core...) usan su carpeta top-level en
// components/ como fallback.
const manifestCategoryByTag = new Map(
  manifest.map((m) => [m.tag.replace(/^is-/, ''), m.category]),
);
const folderFor = (file) => {
  const tag = basename(file).replace(/\.js$/, '');
  if (manifestCategoryByTag.has(tag)) return manifestCategoryByTag.get(tag);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

const scrollbarsIn = join(compRoot, '_shared', 'scrollbars.css');
const emittedFolders = new Set();

for (const inFile of entries) {
  const tag = basename(inFile).replace(/\.js$/, '');
  const folder = folderFor(inFile);
  const outDir = join(dist, folder);
  await mkdir(outDir, { recursive: true });
  const cssIn = inFile.replace(/\.js$/i, '.css');
  const outJs = join(outDir, `${tag}.min.js`);
  const outCss = join(outDir, `${tag}.min.css`);

  // adoptCss busca ./scrollbars.css junto al modulo: emitirlo una vez por carpeta.
  if (!emittedFolders.has(folder)) {
    emittedFolders.add(folder);
    await bundleCss(scrollbarsIn, join(outDir, 'scrollbars.css'));
  }

  await bundleJs(inFile, outJs);

  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleCss(cssIn, outCss);

  const [jsIn, jsOut] = await Promise.all([stat(inFile), stat(outJs)]);
  const cssSize = hasCss ? String((await stat(outCss)).size) : '—';
  console.log(
    `  ${(folder + '/' + tag).padEnd(28)} js ${String(jsIn.size).padStart(6)}→${String(jsOut.size).padStart(6)}  css ${cssSize.padStart(6)}`,
  );
}

const baseIn = join(root, 'styles', 'is-base.css');
const baseOut = join(dist, 'is-base.min.css');
await bundleCss(baseIn, baseOut);
const baseStat = await stat(baseOut);
console.log(`  ${'is-base'.padEnd(18)} css ${String(baseStat.size).padStart(6)}`);

const palettesIn = join(root, 'styles', 'palettes.css');
const palettesOut = join(dist, 'palettes.min.css');
await bundleCss(palettesIn, palettesOut);
const palettesStat = await stat(palettesOut);
console.log(`  ${'palettes'.padEnd(18)} css ${String(palettesStat.size).padStart(6)}`);

// ── Bundles por categoria ────────────────────────────────────────
// Cada categoria exporta TODOS los modulos <tag>.min.js que pertenezcan
// a la misma, lo que activa el side effect de `customElements.define`
// y deja el componente listo para usar.

const entriesImport = (tags) =>
  tags.map((t) => `import './${t}.min.js';`).join('\n');

for (const [category, items] of byCategory) {
  const tags = items.map((m) => m.tag.replace(/^is-/, '')).filter((t) => tagToComponent.has(t));
  if (!tags.length) continue;
  // El bundle vive DENTRO de la carpeta de la categoria: los imports
  // relativos './<tag>.min.js' resuelven a sus hermanos.
  const virtualEntry = `// categoria: ${category}\n${entriesImport(tags)}\n`;
  const outName = `${category}/category.${category}.min.js`;
  await mkdir(join(dist, category), { recursive: true });
  const out = join(dist, category, `category.${category}.min.js`);
  await bundleVirtual(out, virtualEntry, out);
  const outStat = await stat(out);
  console.log(`  ${outName.padEnd(34)} js ${String(outStat.size).padStart(6)}  (${tags.length} comps)`);
}

// ── Bundle all ───────────────────────────────────────────────────
// Re-importa cada <categoria>/<tag>.min.js desde la raiz de dist/cdn.
// Los CSS los carga cada componente en su shadow (adoptCss).
const allPaths = entries
  .map((e) => `${folderFor(e)}/${basename(e).replace(/\.js$/, '')}`)
  .sort();
const allVirtual = `// all.min.js — todos los componentes de IS Web Components\n${allPaths.map((p) => `import './${p}.min.js';`).join('\n')}\n`;
const allOut = join(dist, 'all.min.js');
await bundleVirtual(allOut, allVirtual, allOut);
const allStat = await stat(allOut);
console.log(`  ${'all.min'.padEnd(18)} js ${String(allStat.size).padStart(6)}  (${allPaths.length} comps)`);

await writeFile(
  join(dist, 'README.txt'),
  [
    'CDN artifacts (folderizados por categoria)',
    '  is-base.min.css                          — themes + brand palettes (link in the host app)',
    '  palettes.min.css                         — paletas de marca',
    '  <categoria>/<name>.min.js                — componente individual (carga su .min.css hermano en el shadow)',
    '  <categoria>/<name>.min.css               — estilos del componente (junto al .min.js)',
    '  <categoria>/category.<categoria>.min.js  — todos los componentes de esa categoria',
    '  all.min.js                               — todos los componentes en un archivo',
    '  assets/icons/                            — SVGs Iconify + <prefix>.json + index.json',
    '  Los tags conservan el prefijo is-* (p.ej. actions/button.min.js → <is-button>).',
    '',
    'Uso:',
    '  <link rel="stylesheet" href=".../is-base.min.css">',
    '  <script type="module" src=".../actions/button.min.js"></script>',
    '  <!-- el .min.css lo trae el propio componente -->',
    '  <script type="module" src=".../actions/category.actions.min.js"></script>',
    '  <script type="module" src=".../all.min.js"></script>',
    '',
  ].join('\n'),
);

// ── Iconos locales ───────────────────────────────────────────────
// Si existen assets/icons/{prefix}/{name}.svg (generados por
// scripts/download-icons.mjs), los copiamos junto al bundle para que
// <is-icon> pueda servirlos directamente desde el CDN jsDelivr sin
// depender del script iconify-icon de Iconify.
const iconsSrc = join(root, 'assets', 'icons');
const iconsOut = join(dist, 'assets', 'icons');
try {
  await access(iconsSrc);
  await rm(iconsOut, { recursive: true, force: true });
  await mkdir(iconsOut, { recursive: true });
  // Copia solo los archivos publicos (no .state/).
  const copy = async (srcDir, dstDir) => {
    await mkdir(dstDir, { recursive: true });
    for (const entry of await readdir(srcDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue; // omite .state y dotfiles
      const sp = join(srcDir, entry.name);
      const dp = join(dstDir, entry.name);
      if (entry.isDirectory()) await copy(sp, dp);
      else await import('node:fs/promises').then((fs) => fs.copyFile(sp, dp));
    }
  };
  await copy(iconsSrc, iconsOut);
  let iconFiles = 0;
  const walkIcons = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walkIcons(p);
      else iconFiles++;
    }
  };
  await walkIcons(iconsOut);
  const ic = await stat(iconsOut).catch(() => null);
  if (ic) console.log(`  assets/icons         ${(iconFiles).toString().padStart(6)} files copied into dist/cdn/assets/icons/`);
} catch {
  // No hay assets/icons/ todavia; ignorar.
}

console.log(`OK dist/cdn  ${entries.length} components + is-base + ${byCategory.size} categories + all`);