// build.mjs — CDN folderizado: dist/cdn/{categoria}/{tag}.min.js + .min.css
// + is-base/palettes + loader.min.js. Sin all.min.js ni category.*.min.js.
import { access, readdir, mkdir, stat, rm, writeFile, readFile, copyFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, basename, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { bundleMinJs, bundleMinCss, docsBanner, bundleLoader } from '../src/cdn/build/bundle-min.ts';
import { stampDirectory, hashFile, rewriteHtmlTree, hashesJson, applyHashToHtml, ASSET_HASHES_NAME } from '../src/cdn/build/stamp-hashes.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const dist = join(root, 'dist', 'cdn');
const compRoot = join(root, 'src', 'components');
// Staging de SCSS→CSS: `deno task build:scss` compila cada `src/**/*.scss`
// a `.tmp-scss/src/<mismo-path>.css` y BORRA los `.css` previos en `src/`.
// Aqui leemos SIEMPRE del staging: si build-scss no se ha corrido, `access`
// falla, `hasCss` queda en false y el componente sale sin CSS (el guard
// de "smoke test" del build detectara el problema). No leemos nunca
// `src/**/*.css` directamente para evitar pisar el staging y ensuciar
// otra vez el working tree.
const cssRoot = join(root, '.tmp-scss', 'src');

/** SHA de HEAD para shaDefault. Sin git, el loader queda en main. */
function shaDelBuild() {
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch { /* sin git */ }
  return 'main';
}

// Índice de utilidades _shared para el preview «Ecosistema JS».
// (Carpeta `ops/` desde refactor(scripts) c693e58a45; antes vivía en `scripts/`.)
await import('./ops/gen-shared-index.ts');

// ─────────────────────── PROTOCOLO DE CONSTRUCCION ───────────────────────
//
//   En dist/cdn/ se borra TODO en cada build. Los assets estáticos (iconos,
//   favicon, etc.) viven en dist/assets/, hermano de dist/cdn/, y NO se tocan.
//
// Todo lo de dist/cdn/ (los .min.js, .min.css, loader, skills, docs) es
// GENERADO: se reconstruye entero en cada corrida.
//
// `dist/assets/` es FUENTE versionada: ~317k SVG y material del kit. No se
// genera desde `src/` — `src/assets/` se eliminó para no duplicar.
//
// Consecuencias practicas:
//   - `deno task icons:download` escribe en dist/assets/icons/.
//   - Mas abajo se VERIFICA que el set siga entero (MIN_ICONOS); no se copia.
//   - Quien anada material nuevo al kit lo pone en dist/assets/, no en src.
//
// Los assets fuera de dist/cdn/ evitan mezclar material estático con bundles CDN.
const PRESERVAR = new Set();

/**
 * Minimo de ficheros que debe tener dist/assets/icons/.
 *
 * Es un canario, no una cifra exacta. Desde 2026-10-09 solo viajan en el repo
 * mdi (7447) y tabler (6184) + el catalogo (index/collections/manifest/viewbox):
 * el resto de sets lo sirve la API de Iconify y cada app lleva sus iconos en
 * assets/iconify/. Quedar por debajo significa que alguien borro material publicado.
 */
const MIN_ICONOS = 13_000;

await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (PRESERVAR.has(entry.name)) continue;
  await rm(join(dist, entry.name), { recursive: true, force: true });
}

const bundleJs = (entry, outfile, plugins = [], bannerJs = '', define = undefined) =>
  bundleMinJs({ entry, outfile, plugins, banner: bannerJs, define });

// El CSS de cada componente viaja DENTRO de su .min.js, no como fetch aparte.
// El href del .css hermano solo se conocia tras ejecutar el .js, asi que esas
// peticiones eran cascada pura y no se paralelizaban con nada: para pintar un
// <iswc-tree-view> eran 24 de 38. `define` sustituye el identificador por el
// literal ya minificado; `adoptCss` lo adopta con replaceSync.
//
// Se sigue emitiendo el .min.css hermano: lo consumen el sheet-cache del
// loader, quien enlace la hoja a mano y el propio src/ sin empaquetar.
const defineCss = async (cssFile) => {
  try {
    const texto = await readFile(cssFile, 'utf8');
    return { __IS_COMPONENT_CSS__: JSON.stringify(texto) };
  } catch {
    return undefined;
  }
};

