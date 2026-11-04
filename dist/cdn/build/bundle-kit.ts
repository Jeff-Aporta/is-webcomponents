/**
 * bundle-kit.ts — build único del kit con `splitting` (plan D5, fase F3).
 *
 *   entradasKit(raiz, manifest)   entradas publicadas: componentes y módulos de `src/components` + `src/core` + loader + lib.
 *   catalogoLoader(manifest, e)   `__IS_LOADER_CATALOG__` desde el manifest y las rutas previstas (antes del build).
 *   bundleKit(opts)               UN `esbuild.build`: `<cat>/<tag>.min.mjs`, `core/<x>.min.mjs`, `lib/<x>.min.mjs`,
 *                                 `core/loader.min.mjs` y los chunks compartidos en `_chunks/chunk-<hash>.mjs`.
 *   zodExterno() / aiExterno()    plugins: `zod` y `src/ai` quedan fuera del grafo (se cargan una vez y en diferido).
 *
 * Todas las salidas viven a un nivel de `dist/cdn/` (`actions/`, `core/`, `lib/`, `_chunks/`), así un externo relativo
 * (`../lib/zod.min.mjs`) vale igual desde una entrada que desde un chunk. Sin lista de «componentes externos»: lo que
 * comparten dos entradas sale como chunk y el core (`IswcElement`, `attrs`, `base-sheets`…) existe UNA vez.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { build, type Plugin } from 'esbuild';
import type { BundleKitOptions, BundleKitResult, CatalogoLoader, EntradaKit, ItemManifestKit } from './bundle-kit.schemas.js';
import { aliasKit } from './alias.js';
import { cssVirtual } from './css-virtual.js';
import { loaderDefines } from './bundle-min.js';

/** Extensión de los módulos ES publicados (D2): `.mjs` = módulo, `.js` = clásico. */
export const EXT_MODULO = '.mjs';

/** Carpeta de los chunks compartidos dentro de `dist/cdn`. */
export const CARPETA_CHUNKS = '_chunks';

const barras = (p: string) => p.replaceAll('\\', '/');

/** Fuente de `src/components` que se publica: ni índices, ni schemas, ni previews, ni los compañeros de doc-demo. */
function esPublicable(nombre: string): boolean {
  if (!/\.(ts|js)$/.test(nombre) || nombre.endsWith('.d.ts')) return false;
  if (/^index\.(ts|js)$/.test(nombre) || nombre.endsWith('.schemas.ts')) return false;
  if (nombre.includes('.selfcheck.') || nombre.includes('.preview.')) return false;
  return !/^doc-demo-(boot|host|galeria|estado)\.(ts|js)$/.test(nombre);
}

async function recorrer(dir: string, out: string[] = []): Promise<string[]> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await recorrer(p, out);
    else if (esPublicable(e.name)) out.push(p);
  }
  return out;
}

const tagCorto = (tag: string) => tag.replace(/^iswc-/, '');

/**
 * Entradas del build. Los módulos de `src/components` conservan su ruta pública de siempre (`<carpeta>/<nombre>.min`):
 * varios utils se consumen por URL (`diagrams/theme`, `helpers/md-lite`, `isp/customs-base`…). La carpeta es la
 * categoría del manifest; los que no son tags usan su carpeta de primer nivel.
 */
export async function entradasKit(raiz: string, manifest: ItemManifestKit[]): Promise<EntradaKit[]> {
  const compRoot = join(raiz, 'src', 'components');
  const categoria = new Map(manifest.map((m) => [tagCorto(m.tag), m.category]));
  const entradas: EntradaKit[] = [];
  for (const f of (await recorrer(compRoot)).sort()) {
    const nombre = basename(f).replace(/\.(ts|js)$/, '');
    const carpeta = categoria.get(nombre) ?? relative(compRoot, f).split(/[\\/]/)[0];
    entradas.push({ in: f, out: `${carpeta}/${nombre}.min` });
  }
  const coreRoot = join(raiz, 'src', 'core');
  for (const f of (await readdir(coreRoot)).sort()) {
    if (!f.endsWith('.ts') || f.includes('.selfcheck.')) continue;
    entradas.push({ in: join(coreRoot, f), out: `core/${f.replace(/\.ts$/, '')}.min` });
  }
  entradas.push({ in: join(raiz, 'src', 'cdn', 'loader.ts'), out: 'core/loader.min' });
  for (const lib of ['obj', 'ref-obj', 'zod']) {
    entradas.push({ in: join(raiz, 'src', 'vendor-distributions', 'shared', 'lib', `${lib}.ts`), out: `lib/${lib}.min` });
  }
  return entradas;
}

