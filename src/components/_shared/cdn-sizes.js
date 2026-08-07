/**
 * Pesos CDN desde `sizes.json` (emitido por el build).
 * Expande `all.min.js` / `category.*.min.js` a los `.min.js` reales que se bajan.
 */

/** @type {Map<string, Promise<Record<string, number>>>} */
const cache = new Map();

/**
 * @param {string} base — origen del kit (…/dist/cdn)
 * @returns {Promise<Record<string, number>>}
 */
export const loadCdnSizes = (base) => {
  const key = String(base || '').replace(/\/$/, '');
  if (!key) return Promise.resolve({});
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`${key}/sizes.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    );
  }
  return cache.get(key);
};

/**
 * Ruta relativa a dist/cdn a partir de una URL absoluta del espejo.
 * @param {string} url
 * @param {string} base
 */
export const pathFromCdnUrl = (url, base) => {
  if (!url) return '';
  const b = String(base || '').replace(/\/$/, '');
  if (b && url.startsWith(`${b}/`)) return url.slice(b.length + 1);
  const m = String(url).match(/\/dist\/cdn\/(.+)$/);
  return m ? m[1] : '';
};

const isComponentJs = (k) => /^[^/]+\/[^/]+\.min\.js$/.test(k) && !/\/category\./.test(k);

/**
 * Suma bytes reales descargados por las URLs del snippet.
 * @param {string[]} urls
 * @param {string} base
 * @returns {Promise<number|null>}
 */
export const totalCdnSize = async (urls, base) => {
  const sizes = await loadCdnSizes(base);
  const keys = Object.keys(sizes);
  if (!keys.length) return null;

  const paths = new Set();
  for (const url of urls) {
    const path = pathFromCdnUrl(url, base);
    if (!path) continue;
    paths.add(path);
    if (path === 'all.min.js') {
      for (const k of keys) if (isComponentJs(k)) paths.add(k);
    } else {
      const cat = path.match(/^([^/]+)\/category\.[^/]+\.min\.js$/)?.[1];
      if (cat) {
        for (const k of keys) if (isComponentJs(k) && k.startsWith(`${cat}/`)) paths.add(k);
      }
    }
  }

  const known = [...paths].map((p) => sizes[p]).filter((s) => typeof s === 'number');
  if (!known.length) return null;
  return known.reduce((a, b) => a + b, 0);
};
