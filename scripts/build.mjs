// build.mjs — CDN folderizado con UN build de esbuild con splitting (plan D5, fase F3):
//   dist/cdn/{categoria}/{tag}.min.mjs + .min.css, core/{x}.min.mjs, lib/{x}.min.mjs, core/loader.min.mjs,
//   _chunks/chunk-<hash>.mjs (código compartido), deps.json y exports.json (grafo del metafile), y el package.json
//   de npm en la raíz (F6, sin publicar).
// `.mjs` = módulo ES, `.js` = clásico (D2). Sin all.min.js ni category.*.min.js.
import { access, readdir, mkdir, stat, rm, writeFile, readFile, copyFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, relative, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { aliasKit, ALIAS_KIT, reescribirAlias } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
import { bundleMinJs, bundleMinCss, docsBanner } from '@jeff-aporta/iswc-base/cdn/build/bundle-min.ts';
import { bundleKit, entradasKit, catalogoLoader, zodExterno } from '@jeff-aporta/iswc-base/cdn/build/bundle-kit.ts';
import { conVersiones, depsJson, exportsJson, partirDeps } from '@jeff-aporta/iswc-base/cdn/build/graph.ts';
import { packageJson } from '@jeff-aporta/iswc-base/cdn/build/npm.ts';
import { barrerHashes } from '@jeff-aporta/iswc-base/cdn/build/sync-hashes.ts';
import { hashesRepetidos } from '@jeff-aporta/iswc-base/cdn/build/hash.ts';
import { stampDirectory, mjsReferenciadosEn, hashFile, rewriteHtmlTree, hashesJson, applyHashToHtml, ASSET_HASHES_NAME } from '@jeff-aporta/iswc-base/cdn/build/stamp-hashes.ts';
import { writeJson, minificarCarpetaJson } from '@jeff-aporta/iswc-base/cdn/build/json.ts';
import { escribirIndice } from './indice-md.mjs';
import { escribirReadmes } from './readmes-componentes.mjs';
import { construirAi } from './build-ai.mjs';

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

/**
 * Un `.ts` publicado en dist/cdn/<carpeta>/ (copias para extender) no puede llevar el alias: el dist va con rutas
 * relativas y funciona sin import map. src → dist: `components/<c>/<t>.js` → `<c>/<t>.min.mjs`,
 * `cdn/build/x.js` y `cdn/asset-store.js` → `build/…`, el resto igual (`core/x.js` → `core/x.js`).
 * Guardián: tests/gobernanza/alias-imports.test.ts.
 */
const aliasEnDist = (fuente, carpeta) => reescribirAlias(fuente, (ruta) => {
  const comp = ruta.match(/^components\/([^/]+)\/([^/]+)\.js$/);
  const destino = comp ? `${comp[1]}/${comp[2]}.min.mjs`
    : ruta.startsWith('cdn/build/') ? `build/${ruta.slice('cdn/build/'.length)}`
    : ruta === 'cdn/asset-store.js' ? 'build/asset-store.js'
    : ruta;
  const rel = posix.relative(carpeta, destino);
  return rel.startsWith('.') ? rel : `./${rel}`;
});

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
await import('./sondas/gen-shared-index.ts');

// ─────────────────────── PROTOCOLO DE CONSTRUCCION ───────────────────────
//
//   En dist/cdn/ se borra TODO en cada build. Los assets estáticos (favicon,
//   playlist, PDF de ejemplo) viven en dist/assets/, hermano de dist/cdn/, y NO se tocan.
//
// Todo lo de dist/cdn/ (los .min.mjs, .min.css, loader, skills, docs) es
// GENERADO: se reconstruye entero en cada corrida.
//
// `dist/assets/` es FUENTE versionada (material del kit). No se genera desde
// `src/` — `src/assets/` se eliminó para no duplicar.
//
// Íconos (4-nov-2026): ninguna colección completa viaja en el repo. Los que el kit,
// labs y apps usan de verdad viven en `assets/iconify/` (los genera `deno task icons`,
// que corre antes de este script); el resto lo sirve la API de Iconify.
//
// Los assets fuera de dist/cdn/ evitan mezclar material estático con bundles CDN.
const PRESERVAR = new Set();

// Mapa de hashes del build anterior: se lee ANTES de limpiar dist/ para el barrido ?v= del final.
const hashesPath = join(dist, ASSET_HASHES_NAME);
const hashesPrevios = existsSync(hashesPath) ? JSON.parse(await readFile(hashesPath, 'utf8')).files : {};

await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (PRESERVAR.has(entry.name)) continue;
  await rm(join(dist, entry.name), { recursive: true, force: true });
}

