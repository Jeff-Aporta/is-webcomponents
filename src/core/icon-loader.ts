/// <reference lib="dom" />
/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component `<iconify-icon>` ni su
 * script de CDN. Protocolo (Jeff, 2026-10-13), sin mapas:
 *
 *   1. localStorage (`iswc:icon:<set>:<nombre>`, TTL 15 días): si está, no hay fetch.
 *   2. La web PUBLICADA de la app: `<base>/<set>/<nombre>.svg`, donde `<base>` es una URL ABSOLUTA
 *      (host publicado + carpeta de íconos) declarada UNA vez en `<html data-icons="…">`; la escribe
 *      `initApp({ icons: { host, folder } })` o el registrador de la app (`deno.json` → `iswc.host`).
 *      Sin `data-icons`, las páginas del propio kit servidas en su mismo origen usan `<kit>/assets/iconify/`.
 *   3. API de Iconify (`https://api.iconify.design/<set>/<nombre>.svg`). Si había `<base>` y el ícono no
 *      estaba ahí, UN aviso por ícono: `[iswc-icon] falta en local: <set>:<nombre>` (lo detecta el e2e y
 *      corre `deno task icons`).
 *
 * Todo SVG que llega (local o API) se guarda en localStorage. Un solo fetch en vuelo por ícono, y el
 * resultado (también el fallo) se recuerda por página; `clearIswcStorage()` (core/iswc-storage) vacía
 * localStorage y esta caché en memoria.
 *
 * API:
 *   resolveIconBase()                    -> string|null  `<base>` absoluto en uso (o null)
 *   resolveIconSvg(prefix, name)         -> Promise<string|null>  URL del SVG (local si hay base, si no API)
 *   resolveIconRaw(prefix, name, signal) -> Promise<string|null>  texto del SVG
 *   clearRawCache()                      -> void  vacía la caché en memoria (SVG, en vuelo y avisos)
 *   clearPersistedIcons()                -> void  borra los `iswc:icon:*` de localStorage
 *   purgarIconosVencidos()               -> number  borra los vencidos
 *   iconApiUrl(prefix, name)             -> string  URL del SVG suelto en la API de Iconify
 *
 * Catálogo (explorador de íconos): ninguna colección completa viaja en el repo (4-nov-2026); todo sale
 * de la API de Iconify y se cachea en localStorage (`iswc:icon-catalogo:*`) con el mismo TTL que los SVG.
 *   listIconFamilies()                   -> Promise<IconFamily[]>  `/collections` ([] sin red)
 *   listIconNames(prefix)                -> Promise<string[]>  `/collection?prefix=` ([] si no existe)
 *   searchIconNames(term, prefixes, n)   -> Promise<string[]>  `/search` (ids `set:nombre`)
 *   prefetchIcons(prefix, names)         -> Promise<number>  SVG POR LOTES (`/<set>.json?icons=a,b`):
 *                                           un fetch por página del grid; quedan en memoria y localStorage
 */
import { iswcKey, listIswcKeys, readIswc, registerMemoryCache, removeIswc, writeIswc } from './iswc-storage.js';
import type { CatalogoPersistido, EstadoIconos, IconFamily, LoteIconify, Persistido } from "./schemas/icon-loader.schemas.js";

