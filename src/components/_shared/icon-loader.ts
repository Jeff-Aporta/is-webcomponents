/**
 * icon-loader — resuelve el SVG de un icono Iconify SIN el web component `<iconify-icon>` ni su
 * script de CDN. Dos fuentes, nada más:
 *
 *   1. LOCAL: el mapa de íconos de la app (`assets/iconify.json`). Si el ícono está en el mapa, se
 *      pide a la carpeta de la app (`assets/iconify/<set>/<nombre>.svg`, junto al json).
 *   2. API de Iconify (`https://api.iconify.design/<set>/<nombre>.svg`): todo lo demás, y también
 *      si el archivo local no responde.
 *
 * El mapa lo genera `deno task icons` (`assets/dl.js` → `src/cdn/tools/download-iconify.ts`) con los
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
import type { ColaIconos, IconFamily, MapaListo, MapaPerezoso } from "./icon-loader.schemas.js";

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

/** Cache de raw SVG: `${prefix}:${name}` -> texto SVG. */
const rawCache = new Map<string, string>();

export async function hasIconLocal(prefix: string, name: string): Promise<boolean> {
  return (await urlLocal(prefix, name)) !== null;
}

export async function resolveIconSvg(prefix: string, name: string): Promise<string | null> {
  if (!prefix || !name) return null;
  return (await urlLocal(prefix, name)) ?? urlApi(prefix, name);
}

export async function resolveIconRaw(prefix: string, name: string, signal?: AbortSignal): Promise<string | null> {
  if (!prefix || !name) return null;
  const key = `${prefix}:${name}`;
  const cached = rawCache.get(key);
  if (cached !== undefined) return cached;
  // Local si el mapa lo tiene; si el archivo no responde, la API. El fetch respeta la señal de
  // abort para que <iswc-icon> pueda cancelar renders obsoletos.
  const local = await urlLocal(prefix, name);
  const text = (local ? await traerSvg(local, signal) : null) ?? await traerSvg(urlApi(prefix, name), signal);
  if (text) rawCache.set(key, text);
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
