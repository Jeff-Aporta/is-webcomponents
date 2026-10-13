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
 *   listIconFamilies()                   -> Promise<Array<{prefix, count}>>  (catálogo del kit)
 */
import { iswcKey, listIswcKeys, readIswc, registerMemoryCache, removeIswc, writeIswc } from '../../core/iswc-storage.js';
import type { EstadoIconos, IconFamily, Persistido } from "./icon-loader.schemas.js";

const API_ICONOS = 'https://api.iconify.design/';
const urlApi = (prefix: string, name: string): string =>
  `${API_ICONOS}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;

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

/** Borra los SVG persistidos en localStorage (todos los `iswc:icon:*`). */
export function clearPersistedIcons(): void {
  for (const k of clavesIconos()) removeIswc(k);
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

/**
 * Catálogo de familias del kit (`dist/assets/icons/index.json`, lo usa el explorador de íconos).
 *   - dist/cdn/<cat>/*.min.js     → ../../assets/icons/
 *   - src/components/_shared/…    → ../../../dist/assets/icons/
 */
export async function listIconFamilies(): Promise<IconFamily[]> {
  const u = import.meta.url;
  const base = u.includes('/dist/cdn/') ? new URL('../../assets/icons/', u) : new URL('../../../dist/assets/icons/', u);
  try {
    const res = await fetch(new URL('index.json', base), { cache: 'default' });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (Array.isArray(data)) return data.filter(esFamilia);
    const fam: unknown = data && typeof data === 'object' ? Reflect.get(data, 'families') : undefined;
    return Array.isArray(fam) ? fam.filter(esFamilia) : [];
  } catch {
    return [];
  }
}

function esFamilia(x: unknown): x is IconFamily {
  return !!x && typeof x === 'object' && typeof Reflect.get(x, 'prefix') === 'string' && typeof Reflect.get(x, 'count') === 'number';
}
