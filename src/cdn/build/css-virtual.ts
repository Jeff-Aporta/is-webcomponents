/**
 * css-virtual.ts — el import virtual `iswc:css` (plan D6): el CSS de cada componente viaja dentro de su módulo.
 *
 *   import css from 'iswc:css';               // .tmp-scss/src/<ruta del importador>.css, minificado
 *   import base from 'iswc:css/host-base';    // .tmp-scss/src/core/host-base.css (hojas comunes del core)
 *
 *   cssVirtual(opts)             plugin esbuild; va DESPUÉS de `aliasKit` (bundleMinJs ya lo lleva).
 *   rutaCssVirtual(esp, imp, o)  .css del staging que corresponde a un especificador y su importador, o null.
 *   cssMinificado(archivo)       el .css aplanado (`@import` incluidos) y minificado, o null si no existe.
 *
 * Por qué un import y no un `define` global: el `define __IS_COMPONENT_CSS__` valía para UN build por archivo; con
 * splitting (F3) un build tiene muchas entradas y cada módulo necesita SU hoja. El import se resuelve por importador.
 * El staging lo genera `deno task build:scss` (`src/**\/*.scss` → `.tmp-scss/src/<mismo path>.css`); sin hoja el
 * módulo recibe `''` y el build avisa (hay componentes sin `.scss`).
 *
 * Fuera de esbuild: Deno resuelve `iswc:css` por el import map de `deno.json` (`core/iswc-css-vacio.ts`) y
 * `scripts/serve.mjs` lo reescribe a `/__css/<ruta>.css.js`, que sirve este mismo `cssMinificado`.
 */
import { existsSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Plugin } from 'esbuild';
import type { CssVirtualOptions } from './css-virtual.schemas.js';

/** Especificador del import virtual. Con sufijo `/<nombre>` nombra una hoja común de `src/core`. */
export const ESPECIFICADOR_CSS = 'iswc:css';

const FILTRO = /^iswc:css(?:\/[\w-]+)?$/;

// Ejecutado desde el CDN (construirApp por URL) no hay `src/` del kit: quien lo usa pasa `staging` y `fuentes`.
const RAIZ_SRC = import.meta.url.startsWith('file:') ? fileURLToPath(new URL('../../', import.meta.url)) : '';

const STAGING = join(RAIZ_SRC, '..', '.tmp-scss', 'src');

/** `.css` del staging para `especificador` importado desde `importador` (ruta absoluta), o null si no aplica. */
export function rutaCssVirtual(especificador: string, importador: string, opts: CssVirtualOptions = {}): string | null {
  const staging = opts.staging ?? STAGING;
  const fuentes = opts.fuentes ?? RAIZ_SRC;
  if (especificador.startsWith(`${ESPECIFICADOR_CSS}/`)) return join(staging, 'core', `${especificador.slice(ESPECIFICADOR_CSS.length + 1)}.css`);
  if (especificador !== ESPECIFICADOR_CSS || !importador) return null;
  const rel = relative(fuentes, importador);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return join(staging, rel.replace(/\.(?:ts|js|mjs)$/i, '.css'));
}

/** CSS aplanado y minificado (igual que el `.min.css` publicado), o null si el archivo no existe. */
export async function cssMinificado(archivo: string): Promise<string | null> {
  if (!existsSync(archivo)) return null;
  const r = await build({ entryPoints: [archivo], bundle: true, minify: true, write: false, logLevel: 'silent' });
  return r.outputFiles[0]?.text.trim() ?? '';
}

/** Plugin esbuild de `iswc:css`. Registrar después de `aliasKit`. */
export function cssVirtual(opts: CssVirtualOptions = {}): Plugin {
  return {
    name: 'iswc-css',
    setup(b) {
      b.onResolve({ filter: FILTRO }, (args) => {
        const archivo = rutaCssVirtual(args.path, args.importer, opts);
        return { path: archivo ?? `sin-hoja:${args.importer}`, namespace: 'iswc-css', pluginData: { importador: args.importer } };
      });
      b.onLoad({ filter: /.*/, namespace: 'iswc-css' }, async (args) => {
        const css = args.path.startsWith('sin-hoja:') ? null : await cssMinificado(args.path);
        if (css === null) console.warn(`  [iswc:css] sin hoja para ${relative(RAIZ_SRC, args.pluginData?.importador ?? args.path)}`);
        const watchFiles = css === null ? [] : [args.path];
        return { contents: `export default ${JSON.stringify(css ?? '')};`, loader: 'js', watchFiles };
      });
    },
  };
}
