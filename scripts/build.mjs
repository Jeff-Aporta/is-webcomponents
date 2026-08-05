// build.mjs — CDN artifacts folderizados: dist/cdn/{categoria}/{tag}.min.js
// + {tag}.min.css + is-base.min.css/palettes.min.css en la raiz.
// Ademas genera bundles por categoria (categoria.min.js) y all.min.js para
// poder cargar varios componentes con un solo <script type="module" src="..."></script>.
import { access, readdir, mkdir, stat, rm, writeFile, readFile } from 'node:fs/promises';
import { join, dirname, basename, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');

// Limpieza selectiva: se borran los artefactos de codigo pero NO
// dist/cdn/assets/. Ahi viven ~317k SVG que no cambian entre builds; borrarlos
// y recopiarlos en cada corrida hace el build lento y, sobre todo, dispara los
// file watchers del editor (Live Server recarga en bucle mientras se compila).
await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (entry.name === 'assets') continue;
  await rm(join(dist, entry.name), { recursive: true, force: true });
}

const bundleJs = (entry, outfile, plugins = []) =>
  build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    plugins,
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

// Los componentes que importan OTROS componentes (p. ej. casi todos importan
// media/icon.js) no deben inlinearlos: esbuild duplicaria la clase y, peor,
// `import.meta.url` del componente inlineado apuntaria al ARCHIVO ANFITRION,
// asi que adoptCss pedia el CSS equivocado (is-icon acababa cargando
// actions/button.min.css y perdia su tamano). Se marcan como externos y se
// reescriben al hermano folderizado, que ya existe en dist.
const externalComponents = {
  name: 'external-components',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.js$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      if (!abs.startsWith(compRoot)) return null;
      // Los helpers de _shared no registran custom elements: se inlinean.
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const tag = basename(abs).replace(/\.js$/, '');
      if (!tagToComponent.has(tag)) return null;
      return { path: `../${folderFor(abs)}/${tag}.min.js`, external: true };
    });
  },
};