// El CSS de cada componente viaja DENTRO de su módulo, no como fetch aparte:
// cada componente hace `import css from 'iswc:css'` y el plugin `cssVirtual`
// (src/cdn/build/css-virtual.ts) le pone su .css del staging aplanado y
// minificado; el molde `IswcElement` lo adopta con replaceSync. Es por
// importador, así que vale dentro del build único con splitting.
//
// Se sigue emitiendo el .min.css hermano: lo consumen el sheet-cache del
// loader y quien enlace la hoja a mano (D6).

// Mismo valor que `REPO_GITHUB` (src/core/cdn-ref.ts): nombre real del repo en GitHub hasta que se renombre a iswc-base.
const REPO_GITHUB = 'Jeff-Aporta/is-webcomponents';
const GH_RAW = `https://raw.githubusercontent.com/${REPO_GITHUB}/main`;
const GH_BLOB = `https://github.com/${REPO_GITHUB}/blob/main`;
const CDN_SKILL = `${GH_RAW}/skills/is-cdn-install/SKILL.md`;
const KIT_SKILL = `${GH_RAW}/skills/iswc-base/SKILL.md`;
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

const loaderBanner = docsBanner([
  `kit-skill: ${KIT_SKILL}`,
  `md: ${CDN_LOADER_MD}`,
  `specs: ${CDN_COMP_INDEX}`,
  `cdn-copy: dist/cdn/core/loader.md`,
  `kit: ${CDN_COMP_INDEX}`,
  `cdn-install: ${CDN_SKILL}`,
]);

const bundleCss = (entry, outfile) => bundleMinCss(entry, outfile);

// Componentes por categoria segun manifest.js (single source of truth).
const manifestMod = await import('@jeff-aporta/iswc-base/manifest.js');
const manifest = manifestMod.default;

// ── Entradas del build único ─────────────────────────────────────
// Componentes y módulos de src/components (cada uno en <carpeta>/<nombre>.min.mjs, su ruta pública de siempre),
// src/core/*.ts (core/<x>.min.mjs), el loader (core/loader.min.mjs) y lib (obj, ref-obj, zod). Lo que comparten
// dos entradas sale como chunk en _chunks/: el core existe UNA vez. Sin lista de «componentes externos».
const entradas = await entradasKit(root, manifest);
const fuentePorSalida = new Map(entradas.map((e) => [`${e.out}.mjs`, e.in]));
const entradasComp = entradas.filter((e) => e.in.startsWith(compRoot));

// El catálogo del loader sale del manifest y de las rutas previstas, ANTES del build: el loader es una entrada
// más y recibe el catálogo por `define`. `__IS_ASSET_HASHES__` queda en `{}`: el mapa vive solo en
// dist/cdn/asset-hashes.json (F4 lo leerá en diferido).
const loaderCatalog = catalogoLoader(manifest, entradas);
const sha = shaDelBuild();

