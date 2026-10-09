/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component
 * `<iconify-icon>` ni su script de CDN. Los sets que usan el kit y las apps
 * (`SETS_LOCALES`: mdi, solar, tabler) viajan en `dist/assets/icons/`; los demás
 * se piden SVG a SVG a la API de Iconify (nunca el set entero):
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
 * Mapas registrados (primero): cada app publica `assets/iconify.json` + `assets/iconify/<set>/<n>.svg`
 * (los genera `src/cdn/tools/download-iconify.ts` desde su `assets/dl.js`) y lo registra con
 * `registerIcons(url)` o, sin importar este módulo, empujando la URL a la cola global
 * `globalThis.__ISWC_ICONS__` (así lo hace el registrador `<prefijo>Loader.min.js` del build).
 * Orden de búsqueda de un ícono:
 *   1. mapas registrados, en orden de registro (cadena de apps); dentro de cada uno, la carpeta
 *      junto al json y, si no es accesible, la misma ruta bajo su `host` publicado;
 *   2. el mapa del kit (`<raíz del kit>/assets/iconify.json`, al mismo SHA que este módulo);
 *   3. los sets que aún viajan en `dist/assets/icons/` (mdi, solar, tabler);
 *   4. la API de Iconify.
 *
 * API:
 *   registerIcons(url | mapa)        -> void  añade un mapa a la cadena
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
import type { ColaIconos, IconFamily, IconMapRef, MapaListo, MapaPerezoso } from "./icon-loader.schemas.js";
export type { IconMapRef } from "./icon-loader.schemas.js";
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
  // Sin GitHub Pages ni `@main`: refs mutables que sirven otra versión que la pineada. La base del
  // bundle ya hereda el SHA del loader (misma URL `…@<sha>/dist/cdn/`), así que los íconos van al pin.
];

/**
 * Sets cuyos SVG viajan en el kit (`dist/assets/icons/<set>/`): los que usan el kit y las apps.
 * El resto de sets se sirve desde la API de Iconify (SVG suelto por ícono, con `currentColor`):
 * el repo se mantiene liviano (jsDelivr rechaza paquetes de más de 50 MB) y el loader sigue
 * pidiendo solo el ícono que se pinta. Los índices `<set>.json` de todos los sets sí viajan.
 */
