/**
 * Pega `?h=` a una ruta. El loader y el build usan la misma funcion
 * para que el consumidor no arme el query a mano.
 */

export function withAssetHash(href: string, hash: string): string {
  if (!hash) return href;
  const cut = href.indexOf('#');
  const frag = cut < 0 ? '' : href.slice(cut);
  const base = cut < 0 ? href : href.slice(0, cut);
  const q = base.indexOf('?');
  const path = q < 0 ? base : base.slice(0, q);
  const params = new URLSearchParams(q < 0 ? '' : base.slice(q + 1));
  params.set('h', hash);
  return `${path}?${params.toString()}${frag}`;
}

/** Busca el hash por ruta exacta o por el sufijo mas largo (`…/actions/button.min.js`). */
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

type LoaderGlobal = { ISWebComponentsLoader?: { assetUrl?: (href: string) => string } };

/** Si el loader ya esta en la pagina, enruta por el. Si no, deja el href. */
export function routeThroughLoader(href: string): string {
  const fn = (globalThis as LoaderGlobal).ISWebComponentsLoader?.assetUrl;
  return typeof fn === 'function' ? fn(href) : href;
}