// Banner de docs por archivo: el del componente en sus entradas, el del kit en core/lib, el del loader en el
// loader. Los chunks van sin banner (no son puerta de entrada de nadie).
const bannerDe = (salida) => {
  if (salida.startsWith('_chunks/')) return null;
  if (salida === 'core/loader.min.mjs') return loaderBanner;
  const fuente = fuentePorSalida.get(salida);
  if (!fuente) return null;
  if (fuente.startsWith(compRoot)) {
    const srcFolder = relative(compRoot, fuente).split(/[\\/]/)[0];
    return componentDocsBanner(srcFolder, salida.split('/').pop().replace(/\.min\.mjs$/, ''));
  }
  if (salida.startsWith('core/')) return kitDocsBanner([`source: ${GH_BLOB}/${relative(root, fuente).replaceAll('\\', '/')}`]);
  return kitDocsBanner();
};

// El .min.css hermano de cada módulo con hoja (lo que viaja DENTRO del JS lo pone `iswc:css`).
for (const e of entradasComp) {
  const cssIn = join(cssRoot, relative(join(root, 'src'), e.in).replace(/\.(ts|js)$/i, '.css'));
  if (!(await access(cssIn).then(() => true, () => false))) continue;
  const outCss = join(dist, `${e.out}.css`);
  await mkdir(dirname(outCss), { recursive: true });
  await bundleCss(cssIn, outCss);
}

const t0 = Date.now();
const kit = await bundleKit({
  entradas,
  outdir: dist,
  staging: cssRoot,
  sha,
  catalogo: loaderCatalog,
  aiRoot: join(root, 'src', 'ai'),
  banner: bannerDe,
});
const nChunks = kit.archivos.filter((f) => f.startsWith('_chunks/')).length;
console.log(`  ${'build único'.padEnd(28)} ${entradas.length} entradas + ${nChunks} chunks en ${Date.now() - t0} ms`);
for (const t of ['actions/button', 'layout/dialog', 'data/ag-grid', 'diagrams/flowchart', 'core/loader']) {
  const f = join(dist, `${t}.min.mjs`);
  if (existsSync(f)) console.log(`  ${(t + '.min.mjs').padEnd(28)} js ${String((await stat(f)).size).padStart(6)}`);
}

// `src/core/` se publica en las DOS formas, y no es redundancia:
//   .min.mjs  para quien lo ejecute (sale del build único: re-exporta el chunk compartido).
//   .ts       para quien lo extienda — otro proyecto que escriba sus propios `is-*`
//             lo trae por vendor y necesita los decoradores expresados y los tipos.
// Regla corta: `.mjs` lo que se ejecuta, `.ts` lo que se extiende.
{
  const coreRoot = join(root, 'src', 'core');
  const outCore = join(dist, 'core');
  await mkdir(outCore, { recursive: true });
  for (const f of await readdir(coreRoot)) {
    if (!f.endsWith('.ts') || f.includes('.selfcheck.')) continue;
    // En dist `src/cdn/build/` se publica como `build/` (ver más abajo): el .ts publicado importa de ahí (aliasEnDist).
    const fuente = await readFile(join(coreRoot, f), 'utf8');
    // Un common que carga un componente lo pide a su módulo publicado (dist/cdn/<grupo>/<tag>.min.mjs).
    await writeFile(join(outCore, f), aliasEnDist(fuente, 'core'));
  }
  // Diccionarios de idioma (F8): `core/localize.ts` los importa como `./i18n/<lang>.js`.
  const coreI18n = join(coreRoot, 'i18n');
  if (existsSync(coreI18n)) {
    await mkdir(join(outCore, 'i18n'), { recursive: true });
    for (const f of await readdir(coreI18n)) {
      if (f.endsWith('.ts')) await writeFile(join(outCore, 'i18n', f), aliasEnDist(await readFile(join(coreI18n, f), 'utf8'), 'core/i18n'));
    }
  }
  // Los tipos del core (`core/schemas/`) viajan con el .ts publicado que los importa.
  const coreSchemas = join(coreRoot, 'schemas');
  if (existsSync(coreSchemas)) {
    await mkdir(join(outCore, 'schemas'), { recursive: true });
    for (const f of await readdir(coreSchemas)) await copyFile(join(coreSchemas, f), join(outCore, 'schemas', f));
  }
  // `adoptCss` (compat para código externo) resuelve `./host-base.css` y `./scrollbars.css` contra su `baseUrl`:
  // se publican en core/ para quien consuma el core directo. Las copias por carpeta de componente ya no existen:
  // los componentes llevan esas hojas incrustadas (`iswc:css/host-base`, `iswc:css/scrollbars`).
  await bundleCss(join(cssRoot, 'core', 'scrollbars.css'), join(outCore, 'scrollbars.css'));
  await bundleCss(join(cssRoot, 'core', 'host-base.css'), join(outCore, 'host-base.css'));
  console.log('  core/                     .min.mjs + .ts (base para extender)');
}

