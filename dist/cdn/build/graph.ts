/**
 * graph.ts — el grafo del build único, sacado del metafile de esbuild (plan D5/D9, fase F3).
 *
 *   cierreDe(metafile, salida, cwd, outdir)   módulos que trae `salida` (ella incluida): solo `import` estáticos, sin externos.
 *   depsJson(opts)                            `dist/cdn/deps.json`: tag → cierre ordenado; lo usa el loader (F4) para precargar.
 *   exportsJson(opts)                         `dist/cdn/exports.json`: el `exports` del `package.json` de F6.
 *
 * Las rutas son relativas a `dist/cdn/` con barras (`actions/button.min.mjs`, `_chunks/chunk-ABC123.mjs`). Los
 * `import()` dinámicos no entran al cierre: se piden al usarse.
 */
import { relative, resolve } from 'node:path';
import type { Metafile } from 'esbuild';
import type { DepsJson, ExportsJson, GrafoOptions } from './graph.schemas.js';

const barras = (p: string) => p.replaceAll('\\', '/');

/** Cierre de `salida` (ruta relativa a `outdir`), ordenado. */
export function cierreDe(metafile: Metafile, salida: string, cwd: string, outdir: string): string[] {
  const clave = (p: string) => barras(relative(outdir, resolve(cwd, p)));
  const salidas = new Map(Object.entries(metafile.outputs).map(([p, o]) => [clave(p), o]));
  const visto = new Set<string>();
  const pendientes = [salida];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    if (visto.has(actual) || !salidas.has(actual)) continue;
    visto.add(actual);
    for (const i of salidas.get(actual)!.imports) {
      if (i.kind === 'import-statement' && !i.external) pendientes.push(clave(i.path));
    }
  }
  return [...visto].sort();
}

/** `deps.json`: cierre por tag y por módulo del core. */
export function depsJson(opts: GrafoOptions): DepsJson {
  const cierre = (salida: string) => cierreDe(opts.metafile, salida, opts.cwd, opts.outdir);
  const tags: Record<string, string[]> = {};
  for (const tag of Object.keys(opts.tags).sort()) tags[tag] = cierre(opts.tags[tag]);
  const core: Record<string, string[]> = {};
  for (const nombre of Object.keys(opts.core).sort()) core[nombre] = cierre(opts.core[nombre]);
  return { sha: opts.sha, tags, core };
}

/**
 * `deps.json` con `v`: el `?v=` (de `asset-hashes`) de cada ENTRADA que aparece en algún cierre. Los chunks no van:
 * su nombre ya es un hash y no se sellan. El loader lo usa en orígenes mutables (Pages/local) para pedir la entrada
 * con su `?v=` sin bajar asset-hashes.json; sobre un pin SHA lo ignora.
 */
export function conVersiones(deps: DepsJson, hashes: Record<string, string>): DepsJson {
  const v: Record<string, string> = {};
  for (const cierre of [...Object.values(deps.tags), ...Object.values(deps.core)]) {
    for (const ruta of cierre) if (!ruta.startsWith('_chunks/') && hashes[ruta]) v[ruta] = hashes[ruta];
  }
  return { ...deps, v: Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) };
}

/** `exports.json`: `./loader`, `./core/<x>`, `./<cat>/<tag>` y comodines por carpeta. */
export function exportsJson(opts: GrafoOptions): ExportsJson {
  const out: ExportsJson = { './loader': './dist/cdn/core/loader.min.mjs' };
  const carpetas = new Set<string>();
  const publicar = (ruta: string) => {
    out[`./${ruta.replace(/\.min\.mjs$/, '')}`] = `./dist/cdn/${ruta}`;
    carpetas.add(ruta.split('/')[0]);
  };
  for (const ruta of Object.values(opts.core).sort()) publicar(ruta);
  for (const ruta of [...new Set(Object.values(opts.tags))].sort()) publicar(ruta);
  for (const carpeta of [...carpetas, 'lib'].sort()) out[`./${carpeta}/*`] = `./dist/cdn/${carpeta}/*.min.mjs`;
  return out;
}
