/**
 * alias.ts — el alias `@jeff-aporta/iswc-base/<ruta>` fuera de Deno.
 *
 *   aliasKit(opts)            plugin esbuild: resuelve el alias a la carpeta `raiz` (por defecto `src/` del kit).
 *   reescribirAlias(c, mapeo) reescribe en un texto los especificadores con alias (`from`, `import`, `import()`).
 *
 * Deno y tsc lo resuelven solos (`deno.json` → `imports`, `tsconfig.json` → `paths`). esbuild no lee
 * `deno.json`: sin este plugin un bundle no encuentra `@jeff-aporta/iswc-base/core/x.js`.
 *
 * Composición con los demás plugins (`external-components`, `componentes-externos`, `ai-externo`…): ellos deciden por
 * la ruta absoluta `resolve(resolveDir, path)`, que con un especificador con alias no tiene sentido. Por eso `aliasKit`
 * va PRIMERO y no devuelve la ruta final: traduce el alias a la ruta relativa equivalente y la vuelve a pasar por
 * `build.resolve`, así que los demás plugins ven exactamente lo que veían antes del codemod (`'../../core/x.js'`).
 *
 * Una copia vendorizada (dist/cdn/build/alias.ts) debe pasar `raiz`: el valor por defecto solo vale dentro del kit.
 */
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'esbuild';
import type { AliasKitOptions, MapeoAlias } from './alias.schemas.ts';

/** Prefijo del alias del kit, con barra final (igual que la clave de `deno.json` y del importmap). */
export const ALIAS_KIT = '@jeff-aporta/iswc-base/';

// Ejecutado desde el CDN (`deno run https://…/build/construir-app.ts`) no hay carpeta del kit: el defecto queda vacío.
const RAIZ_KIT = import.meta.url.startsWith('file:') ? fileURLToPath(new URL('../../', import.meta.url)) : '';

const escaparRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const barras = (ruta: string) => ruta.replaceAll('\\', '/');

/** Plugin esbuild del alias. Registrar antes que cualquier plugin que decida por ruta absoluta. */
export function aliasKit(opts: AliasKitOptions = {}): Plugin {
  const prefijo = opts.prefijo ?? ALIAS_KIT;
  const raiz = opts.raiz ?? RAIZ_KIT;
  const filtro = new RegExp(`^${escaparRegex(prefijo)}`);
  return {
    name: 'alias-kit',
    setup(b) {
      b.onResolve({ filter: filtro }, async (args) => {
        const abs = join(raiz, args.path.slice(prefijo.length));
        const desde = args.resolveDir || raiz;
        const rel = barras(relative(desde, abs));
        const ruta = isAbsolute(rel) ? abs : rel.startsWith('.') ? rel : `./${rel}`;
        const r = await b.resolve(ruta, { kind: args.kind, resolveDir: desde, importer: args.importer, pluginData: args.pluginData });
        if (r.errors.length) return { errors: r.errors, warnings: r.warnings };
        return { path: r.path, external: r.external, namespace: r.namespace, sideEffects: r.sideEffects, suffix: r.suffix, pluginData: r.pluginData, warnings: r.warnings };
      });
    },
  };
}

/** Reescribe los especificadores con alias de un módulo (`from '…'`, `import '…'`, `import('…')`). */
export function reescribirAlias(codigo: string, mapeo: MapeoAlias, prefijo = ALIAS_KIT): string {
  const patron = new RegExp(`(\\bfrom\\s*|\\bimport\\s*\\(?\\s*)(["'])${escaparRegex(prefijo)}([^"']*)\\2`, 'g');
  return codigo.replace(patron, (entero: string, antes: string, comilla: string, ruta: string) => {
    const nuevo = mapeo(ruta);
    return nuevo === null ? entero : `${antes}${comilla}${nuevo}${comilla}`;
  });
}
