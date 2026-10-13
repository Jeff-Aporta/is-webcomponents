/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component `<iconify-icon>` ni su
 * script de CDN. Dos fuentes, nada más:
 *
 *   1. LOCAL: el mapa de íconos de la app (`assets/iconify.json`). Si el ícono está en el mapa, se
 *      pide a la carpeta de la app (`assets/iconify/<set>/<nombre>.svg`, junto al json).
 *   2. API de Iconify (`https://api.iconify.design/<set>/<nombre>.svg`): todo lo demás, y también
 *      si el archivo local no responde.
 *
 * El mapa lo genera `deno task icons` (`assets/dl.js` → `src/vendor-distributions/client/tools/download-iconify.ts`) con los
 * íconos de la app y los de todo lo que consume (kit y otras apps): no se enlazan rutas de otras apps
 * en ejecución. El registrador del build (`<prefijo>Loader.min.js`) lo registra empujando su URL a la
 * cola global `globalThis.__ISWC_ICONS__` (antes o después de que cargue este módulo); desde código,
 * `registerIcons(url)`. Las páginas del propio kit usan el mapa del kit cuando se sirven en su mismo
 * origen (dev o su sitio).
 *
 * API:
 *   registerIcons(url)                   -> void  registra un iconify.json
 *   resolveIconSvg(prefix, name)         -> Promise<string|null>  URL del SVG (local o API)
 *   resolveIconRaw(prefix, name, signal) -> Promise<string|null>  texto del SVG
 *   clearRawCache()                      -> void  vacia el cache de SVGs
 *   hasIconLocal(prefix, name)           -> Promise<boolean>  ¿está en un mapa registrado?
 *   listIconFamilies()                   -> Promise<Array<{prefix, count}>>  (catálogo del kit)
 */
import type { ColaIconos, IconFamily, MapaListo, MapaPerezoso, Persistido } from "./icon-loader.schemas.js";