const GH_RAW = 'https://raw.githubusercontent.com/Jeff-Aporta/iswc-root/main';
const GH_BLOB = 'https://github.com/Jeff-Aporta/iswc-root/blob/main';
const CDN_SKILL = `${GH_RAW}/skills/is-cdn-install/SKILL.md`;
const KIT_SKILL = `${GH_RAW}/skills/iswc-root/SKILL.md`;
// Consolidación 2026-09-07: src/components/LLM.md y src/cdn/LLM.md eliminados.
// El catálogo global vive en specs/componentes.md; el doc del loader en
// src/cdn/loader.md (sin cambio).
const CDN_COMP_INDEX = `${GH_RAW}/specs/componentes.md`;
const CDN_LOADER_MD = `${GH_RAW}/src/cdn/loader.md`;

const componentDocsBanner = (folder, tag) => {
  const skillFile = join(compRoot, folder, `${tag}.md`);
  const componentSkill = existsSync(skillFile)
    ? `${GH_RAW}/src/components/${folder}/${tag}.md`
    : `(sin ${tag}.md) → ${KIT_SKILL}`;
  const lines = [
    `component-skill: ${componentSkill}`,
    `kit-skill: ${KIT_SKILL}`,
    `component: ${componentSkill}`,
    `category: ${CDN_COMP_INDEX}`,
    `kit: ${CDN_COMP_INDEX}`,
    `loader: ${CDN_LOADER_MD}`,
    `cdn-install: ${CDN_SKILL}`,
    `blob: ${GH_BLOB}/src/components/${folder}/${tag}.js`,
  ];
  return docsBanner(lines);
};

const kitDocsBanner = (extra = []) => docsBanner([
  `kit-skill: ${KIT_SKILL}`,
  `cdn-install: ${CDN_SKILL}`,
  ...extra,
]);

const bundleCss = (entry, outfile) => bundleMinCss(entry, outfile);

