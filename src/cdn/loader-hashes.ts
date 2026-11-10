// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-hashes — capa 2 del loader (plan D7): `dist/cdn/asset-hashes.json` en diferido.
 *
 * El build único deja `__IS_ASSET_HASHES__` vacío: el mapa completo vive en `asset-hashes.json`. Solo en orígenes
 * mutables (Pages, localhost, carpeta local) el loader lo lee para sellar `?v=` en hojas, módulos de página y
 * `assetUrl()`; sobre un pin SHA de jsDelivr/githack la URL ya es inmutable y no se pide (`esUrlInmutable`).
 * Las entradas del kit no lo necesitan: su `?v=` viaja en `deps/<cat>.json` (`v`).
 */
import { esUrlInmutable } from './build/asset-url.js';
import type { LoaderCtx } from './schemas/loader-capas.schemas.js';

/** Lee `asset-hashes.json` de la raíz primaria y lo funde en `ctx.hashes` (sin pisar lo que ya había). */
export async function cargar(ctx: LoaderCtx): Promise<void> {
  const raiz = ctx.raizPrimaria() ?? ctx.cdnRoot;
  if (esUrlInmutable(raiz)) return;
  try {
    const r = await fetch(new URL('asset-hashes.json', raiz).href, { cache: 'no-cache' });
    if (!r.ok) return;
    const data = await r.json() as { files?: Record<string, string> };
    for (const [ruta, hash] of Object.entries(data.files ?? {})) ctx.hashes[ruta] ??= hash;
  } catch { /* sin mapa: URLs sin `?v=` */ }
}
