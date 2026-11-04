/**
 * loader-store — capa 2 del loader (plan D7): el `asset-store` (cuerpos por ruta+hash en IndexedDB) y su memoria
 * de hashes en localStorage.
 *
 * Fuera del arranque: el loader ya no guarda hojas en IndexedDB (`is-base.min.css` va por `<link>`). Este módulo
 * solo limpia, en reposo, los cuerpos viejos que dejaron loaders anteriores, y expone el almacén a quien lo use a mano.
 */
import { readIswc } from '@jeff-aporta/iswc-base/core/iswc-storage.js';
import { readBody, syncHashMemory, writeBody } from './asset-store.js';

/** Clave de la memoria de hashes del asset-store (misma que `asset-store.ts`). */
const LS_KEY = 'asset-hashes';

export function leerCuerpo(ruta: string, hash: string): Promise<string | null> {
  return readBody(ruta, hash);
}

export function escribirCuerpo(ruta: string, hash: string, cuerpo: string): Promise<void> {
  return writeBody(ruta, hash, cuerpo);
}

/** Sincroniza la memoria con `files` y tira los cuerpos viejos. */
export function sincronizar(files: Record<string, string>): void {
  syncHashMemory(files);
}

/** Igual que `sincronizar`, pero solo si un loader anterior dejó memoria (si no, no hay cuerpos que limpiar). */
export function sincronizarSiHabia(files: Record<string, string>): void {
  if (readIswc(LS_KEY) != null) syncHashMemory(files);
}