async function walk(dir, out = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '_shared') continue;
      await walk(p, out);
    } else if (/\.(ts|js)$/.test(name.name) && !/^index\.(ts|js)$/.test(name.name)
               && !name.name.endsWith('.d.ts')
               && !name.name.includes('.selfcheck.')
               && !name.name.includes('.preview.')
               && !name.name.endsWith('.json')
               // Companions de iswc-doc-demo: boot ESM + host module (no CE).
               && !/^doc-demo-(boot|host)\.(ts|js)$/.test(name.name)
               // Companions Zod (W54): esquemas declarativos; los importa el
               // `.ts` padre via `import {...} from './foo.schemas.js'`, asi
               // que esbuild los inlinea cuando procesa al padre. Procesarlos
               // ademas como entry los duplica y rompe si el WIP no compila.
               && !name.name.endsWith('.schemas.ts')) {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();

// Componentes por categoria segun manifest.js (single source of truth).
const manifestMod = await import('../src/manifest.js');
const manifest = manifestMod.default;
const byCategory = new Map();
for (const m of manifest) {
  if (!byCategory.has(m.category)) byCategory.set(m.category, []);
  byCategory.get(m.category).push(m);
}

// Mapa tag → componente
const tagToComponent = new Map();
for (const e of entries) {
  // `.ts` ademas de `.js`: sin esto un componente migrado se registraba con el
  // tag «dropdown.ts» y los que lo importaban dejaban de reconocerlo, asi que
  // esbuild lo inlineaba en vez de dejarlo externo — y adoptCss del componente
  // inlineado se rompe.
  const tag = basename(e).replace(/\.(ts|js)$/, '');
  tagToComponent.set(tag, e);
}

// Carpeta de salida por tag: la categoria del manifest manda; los modulos
// internos (marks, specs, datagrid-core...) usan su carpeta top-level en
// components/ como fallback.
const manifestCategoryByTag = new Map(
  manifest.map((m) => [m.tag.replace(/^iswc-/, ''), m.category]),
);
const folderFor = (file) => {
  const tag = basename(file).replace(/\.(ts|js)$/, '');
  if (manifestCategoryByTag.has(tag)) return manifestCategoryByTag.get(tag);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

// Los componentes que importan OTROS componentes (p. ej. casi todos importan
// media/icon.js) no deben inlinearlos: esbuild duplicaria la clase y, peor,
// `import.meta.url` del componente inlineado apuntaria al ARCHIVO ANFITRION,
// asi que adoptCss pedia el CSS equivocado (iswc-icon acababa cargando
// actions/button.min.css y perdia su tamano). Se marcan como externos y se
// reescriben al hermano folderizado, que ya existe en dist.
const externalComponents = {
  name: 'external-components',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      // `base-sheets` lleva host-base + scrollbars incrustados y vale para toda
      // la pagina: externo, para que sea UNA peticion y UNA CSSStyleSheet
      // compartida en vez de 1,4 KB duplicados en los 150 bundles. Mismo
      // criterio que `decors`.
      if (basename(abs).replace(/\.(ts|js)$/, '') === 'base-sheets') {
        return { path: '../_shared/base-sheets.min.js', external: true };
      }
      if (!abs.startsWith(compRoot)) return null;
      // `decors` es la excepcion al inlinado de _shared: lleva el runtime de
      // decoradores de esbuild (~2 KB) y con 155 componentes serian ~310 KB
      // duplicados en el CDN. Va externo, como los componentes entre si.

      // Los demas helpers de _shared no registran custom elements: se inlinean.
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const tag = basename(abs).replace(/\.(ts|js)$/, '');
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
// Igual que los de `../_shared/`, los parciales locales de carpeta
// (`@import './_tokens.css'`) se resuelven en el navegador contra el .css
// publicado: hay que emitirlos por carpeta o dan 404 en silencio.
const localPartials = new Set();
for (const file of entries) {
  // El .css fuente vive en el staging, NO en `src/`. `build-scss.mjs` lo
  // pone ahi espejando la estructura. Si no existe, el componente va sin
  // CSS (igual que antes, cuando el .css no se habia regenerado).
  const cssFile = join(cssRoot, relative(join(root, 'src'), file).replace(/\.(ts|js)$/i, '.css'));
  let css = '';
  try { css = await readFile(cssFile, 'utf8'); } catch { continue; }
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]\.\.\/_shared\/([\w.-]+\.css)['"]/g)) {
    sharedImports.add(m[1]);
  }
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]\.\/([\w.-]+\.css)['"]/g)) {
    // Origen: el .css fuente esta en el staging, junto al resto.
    // Destino: la carpeta de publicacion, que para algunos tags no coincide
    // (chart.js vive en charts/ y se publica en data-viz/ segun el manifest).
    localPartials.add(JSON.stringify({
      from: join(dirname(cssFile), m[1]),
      to: `${folderFor(file)}/${m[1]}`,
    }));
  }
}
for (const name of sharedImports) {
  await mkdir(join(dist, '_shared'), { recursive: true });
  await bundleCss(join(cssRoot, 'components', '_shared', name), join(dist, '_shared', name));
  console.log(`  ${('_shared/' + name).padEnd(28)} css (destino de @import)`);
}

// base-sheets: host-base + scrollbars incrustados, externo y compartido por
// toda la pagina. Sustituye a los dos <link> que adoptCss ponia en CADA
// instancia de CADA componente (10 de las 38 peticiones de un <iswc-tree-view>).
{
  const coreRoot = join(root, 'src', 'core');
  const outBase = join(dist, '_shared', 'base-sheets.min.js');
  await mkdir(join(dist, '_shared'), { recursive: true });
  // Se minifican a un temporal para incrustar exactamente lo que se publicaria.
  const tmpBase = join(dist, '_shared', '_tmp-host-base.css');
  const tmpScroll = join(dist, '_shared', '_tmp-scrollbars.css');
  await bundleCss(join(cssRoot, 'components', '_shared', 'host-base.css'), tmpBase);
  await bundleCss(join(cssRoot, 'components', '_shared', 'scrollbars.css'), tmpScroll);
  await bundleJs(join(coreRoot, 'base-sheets.ts'), outBase, [], kitDocsBanner(), {
    __IS_HOST_BASE_CSS__: JSON.stringify(await readFile(tmpBase, 'utf8')),
    __IS_SCROLLBARS_CSS__: JSON.stringify(await readFile(tmpScroll, 'utf8')),
  });
  await unlink(tmpBase).catch(() => {});
  await unlink(tmpScroll).catch(() => {});
  console.log(`  ${'_shared/base-sheets.min.js'.padEnd(28)} js  (hojas base compartidas)`);
}

for (const raw of localPartials) {
  const { from, to } = JSON.parse(raw);
  await mkdir(join(dist, dirname(to)), { recursive: true });
  await bundleCss(from, join(dist, to));
  console.log(`  ${to.padEnd(28)} css (parcial de carpeta)`);
}

// `src/core/` se publica en las DOS formas, y no es redundancia:
//   .js  para quien lo ejecute (lo importan los componentes minificados).
//   .ts  para quien lo extienda — otro proyecto que escriba sus propios `is-*`
//        lo trae por vendor y necesita los decoradores expresados y los tipos.
// Regla corta: `.js` lo que se ejecuta, `.ts` lo que se extiende.
{
  const coreRoot = join(root, 'src', 'core');
  if (existsSync(coreRoot)) {
    const outCore = join(dist, 'core');
    await mkdir(outCore, { recursive: true });
    for (const f of await readdir(coreRoot)) {
      if (!f.endsWith('.ts')) continue;
      await bundleJs(join(coreRoot, f), join(outCore, f.replace(/\.ts$/, '.min.js')), [], kitDocsBanner([
        `source: ${GH_BLOB}/src/core/${f}`,
      ]));
      await copyFile(join(coreRoot, f), join(outCore, f));
    }
    // `adoptCss` resuelve `./host-base.css` y `./scrollbars.css` contra la URL
    // de su propio modulo. Con el core inlineado eso cae en la carpeta del
    // componente; emitirlas tambien aqui cubre el consumo directo del core.
    await bundleCss(join(cssRoot, 'components', '_shared', 'scrollbars.css'), join(outCore, 'scrollbars.css'));
    await bundleCss(join(cssRoot, 'components', '_shared', 'host-base.css'), join(outCore, 'host-base.css'));
    console.log('  core/                     .js + .ts (base para extender)');
  }
}

const scrollbarsIn = join(cssRoot, 'components', '_shared', 'scrollbars.css');
const hostBaseIn = join(cssRoot, 'components', '_shared', 'host-base.css');
const emittedFolders = new Set();

for (const inFile of entries) {
  const tag = basename(inFile).replace(/\.(ts|js)$/, '');
  // Carpeta FISICA en src/components (charts/, data/, …): el .md y el LLM.md
  // viven ahi y el banner de docs debe enlazar a la fuente, no a la carpeta de
  // publicacion (que para chart/bar-chart es data-viz/ segun el manifest).
  const srcFolder = relative(compRoot, inFile).split(/[\\/]/)[0];
  const folder = folderFor(inFile);
  const outDir = join(dist, folder);
  await mkdir(outDir, { recursive: true });
  // El .css fuente vive en el staging, NO en `src/`. `deno task build:scss`
  // lo pone ahi antes de este build; build-scss es la primera mitad de
  // `deno task build`.
  const cssIn = join(cssRoot, relative(join(root, 'src'), inFile).replace(/\.(ts|js)$/i, '.css'));
  const outJs = join(outDir, `${tag}.min.js`);
  const outCss = join(outDir, `${tag}.min.css`);

  // adoptCss busca ./host-base.css y ./scrollbars.css junto al modulo:
  // emitirlos una vez por carpeta.
  if (!emittedFolders.has(folder)) {
    emittedFolders.add(folder);
    await bundleCss(scrollbarsIn, join(outDir, 'scrollbars.css'));
    await bundleCss(hostBaseIn, join(outDir, 'host-base.css'));
  }

  // El CSS va primero: lo que se incrusta en el JS es el .min.css YA aplanado
  // (sin @import, que replaceSync descartaria) y minificado, no la fuente.
  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleCss(cssIn, outCss);

  await bundleJs(
    inFile,
    outJs,
    [externalComponents],
    componentDocsBanner(srcFolder, tag),
    hasCss ? await defineCss(outCss) : undefined,
  );

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
    .filter((d) => d.isDirectory())
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

const coreDist = join(dist, 'core');

const baseIn = join(cssRoot, 'styles', 'is-base.css');
const baseOut = join(coreDist, 'is-base.min.css');
await mkdir(coreDist, { recursive: true });
await bundleCss(baseIn, baseOut);
const baseStat = await stat(baseOut);
console.log(`  ${'is-base'.padEnd(18)} css ${String(baseStat.size).padStart(6)}`);

const palettesIn = join(cssRoot, 'styles', 'palettes.css');
const palettesOut = join(coreDist, 'palettes.min.css');
await bundleCss(palettesIn, palettesOut);
const palettesStat = await stat(palettesOut);
console.log(`  ${'palettes'.padEnd(18)} css ${String(palettesStat.size).padStart(6)}`);

// Alias CSS en la raíz de dist/cdn: path pre-folderizado (PatyIA, snippets).
// Sin esto jsDelivr sirve 404 y no hay tokens ni tema. Canónico: core/.
await copyFile(baseOut, join(dist, 'is-base.min.css'));
await copyFile(palettesOut, join(dist, 'palettes.min.css'));

// ── iswc-doc-demo companions (boot ESM + host module + page CSS) ──
{
  const previewDist = join(dist, 'preview');
  await mkdir(previewDist, { recursive: true });
  const bootIn = join(compRoot, 'layout', 'doc-demo-boot.ts');
  const hostIn = join(compRoot, 'layout', 'doc-demo-host.ts');
  const bootOut = join(previewDist, 'doc-demo-boot.min.js');
  const hostOut = join(previewDist, 'doc-demo-host.min.js');
  const shellOut = join(previewDist, 'doc-shell.min.css');
  const presentationOut = join(previewDist, 'doc-presentation.min.css');

  await bundleMinJs({
    entry: bootIn,
    outfile: bootOut,
    format: 'esm',
    banner: docsBanner([`md: ${GH_RAW}/src/components/layout/doc-demo.md`]),
  });
  await bundleMinJs({
    entry: hostIn,
    outfile: hostOut,
    format: 'esm',
    target: 'es2022',
    banner: docsBanner([`md: ${GH_RAW}/src/components/layout/doc-demo.md`]),
  });
  await bundleCss(join(cssRoot, 'styles', 'shell.css'), shellOut);
  await bundleCss(join(cssRoot, 'styles', 'presentation.css'), presentationOut);

  const [b, h, sh, pr] = await Promise.all([
    stat(bootOut), stat(hostOut), stat(shellOut), stat(presentationOut),
  ]);
  console.log(`  ${'doc-demo-boot'.padEnd(18)} js ${String(b.size).padStart(6)}  (module)`);
  console.log(`  ${'doc-demo-host'.padEnd(18)} js ${String(h.size).padStart(6)}  (module)`);
  console.log(`  ${'doc-shell'.padEnd(18)} css ${String(sh.size).padStart(6)}`);
  console.log(`  ${'doc-presentation'.padEnd(18)} css ${String(pr.size).padStart(6)}`);
}

try { await unlink(join(dist, 'all.min.js')); } catch { /* leftover */ }
for (const [category] of byCategory) {
  try { await unlink(join(dist, category, `category.${category}.min.js`)); } catch { /* leftover */ }
}

// ── loader.min.js ────────────────────────────────────────────────
// Entry liviano: manifiesto embebido + load / loadPageStyles (alias iswc-palettes-default).
const loaderCatalog = {
  aliases: { charts: 'data-viz', 'data-viz': 'data-viz', dataviz: 'data-viz' },
  categories: {},
  tags: {},
};
for (const [category, items] of byCategory) {
  const files = [];
  for (const m of items) {
    const file = m.tag.replace(/^iswc-/, '');
    if (!tagToComponent.has(file)) continue;
    files.push(file);
    loaderCatalog.tags[m.tag] = { category, file };
    loaderCatalog.tags[file] = { category, file };
  }
  if (files.length) loaderCatalog.categories[category] = files;
}
const loaderSrc = join(root, 'src', 'cdn', 'loader.ts');
const loaderOut = join(coreDist, 'loader.min.js');
const loaderBanner = docsBanner([
  `kit-skill: ${KIT_SKILL}`,
  `md: ${CDN_LOADER_MD}`,
  `specs: ${CDN_COMP_INDEX}`,
  `cdn-copy: dist/cdn/core/loader.md`,
  `kit: ${CDN_COMP_INDEX}`,
  `cdn-install: ${CDN_SKILL}`,
]);
await copyFile(join(root, 'src', 'cdn', 'loader.md'), join(coreDist, 'loader.md'));
console.log(`  ${'loader.md'.padEnd(18)} docs`);
// El .min.js del loader se emite al final, cuando el mapa de hashes ya existe.
// Consolidación 2026-09-07: src/cdn/LLM.md eliminado. El contenido del visor del
// loader vive en specs/cdn.md (catálogo visible por LLM); no se copia nada a
// dist/cdn/LLM.md raíz (apps que lo enlazaban fueron migradas al spec).

// ── Iconos: dist/assets/ no se toca en el build ───────────────────
// `dist/assets/` es la unica copia del material del kit. No se genera desde
// `src/` — `src/assets/` ya no existe. El borrado de arriba solo afecta
// dist/cdn/; los assets viven al lado, en dist/assets/.
//
// Aqui solo se verifica que siga entero.
const iconsOut = join(root, 'dist', 'assets', 'icons');
{
  const contar = async (dir) => {
    let n = 0;
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      n += e.isDirectory() ? await contar(join(dir, e.name)) : 1;
    }
    return n;
  };
  try {
    const n = await contar(iconsOut);
    if (n < MIN_ICONOS) {
      console.error(`
ERROR assets/icons: ${n} ficheros, se esperaban >= ${MIN_ICONOS}.`);
      console.error('dist/assets/ es la unica copia y el build NUNCA la borra.');
      console.error('Si falta, recuperala con `git checkout -- dist/assets` o `deno task icons:download`.');
      process.exit(1);
    }
    console.log(`  assets/icons         ${n} preservados (no se regeneran: unica copia)`);
  } catch {
    console.error('\nERROR: falta dist/assets/icons/. Es la unica copia del set de iconos.');
    console.error('Recuperala con `git checkout -- dist/assets` antes de volver a construir.');
    process.exit(1);
  }
}

// ── Skills para agentes (Cursor / Claude / LLM) ──────────────────
// Van a dist/cdn/skills/ para que jsDelivr y Pages las sirvan igual que
// el resto del kit. La fuente canónica vive en `skills/` (raíz); se
// subio desde src/skills/ porque las skills son contenido de nivel
// proyecto, no código fuente del kit.
const skillsSrc = join(root, 'skills');
const skillsOut = join(dist, 'skills');
try {
  await access(skillsSrc);
  const { cp } = await import('node:fs/promises');
  await mkdir(skillsOut, { recursive: true });
  await cp(skillsSrc, skillsOut, { recursive: true, force: true });
  const names = (await readdir(skillsSrc, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  console.log(`  skills/              ${names.length} → dist/cdn/skills/ (${names.join(', ')})`);
} catch {
  // Sin skills/: no bloquear el build del CDN.
}

// El HTML plano por componente se retiro el 31-ago-2026: la galeria es una SPA
// y nadie llegaba a esas 177 paginas. Para agentes el canal es `skills/`,
// que este mismo build publica en `dist/cdn/skills/`.

// ── lib/: utilidades comunes (Obj: operaciones sobre objetos y referencias) ──
// Dos formas: la fuente .ts (vendor de ISS/ISW con su propio zod) y un bundle ESM para el navegador
// (zod incluido): `import { Obj } from '<cdn>/lib/ISUtils.min.js'`. Prefijo IS*: los archivos que
// otros proyectos vendorizan no chocan con los propios del proyecto.
const libOut = join(dist, 'lib');
await mkdir(libOut, { recursive: true });
for (const name of ['ISUtils.ts', 'ISUtils.schemas.ts', 'ISUtils.md']) await copyFile(join(root, 'src', 'cdn', 'lib', name), join(libOut, name));
await build({
  entryPoints: [join(root, 'src', 'cdn', 'lib', 'ISUtils.ts')],
  outfile: join(libOut, 'ISUtils.min.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  legalComments: 'none',
});
console.log(`  ${'lib/'.padEnd(18)} ISUtils.ts (vendor) + ISUtils.min.js (navegador)`);

// ── gallery-app.min.js ───────────────────────────────────────────
// Consumo de la SPA: Live Server / Pages no transpilan src/*.ts.
// El entry vive en src/gallery/app.ts; el runtime solo carga dist/.
const galleryOut = join(root, 'dist', 'gallery-app.min.js');
await build({
  entryPoints: [join(root, 'src', 'gallery', 'app.ts')],
  outfile: galleryOut,
  bundle: true,
  minify: true,
  format: 'esm',
  // es2022: TLA para esperar el shell de iswc-doc-demo (host sibling async).
  target: 'es2022',
  legalComments: 'none',
  // load-json.ts tiene imports dinamicos node:* solo para tests; el browser usa fetch.
  external: ['node:fs', 'node:url'],
});
const galleryStat = await stat(galleryOut);
console.log(`  ${'gallery-app'.padEnd(18)} js ${String(galleryStat.size).padStart(6)}  (SPA → dist/)`);

// ── hashes: sellar imports y embeber el mapa en el loader ────────
const hashes = await stampDirectory(dist);
const addHash = async (key, abs) => {
  try { hashes[key] = await hashFile(abs); } catch { /* todavia no existe */ }
};
await addHash('dist/gallery-app.min.js', galleryOut);
for (const bucket of ['scripts', 'pages']) {
  const dir = join(root, 'dist', bucket);
  let names = [];
  try { names = await readdir(dir); } catch { names = []; }
  for (const name of names) {
    if (!/\.(?:min\.js|js|css)$/.test(name) || name.endsWith('.map')) continue;
    await addHash(`dist/${bucket}/${name}`, join(dir, name));
  }
}
await bundleLoader({
  entry: loaderSrc,
  outfile: loaderOut,
  banner: loaderBanner,
  catalog: loaderCatalog,
  hashes,
  sha: shaDelBuild(),
});
const loaderHash = await hashFile(loaderOut);
hashes['core/loader.min.js'] = loaderHash;
hashes['loader.min.js'] = loaderHash;
await copyFile(loaderOut, join(dist, 'loader.min.js'));
await writeFile(join(dist, ASSET_HASHES_NAME), hashesJson(hashes));
const loaderStat = await stat(loaderOut);
console.log(`  ${'loader.min'.padEnd(18)} js ${String(loaderStat.size).padStart(6)}  (${Object.keys(loaderCatalog.categories).length} cats, ${Object.keys(hashes).length} hashes)`);
console.log(`  ${'loader.min'.padEnd(18)} alias raíz (compat)`);

const buildSrc = join(root, 'src', 'cdn', 'build');
const buildOut = join(dist, 'build');
await mkdir(buildOut, { recursive: true });
for (const name of await readdir(buildSrc)) {
  if (!name.endsWith('.ts')) continue;
  await copyFile(join(buildSrc, name), join(buildOut, name));
}
await copyFile(join(root, 'src', 'cdn', 'asset-store.ts'), join(buildOut, 'asset-store.ts'));
console.log(`  ${'build/'.padEnd(18)} ts vendor (hash + bundle)`);

// tools/: render headless de diagramas (Playwright inyectado por el consumidor).
const toolsSrc = join(root, 'src', 'cdn', 'tools');
const toolsOut = join(dist, 'tools');
await mkdir(toolsOut, { recursive: true });
for (const name of await readdir(toolsSrc)) {
  if (!name.endsWith('.ts') && !name.endsWith('.mjs')) continue;
  await copyFile(join(toolsSrc, name), join(toolsOut, name));
}
// Los archivos que otros proyectos vendorizan llevan prefijo IS* (no chocan con los del proyecto).
// Transición: también se publican con su nombre anterior, con los imports internos a esos nombres,
// para que un consumidor que aún no migró (p. ej. el ISW) siga funcionando. Retirar al migrar todos.
const ANTERIORES = { ISPruebasHijo: 'pruebas-hijo', ISDenoTest: 'deno-test', ISPinUpdate: 'pin-update', ISPruebas: 'pruebas', ISSyncEntregable: 'sync-entregable', ISTestCooldown: 'test-cooldown', ISTestQueue: 'test-queue' };
const aAnterior = (texto) => texto.replace(/\b(ISPruebasHijo|ISDenoTest|ISPinUpdate|ISPruebas|ISSyncEntregable|ISTestCooldown|ISTestQueue)((?:\.schemas)?\.(?:ts|js|mjs))\b/g, (_m, n, ext) => ANTERIORES[n] + ext);
let anteriores = 0;
for (const name of await readdir(toolsSrc)) {
  const m = name.match(/^(IS[A-Za-z]+)((?:\.schemas)?\.(?:ts|mjs))$/);
  if (!m || !ANTERIORES[m[1]]) continue;
  const texto = await readFile(join(toolsSrc, name), 'utf8');
  await writeFile(join(toolsOut, ANTERIORES[m[1]] + m[2]), `// OBSOLETO: nombre anterior de ${name} (vendorice ${name}).
${aAnterior(texto)}`);
  anteriores++;
}
console.log(`  ${'tools/'.padEnd(18)} ts vendor IS* (+${anteriores} con el nombre anterior, transición)`);

// Estilos de diagrama (diagram-styles.ts): los temas JSON no van dentro de
// los bundles; se descargan bajo demanda junto a ellos, en diagrams/themes/.
const themesSrc = join(root, 'src', 'components', 'diagrams', 'themes');
const themesOut = join(dist, 'diagrams', 'themes');
await mkdir(themesOut, { recursive: true });
let nTemas = 0;
for (const name of await readdir(themesSrc)) {
  if (!name.endsWith('.json')) continue;
  await copyFile(join(themesSrc, name), join(themesOut, name));
  nTemas++;
}
console.log(`  ${'diagrams/themes/'.padEnd(18)} ${nTemas} temas (carga diferida por diagram-style)`);
// Campo de costos del router: los defaults del kit se publican como JSON
// para consumidores y auditoría (la fuente es routing-costs.ts).
{
  const { ROUTING_COSTS_DEFAULTS } = await import(pathToFileURL(join(root, 'src', 'components', 'diagrams', 'routing-costs.ts')).href);
  await writeFile(join(dist, 'diagrams', 'routing-costs.json'), JSON.stringify(ROUTING_COSTS_DEFAULTS, null, 2) + '\n', 'utf8');
  console.log(`  ${'diagrams/'.padEnd(18)} routing-costs.json (campo de costos compartido)`);
}

const indexPath = join(root, 'index.html');
const indexPrev = await readFile(indexPath, 'utf8');
const indexNext = applyHashToHtml(indexPrev, hashes);
if (indexNext !== indexPrev) await writeFile(indexPath, indexNext);
const htmlTouched = await rewriteHtmlTree(join(root, 'demos'), hashes) + (indexNext !== indexPrev ? 1 : 0);
console.log(`  html                 ${htmlTouched} con ?v=`);

// Pin de auto-reload: el snippet embebido en cada HTML hace polling de este
// endpoint y recarga el browser al cambiar. Lo escribimos también al build
// (valor estable basado en HEAD) para que producción / `deno task dev` sin
// watcher no devuelvan 404. El watcher (`scripts/watch.mjs`) lo sobreescribe
// con un timestamp al detectar cambios.
await writeFile(
  join(dist, 'reload-pin'),
  `build:${shaDelBuild().slice(0, 12)}\n`,
  'utf8',
);
console.log(`  reload-pin           build:<sha>`);

console.log(`OK dist/cdn  ${entries.length} components + is-base + loader + gallery-app`);