const SETS_LOCALES: ReadonlySet<string> = new Set(['mdi', 'solar', 'tabler']);
const API_ICONOS = 'https://api.iconify.design/';
const urlApi = (prefix: string, name: string): string =>
  `${API_ICONOS}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;

// ── Mapas de íconos registrados (cadena de apps) ─────────────────────────────

const COLA_GLOBAL = '__ISWC_ICONS__';
const registrados: MapaPerezoso[] = [];
const urlsRegistradas = new Set<string>();
const basesCaidas = new Set<string>();

function prepararMapa(m: unknown, url: string | null): MapaListo | null {
  const x = m as Partial<IconMapRef> | null;
  if (!x || x.v !== 1 || typeof x.icons !== 'object' || !x.icons || typeof x.base !== 'string') return null;
  const bases: string[] = [];
  try { if (url) bases.push(new URL(x.base, url).href); } catch { /* url rara */ }
  try { if (x.host) bases.push(new URL(x.base, new URL(x.ruta || 'assets/iconify.json', x.host)).href); } catch { /* host raro */ }
  const icons = new Map<string, Set<string>>();
  for (const [set, nombres] of Object.entries(x.icons)) if (Array.isArray(nombres)) icons.set(set, new Set(nombres));
  const svg = new Map<string, string>();
  for (const [set, porNombre] of Object.entries(x.svg ?? {})) {
    for (const [n, texto] of Object.entries(porNombre ?? {})) if (typeof texto === 'string' && texto.includes('<svg')) svg.set(`${set}:${n}`, texto);
  }
  return { bases: [...new Set(bases)], icons, svg };
}

/** El json se pide una sola vez y solo cuando se resuelve el primer ícono, no al registrar. */
function perezoso(url: string): MapaPerezoso {
  let carga: Promise<MapaListo | null> | null = null;
  return () => carga ??= fetch(url, { cache: 'default' })
    .then(async (res) => res.ok ? prepararMapa(await res.json(), res.url || url) : null)
    .catch(() => null);
}

/**
 * Añade un mapa de íconos a la cadena: la URL de un `iconify.json` (relativa a la página) o el mapa ya
 * leído. Los mapas se consultan en orden de registro y antes que el del kit. Registrar dos veces la
 * misma URL no hace nada.
 */
export function registerIcons(src: string | URL | IconMapRef): void {
  colaGlobal().push(src instanceof URL ? src.href : src);
}

/** Alta en ESTA copia del módulo (cada bundle que lo incluya se suscribe a la cola global). */
function agregarMapa(src: string | IconMapRef): void {
  if (typeof src === 'object' && !(src instanceof URL)) {
    const listo = prepararMapa(src, null);
    registrados.push(() => Promise.resolve(listo));
    return;
  }
  let url: string;
  try {
    url = new URL(String(src), typeof location !== 'undefined' ? location.href : import.meta.url).href;
  } catch {
    return;
  }
  if (urlsRegistradas.has(url)) return;
  urlsRegistradas.add(url);
  registrados.push(perezoso(url));
}

/** `iconify.json` del kit, en la raíz del repo publicado (mismo SHA que este módulo). */
function urlMapaKit(): string | null {
  const u = import.meta.url;
  const i = u.indexOf('/dist/cdn/');
  if (i >= 0) return `${u.slice(0, i)}/assets/iconify.json`;
  const j = u.search(/\/src\/components\//);
  return j >= 0 ? `${u.slice(0, j)}/assets/iconify.json` : null;
}
let mapaKit: MapaPerezoso | null = null;

function cadena(): MapaPerezoso[] {
  const kit = urlMapaKit();
  if (kit && !urlsRegistradas.has(kit)) mapaKit ??= perezoso(kit);
  return mapaKit ? [...registrados, mapaKit] : [...registrados];
}

/**
 * Lo que los mapas (en orden de la cadena) ofrecen para un ícono: el SVG incrustado del primero que lo
 * trae y las URLs candidatas de archivo (sin las bases que ya fallaron).
 */
async function buscarEnMapas(prefix: string, name: string): Promise<{ svg: string | null; urls: string[] }> {
  const urls: string[] = [];
  let svg: string | null = null;
  for (const m of await Promise.all(cadena().map((f) => f()))) {
    if (!m?.icons.get(prefix)?.has(name)) continue;
    // Solo cuenta el incrustado del PRIMER mapa que tiene el ícono (el orden de la cadena manda).
    if (!urls.length && svg === null) svg = m.svg.get(`${prefix}:${name}`) ?? null;
    for (const b of m.bases) if (!basesCaidas.has(b)) urls.push(`${b}${prefix}/${name}.svg`);
  }
  return { svg, urls };
}
const urlsEnMapas = async (prefix: string, name: string): Promise<string[]> => (await buscarEnMapas(prefix, name)).urls;

/**
 * Cola global `globalThis.__ISWC_ICONS__`: los registradores de las apps empujan URLs antes o después
 * de que cargue este módulo (si llega primero, es un array). Guarda todo lo registrado y avisa a cada
 * copia del módulo, así dos bundles que lo incluyan ven la misma cadena.
 */
function colaGlobal(): ColaIconos {
  const g = globalThis as unknown as Record<string, unknown>;
  const actual = g[COLA_GLOBAL] as ColaIconos | unknown[] | undefined;
  if (actual && !Array.isArray(actual) && actual.oyentes instanceof Set) return actual;
  const items = Array.isArray(actual) ? [...actual] as (string | IconMapRef)[] : [];
  const cola: ColaIconos = {
    items,
    oyentes: new Set(),
    push(...xs) {
      for (const x of xs) {
        items.push(x);
        for (const f of cola.oyentes) f(x);
      }
      return items.length;
    },
  };
  g[COLA_GLOBAL] = cola;
  return cola;
}
{
  const cola = colaGlobal();
  for (const x of cola.items) agregarMapa(x);
  cola.oyentes.add(agregarMapa);
}

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
const SRC_SHIPPED_PREFIXES: ReadonlySet<string> = SETS_LOCALES;

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
  const enMapas = await buscarEnMapas(prefix, name);
  if (enMapas.svg || enMapas.urls.length) return true;
  const idx = await loadIndex(prefix);
  return !!(idx && idx.has(name));
}

export function iconSourceBase(prefix: string): string | null {
  return baseCache.get(prefix) ?? null;
}

export async function resolveIconSvg(prefix: string, name: string): Promise<string | null> {
  const [enMapa] = await urlsEnMapas(prefix, name);
  return enMapa ?? resolveSinMapas(prefix, name);
}

async function resolveSinMapas(prefix: string, name: string): Promise<string | null> {
  const idx = await loadIndex(prefix);
  const base = baseCache.get(prefix);
  if (idx && base && idx.has(name) && SETS_LOCALES.has(prefix)) return base + LOCAL_SVG_PATH(prefix, name);
  // Set que no viaja en el kit (o índice inalcanzable): el SVG sale de la API de Iconify.
  if (!SETS_LOCALES.has(prefix) && (!idx || idx.has(name))) return urlApi(prefix, name);
  return null;
}

export async function resolveIconRaw(prefix: string, name: string, signal?: AbortSignal): Promise<string | null> {
  const key = `${prefix}:${name}`;
  const cached = rawCache.get(key);
  if (cached !== undefined) return cached;
  // Resuelve primero si el icono existe y desde que base (loadIndex/baseCache),
  // igual que resolveIconSvg; el fetch del SVG respeta la senal de abort para
  // que <iswc-icon> pueda cancelar renders obsoletos.
  // 1-2. Mapas registrados y del kit: SVG incrustado (cero peticiones) o archivo; si el archivo no es
  //      accesible se prueba la siguiente base.
  const enMapas = await buscarEnMapas(prefix, name);
  if (enMapas.svg) {
    rawCache.set(key, enMapas.svg);
    return enMapas.svg;
  }
  for (const url of enMapas.urls) {
    const text = await traerSvg(url, signal);
    if (text) {
      rawCache.set(key, text);
      return text;
    }
    if (text === null) basesCaidas.add(url.slice(0, url.length - `${prefix}/${name}.svg`.length));
  }
  // 3-4. Sets locales del kit y API de Iconify.
  const url = await resolveSinMapas(prefix, name);
  const text = url ? await traerSvg(url, signal) : null;
  if (text) rawCache.set(key, text);
  return text || null;
}

/**
 * Texto del SVG; `''` si la base respondió pero no tiene ese archivo (404 u otra cosa que no es SVG);
 * `null` si la base no es accesible (red, CORS, 5xx) y no conviene volver a intentarla. AbortError se propaga.
 */
async function traerSvg(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal, cache: 'default' });
    if (res.status === 404) return '';
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('<svg') ? text : '';
  } catch (err) {
    if ((err as { name?: unknown } | null)?.name === 'AbortError') throw err; // propagar la cancelacion
    return null;
  }
}

/** Vacia el cache en memoria de SVGs (util para tests y para liberar memoria). */
export function clearRawCache(): void {
  rawCache.clear();
}

/** Entrada del listado de familias devuelto por `listIconFamilies`. */

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
