/**
 * helpers/response-cache.js — caché de lecturas en IndexedDB (SWR).
 *
 * NO es un custom element. Expone `createResponseCache` / `IsResponseCache`.
 *
 * Contrato (Muéstralo + PatyIA):
 *   - Pinta al instante lo último conocido; repinta solo si la red difiere.
 *   - El caché JAMÁS bloquea el pintado (tope 1,5 s → memoria).
 *   - Solo tiene sentido para lecturas (GET / QUERY / HEAD).
 *
 * CDN: …/dist/cdn/helpers/response-cache.min.js
 */

const LIMITE_MS_DEFAULT = 1500;
const VIDA_MS_DEFAULT = 24 * 60 * 60 * 1000;

function conTope<T>(promesa: Promise<T>, siTarda: T | null = null, ms: number = LIMITE_MS_DEFAULT): Promise<T | null> {
  return Promise.race([
    promesa,
    new Promise<T | null>((resolve) => setTimeout(() => resolve(siTarda), ms)),
  ]);
}

/** JSON canónico: mismas claves en otro orden → mismo texto. */
export function canonico(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor ?? null);
  if (Array.isArray(valor)) return `[${(valor as unknown[]).map((v) => canonico(v)).join(',')}]`;
  const obj = valor as Record<string, unknown>;
  const claves = Object.keys(obj).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(obj[k])}`).join(',')}}`;
}

export interface CreateResponseCacheOpts {
  dbName?: string;
  storeName?: string;
  ttlMs?: number;
  timeoutMs?: number;
}

export interface ClaveDeInput {
  app?: string;
  metodo?: string;
  ruta?: string;
  cuerpo?: unknown;
  quien?: string;
  user?: string;
  method?: string;
  path?: string;
  body?: unknown;
}

export interface CachedRow<T = unknown> {
  clave: string;
  datos: T;
  texto: string;
  guardadoEn: number;
}

export interface VivoAviso {
  origen: 'cache' | 'red';
  cambio: boolean;
}

export interface VivoOpts<T = unknown> {
  key: string;
  pintar?: (datos: T, info: VivoAviso) => void;
  onCached?: (datos: T, info: VivoAviso) => void;
  onError?: (error: unknown) => void;
}

export interface ResponseCache {
  dbName: string;
  storeName: string;
  ttlMs: number;
  canonico: typeof canonico;
  claveDe: (input?: ClaveDeInput) => string;
  leer: <T = unknown>(clave: string) => Promise<CachedRow<T> | null>;
  guardar: <T = unknown>(clave: string, datos: T) => Promise<boolean>;
  borrar: (clave: string) => Promise<void>;
  invalidar: (coincide: string | ((c: string) => boolean)) => Promise<void>;
  vaciar: () => Promise<void>;
  vivo: <T = unknown>(fetchFresh: () => Promise<T>, opts: VivoOpts<T>) => Promise<T>;
}

