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

function conTope(promesa, siTarda = null, ms = LIMITE_MS_DEFAULT) {
  return Promise.race([
    promesa,
    new Promise((resolve) => setTimeout(() => resolve(siTarda), ms)),
  ]);
}

/** JSON canónico: mismas claves en otro orden → mismo texto. */
export function canonico(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor ?? null);
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  const claves = Object.keys(valor).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(',')}}`;
}

/**
 * @param {{
 *   dbName?: string,
 *   storeName?: string,
 *   ttlMs?: number,
 *   timeoutMs?: number,
 * }} [opts]
 */
export function createResponseCache(opts = {}) {
  const DB = String(opts.dbName || 'is-response-cache');
  const ALMACEN = String(opts.storeName || 'respuestas');
  const VERSION = 1;
  const VIDA_MS = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : VIDA_MS_DEFAULT;
  const LIMITE_MS = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : LIMITE_MS_DEFAULT;

  const memoria = new Map();
  let promesaDb = null;

  function abrir() {
    if (promesaDb) return promesaDb;
    promesaDb = conTope(new Promise((resolve) => {
      if (!globalThis.indexedDB) return resolve(null);
      let req;
      try {
        req = indexedDB.open(DB, VERSION);
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

  function transaccion(db, modo) {
    return db.transaction(ALMACEN, modo).objectStore(ALMACEN);
  }

  const promesa = (req) =>
    conTope(new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    }), null, LIMITE_MS);

  function escribir(db, clave, fila) {
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
  function claveDe({ app, metodo, ruta, cuerpo, quien, user, method, path, body } = {}) {
    const a = app || 'app';
    const m = String(metodo || method || 'GET').toUpperCase();
    const r = String(ruta || path || '').trim();
    const q = String(quien || user || 'anon').trim() || 'anon';
    const c = cuerpo !== undefined ? cuerpo : body;
    return `${a}|${q}|${m}|${r}|${canonico(c ?? null)}`;
  }

  async function leer(clave) {
    const db = await abrir();
    let fila = memoria.get(clave) ?? null;
    if (!fila && db) {
      try {
        fila = await promesa(transaccion(db, 'readonly').get(clave));
      } catch {
        fila = null;
      }
    }
    if (!fila) return null;
    const cuando = Number(fila.guardadoEn ?? fila.fetchedAt) || 0;
    if (!cuando || Date.now() - cuando > VIDA_MS) {
      await borrar(clave);
      return null;
    }
    try {
      const datos = fila.datos !== undefined ? fila.datos : JSON.parse(fila.texto);
      const texto = fila.texto ?? canonico(datos);
      return { clave, datos, texto, guardadoEn: cuando };
    } catch {
      return null;
    }
  }

  /** Guarda solo si el texto cambió. Devuelve true si hubo cambio real. */
  async function guardar(clave, datos) {
    const texto = canonico(datos);
    const previo = await leer(clave);
    if (previo && previo.texto === texto) return false;
    const fila = { clave, texto, datos, guardadoEn: Date.now(), fetchedAt: Date.now() };
    const db = await abrir();
    memoria.set(clave, fila);
    escribir(db, undefined, fila);
    return true;
  }

  async function borrar(clave) {
    memoria.delete(clave);
    escribir(await abrir(), clave, null);
  }

  async function invalidar(coincide) {
    const prueba = typeof coincide === 'function' ? coincide : (c) => String(c).includes(String(coincide));
    for (const c of [...memoria.keys()]) if (prueba(c)) memoria.delete(c);
    const db = await abrir();
    if (!db) return;
    try {
      const claves = await promesa(transaccion(db, 'readonly').getAllKeys());
      const store = transaccion(db, 'readwrite');
      for (const c of claves ?? []) if (prueba(String(c))) store.delete(c);
    } catch { /* memoria ya limpia */ }
  }

  async function vaciar() {
    memoria.clear();
    escribir(await abrir(), undefined, null);
  }

  /**
   * SWR: pinta caché ya; red después; segunda pintura solo si cambió.
   * @param {() => Promise<unknown>} fetchFresh
   * @param {{ key: string, pintar?: Function, onCached?: Function, onError?: Function }} opts
   */
  async function vivo(fetchFresh, { key, pintar, onCached, onError } = {}) {
    if (!key) throw new Error('vivo() requiere key');
    const aviso = pintar || onCached;
    const guardado = await leer(key).catch(() => null);
    if (guardado && aviso) aviso(guardado.datos, { origen: 'cache', cambio: false });

    try {
      const frescos = await fetchFresh();
      const cambio = await guardar(key, frescos);
      if (aviso && (cambio || !guardado)) aviso(frescos, { origen: 'red', cambio });
      return frescos;
    } catch (e) {
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
export const IsResponseCache = createResponseCache();

if (typeof globalThis !== 'undefined') {
  globalThis.IsResponseCache = IsResponseCache;
  globalThis.createResponseCache = createResponseCache;
}
