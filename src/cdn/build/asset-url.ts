// @contexto INDICE.md · src/cdn/build/README.md
/**
 * Cache busting por query string con el parametro convencional `v`
 * (`archivo.js?v=1dj4v0`): el valor es el hash del contenido, asi la URL solo
 * cambia cuando cambia el archivo. El loader y el build usan la misma funcion
 * para que el consumidor no arme el query a mano.
 */

import type { LoaderGlobal } from "./asset-url.schemas.js";
/** Nombre del parametro de cache busting (convencion `?v=`). */
export const ASSET_HASH_PARAM = 'v';
/** Parametro anterior (`?h=`): se reemplaza al sellar. */
export const ASSET_HASH_PARAM_LEGADO = 'h';

export function withAssetHash(href: string, hash: string): string {
  if (!hash) return href;
  const cut = href.indexOf('#');
  const frag = cut < 0 ? '' : href.slice(cut);
  const base = cut < 0 ? href : href.slice(0, cut);
  const q = base.indexOf('?');
  const path = q < 0 ? base : base.slice(0, q);
  const params = new URLSearchParams(q < 0 ? '' : base.slice(q + 1));
  params.delete(ASSET_HASH_PARAM_LEGADO);
  params.set(ASSET_HASH_PARAM, hash);
  return `${path}?${params.toString()}${frag}`;
}

/** Busca el hash por ruta exacta o por el sufijo mas largo (`…/actions/button.min.mjs`). */
export function lookupHash(files: Record<string, string>, href: string): string | null {
  if (!href || !files) return null;
  const path = href.split(/[?#]/)[0].replace(/\\/g, '/');
  if (files[path]) return files[path];
  const bare = path.replace(/^\.\//, '');
  if (files[bare]) return files[bare];
  let best: string | null = null;
  let bestLen = -1;
  for (const key of Object.keys(files)) {
    if (path.endsWith('/' + key) && key.length > bestLen) {
      best = files[key];
      bestLen = key.length;
    }
  }
  return best;
}

/**
 * `true` si la URL es de jsDelivr o githack pineada a un SHA (`…/gh/<owner>/<repo>@<sha>/…`, `raw.githack.com/
 * <owner>/<repo>/<sha>/…`): el contenido es inmutable (`Cache-Control: immutable`), así que no lleva `?v=`. Pages,
 * localhost, `file:` y los pines a una rama (`@main`) son mutables y sí se sellan (plan D5).
 */
export function esUrlInmutable(href: string): boolean {
  let u: URL;
  try { u = new URL(href); } catch { return false; }
  const host = u.hostname.toLowerCase();
  if (host === 'cdn.jsdelivr.net') return /^\/gh\/[^/]+\/[^/@]+@[0-9a-f]{7,40}\//i.test(u.pathname);
  if (host === 'raw.githack.com' || host === 'rawcdn.githack.com') return /^\/[^/]+\/[^/]+\/[0-9a-f]{7,40}\//i.test(u.pathname);
  return false;
}

/** Si el loader ya esta en la pagina, enruta por el. Si no, deja el href. */
export function routeThroughLoader(href: string): string {
  const fn = (globalThis as LoaderGlobal).iswcLoader?.assetUrl;
  return typeof fn === 'function' ? fn(href) : href;
}