// Reescribe los @import a hermanos: en fuente son `./chart.css`, pero en dist
// el archivo se llama `chart.min.css`. Sin esto los 10 charts tipados
// (bar, line, pie...) importaban una ruta inexistente y perdian la hoja base
// entera en el bundle publicado.
{
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
      const css = await readFile(file, 'utf8');
      const next = css.replace(
        /@import\s*(url\(\s*)?["'](\.\/)?([\w-]+)\.css["']\s*\)?/g,
        (whole, urlOpen, dot, name) => (minSet.has(`${name}.min.css`)
          ? `@import"./${name}.min.css"`
          : whole),
      );
      if (next !== css) { await writeFile(file, next); arreglados += 1; }
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
// Fuera del build único: doc-demo-host usa top-level await (es2022) y ninguno define componentes del kit
// (los pide al loader), así que no duplican el core.
{
  const previewDist = join(dist, 'preview');
  await mkdir(previewDist, { recursive: true });
  const bootIn = join(compRoot, 'layout', 'utils', 'doc-demo-boot.ts');
  const hostIn = join(compRoot, 'layout', 'utils', 'doc-demo-host.ts');
  const bootOut = join(previewDist, 'doc-demo-boot.min.mjs');
  const hostOut = join(previewDist, 'doc-demo-host.min.mjs');
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
  await bundleMinJs({
    entry: join(compRoot, 'layout', 'utils', 'doc-demo-galeria.ts'),
    outfile: join(previewDist, 'doc-demo-galeria.min.mjs'),
    format: 'esm',
    target: 'es2022',
    plugins: [zodExterno()],
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

await copyFile(join(root, 'src', 'cdn', 'loader.md'), join(coreDist, 'loader.md'));
console.log(`  ${'loader.md'.padEnd(18)} docs`);
// Consolidación 2026-09-07: src/cdn/LLM.md eliminado. El contenido del visor del
// loader vive en specs/cdn.md (catálogo visible por LLM); no se copia nada a
// dist/cdn/LLM.md raíz (apps que lo enlazaban fueron migradas al spec).

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

// ── lib/: obj.min.mjs (Obj virtual), ref-obj.min.mjs (RefObj físico) y zod.min.mjs (compartido) salen del build único.
// Las FUENTES vendorizables (obj.ts, ref-obj.ts, obj.md, zod.ts; contratos en shared/schemas.ts) viven en
// src/vendor-distributions/shared/lib y se publican en dist/cdn/vendor-distributions/shared/lib (más abajo).
// Los módulos quedan en dist/cdn/lib porque todo el kit importa `../lib/zod.min.mjs` (plugin `zodExterno`;
// guardián gobernanza/zod-compartido.test.ts).
const vendorSrc = join(root, 'src', 'vendor-distributions');
// src/ai: lib/ai/*.min.mjs, build aparte (un módulo por archivo; el estado de motores y cola existe una vez).
// Desde lib/ai/ un módulo de src/components queda externo a su entrada publicada (`../../<carpeta>/<x>.min.mjs`)
// y Zod a `../zod.min.mjs`: nada del kit se duplica dentro de la IA.
const salidaPorFuente = new Map(entradasComp.map((e) => [e.in.replace(/\.(ts|js)$/, ''), `${e.out}.mjs`]));
const componentesDesdeAi = {
  name: 'componentes-desde-ai',
  setup(b) {
    b.onResolve({ filter: /^zod$/ }, () => ({ path: '../zod.min.mjs', external: true }));
    b.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const salida = salidaPorFuente.get(join(args.resolveDir, args.path).replace(/\.(ts|js)$/, ''));
      return salida ? { path: `../../${salida}`, external: true } : null;
    });
  },
};
await construirAi({ root, dist, componentes: componentesDesdeAi, bundleMinJs });

// ── gallery-app.min.js ───────────────────────────────────────────
// Consumo de la SPA: Live Server / Pages no transpilan src/*.ts.
// El entry vive en src/app/app.ts; el runtime solo carga dist/. La galería (dist/gallery-app, dist/scripts,
// dist/pages, dist/previews) conserva `.min.js`: no es parte del CDN del kit.
const galleryOut = join(root, 'dist', 'gallery-app.min.js');
await build({
  entryPoints: [join(root, 'src', 'app', 'app.ts')],
  outfile: galleryOut,
  plugins: [aliasKit(), cssVirtual()],
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

// ── grafo: deps.json + exports.json (desde el metafile, antes de sellar: las rutas no cambian) ──
// deps.json se escribe DESPUÉS de sellar: lleva `v` (el `?v=` de cada entrada de los cierres) para que el loader
// selle sus `import()` en orígenes mutables sin pedir asset-hashes.json (F4). Los chunks no llevan `?v=`.
let deps;
// Para el package.json del final (F6): el mismo `exports.json` y el tag → archivo del catálogo.
let exportsKit;
let tagsKit;
{
  const tags = {};
  for (const [tag, { category, file }] of Object.entries(loaderCatalog.tags)) {
    if (tag.startsWith('iswc-')) tags[tag] = `${category}/${file}.min.mjs`;
  }
  const core = {};
  for (const e of entradas) if (e.out.startsWith('core/')) core[e.out.slice('core/'.length).replace(/\.min$/, '')] = `${e.out}.mjs`;
  const grafo = { metafile: kit.metafile, outdir: dist, cwd: process.cwd(), sha, tags, core };
  deps = depsJson(grafo);
  // El metafile completo queda fuera de lo publicado (.tmp/, ignorado): lo leen los guardianes del grafo
  // (gobernanza/zod-compartido: Zod solo entra en lib/zod.min.mjs).
  await mkdir(join(root, '.tmp'), { recursive: true });
  await writeFile(join(root, '.tmp', 'metafile-kit.json'), JSON.stringify(kit.metafile), 'utf8');
  exportsKit = exportsJson(grafo);
  tagsKit = tags;
  await writeJson(join(dist, 'exports.json'), exportsKit);
  console.log(`  ${'deps.json'.padEnd(18)} ${Object.keys(deps.tags).length} tags + ${Object.keys(deps.core).length} core · exports.json`);
}

// ── hashes: sellar imports relativos de dist/cdn y escribir el mapa (asset-hashes.json) ────────
// Los chunks ya llevan hash en el nombre: no se sellan (`esChunk` en stamp-hashes), y su URL es la misma para todos
// sus importadores y para el `modulepreload` del loader.
// F7 (0.2): ningún `.mjs` lleva `?v=` dentro (ni chunks ni entradas). Un módulo que otro importa por ruta relativa
// (`lib/zod`, `import()` entre tags, capas del loader) tiene UNA URL, sin `?v=`, para todos: sale del mapa para que
// ni el loader (`v` de deps) ni la galería (`asset-hashes.json`) ni los HTML lo sellen. El sello en orígenes
// mutables queda para las entradas que nadie importa, y lo pone quien las pide (loader vía `deps/<cat>.json`).
const hashes = await stampDirectory(dist, undefined, { sellarMjs: false });
// El loader también: `preview/doc-demo-host` lo importa sin `?v=`; si el HTML lo sellara, la galería evaluaría dos
// instancias (F7b: 2× loader y capas, 2× asset-hashes.json y deps/preview.json). Los HTML le quitan el sello viejo.
const compartidos = await mjsReferenciadosEn(dist);
for (const ruta of compartidos) delete hashes[ruta];
// Índice mínimo + una parte por categoría (F7, 0.1): el loader baja solo `deps/<cat>.json` de lo que pide, y nada
// si el HTML ya precargó el cierre. Sin sangría.
{
  const partido = partirDeps(conVersiones(deps, hashes, compartidos), (tag) => loaderCatalog.tags[tag].category);
  await mkdir(join(dist, 'deps'), { recursive: true });
  for (const [cat, parte] of Object.entries(partido.partes)) await writeJson(join(dist, 'deps', `${cat}.json`), parte);
  await writeJson(join(dist, 'deps.json'), partido.indice);
  console.log(`  ${'deps/'.padEnd(18)} ${Object.keys(partido.partes).length} partes · ${compartidos.size} módulos compartidos sin ?v=`);
}
const addHash = async (key, abs) => {
  try { hashes[key] = await hashFile(abs, key); } catch { /* todavia no existe */ }
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
// Compatibilidad: `core/loader.min.js` es copia byte a byte de `core/loader.min.mjs` (módulo ES con la extensión
// vieja) para los consumidores que pinean la URL vieja. Se retira cuando re-pineen (F5); ver specs/cdn.md.
// Ningún otro artefacto conserva `.min.js`.
const loaderOut = join(coreDist, 'loader.min.mjs');
const LOADER_COMPAT = 'core/loader.min.js'; // compat (F5)
await copyFile(loaderOut, join(dist, LOADER_COMPAT));
// Alias en la raíz (path pre-folderizado): no puede ser copia, porque el loader importa `../_chunks/…`; re-exporta.
await writeFile(join(dist, 'loader.min.mjs'), 'export*from"./core/loader.min.mjs";export{default}from"./core/loader.min.mjs";\n', 'utf8');
for (const k of ['core/loader.min.mjs', LOADER_COMPAT, 'loader.min.mjs']) await addHash(k, join(dist, k));
// Cada hash debe nombrar un solo archivo: el barrido ?v=viejo → ?v=nuevo depende de ello.
const repetidos = hashesRepetidos(hashes);
if (repetidos.length) throw new Error(`hashes repetidos (subir HASH_LEN en src/cdn/build/hash.ts):\n${repetidos.join('\n')}`);
await writeFile(hashesPath, hashesJson(hashes));
// Barrido determinista: todo ?v=<hash viejo> del repo pasa al hash nuevo (html, md, json, js…).
console.log(`  ${'?v= barrido'.padEnd(18)} ${barrerHashes(hashesPrevios, hashes, [root])} archivos`);
const loaderStat = await stat(loaderOut);
console.log(`  ${'loader.min.mjs'.padEnd(18)} js ${String(loaderStat.size).padStart(6)}  (${Object.keys(loaderCatalog.categories).length} cats, ${Object.keys(hashes).length} hashes en asset-hashes.json)`);
console.log(`  ${'loader.min.js'.padEnd(18)} copia compat (se retira en F5)`);

const buildSrc = join(root, 'src', 'cdn', 'build');
const buildOut = join(dist, 'build');
await mkdir(buildOut, { recursive: true });
// Publicado, `build/` se ejecuta también por URL (`deno run https://…/build/construir-app.ts`, F10): Deno no aplica
// `sloppy-imports` a módulos remotos, así que `./x.js` (que nombra la fuente `./x.ts`) se publica como `./x.ts`.
const nombresBuild = (await readdir(buildSrc)).filter((n) => n.endsWith('.ts'));
const deTsEnBuild = new Set([...nombresBuild, 'asset-store.ts'].map((n) => n.replace(/\.ts$/, '')));
const conExtensionTs = (fuente) => fuente.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])\.\/([\w.-]+)\.js\2/g, (entero, antes, comilla, nombre) => (deTsEnBuild.has(nombre) ? `${antes}${comilla}./${nombre}.ts${comilla}` : entero));
for (const name of nombresBuild) {
  await writeFile(join(buildOut, name), conExtensionTs(aliasEnDist(await readFile(join(buildSrc, name), 'utf8'), 'build')));
}
await writeFile(join(buildOut, 'asset-store.ts'), conExtensionTs(aliasEnDist(await readFile(join(root, 'src', 'cdn', 'asset-store.ts'), 'utf8'), 'build')));
console.log(`  ${'build/'.padEnd(18)} ts vendor (hash + bundle)`);

// importmap.json: la entrada del alias que un consumidor pega tal cual en su `<script type="importmap">` o en
// su `deno.json` (specs/cdn.md §Alias). El SHA es el del build; `pin-update` lo mueve después.
await writeJson(join(dist, 'importmap.json'), { imports: { [ALIAS_KIT]: `https://cdn.jsdelivr.net/gh/${REPO_GITHUB}@${sha}/dist/cdn/` }, scopes: {} });
console.log(`  ${'importmap.json'.padEnd(18)} alias ${ALIAS_KIT} → dist/cdn/@<sha>`);

// vendor-distributions/: TODO lo que un consumidor trae por vendor (tools/vendor.ts), por PERFIL:
//   shared/ (sin navegador: lib, testing, tools) · server/ (solo server) · client/ (Playwright,
//   Stagehand, render, íconos) + README.md índice. Un consumidor declara su perfil en su vendor.json y
//   baja shared/ + el suyo (guardián meta/vendor-perfiles.test.ts). Se copian fuentes (.ts/.mjs) y
//   docs (.md) conservando el árbol; los consumidores las depositan en su carpeta ISU/. Los contratos van
//   en UN solo shared/schemas.ts por secciones que vendor.ts poda al vendorizar.
const vendorOut = join(dist, 'vendor-distributions');
await rm(vendorOut, { recursive: true, force: true });
let nVendor = 0;
const copiarVendor = async (rel) => {
  await mkdir(join(vendorOut, rel), { recursive: true });
  for (const e of await readdir(join(vendorSrc, rel), { withFileTypes: true })) {
    const sub = join(rel, e.name);
    if (e.isDirectory()) await copiarVendor(sub);
    else if (e.isFile() && /\.(ts|mjs|md)$/.test(e.name)) {
      await copyFile(join(vendorSrc, sub), join(vendorOut, sub));
      nVendor++;
    }
  }
};
await copiarVendor('');
console.log(`  ${'vendor-distrib./'.padEnd(18)} ${nVendor} archivos (shared, server, client) para vendorizar`);
// Bundles autocontenidos de los scripts ONLINE (vendor, pin-update, download-iconify, render-lote, skills/*/tools).
{
  const { construirOnline } = await import(pathToFileURL(join(root, 'scripts', 'build-online.mjs')).href);
  await construirOnline();
}

// Estilos de diagrama (diagram-styles.ts): los temas JSON no van dentro de
// los bundles; se descargan bajo demanda junto a ellos, en diagrams/themes/.
const themesSrc = join(root, 'src', 'components', 'diagrams', 'utils', 'themes');
const themesOut = join(dist, 'diagrams', 'themes');
await mkdir(themesOut, { recursive: true });
let nTemas = 0;
for (const name of await readdir(themesSrc)) {
  if (!name.endsWith('.json')) continue;
  // La fuente (src/…) queda legible; la copia que se publica va minificada.
  await writeJson(join(themesOut, name), JSON.parse(await readFile(join(themesSrc, name), 'utf8')));
  nTemas++;
}
console.log(`  ${'diagrams/themes/'.padEnd(18)} ${nTemas} temas (carga diferida por diagram-style)`);
// Campo de costos del router: los defaults del kit se publican como JSON
// para consumidores y auditoría (la fuente es routing-costs.ts).
{
  const { ROUTING_COSTS_DEFAULTS } = await import(pathToFileURL(join(root, 'src', 'components', 'diagrams', 'utils', 'diagram-routing.ts')).href);
  await writeJson(join(dist, 'diagrams', 'routing-costs.json'), ROUTING_COSTS_DEFAULTS);
  console.log(`  ${'diagrams/'.padEnd(18)} routing-costs.json (campo de costos compartido)`);
}

// `?v=` en los HTML del repo (Pages y carpeta local son orígenes mutables). Sobre un pin SHA de jsDelivr/githack
// el loader no sella (la URL ya es inmutable; ver `esUrlInmutable` en src/cdn/build/asset-url.ts).
const indexPath = join(root, 'index.html');
const indexPrev = await readFile(indexPath, 'utf8');
const indexNext = applyHashToHtml(indexPrev, hashes, compartidos);
if (indexNext !== indexPrev) await writeFile(indexPath, indexNext);
const htmlTouched = await rewriteHtmlTree(join(root, 'demos'), hashes, undefined, compartidos) + (indexNext !== indexPrev ? 1 : 0);
console.log(`  html                 ${htmlTouched} con ?v=`);

// Pin de auto-reload: el snippet embebido en cada HTML hace polling de este
// endpoint y recarga el browser al cambiar. Lo escribimos también al build
// (valor estable basado en HEAD) para que producción / `deno task dev` sin
// watcher no devuelvan 404. El watcher (`scripts/watch.mjs`) lo sobreescribe
// con un timestamp al detectar cambios.
await writeFile(
  join(dist, 'reload-pin'),
  `build:${sha.slice(0, 12)}\n`,
  'utf8',
);
console.log(`  reload-pin           build:<sha>`);

try { await unlink(join(dist, 'all.min.js')); } catch { /* leftover */ }

// package.json de npm (F6, preparado y NO publicado): `exports` desde exports.json, `sideEffects` desde el catálogo,
// versión provisional `0.0.0-<fecha del commit>.<sha7>` (specs/cdn.md §npm). `deno task npm:pack` arma el tarball.
{
  let fecha = '00000000';
  try { fecha = execSync('git log -1 --format=%cd --date=format:%Y%m%d', { cwd: root, encoding: 'utf8' }).trim(); } catch { /* sin git */ }
  const licencia = existsSync(join(root, 'LICENSE')) ? 'SEE LICENSE IN LICENSE' : 'UNLICENSED';
  const pkg = packageJson({ exports: exportsKit, tags: tagsKit, sha, fecha, repo: REPO_GITHUB, licencia });
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  ${'package.json'.padEnd(18)} ${pkg.version} · ${Object.keys(pkg.exports).length} exports · ${pkg.sideEffects.length} sideEffects`);
}

// Invariante B.3: todo .json de dist/cdn es JSON.stringify(JSON.parse(x)).
await minificarCarpetaJson(dist);

// INDICE.md: el indice de todos los md del repo. Se regenera aqui para que nunca quede viejo
// (lo escribe scripts/indice-md.mjs; es idempotente).
{
  const cambio = escribirIndice();
  console.log(`  ${'INDICE.md'.padEnd(18)} ${cambio ? 'regenerado' : 'al día'}`);
}

// El README de cada categoria de componentes: su lista de componentes sale del manifest.
{
  const n = escribirReadmes();
  console.log(`  ${'README.md'.padEnd(18)} ${n} de categoria ${n ? 'regenerados' : 'al dia'}`);
}
console.log(`OK dist/cdn  ${entradasComp.length} módulos de componentes + core + lib + loader (${nChunks} chunks) + gallery-app`);