/** Catálogo del loader: cada tag del manifest con archivo propio (`<cat>/<file>.min.mjs` entre las entradas). */
export function catalogoLoader(manifest: ItemManifestKit[], entradas: EntradaKit[]): CatalogoLoader {
  const salidas = new Set(entradas.map((e) => e.out));
  const catalogo: CatalogoLoader = {
    aliases: { charts: 'data-viz', 'data-viz': 'data-viz', dataviz: 'data-viz' },
    categories: {},
    tags: {},
  };
  for (const m of manifest) {
    const file = tagCorto(m.tag);
    if (!salidas.has(`${m.category}/${file}.min`)) continue;
    (catalogo.categories[m.category] ??= []).push(file);
    catalogo.tags[m.tag] = { category: m.category, file };
    catalogo.tags[file] = { category: m.category, file };
  }
  return catalogo;
}

/** `zod` → `../lib/zod.min.mjs` (externo), salvo para el propio `lib/zod.ts` que lo empaqueta. */
export function zodExterno(ruta = `../lib/zod.min${EXT_MODULO}`): Plugin {
  return {
    name: 'zod-externo',
    setup(b) {
      b.onResolve({ filter: /^zod$/ }, (args) => (/[\\/]lib[\\/]zod\.ts$/.test(args.importer) ? null : { path: ruta, external: true }));
    },
  };
}

/** Un módulo de `src/ai` (no sus schemas ni `motores/`) queda externo: `<desde><nombre>.min.mjs`. */
export function aiExterno(aiRoot: string, desde = '../lib/ai/'): Plugin {
  const raizAi = barras(aiRoot);
  return {
    name: 'ai-externo',
    setup(b) {
      b.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
        if (args.kind === 'entry-point') return null;
        const abs = resolve(args.resolveDir, args.path);
        if (barras(dirname(abs)) !== raizAi) return null;
        return { path: `${desde}${basename(abs).replace(/\.(ts|js)$/, '')}.min${EXT_MODULO}`, external: true };
      });
    },
  };
}

/** Un solo `esbuild.build` con todas las entradas. Escribe en `outdir` (con el banner de cada archivo) y devuelve el metafile. */
export async function bundleKit(opts: BundleKitOptions): Promise<BundleKitResult> {
  const plugins: Plugin[] = [aliasKit(), cssVirtual(opts.staging ? { staging: opts.staging } : {}), zodExterno()];
  if (opts.aiRoot) plugins.push(aiExterno(opts.aiRoot));
  plugins.push(...(opts.plugins ?? []));
  const r = await build({
    entryPoints: opts.entradas,
    outdir: opts.outdir,
    bundle: true,
    splitting: true,
    minify: true,
    metafile: true,
    write: false,
    format: 'esm',
    target: opts.target ?? 'es2020',
    legalComments: 'none',
    chunkNames: `${CARPETA_CHUNKS}/[name]-[hash]`,
    outExtension: { '.js': EXT_MODULO },
    define: loaderDefines(opts.catalogo ?? { aliases: {}, categories: {}, tags: {} }, {}, opts.sha ?? 'main'),
    logLevel: 'warning',
    plugins,
  });
  const archivos: string[] = [];
  for (const f of r.outputFiles) {
    const rel = barras(relative(opts.outdir, f.path));
    const banner = opts.banner?.(rel) ?? null;
    await mkdir(dirname(f.path), { recursive: true });
    await writeFile(f.path, banner ? `${banner}\n${f.text}` : f.contents);
    archivos.push(rel);
  }
  return { metafile: r.metafile, archivos: archivos.sort() };
}