export function createResponseCache(opts: CreateResponseCacheOpts = {}): ResponseCache {
  const DB = String(opts.dbName || 'is-response-cache');
  const ALMACEN = String(opts.storeName || 'respuestas');
  const VERSION = 1;
  const VIDA_MS = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : VIDA_MS_DEFAULT;
  const LIMITE_MS = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : LIMITE_MS_DEFAULT;

  const memoria = new Map<string, CachedRow<unknown>>();
  let promesaDb: Promise<IDBDatabase | null> | null = null;

  function abrir(): Promise<IDBDatabase | null> {
    if (promesaDb) return promesaDb;
    promesaDb = conTope(new Promise<IDBDatabase | null>((resolve) => {
      if (!(globalThis as { indexedDB?: IDBFactory }).indexedDB) return resolve(null);
      let req: IDBOpenDBRequest;
      try {
        req = (globalThis as { indexedDB: IDBFactory }).indexedDB.open(DB, VERSION);
      } catch {
        return resolve(null);
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(ALMACEN)) {
          db.createObjectStore(ALMACEN, { keyPath: 'clave' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    }), null, LIMITE_MS);
    return promesaDb;
  }

  function transaccion(db: IDBDatabase, modo: IDBTransactionMode): IDBObjectStore {
    return db.transaction(ALMACEN, modo).objectStore(ALMACEN);
  }

  const promesa = <T>(req: IDBRequest<T>): Promise<T | null> =>
    conTope(new Promise<T | null>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    }), null, LIMITE_MS);

  function escribir(db: IDBDatabase | null, clave: string | undefined, fila: CachedRow<unknown> | null): boolean {
    try {
      if (!db) return false;
      const store = transaccion(db, 'readwrite');
      if (fila) store.put(fila);
      else if (clave !== undefined) store.delete(clave);
      else store.clear();
      return true;
    } catch {
      return false;
    }
  }

  /** Identidad de consulta. `quien` aísla por usuario/sesión. */
  function claveDe(input: ClaveDeInput = {}): string {
    const { app, metodo, ruta, cuerpo, quien, user, method, path, body } = input;
    const a = app || 'app';
    const m = String(metodo || method || 'GET').toUpperCase();
    const r = String(ruta || path || '').trim();
    const q = String(quien || user || 'anon').trim() || 'anon';
    const c = cuerpo !== undefined ? cuerpo : body;
    return `${a}|${q}|${m}|${r}|${canonico(c ?? null)}`;
  }

  async function leer<T = unknown>(clave: string): Promise<CachedRow<T> | null> {
    const db = await abrir();
    let fila: CachedRow<T> | null = (memoria.get(clave) as CachedRow<T> | undefined) ?? null;
    if (!fila && db) {
      try {
        const raw = await promesa(transaccion(db, 'readonly').get(clave) as IDBRequest<CachedRow<T> | undefined>);
        fila = raw ?? null;
      } catch {
        fila = null;
      }
    }
    if (!fila) return null;
    const rawRow = fila as unknown as { guardadoEn?: number; fetchedAt?: number; datos?: T; texto?: string };
    const cuando = Number(rawRow.guardadoEn ?? rawRow.fetchedAt) || 0;
    if (!cuando || Date.now() - cuando > VIDA_MS) {
      await borrar(clave);
      return null;
    }
    try {
      const datos: T = rawRow.datos !== undefined
        ? rawRow.datos
        : JSON.parse(rawRow.texto ?? 'null') as T;
      const texto = rawRow.texto ?? canonico(datos);
      return { clave, datos, texto, guardadoEn: cuando };
    } catch {
      return null;
    }
  }

  /** Guarda solo si el texto cambió. Devuelve true si hubo cambio real. */
  async function guardar<T = unknown>(clave: string, datos: T): Promise<boolean> {
    const texto = canonico(datos);
    const previo = await leer<T>(clave);
    if (previo && previo.texto === texto) return false;
    const fila: CachedRow<T> = { clave, texto, datos, guardadoEn: Date.now() };
    const db = await abrir();
    memoria.set(clave, fila as CachedRow<unknown>);
    escribir(db, undefined, fila as unknown as CachedRow<unknown>);
    return true;
  }

  async function borrar(clave: string): Promise<void> {
    memoria.delete(clave);
    escribir(await abrir(), clave, null);
  }

  async function invalidar(coincide: string | ((c: string) => boolean)): Promise<void> {
    const prueba = typeof coincide === 'function' ? coincide : (c: string) => String(c).includes(String(coincide));
    for (const c of [...memoria.keys()]) if (prueba(c)) memoria.delete(c);
    const db = await abrir();
    if (!db) return;
    try {
      const claves = await promesa(transaccion(db, 'readonly').getAllKeys() as IDBRequest<IDBValidKey[]>);
      const store = transaccion(db, 'readwrite');
      for (const c of claves ?? []) if (prueba(String(c))) store.delete(c);
    } catch { /* memoria ya limpia */ }
  }

  async function vaciar(): Promise<void> {
    memoria.clear();
    escribir(await abrir(), undefined, null);
  }

  /**
   * SWR: pinta caché ya; red después; segunda pintura solo si cambió.
   */
  async function vivo<T = unknown>(fetchFresh: () => Promise<T>, { key, pintar, onCached, onError }: VivoOpts<T>): Promise<T> {
    if (!key) throw new Error('vivo() requiere key');
    const aviso = pintar || onCached;
    const guardado = await leer<T>(key).catch(() => null);
    if (guardado && aviso) aviso(guardado.datos, { origen: 'cache', cambio: false });

    try {
      const frescos = await fetchFresh();
      const cambio = await guardar<T>(key, frescos);
      if (aviso && (cambio || !guardado)) aviso(frescos, { origen: 'red', cambio });
      return frescos;
    } catch (e: unknown) {
      if (!guardado) throw e;
      onError?.(e);
      return guardado.datos;
    }
  }

  return {
    dbName: DB,
    storeName: ALMACEN,
    ttlMs: VIDA_MS,
    canonico,
    claveDe,
    leer,
    guardar,
    borrar,
    invalidar,
    vaciar,
    vivo,
  };
}

/** Instancia por defecto del kit (apps pueden createResponseCache con su dbName). */
export const IsResponseCache: ResponseCache = createResponseCache();

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).IsResponseCache = IsResponseCache;
  (globalThis as Record<string, unknown>).createResponseCache = createResponseCache;
}