// Los CSS de componente hacen `@import url('../_shared/<x>.css')`. Ese import
// se resuelve EN EL NAVEGADOR contra la ruta del .css publicado, asi que el
// archivo tiene que existir tambien en dist. Sin esto, chart y los 9 diagramas
// perdian entero el kit compartido (diagram-kit.css) en el bundle: entre otras
// cosas, `.dg-tooltip { position: absolute }`, y el tooltip pasaba a ocupar
// espacio en el flujo y empujaba el grafico al hacer hover.
const sharedImports = new Set();
for (const file of entries) {
  const cssFile = file.replace(/\.js$/i, '.css');
  let css = '';
  try { css = await readFile(cssFile, 'utf8'); } catch { continue; }
  for (const m of css.matchAll(/@import\s+url\(\s*['"]\.\.\/_shared\/([\w.-]+\.css)['"]\s*\)/g)) {
    sharedImports.add(m[1]);
  }
}
for (const name of sharedImports) {
  await mkdir(join(dist, '_shared'), { recursive: true });
  await bundleCss(join(compRoot, '_shared', name), join(dist, '_shared', name));
  console.log(`  ${('_shared/' + name).padEnd(28)} css (destino de @import)`);
}

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

  await bundleJs(inFile, outJs, [externalComponents]);

  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleCss(cssIn, outCss);

  const [jsIn, jsOut] = await Promise.all([stat(inFile), stat(outJs)]);
  const cssSize = hasCss ? String((await stat(outCss)).size) : '—';
  console.log(
    `  ${(folder + '/' + tag).padEnd(28)} js ${String(jsIn.size).padStart(6)}→${String(jsOut.size).padStart(6)}  css ${cssSize.padStart(6)}`,
  );
}

// Reescribe los @import a hermanos: en fuente son `./chart.css`, pero en dist
// el archivo se llama `chart.min.css`. Sin esto los 10 charts tipados
// (bar, line, pie...) importaban una ruta inexistente y perdian la hoja base
// entera en el bundle publicado. Los `_shared/*.css` se emiten con su nombre
// original, asi que no se tocan.
{
  const { readFile: rf, writeFile: wf } = await import('node:fs/promises');
  const dirs = (await readdir(dist, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name !== 'assets')
    .map((d) => d.name);
  let arreglados = 0;
  for (const dir of dirs) {
    const abs = join(dist, dir);
    const files = await readdir(abs);
    const minSet = new Set(files.filter((f) => f.endsWith('.min.css')));
    for (const f of files.filter((x) => x.endsWith('.min.css'))) {
      const file = join(abs, f);
      const css = await rf(file, 'utf8');
      const next = css.replace(
        /@import\s*(url\(\s*)?["'](\.\/)?([\w-]+)\.css["']\s*\)?/g,
        (whole, urlOpen, dot, name) => (minSet.has(`${name}.min.css`)
          ? `@import"./${name}.min.css"`
          : whole),
      );
      if (next !== css) { await wf(file, next); arreglados += 1; }
    }
  }
  if (arreglados) console.log(`  @import hermanos reescritos a .min.css en ${arreglados} archivos`);
}

const baseIn = join(root, 'src', 'styles', 'is-base.css');
const baseOut = join(dist, 'is-base.min.css');
await bundleCss(baseIn, baseOut);
const baseStat = await stat(baseOut);
console.log(`  ${'is-base'.padEnd(18)} css ${String(baseStat.size).padStart(6)}`);

const palettesIn = join(root, 'src', 'styles', 'palettes.css');
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

// ── sizes.json ───────────────────────────────────────────────────
// Mapa {ruta relativa → bytes} de todo el JS/CSS publicado. El front
// (demo-code.js, is-cdn-snippet) lo consulta UNA vez por el CDN para
// sumar el peso de un snippet: pedir un HEAD por archivo era lento y
// jsDelivr no siempre devuelve Content-Length.
const sizes = {};
const walkSizes = async (dir, prefix = '') => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'assets') continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { await walkSizes(join(dir, entry.name), rel); continue; }
    if (!/\.min\.(js|css)$/i.test(entry.name)) continue;
    sizes[rel] = (await stat(join(dir, entry.name))).size;
  }
};
await walkSizes(dist);
await writeFile(join(dist, 'sizes.json'), `${JSON.stringify(sizes, null, 0)}\n`);
console.log(`  ${'sizes.json'.padEnd(18)}    ${String(Object.keys(sizes).length).padStart(6)} archivos medidos`);

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
    '  sizes.json                               — {ruta: bytes} de todo el .min.js/.min.css publicado',
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
    'Docs / skills (FUENTE, no van en dist/cdn):',
    '  components/**/LLM.md, components/**/*.md  — docs LLM de componentes',
    '  skills/is-webcomponents/                  — skill agentes IDE',
    '  npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents',
    '',
  ].join('\n'),
);

// ── Iconos locales ───────────────────────────────────────────────
// Si existen assets/icons/{prefix}/{name}.svg (generados por
// scripts/download-icons.mjs), los copiamos junto al bundle para que
// <is-icon> pueda servirlos directamente desde el CDN jsDelivr sin
// depender del script iconify-icon de Iconify.
const iconsSrc = join(root, 'src', 'assets', 'icons');
const iconsOut = join(dist, 'assets', 'icons');
try {
  await access(iconsSrc);
  await mkdir(iconsOut, { recursive: true });
  // Copia INCREMENTAL: solo los archivos que faltan o cambiaron de tamano.
  // Un `rm -rf` + copia completa reescribia 317k archivos en cada build.
  const { copyFile } = await import('node:fs/promises');
  let copied = 0;
  let kept = 0;
  const copy = async (srcDir, dstDir) => {
    await mkdir(dstDir, { recursive: true });
    for (const entry of await readdir(srcDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue; // omite .state y dotfiles
      const sp = join(srcDir, entry.name);
      const dp = join(dstDir, entry.name);
      if (entry.isDirectory()) { await copy(sp, dp); continue; }
      const [src, dst] = await Promise.all([stat(sp), stat(dp).catch(() => null)]);
      if (dst && dst.size === src.size && dst.mtimeMs >= src.mtimeMs) { kept += 1; continue; }
      await copyFile(sp, dp);
      copied += 1;
    }
  };
  await copy(iconsSrc, iconsOut);
  console.log(`  assets/icons         ${String(copied).padStart(6)} copiados, ${kept} ya al dia en dist/cdn/assets/icons/`);
} catch {
  // No hay assets/icons/ todavia; ignorar.
}

console.log(`OK dist/cdn  ${entries.length} components + is-base + ${byCategory.size} categories + all`);