const API_ICONOS = 'https://api.iconify.design/';
const urlApi = (prefix: string, name: string): string =>
  `${API_ICONOS}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;

/** URL del SVG suelto de `prefix:name` en la API de Iconify (la que copia el explorador). */
export const iconApiUrl = urlApi;

/** Formato estable del aviso (grep del e2e). */
export const AVISO_FALTA_LOCAL = '[iswc-icon] falta en local:';

// ── Estado compartido por todas las copias del módulo (cada bundle puede traer la suya) ──
const G = globalThis as typeof globalThis & { __iswcIcons?: EstadoIconos };
const estado: EstadoIconos = G.__iswcIcons ??= { svg: new Map(), enVuelo: new Map(), avisados: new Set() };
registerMemoryCache(() => clearRawCache());

// ── Base local: la web publicada de la app ──────────────────────────────────

/** Normaliza a URL absoluta http(s) con `/` final; `null` si no lo es. */
export function baseAbsoluta(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const u = new URL(valor);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.href.endsWith('/') ? u.href : `${u.href}/`;
  } catch {
    return null; // relativa o inválida: no se usa
  }
}

/** Páginas del propio kit: `<kit>/assets/iconify/`, solo si el kit se sirve en el mismo origen que la página. */
function baseDelKit(): string | null {
  const u = import.meta.url;
  const corte = u.includes('/dist/cdn/') ? u.indexOf('/dist/cdn/') : u.search(/\/src\/components\//);
  if (corte < 0 || typeof location === 'undefined') return null;
  try {
    return new URL(u).origin === location.origin ? `${u.slice(0, corte)}/assets/iconify/` : null;
  } catch {
    return null;
  }
}

/** `<base>` en uso: `<html data-icons>` (absoluto) o, en el kit, su carpeta local. */
export function resolveIconBase(): string | null {
  const declarada = typeof document !== 'undefined' ? document.documentElement?.dataset.icons : undefined;
  if (declarada) return baseAbsoluta(declarada);
  return baseDelKit();
}

// ── localStorage: el SVG ya resuelto se queda en el navegador ─────────────────
const LS_PREFIJO = 'icon:';
/** Catálogo de la API (familias y nombres por set): `iswc:icon-catalogo:<clave>`, mismo TTL que los SVG. */
const LS_CATALOGO = 'icon-catalogo:';
/** Tope por SVG en localStorage (los íconos pesan ~1 KB; uno enorme no vale el espacio). */
const LS_MAX_BYTES = 32 * 1024;
/** Vida máxima de un SVG persistido: 15 días. Después se vuelve a pedir (y se renueva). */
export const LS_TTL_MS = 15 * 24 * 60 * 60 * 1000;

function leerPersistido(key: string, ahora = Date.now()): string | null {
  const v = readIswc(LS_PREFIJO + key);
  if (!v) return null;
  try {
    const p: Partial<Persistido> | null = JSON.parse(v);
    if (typeof p?.s !== 'string' || !p.s.includes('<svg') || typeof p.t !== 'number') { removeIswc(LS_PREFIJO + key); return null; }
    if (ahora - p.t > LS_TTL_MS) { removeIswc(LS_PREFIJO + key); return null; } // vencido: se renueva
    return p.s;
  } catch {
    removeIswc(LS_PREFIJO + key);
    return null;
  }
}

function persistir(key: string, svg: string, ahora = Date.now()): void {
  if (svg.length > LS_MAX_BYTES) return;
  writeIswc(LS_PREFIJO + key, JSON.stringify({ t: ahora, s: svg } satisfies Persistido)); // cuota llena: la memoria basta
}

const clavesIconos = (): string[] => listIswcKeys().filter((k) => k.startsWith(iswcKey(LS_PREFIJO)));

/** Borra los SVG persistidos vencidos (más de `LS_TTL_MS`). Devuelve cuántos quitó. */
export function purgarIconosVencidos(ahora = Date.now()): number {
  let n = 0;
  for (const k of clavesIconos()) {
    let vencido = true;
    try {
      const p: Partial<Persistido> | null = JSON.parse(readIswc(k) ?? '');
      vencido = typeof p?.t !== 'number' || ahora - p.t > LS_TTL_MS;
    } catch { /* corrupto: fuera */ }
    if (vencido) { removeIswc(k); n++; }
  }
  return n;
}

// Barrido perezoso: una vez por página, 60 s después de cargar, fuera del arranque.
if (typeof setTimeout === 'function' && 'window' in globalThis && typeof document !== 'undefined') {
  setTimeout(() => { try { purgarIconosVencidos(); } catch { /* nada */ } }, 60_000);
}

/** Borra los SVG persistidos en localStorage (todos los `iswc:icon:*`) y el catálogo (`iswc:icon-catalogo:*`). */
export function clearPersistedIcons(): void {
  for (const k of clavesIconos()) removeIswc(k);
  for (const k of listIswcKeys().filter((c) => c.startsWith(iswcKey(LS_CATALOGO)))) removeIswc(k);
}

// ── Resolución ────────────────────────────────────────────────────────────────

export async function resolveIconSvg(prefix: string, name: string): Promise<string | null> {
  if (!prefix || !name) return null;
  const base = resolveIconBase();
  return base ? `${base}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg` : urlApi(prefix, name);
}

/** Texto del SVG o `null` (no existe, no es SVG, CORS o sin red). Nunca lanza. */
async function traerSvg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('<svg') ? text : null;
  } catch {
    return null;
  }
}

/** Local (web publicada) → API, con el aviso si el local no lo tenía. Persiste lo que llega. */
async function cargar(prefix: string, name: string, key: string): Promise<string | null> {
  const base = resolveIconBase();
  const local = base ? await traerSvg(`${base}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`) : null;
  if (base && !local && !estado.avisados.has(key)) {
    estado.avisados.add(key);
    console.warn(`${AVISO_FALTA_LOCAL} ${key}`);
  }
  const text = local ?? await traerSvg(urlApi(prefix, name));
  estado.svg.set(key, text); // también el fallo (null): nunca se vuelve a pedir en esta página
  if (text) persistir(key, text); // venga de local o de la API: la próxima vez no hay fetch
  return text;
}

/** Rechaza con AbortError cuando `signal` aborta (el fetch compartido sigue para los demás). */
function conAbort<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  const abortError = () => new DOMException('Aborted', 'AbortError');
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((ok, mal) => {
    const alAbortar = () => mal(abortError());
    signal.addEventListener('abort', alAbortar, { once: true });
    p.then(ok, mal).finally(() => signal.removeEventListener('abort', alAbortar));
  });
}

export async function resolveIconRaw(prefix: string, name: string, signal?: AbortSignal): Promise<string | null> {
  if (!prefix || !name) return null;
  const key = `${prefix}:${name}`;
  const cached = estado.svg.get(key);
  if (cached !== undefined) return cached;
  // 1) localStorage: sin fetch.
  const persistido = leerPersistido(key);
  if (persistido) { estado.svg.set(key, persistido); return persistido; }
  // Ya abortado: ni se arranca el fetch (un abort nunca deja un fallo cacheado).
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  // 2) y 3): un solo fetch en vuelo por ícono, compartido por todos los que lo piden.
  let p = estado.enVuelo.get(key);
  if (!p) {
    p = cargar(prefix, name, key).finally(() => estado.enVuelo.delete(key));
    estado.enVuelo.set(key, p);
  }
  return conAbort(p, signal);
}

/** Vacía la caché en memoria: SVG resueltos, fetches en vuelo y avisos dados (útil en tests y al limpiar). */
export function clearRawCache(): void {
  estado.svg.clear();
  estado.enVuelo.clear();
  estado.avisados.clear();
}

// ── Catálogo: API de Iconify (ninguna colección completa viaja en el repo) ─────────────────

/** Catálogos ya pedidos en esta página (también el fallo: `null`, no se reintenta hasta recargar). */
const catalogoEnMemoria = new Map<string, Promise<unknown>>();
registerMemoryCache(() => catalogoEnMemoria.clear());

function leerCatalogo<T>(clave: string, ahora = Date.now()): T | null {
  const v = readIswc(LS_CATALOGO + clave);
  if (!v) return null;
  try {
    const p: Partial<CatalogoPersistido<T>> | null = JSON.parse(v);
    if (typeof p?.t === 'number' && ahora - p.t <= LS_TTL_MS && p.d !== undefined && p.d !== null) return p.d;
  } catch { /* corrupto: fuera */ }
  removeIswc(LS_CATALOGO + clave);
  return null;
}

function guardarCatalogo<T>(clave: string, d: T): void {
  writeIswc(LS_CATALOGO + clave, JSON.stringify({ t: Date.now(), d } satisfies CatalogoPersistido<T>)); // cuota llena: la memoria basta
}

/** localStorage (TTL) → memoria de la página → `traer()`; lo que llega se persiste. `vacio` si no hay datos. */
async function conCatalogo<T>(clave: string, traer: () => Promise<T | null>, vacio: T): Promise<T> {
  const guardado = leerCatalogo<T>(clave);
  if (guardado !== null) return guardado;
  let p = catalogoEnMemoria.get(clave);
  if (!p) {
    p = traer().then((d) => { if (d !== null) guardarCatalogo(clave, d); return d; });
    catalogoEnMemoria.set(clave, p);
  }
  const d = await p;
  return d === null || d === undefined ? vacio : d as T;
}

/** JSON de la API o `null` (sin red, CORS, 404 o cuerpo inválido). Nunca lanza. */
async function traerJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const texto = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);
const nombreDe = (x: unknown): string | undefined => (x && typeof x === 'object' ? texto(Reflect.get(x, 'name') ?? Reflect.get(x, 'title')) : undefined);

/** Entrada de `/collections` → `IconFamily` (aplanada); `null` si no trae `total`. */
function familiaDe(prefix: string, x: unknown): IconFamily | null {
  if (!x || typeof x !== 'object') return null;
  const total = Reflect.get(x, 'total');
  if (typeof total !== 'number') return null;
  const alto = Reflect.get(x, 'height');
  const muestras = Reflect.get(x, 'samples');
  const licencia = Reflect.get(x, 'license');
  return {
    prefix,
    count: total,
    name: texto(Reflect.get(x, 'name')),
    category: texto(Reflect.get(x, 'category')),
    author: nombreDe(Reflect.get(x, 'author')),
    license: licencia && typeof licencia === 'object' ? texto(Reflect.get(licencia, 'title')) : undefined,
    height: typeof alto === 'number' ? alto : undefined,
    palette: Reflect.get(x, 'palette') === true,
    samples: Array.isArray(muestras) ? muestras.filter((s): s is string => typeof s === 'string') : undefined,
  };
}

/** Familias de Iconify (`/collections`) con sus metadatos; `[]` sin red o API caída. */
export function listIconFamilies(): Promise<IconFamily[]> {
  return conCatalogo<IconFamily[]>('familias', async () => {
    const d = await traerJson(`${API_ICONOS}collections`);
    if (!d || typeof d !== 'object') return null;
    const out: IconFamily[] = [];
    for (const [prefix, x] of Object.entries(d)) {
      const f = familiaDe(prefix, x);
      if (f) out.push(f);
    }
    return out.length ? out : null;
  }, []);
}

/** Nombres de una familia (`/collection?prefix=`), ordenados y sin repetir; `[]` si no existe o sin red. */
export function listIconNames(prefix: string): Promise<string[]> {
  if (!prefix) return Promise.resolve([]);
  return conCatalogo<string[]>(`nombres:${prefix}`, async () => {
    const d = await traerJson(`${API_ICONOS}collection?prefix=${encodeURIComponent(prefix)}`);
    if (!d || typeof d !== 'object') return null;
    const sueltos = Reflect.get(d, 'uncategorized');
    const categorias = Reflect.get(d, 'categories');
    const todos: unknown[] = [
      ...(Array.isArray(sueltos) ? sueltos : []),
      ...(categorias && typeof categorias === 'object' ? Object.values(categorias).flat() : []),
    ];
    const nombres = [...new Set(todos.filter((n): n is string => typeof n === 'string'))].sort();
    return nombres.length ? nombres : null;
  }, []);
}

/** Búsqueda en la API (`/search`): ids `set:nombre`, como mucho `limite` (32–999); `prefixes` acota los sets. */
export async function searchIconNames(term: string, prefixes: string[] = [], limite = 240): Promise<string[]> {
  const q = term.trim();
  if (!q) return [];
  const n = Math.min(999, Math.max(32, Math.round(limite)));
  const sets = prefixes.length ? `&prefixes=${prefixes.map(encodeURIComponent).join(',')}` : '';
  const d = await traerJson(`${API_ICONOS}search?query=${encodeURIComponent(q)}&limit=${n}${sets}`);
  const ids = d && typeof d === 'object' ? Reflect.get(d, 'icons') : null;
  return Array.isArray(ids) ? ids.filter((i): i is string => typeof i === 'string' && i.includes(':')).slice(0, limite) : [];
}

/** Largo máximo de la lista `icons=` de un lote: una página del grid (240 nombres de mdi) cabe en uno. */
const LOTE_MAX_CHARS = 6000;

function enLotes(nombres: string[]): string[][] {
  const lotes: string[][] = [];
  let actual: string[] = [];
  let largo = 0;
  for (const n of nombres) {
    const c = encodeURIComponent(n).length + 1;
    if (actual.length && largo + c > LOTE_MAX_CHARS) { lotes.push(actual); actual = []; largo = 0; }
    actual.push(n);
    largo += c;
  }
  if (actual.length) lotes.push(actual);
  return lotes;
}

/** SVG suelto (como lo sirve `api.iconify.design/<set>/<n>.svg`) desde el JSON por lotes; alias simples incluidos. */
function svgDeLote(d: LoteIconify, nombre: string): string | null {
  const alias = d.aliases?.[nombre];
  const sinTransformar = alias && !alias.rotate && !alias.hFlip && !alias.vFlip;
  const i = d.icons?.[nombre] ?? (sinTransformar ? d.icons?.[alias.parent] : undefined);
  if (!i || typeof i.body !== 'string') return null;
  const w = i.width ?? d.width ?? 16;
  const h = i.height ?? d.height ?? 16;
  const l = i.left ?? d.left ?? 0;
  const t = i.top ?? d.top ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${+(w / h).toFixed(4)}em" height="1em" viewBox="${l} ${t} ${w} ${h}">${i.body}</svg>`;
}

