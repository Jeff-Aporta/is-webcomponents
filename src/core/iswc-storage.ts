/**
 * iswc-storage — TODO lo que el kit guarda en el navegador lleva UN prefijo: `iswc:`.
 *
 *   readIswc('app-cfg')                    // localStorage['iswc:app-cfg']
 *   writeIswc('icon:mdi:home', svg)        // localStorage['iswc:icon:mdi:home']
 *   writeIswc('cdn-ref', ref, 'session')   // sessionStorage['iswc:cdn-ref']
 *   listIswcKeys()                         // ['iswc:app-cfg', 'iswc:root', 'iswc:icon:mdi:home', …]
 *   clearIswcStorage()                     // borra todas las `iswc:` (local y session) y vacía las cachés en memoria
 *   registerMemoryCache(() => cache.clear())
 *
 * Es el ÚNICO módulo del kit que llama a `setItem` (guardián `meta/iswc-storage.test.ts`): así
 * `clearIswcStorage()` deja la app como en su primera carga (lo usa `<iswc-prefs-clear>`).
 *
 * Migración (una vez por página, al cargar el módulo): las llaves del formato viejo
 * (`iswc-app-cfg`, `iswc-root`, `iswc-icon:*`, `iswc-diagram:*`, `iswc-wc-asset-hashes`,
 * `iswc-theming-seeds`, `<clave>:paneles` de iswc-doc-layout) se copian a `iswc:<nombre>` (sin pisar
 * una nueva que ya exista) y la vieja se borra. `iswc-theme`/`iswc-palette` las absorbe `app-cfg.ts`.
 */
import type { AreaIswc, GlobalIswcStorage, LimpiezaIswc, MigracionIswc } from './iswc-storage.schemas.js';

export type { AreaIswc, LimpiezaIswc, MigracionIswc } from './iswc-storage.schemas.js';

export const ISWC_PREFIX = 'iswc:';

const G: GlobalIswcStorage = globalThis;

/** Llave completa: `iswc:<nombre>` (si ya trae el prefijo, tal cual). */
export const iswcKey = (nombre: string): string => (nombre.startsWith(ISWC_PREFIX) ? nombre : `${ISWC_PREFIX}${nombre}`);

function almacen(area: AreaIswc): Storage | null {
  try {
    const s = area === 'session' ? G.sessionStorage : G.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null; // acceso bloqueado (modo privado, iframe sin permiso)
  }
}

/** Valor de `iswc:<nombre>` o `null`. */
export function readIswc(nombre: string, area: AreaIswc = 'local'): string | null {
  try { return almacen(area)?.getItem(iswcKey(nombre)) ?? null; } catch { return null; }
}

/** Escribe `iswc:<nombre>`. `false` si no hay storage o la cuota está llena. */
export function writeIswc(nombre: string, valor: string, area: AreaIswc = 'local'): boolean {
  const s = almacen(area);
  if (!s) return false;
  try { s.setItem(iswcKey(nombre), valor); return true; } catch { return false; }
}

/** Borra `iswc:<nombre>`. */
export function removeIswc(nombre: string, area: AreaIswc = 'local'): void {
  try { almacen(area)?.removeItem(iswcKey(nombre)); } catch { /* sin storage */ }
}

function llaves(s: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k !== null) out.push(k);
  }
  return out;
}

/** Todas las llaves `iswc:` del almacén (ordenadas). */
export function listIswcKeys(area: AreaIswc = 'local'): string[] {
  const s = almacen(area);
  if (!s) return [];
  try { return llaves(s).filter((k) => k.startsWith(ISWC_PREFIX)).sort(); } catch { return []; }
}

/** Registra una caché en memoria del kit (SVG de íconos, …): `clearIswcStorage()` la vacía. */
export function registerMemoryCache(vaciar: () => void): void {
  (G.__iswcMemoryCaches ??= new Set()).add(vaciar);
}

/**
 * Deja la app como en su primera carga: borra TODAS las llaves `iswc:` de localStorage y de
 * sessionStorage y vacía las cachés en memoria registradas.
 */
export function clearIswcStorage(): LimpiezaIswc {
  const borrar = (area: AreaIswc): string[] => {
    const ks = listIswcKeys(area);
    for (const k of ks) removeIswc(k, area);
    return ks;
  };
  const local = borrar('local');
  const session = borrar('session');
  let memorias = 0;
  for (const vaciar of G.__iswcMemoryCaches ?? []) {
    try { vaciar(); memorias++; } catch { /* una caché rota no frena la limpieza */ }
  }
  return { local, session, memorias };
}

/** Llaves enteras del formato viejo → nombre nuevo. */
const LEGADO_EXACTO: Readonly<Record<string, string>> = {
  'iswc-app-cfg': 'app-cfg',
  'iswc-root': 'root',
  'iswc-wc-asset-hashes': 'asset-hashes',
  'iswc-theming-seeds': 'theming-seeds',
};
/** Prefijos del formato viejo → prefijo nuevo. */
const LEGADO_PREFIJO: ReadonlyArray<readonly [string, string]> = [
  ['iswc-icon:', 'icon:'],
  ['iswc-diagram:', 'diagram:'],
];
const LEGADO_SESSION: Readonly<Record<string, string>> = {
  'iswc-wc:cdn-ref': 'cdn-ref',
  'iswc-wc:cdn-mirror': 'cdn-mirror',
};

/** Nombre nuevo (sin `iswc:`) de una llave vieja, o `null` si no es del kit o ya está migrada. */
export function nombreMigrado(llave: string, area: AreaIswc = 'local'): string | null {
  if (llave.startsWith(ISWC_PREFIX)) return null;
  if (area === 'session') return LEGADO_SESSION[llave] ?? null;
  const exacto = LEGADO_EXACTO[llave];
  if (exacto) return exacto;
  for (const [viejo, nuevo] of LEGADO_PREFIJO) if (llave.startsWith(viejo)) return nuevo + llave.slice(viejo.length);
  if (llave.endsWith(':paneles')) return llave; // iswc-doc-layout: `<storage-key>:paneles`
  return null;
}

/** Mueve las llaves viejas a `iswc:` y borra las viejas. Idempotente. */
export function migrateIswcStorage(): MigracionIswc[] {
  const hechas: MigracionIswc[] = [];
  for (const area of ['local', 'session'] as const) {
    const s = almacen(area);
    if (!s) continue;
    try {
      for (const desde of llaves(s)) {
        const nombre = nombreMigrado(desde, area);
        if (nombre === null) continue;
        const hacia = iswcKey(nombre);
        const valor = s.getItem(desde);
        const copiada = valor !== null && s.getItem(hacia) === null;
        if (copiada) s.setItem(hacia, valor);
        s.removeItem(desde);
        hechas.push({ desde, hacia, copiada });
      }
    } catch { /* cuota o storage bloqueado: se reintenta en la próxima carga */ }
  }
  return hechas;
}

if (!G.__iswcStorageMigrated) {
  G.__iswcStorageMigrated = true;
  migrateIswcStorage();
}