const API_ICONOS = 'https://api.iconify.design/';
const urlApi = (prefix: string, name: string): string =>
  `${API_ICONOS}${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;

// ── Mapas registrados (lo local) ─────────────────────────────────────────────

const COLA_GLOBAL = '__ISWC_ICONS__';
const registrados: MapaPerezoso[] = [];
const urlsRegistradas = new Set<string>();

function prepararMapa(m: unknown, url: string): MapaListo | null {
  const x = m as { v?: unknown; base?: unknown; icons?: unknown } | null;
  if (!x || x.v !== 1 || typeof x.base !== 'string' || !x.icons || typeof x.icons !== 'object') return null;
  const ids = new Set<string>();
  for (const [set, nombres] of Object.entries(x.icons as Record<string, unknown>)) {
    if (Array.isArray(nombres)) for (const n of nombres) ids.add(`${set}:${n}`);
  }
  return { base: new URL(x.base, url).href, ids };
}

/** El json se pide una sola vez y solo cuando se resuelve el primer ícono, no al registrar. */
function perezoso(url: string): MapaPerezoso {
  let carga: Promise<MapaListo | null> | null = null;
  return () => carga ??= fetch(url, { cache: 'default' })
    .then(async (res) => res.ok ? prepararMapa(await res.json(), res.url || url) : null)
    .catch(() => null);
}

function agregarMapa(src: string): void {
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

/**
 * Cola global `globalThis.__ISWC_ICONS__`: los registradores de las apps empujan URLs antes o después
 * de que cargue este módulo (si llegan antes, es un array). Guarda lo registrado y avisa a cada copia
 * del módulo, así dos bundles que lo incluyan ven los mismos mapas.
 */
function colaGlobal(): ColaIconos {
  const g = globalThis as unknown as Record<string, unknown>;
  const actual = g[COLA_GLOBAL] as ColaIconos | unknown[] | undefined;
  if (actual && !Array.isArray(actual) && actual.oyentes instanceof Set) return actual;
  const items = Array.isArray(actual) ? actual.map(String) : [];
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

/** Registra el `iconify.json` de una app (URL relativa a la página). Repetir la misma URL no hace nada. */
export function registerIcons(url: string | URL): void {
  colaGlobal().push(String(url));
}

{
  const cola = colaGlobal();
  for (const x of cola.items) agregarMapa(x);
  cola.oyentes.add(agregarMapa);
}

/** Páginas del propio kit: su mapa, solo si el kit se sirve en el mismo origen que la página. */
{
  const u = import.meta.url;
  const corte = u.includes('/dist/cdn/') ? u.indexOf('/dist/cdn/') : u.search(/\/src\/components\//);
  if (corte >= 0 && typeof location !== 'undefined' && new URL(u).origin === location.origin) {
    agregarMapa(`${u.slice(0, corte)}/assets/iconify.json`);
  }
}

/** URL local del ícono si algún mapa registrado lo tiene; `null` si no. */
async function urlLocal(prefix: string, name: string): Promise<string | null> {
  const id = `${prefix}:${name}`;
  for (const m of await Promise.all(registrados.map((f) => f()))) {
    if (m?.ids.has(id)) return `${m.base}${prefix}/${name}.svg`;
  }
  return null;
}

// ── Resolución: local o API ───────────────────────────────────────────────────

/**
 * Cache de raw SVG: `${prefix}:${name}` -> texto SVG, o `null` cuando NO se pudo resolver (ni local ni
 * API: 404, CSP que bloquea `connect-src`, sin red). El fallo también se recuerda: cada ícono se intenta
 * UNA vez por página. Sin esto, un componente que se repinta por timer (p. ej. una barra de estado que
 * emite cada 120 ms) volvía a pedir el mismo ícono bloqueado en cada repintado y la consola entraba en
 * bucle (ISW en Azure, 2026-10-13). Un abort no se cachea. `clearRawCache()` permite reintentar.
 */
const rawCache = new Map<string, string | null>();

export async function hasIconLocal(prefix: string, name: string): Promise<boolean> {
  return (await urlLocal(prefix, name)) !== null;
}

export async function resolveIconSvg(prefix: string, name: string): Promise<string | null> {
  if (!prefix || !name) return null;
  return (await urlLocal(prefix, name)) ?? urlApi(prefix, name);
}

// ── localStorage: el SVG ya resuelto se queda en el navegador ─────────────────
// Cadena de resolución (Jeff, 2026-10-13): memoria → localStorage → carpeta local de la app (mapa
// `iconify.json`) → API de Iconify. Todo SVG que llega por cualquier vía se guarda en localStorage,
// también el que vino de la API: así la API es solo fallback de la primera vez y después el ícono se
// "quema" directo sin fetch. Un fallo nunca se persiste (solo memoria, por página).
const LS_PREFIJO = 'iswc-icon:';
/** Tope por SVG en localStorage (los íconos pesan ~1 KB; uno enorme no vale el espacio). */
const LS_MAX_BYTES = 32 * 1024;
/** Vida máxima de un SVG persistido: 15 días. Después se vuelve a pedir (y se renueva). */
export const LS_TTL_MS = 15 * 24 * 60 * 60 * 1000;

function almacen(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null; // acceso bloqueado (privado, iframe sin permiso)
  }
}

function leerPersistido(key: string, ahora = Date.now()): string | null {
  const ls = almacen();
  if (!ls) return null;
  try {
    const v = ls.getItem(LS_PREFIJO + key);
    if (!v) return null;
    const p = JSON.parse(v) as Partial<Persistido>;
    if (typeof p?.s !== 'string' || !p.s.includes('<svg') || typeof p.t !== 'number') { ls.removeItem(LS_PREFIJO + key); return null; }
    if (ahora - p.t > LS_TTL_MS) { ls.removeItem(LS_PREFIJO + key); return null; } // vencido: se renueva
    return p.s;
  } catch {
    try { ls.removeItem(LS_PREFIJO + key); } catch { /* nada */ }
    return null;
  }
}

function persistir(key: string, svg: string, ahora = Date.now()): void {
  if (svg.length > LS_MAX_BYTES) return;
  try {
    almacen()?.setItem(LS_PREFIJO + key, JSON.stringify({ t: ahora, s: svg } satisfies Persistido));
  } catch {
    // cuota llena o storage bloqueado: la memoria basta para esta página
  }
}

/** Borra los SVG persistidos vencidos (más de `LS_TTL_MS`). Devuelve cuántos quitó. */
export function purgarIconosVencidos(ahora = Date.now()): number {
  const ls = almacen();
  if (!ls) return 0;
  let n = 0;
  try {
    const claves: string[] = [];
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(LS_PREFIJO)) claves.push(k); }
    for (const k of claves) {
      let vencido = true;
      try { const p = JSON.parse(ls.getItem(k) ?? '') as Partial<Persistido>; vencido = typeof p?.t !== 'number' || ahora - p.t > LS_TTL_MS; } catch { /* corrupto: fuera */ }
      if (vencido) { ls.removeItem(k); n++; }
    }
  } catch { /* nada */ }
  return n;
}

// Barrido perezoso: una vez por página, 60 s después de cargar, fuera del arranque.
if (typeof setTimeout === 'function' && typeof document !== 'undefined') {
  setTimeout(() => { try { purgarIconosVencidos(); } catch { /* nada */ } }, 60_000);
}

/** Borra los SVG persistidos en localStorage (todos los `iswc-icon:*`). */
export function clearPersistedIcons(): void {
  const ls = almacen();
  if (!ls) return;
  try {
    const claves: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(LS_PREFIJO)) claves.push(k);
    }
    for (const k of claves) ls.removeItem(k);
  } catch {
    // nada
  }
}

export async function resolveIconRaw(prefix: string, name: string, signal?: AbortSignal): Promise<string | null> {
  if (!prefix || !name) return null;
  const key = `${prefix}:${name}`;
  const cached = rawCache.get(key);
  if (cached !== undefined) return cached;
  // 1) localStorage: sin fetch.
  const persistido = leerPersistido(key);
  if (persistido) { rawCache.set(key, persistido); return persistido; }
  // 2) Local si el mapa lo tiene; 3) si no está o el archivo no responde, la API. El fetch respeta
  // la señal de abort para que <iswc-icon> pueda cancelar renders obsoletos.
  const local = await urlLocal(prefix, name);
  const text = (local ? await traerSvg(local, signal) : null) ?? await traerSvg(urlApi(prefix, name), signal);
  rawCache.set(key, text); // también el fallo (null): nunca se vuelve a pedir en esta página
  if (text) persistir(key, text); // venga de local o de la API: la próxima vez no hay fetch
  return text;
}

/** Texto del SVG o `null` (no existe, no es SVG o no hay red). AbortError se propaga. */
async function traerSvg(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal, cache: 'default' });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('<svg') ? text : null;
  } catch (err) {
    if ((err as { name?: unknown } | null)?.name === 'AbortError') throw err; // propagar la cancelacion
    return null;
  }
}

/** Vacia el cache en memoria de SVGs (util para tests y para liberar memoria). */
export function clearRawCache(): void {
  rawCache.clear();
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
    if (Array.isArray(data)) return data as IconFamily[];
    const fam = (data as { families?: unknown } | null)?.families;
    return Array.isArray(fam) ? fam as IconFamily[] : [];
  } catch {
    return [];
  }
}