/**
 * Trae POR LOTES los SVG de `names` (`/<set>.json?icons=a,b,c`: un fetch por lote, no uno por ícono) y los
 * deja en memoria y en localStorage: los `<iswc-icon>` que se pinten después no hacen fetch. Salta los que ya
 * están (memoria, localStorage o en vuelo). Devuelve cuántos SVG llegaron.
 */
export async function prefetchIcons(prefix: string, names: string[]): Promise<number> {
  if (!prefix) return 0;
  const faltan = [...new Set(names)].filter((nombre) => {
    const key = `${prefix}:${nombre}`;
    if (!nombre || estado.svg.has(key) || estado.enVuelo.has(key)) return false;
    const persistido = leerPersistido(key);
    if (persistido) { estado.svg.set(key, persistido); return false; }
    return true;
  });
  let llegaron = 0;
  for (const lote of enLotes(faltan)) {
    const d = await traerJson(`${API_ICONOS}${encodeURIComponent(prefix)}.json?icons=${lote.map(encodeURIComponent).join(',')}`);
    if (!d || typeof d !== 'object') continue;
    for (const nombre of lote) {
      const svg = svgDeLote(d as LoteIconify, nombre);
      if (!svg) continue; // no existe en el set: el <iswc-icon> marcará data-missing por su cuenta
      const key = `${prefix}:${nombre}`;
      estado.svg.set(key, svg);
      persistir(key, svg);
      llegaron++;
    }
  }
  return llegaron;
}
