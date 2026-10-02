/**
 * Cache de texto por ruta+hash. IndexedDB guarda el cuerpo; localStorage
 * recuerda el mapa para borrar entradas cuando un archivo cambia.
 * La clave incluye el hash: un hit es el contenido de ese build.
 */

const DB_NAME = 'is-wc-assets';
const STORE = 'bodies';
const LS_KEY = 'is-wc-asset-hashes';

function db(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try { req = indexedDB.open(DB_NAME, 1); }
    catch { resolve(null); return; }
    req.onupgradeneeded = () => {
      const base = req.result;
      if (!base.objectStoreNames.contains(STORE)) base.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function rowKey(path: string, hash: string): string {
  return `${path}@${hash}`;
}

export async function readBody(path: string, hash: string): Promise<string | null> {
  const base = await db();
  if (!base) return null;
  return new Promise((resolve) => {
    const tx = base.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).get(rowKey(path, hash));
    q.onsuccess = () => resolve(typeof q.result === 'string' ? q.result : null);
    q.onerror = () => resolve(null);
  });
}

export async function writeBody(path: string, hash: string, body: string): Promise<void> {
  const base = await db();
  if (!base) return;
  await new Promise<void>((resolve) => {
    const tx = base.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(body, rowKey(path, hash));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

async function dropKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const base = await db();
  if (!base) return;
  await new Promise<void>((resolve) => {
    const tx = base.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

/** Compara el mapa embebido con el anterior y tira los cuerpos viejos. */
export function syncHashMemory(files: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  let prev: Record<string, string> = {};
  try { prev = JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Record<string, string>; }
  catch { prev = {}; }
  const stale: string[] = [];
  for (const [path, hash] of Object.entries(prev)) {
    if (files[path] && files[path] !== hash) stale.push(rowKey(path, hash));
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(files)); }
  catch { /* cuota o modo privado */ }
  if (stale.length) void dropKeys(stale);
}
