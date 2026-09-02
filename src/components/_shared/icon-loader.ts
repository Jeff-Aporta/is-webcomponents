/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component
 * `<iconify-icon>` ni su script de CDN. Todo el sistema de iconos vive en
 * `assets/icons/` y se publica en `dist/assets/icons/`:
 *
 *   assets/icons/<prefix>.json        indice de la coleccion (lista de nombres)
 *   assets/icons/<prefix>/<name>.svg  el SVG suelto
 *   assets/icons/index.json           familias + conteos
 *
 * Las bases se derivan del propio modulo (`import.meta.url`), no de
 * `location.pathname`: asi el bundle publicado en
 * `dist/cdn/<categoria>/icon.min.js` encuentra sus iconos en
 * `dist/assets/icons/` sin importar en que ruta se embeba la pagina, y el
 * codigo fuente los encuentra en la raiz del repo.
 *
 * API:
 *   resolveIconSvg(prefix, name)     -> Promise<string|null>  URL del SVG
 *   resolveIconRaw(prefix, name, signal) -> Promise<string|null>  texto del SVG
 *   clearRawCache()                  -> void  vacia el cache de SVGs
 *   hasIconLocal(prefix, name)       -> Promise<boolean>
 *   listIconFamilies()               -> Promise<Array<{prefix, count}>>
 *   iconSourceBase(prefix)           -> string|null
 */

/**
 * Bases candidatas para `assets/icons/`, en orden de preferencia.
 *
 * Los iconos tienen **una sola copia**, `dist/assets/icons/`: es la que se
 * publica y la que sirven Pages y jsDelivr. `src/assets/` se eliminó para no
 * mantener el mismo material por duplicado.
 *
 * El loader se ejecuta desde dos sitios y la ruta relativa NO significa lo mismo:
 *   - dist/cdn/media/icon.min.js  → ../../assets/icons/
 *   - src/components/_shared/…    → ../../../dist/assets/icons/
 */
const ICON_BASES = [
  // Bundle publicado: dist/cdn/<categoria>/*.min.js → dist/assets/icons/
  () => {
    if (!import.meta.url.includes('/dist/cdn/')) return null;
    return new URL('../../assets/icons/', import.meta.url).href;
  },
  // Dev (Live Server / serve.mjs): src/components/_shared → dist/assets/.
  () => {
    if (!/\/(?:src\/)?components\//.test(import.meta.url)) return null;
    return new URL('../../../dist/assets/icons/', import.meta.url).href;
  },
  // GitHub Pages del proyecto (sitio publicado).
  () => 'https://jeff-aporta.github.io/is-webcomponents/dist/assets/icons/',
  // jsDelivr sobre el repo.
  () => 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/assets/icons/',
];

const LOCAL_INDEX_PATH = (prefix) => `${prefix}.json`;
const LOCAL_SVG_PATH = (prefix, name) => `${prefix}/${name}.svg`;

/**
 * Prefijos garantizados en el material publicado.
 *
 * Desde que `src/assets/` se eliminó y todo vive en `dist/assets/icons/`,
 * este conjunto ya no separa «en git» de «solo local»: marca las dos
 * colecciones que siempre están, para no prefetchear las que puede que el
 * consumidor no haya descargado y llenar la consola de 404.
 */
const SRC_SHIPPED_PREFIXES = new Set(['mdi', 'tabler']);

/** Cache en memoria: prefix -> Set<name> | null (null = no existe indice). */
const indexCache = new Map();
/** Cache de base usada por coleccion: prefix -> string|null. */
const baseCache = new Map();
/** Cache de raw SVG: `${prefix}:${name}` -> string (texto SVG). */
const rawCache = new Map();
const inflight = new Map();

function candidateBases(prefix) {
  const out = [];
  for (const fn of ICON_BASES) {
    try {
      const v = fn();
      if (!v) continue;
      const base = v.endsWith('/') ? v : `${v}/`;
      if (/\/src\/assets\/icons\//.test(base) && prefix && !SRC_SHIPPED_PREFIXES.has(prefix)) {
        continue;
      }
      out.push(base);
    } catch {
      /* ignore */
    }
  }
  return out;
}

async function loadIndex(prefix) {
  if (indexCache.has(prefix)) return indexCache.get(prefix);
  if (inflight.has(prefix)) return inflight.get(prefix);

  const task = (async () => {
    for (const base of candidateBases(prefix)) {
      try {
        const res = await fetch(base + LOCAL_INDEX_PATH(prefix), { cache: 'default' });
        if (!res.ok) continue;
        const data = await res.json();
        const icons = new Set(data.icons || []);
        indexCache.set(prefix, icons);
        baseCache.set(prefix, base);
        return icons;
      } catch {
        /* try next base */
      }
    }
    indexCache.set(prefix, null);
    baseCache.set(prefix, null);
    return null;
  })();

  inflight.set(prefix, task);
  try {
    return await task;
  } finally {
    inflight.delete(prefix);
  }
}

// Prefetch de colecciones siempre presentes en idle time.
if (typeof requestIdleCallback === 'function') {
  [...SRC_SHIPPED_PREFIXES].forEach((p) => {
    requestIdleCallback(() => loadIndex(p));
  });
}

export async function hasIconLocal(prefix, name) {
  const idx = await loadIndex(prefix);
  return !!(idx && idx.has(name));
}

export function iconSourceBase(prefix) {
  return baseCache.get(prefix) ?? null;
}

export async function resolveIconSvg(prefix, name) {
  const idx = await loadIndex(prefix);
  if (!idx || !idx.has(name)) return null;
  const base = baseCache.get(prefix);
  if (!base) return null;
  return base + LOCAL_SVG_PATH(prefix, name);
}

export async function resolveIconRaw(prefix, name, signal) {
  const key = `${prefix}:${name}`;
  if (rawCache.has(key)) return rawCache.get(key);
  // Resuelve primero si el icono existe y desde que base (loadIndex/baseCache),
  // igual que resolveIconSvg; el fetch del SVG respeta la senal de abort para
  // que <is-icon> pueda cancelar renders obsoletos.
  const url = await resolveIconSvg(prefix, name);
  if (!url) return null;
  const base = baseCache.get(prefix) ?? '';
  try {
    const res = await fetch(base + LOCAL_SVG_PATH(prefix, name), { signal, cache: 'default' });
    if (!res.ok) return null;
    const text = await res.text();
    rawCache.set(key, text);
    return text;
  } catch (err) {
    if (err?.name === 'AbortError') throw err; // propagar la cancelacion
    return null;
  }
}

/** Vacia el cache en memoria de SVGs (util para tests y para liberar memoria). */
export function clearRawCache() {
  rawCache.clear();
}

export async function listIconFamilies() {
  for (const base of candidateBases()) {
    try {
      const res = await fetch(base + 'index.json', { cache: 'default' });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.families)) return data.families;
      if (Array.isArray(data)) return data;
    } catch {
      /* try next */
    }
  }
  return [];
}
