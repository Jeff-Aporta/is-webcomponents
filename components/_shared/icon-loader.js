/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component
 * `<iconify-icon>` ni su script de CDN. Todo el sistema de iconos vive en
 * `assets/icons/` y se publica en `dist/cdn/assets/icons/`:
 *
 *   assets/icons/<prefix>.json        indice de la coleccion (lista de nombres)
 *   assets/icons/<prefix>/<name>.svg  el SVG suelto
 *   assets/icons/index.json           familias + conteos
 *
 * Las bases se derivan del propio modulo (`import.meta.url`), no de
 * `location.pathname`: asi el bundle publicado en
 * `dist/cdn/<categoria>/icon.min.js` encuentra sus iconos en
 * `dist/cdn/assets/icons/` sin importar en que ruta se embeba la pagina, y el
 * codigo fuente los encuentra en la raiz del repo.
 *
 * API:
 *   resolveIconSvg(prefix, name) -> Promise<string|null>  URL del SVG
 *   resolveIconRaw(prefix, name) -> Promise<string|null>  texto del SVG
 *   hasIconLocal(prefix, name)   -> Promise<boolean>
 *   listIconFamilies()           -> Promise<Array<{prefix, count}>>
 *   iconSourceBase(prefix)       -> string|null
 */

/** Bases candidatas para `assets/icons/`, en orden de preferencia. */
const ICON_BASES = [
  // 1. Bundle CDN: dist/cdn/<categoria>/icon.min.js -> dist/cdn/assets/icons/
  () => new URL('../assets/icons/', import.meta.url).href,
  // 2. Fuente: components/_shared/icon-loader.js -> <repo>/assets/icons/
  () => new URL('../../assets/icons/', import.meta.url).href,
  // 3. Fuente apuntando al bundle: <repo>/dist/cdn/assets/icons/
  () => new URL('../../dist/cdn/assets/icons/', import.meta.url).href,
  // 4. GitHub Pages del proyecto (sitio publicado).
  () => 'https://jeff-aporta.github.io/is-webcomponents/dist/cdn/assets/icons/',
  // 5. jsDelivr sobre el repo.
  () => 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/assets/icons/',
];

const LOCAL_INDEX_PATH = (prefix) => `${prefix}.json`;
const LOCAL_SVG_PATH = (prefix, name) => `${prefix}/${name}.svg`;

/** Cache en memoria: prefix -> Set<name> | null (null = no existe indice). */
const indexCache = new Map();
/** Cache de base usada por coleccion: prefix -> string|null. */
const baseCache = new Map();
/** Cache de raw SVG: `${prefix}:${name}` -> string (texto SVG). */
const rawCache = new Map();
const inflight = new Map();

function candidateBases() {
  const out = [];
  for (const fn of ICON_BASES) {
    try {
      const v = fn();
      if (v) out.push(v.endsWith('/') ? v : v + '/');
    } catch { /* URL invalida en este contexto; probar siguiente */ }
  }
  return out;
}

async function fetchIndex(prefix) {
  if (indexCache.has(prefix)) return indexCache.get(prefix);
  if (inflight.has(prefix)) return inflight.get(prefix);

  const promise = (async () => {
    for (const base of candidateBases()) {
      try {
        const res = await fetch(base + LOCAL_INDEX_PATH(prefix), { cache: 'force-cache' });
        if (!res.ok) continue;
        const data = await res.json();
        const set = new Set(data.icons || []);
        indexCache.set(prefix, set);
        baseCache.set(prefix, base);
        return set;
      } catch {
        // Red offline o CORS; probar siguiente base.
      }
    }
    indexCache.set(prefix, null);
    baseCache.set(prefix, null);
    return null;
  })();
  inflight.set(prefix, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(prefix);
  }
}

/**
 * Base donde se encontro la coleccion (o null). Sirve para que la UI
 * distinga "icono local" de "icono remoto".
 */
export function iconSourceBase(prefix) {
  return baseCache.get(prefix) || null;
}

/**
 * URL del SVG de un icono. null si la coleccion no esta disponible en
 * ninguna de las bases.
 *
 * @param {string} prefix
 * @param {string} name
 * @returns {Promise<string|null>}
 */
export async function resolveIconSvg(prefix, name) {
  if (!prefix || !name) return null;
  const set = await fetchIndex(prefix);
  if (!(set instanceof Set) || !set.has(name)) return null;
  const base = baseCache.get(prefix);
  return base ? base + LOCAL_SVG_PATH(prefix, name) : null;
}

/** Comprueba si un icono ya esta en el indice cargado (sincrono). */
export function hasIconLocalSync(prefix, name) {
  const set = indexCache.get(prefix);
  return set instanceof Set && set.has(name);
}

/** Version async (carga el indice si hace falta). */
export async function hasIconLocal(prefix, name) {
  const set = await fetchIndex(prefix);
  return set instanceof Set && set.has(name);
}

/**
 * TEXTO CRUDO del SVG (no una URL). `<is-icon>` lo necesita para inyectar el
 * SVG inline en su Shadow DOM y que `currentColor` se propague al fill; si se
 * sirviera como `<img src>` los colores quedarian congelados en negro.
 *
 * Prueba cada base en orden y cachea el resultado. Devuelve null si el icono
 * no existe en ninguna: el caller decide que pintar (no hay fallback a un web
 * component externo).
 *
 * @param {string} prefix
 * @param {string} name
 * @param {AbortSignal} [signal]
 * @returns {Promise<string|null>}
 */
export async function resolveIconRaw(prefix, name, signal) {
  if (!prefix || !name) return null;
  const key = `${prefix}:${name}`;
  if (rawCache.has(key)) return rawCache.get(key);

  const set = await fetchIndex(prefix);
  // El indice existe y no lista el icono: no gastar requests en 404s.
  if (set instanceof Set && !set.has(name)) return null;

  const known = baseCache.get(prefix);
  const bases = known
    ? [known, ...candidateBases().filter((b) => b !== known)]
    : candidateBases();

  for (const base of bases) {
    try {
      const res = await fetch(base + LOCAL_SVG_PATH(prefix, name), { signal, cache: 'force-cache' });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.includes('<svg')) {
        rawCache.set(key, text);
        return text;
      }
    } catch {
      if (signal?.aborted) return null;
      // Red offline o CORS; probar siguiente base.
    }
  }
  return null;
}

/** Invalida el cache de raw SVG (util para tests). */
export function clearRawCache() {
  rawCache.clear();
}

/** Familias disponibles (assets/icons/index.json): [{ prefix, count }]. */
export async function listIconFamilies() {
  for (const base of candidateBases()) {
    try {
      const res = await fetch(base + 'index.json', { cache: 'force-cache' });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.families)) return data.families;
    } catch { /* siguiente base */ }
  }
  return [];
}

// Precarga en background: cuando el navegador esta idle, carga las
// colecciones mas usadas para que <is-icon> resuelva sin latencia.
if (typeof requestIdleCallback === 'function') {
  ['mdi', 'tabler', 'lucide', 'heroicons', 'material-symbols'].forEach((p) => {
    requestIdleCallback(() => fetchIndex(p));
  });
}
