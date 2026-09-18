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
const ICON_BASES: (() => string | null)[] = [
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

const LOCAL_INDEX_PATH = (prefix: string): string => `${prefix}.json`;
const LOCAL_SVG_PATH = (prefix: string, name: string): string => `${prefix}/${name}.svg`;

/**
 * Prefijos garantizados en el material publicado.
 *
 * Desde que `src/assets/` se eliminó y todo vive en `dist/assets/icons/`,
 * este conjunto ya no separa «en git» de «solo local»: marca las dos
 * colecciones que siempre están, para no prefetchear las que puede que el
 * consumidor no haya descargado y llenar la consola de 404.
 */
const SRC_SHIPPED_PREFIXES: ReadonlySet<string> = new Set(['mdi', 'tabler']);

/** Cache en memoria: prefix -> Set<name> | null (null = no existe indice). */
const indexCache = new Map<string, Set<string> | null>();
/** Cache de base usada por coleccion: prefix -> string|null. */
const baseCache = new Map<string, string | null>();
/** Cache de raw SVG: `${prefix}:${name}` -> string (texto SVG). */
const rawCache = new Map<string, string>();
const inflight = new Map<string, Promise<Set<string> | null>>();

function candidateBases(prefix?: string): string[] {
  const out: string[] = [];
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

async function loadIndex(prefix: string): Promise<Set<string> | null> {
  if (indexCache.has(prefix)) return indexCache.get(prefix) ?? null;
  const cached = inflight.get(prefix);
  if (cached) return cached;

  const task: Promise<Set<string> | null> = (async () => {
    for (const base of candidateBases(prefix)) {
      try {
        const res = await fetch(base + LOCAL_INDEX_PATH(prefix), { cache: 'default' });
        if (!res.ok) continue;
        const data = await res.json() as { icons?: string[] };
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
  for (const p of SRC_SHIPPED_PREFIXES) {
    requestIdleCallback(() => { loadIndex(p); });
  }
}

export async function hasIconLocal(prefix: string, name: string): Promise<boolean> {
  const idx = await loadIndex(prefix);
  return !!(idx && idx.has(name));
}

export function iconSourceBase(prefix: string): string | null {
  return baseCache.get(prefix) ?? null;
}

export async function resolveIconSvg(prefix: string, name: string): Promise<string | null> {
  const idx = await loadIndex(prefix);
  if (!idx || !idx.has(name)) return null;
  const base = baseCache.get(prefix);
  if (!base) return null;
  return base + LOCAL_SVG_PATH(prefix, name);
}

export async function resolveIconRaw(prefix: string, name: string, signal?: AbortSignal): Promise<string | null> {
  const key = `${prefix}:${name}`;
  const cached = rawCache.get(key);
  if (cached !== undefined) return cached;
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
    const name = (err as { name?: unknown } | null)?.name;
    if (name === 'AbortError') throw err; // propagar la cancelacion
    return null;
  }
}

/** Vacia el cache en memoria de SVGs (util para tests y para liberar memoria). */
export function clearRawCache(): void {
  rawCache.clear();
}

/** Entrada del listado de familias devuelto por `listIconFamilies`. */
export type IconFamily = { prefix: string; count: number };

export async function listIconFamilies(): Promise<IconFamily[]> {
  for (const base of candidateBases()) {
    try {
      const res = await fetch(base + 'index.json', { cache: 'default' });
      if (!res.ok) continue;
      const data: unknown = await res.json();
      if (Array.isArray(data)) return data as IconFamily[];
      if (data && typeof data === 'object' && Array.isArray((data as { families?: unknown }).families)) {
        return (data as { families: IconFamily[] }).families;
      }
    } catch {
      /* try next */
    }
  }
  return [];
}
