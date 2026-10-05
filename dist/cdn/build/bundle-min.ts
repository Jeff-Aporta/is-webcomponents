/**
 * Generadores de .min.js / .min.css / loader.
 * Otro proyecto is-* los importa por vendor (copia de dist/cdn/build)
 * o desde el CDN, y queda con el mismo formato y los mismos defines.
 */
import { build, type Plugin } from 'esbuild';
import type { BundleMinJsOptions, BundleLoaderOptions } from "./bundle-min.schemas.js";

export function bundleMinJs(opts: BundleMinJsOptions) {
  return build({
    entryPoints: [opts.entry],
    outfile: opts.outfile,
    bundle: true,
    minify: true,
    format: opts.format || 'esm',
    target: opts.target || 'es2020',
    legalComments: 'none',
    plugins: opts.plugins,
    ...(opts.external ? { external: opts.external } : {}),
    ...(opts.define ? { define: opts.define } : {}),
    ...(opts.banner ? { banner: { js: opts.banner } } : {}),
  });
}

export function bundleMinCss(entry: string, outfile: string) {
  return build({ entryPoints: [entry], outfile, minify: true, bundle: true });
}

export function docsBanner(lines: string[]): string {
  return ['/*!', ' * ISWC - docs (LLM)', ...lines.map((l) => ` * ${l}`), ' */'].join('\n');
}

/** Defines que el loader espera. Mismo nombre en todos los proyectos is-*. */
export function loaderDefines(catalog: unknown, files: Record<string, string>, sha = 'main'): Record<string, string> {
  return {
    __IS_LOADER_CATALOG__: JSON.stringify(catalog),
    __IS_ASSET_HASHES__: JSON.stringify(files),
    __IS_BUILD_SHA__: JSON.stringify(sha),
  };
}

export function bundleLoader(opts: BundleLoaderOptions) {
  return bundleMinJs({
    entry: opts.entry,
    outfile: opts.outfile,
    plugins: opts.plugins,
    banner: opts.banner,
    external: opts.external,
    define: loaderDefines(opts.catalog, opts.hashes, opts.sha),
  });
}
