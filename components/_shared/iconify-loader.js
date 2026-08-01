/**
 * Carga iconos de Iconify desde tres fuentes, en orden:
 *
 *   1. Local: assets/icons/{prefix}/{name}.svg — disponible cuando el usuario
 *      ha ejecutado `node scripts/download-icons.mjs` o cuando el sitio está
 *      desplegado en jsDelivr (los assets se sirven vía la carpeta assets/).
 *      Para esto, primero se descarga assets/icons/{prefix}.json (un índice
 *      por coleccion con la lista de nombres validos) y se cachea en memoria.
 *
 *   2. CDN: https://api.iconify.design/{prefix}/{name}.svg — endpoint
 *      oficial de Iconify, sirve cualquier icono de cualquier coleccion
 *      con latencia ~50ms.
 *
 *   3. Fallback final: <iconify-icon> con el script iconify.min.js — para
 *      soporte offline o entornos sin fetch directo.
 *
 * La API expuesta al componente <is-icon> es:
 *
 *   resolveIconSvg(prefix, name) -> string|null   (URL SVG lista para <img src>)
 *   hasIconLocal(prefix, name)   -> Promise<bool>
 *
 * Ademas exporta ensureIconify() para mantener compatibilidad con el comportamiento
 * previo (carga el <iconify-icon> Web Component desde CDN).
 */

const RELATIVE_BASES = [
  // <base href> del documento (define la raíz del sitio, si la tiene).
  () => document.querySelector('base[href]')?.getAttribute('href') ?? null,
  // Resolución desde la raíz del sitio: si el documento está en
  // http://host/PatyIA/previews/media/is-icon.html y assets está en la raíz del
  // repo, subimos hasta el primer segmento que ya está en el repo.
  () => rootFromBaseURI(),
  // Algunos sitios usan un CDN absoluto del repo en GitHub Pages.
  () => 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/assets/icons/',
];

/**
 * Calcula la raíz del documento desde el URL actual. Si el doc está en
 * /previews/media/is-icon.html, devolvemos "../../". Si está en /index.html
 * (raíz), devolvemos "./".
 */
function rootFromBaseURI() {
  if (typeof location === 'undefined') return null;
  const segments = location.pathname.split('/').filter(Boolean);
  // El último segmento siempre es el .html; lo descartamos.
  segments.pop();
  if (segments.length === 0) return './';
  return segments.map(() => '..').join('/') + '/';
}

const LOCAL_INDEX_PATH = (prefix) => `${prefix}.json`;
const LOCAL_SVG_PATH = (prefix, name) => `${prefix}/${name}.svg`;
const REMOTE_SVG_URL = (prefix, name) => `https://api.iconify.design/${prefix}/${name}.svg`;

/** Cache en memoria: prefix -> Set<name> | null (null = no existe indice). */
const indexCache = new Map();
/** Cache de base usada por coleccion: prefix -> string|null. */
const baseCache = new Map();
const inflight = new Map();

function candidateBases() {
  const out = [];
  for (const fn of RELATIVE_BASES) {
    try {
      const v = fn();
      if (v) out.push(v.endsWith('/') ? v : v + '/');
    } catch {}
  }
  // Último fallback absoluto: GitHub Pages.
  return out;
}

async function fetchIndex(prefix) {
  if (indexCache.has(prefix)) return indexCache.get(prefix);
  if (inflight.has(prefix)) return inflight.get(prefix);

  const promise = (async () => {
    for (const base of candidateBases()) {
      const url = base + 'assets/icons/' + LOCAL_INDEX_PATH(prefix);
      try {
        const res = await fetch(url, { cache: 'force-cache' });
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
 * Devuelve la URL base donde se encontro un icono local. Si no se encontro
 * localmente, devuelve null. Pensado para que la UI pueda mostrar un badge
 * "icono local" vs "icono CDN".
 */
export function iconSourceBase(prefix) {
  return baseCache.get(prefix) || null;
}

/**
 * Devuelve la URL del SVG para un icono, eligiendo local primero y CDN
 * como fallback. Si no existe en ninguna, devuelve null.
 *
 * @param {string} prefix
 * @param {string} name
 * @returns {Promise<string|null>}
 */
export async function resolveIconSvg(prefix, name) {
  if (!prefix || !name) return null;

  // Intentar local.
  const set = await fetchIndex(prefix);
  if (set && set.has(name)) {
    const base = baseCache.get(prefix) || './';
    return base + 'assets/icons/' + LOCAL_SVG_PATH(prefix, name);
  }
  // Fallback a CDN.
  return REMOTE_SVG_URL(prefix, name);
}

/** Comprueba si un icono esta disponible localmente (sincrono si ya se cargo el indice). */
export function hasIconLocalSync(prefix, name) {
  const set = indexCache.get(prefix);
  if (set instanceof Set) return set.has(name);
  return false;
}

/** Version async (carga el indice si hace falta). */
export async function hasIconLocal(prefix, name) {
  const set = await fetchIndex(prefix);
  return set instanceof Set && set.has(name);
}

// ----------------------------------------------------------------------------
// Compatibilidad con el comportamiento previo (cargar <iconify-icon> de CDN).
// ----------------------------------------------------------------------------

const ICONIFY_SRC = 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js';
let iconifyReady = null;

export function ensureIconify() {
  if (customElements.get('iconify-icon')) return Promise.resolve();
  if (iconifyReady) return iconifyReady;
  iconifyReady = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((s) => s.src.includes('iconify-icon'));
    if (existing) {
      customElements.whenDefined('iconify-icon').then(resolve, reject);
      return;
    }
    const el = document.createElement('script');
    el.src = ICONIFY_SRC;
    el.async = true;
    el.onload = () => customElements.whenDefined('iconify-icon').then(resolve, reject);
    el.onerror = () => reject(new Error('iconify-icon CDN failed'));
    document.head.appendChild(el);
  });
  return iconifyReady;
}

// Precarga en background: cuando el navegador esta idle, carga las 5
// colecciones mas usadas para que <is-icon> resuelva sync.
if (typeof requestIdleCallback === 'function') {
  ['mdi', 'tabler', 'lucide', 'heroicons', 'material-symbols'].forEach((p) => {
    requestIdleCallback(() => fetchIndex(p));
  });
}