// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-ref — capa 2 del loader (plan D7): pin de `main` → SHA por la API de GitHub.
 *
 * Solo se carga cuando NO hay pin (`state.ref`) y algún espejo lo necesita (`L.resolvePin()`, `L.listBases()`,
 * fallback tras un fallo de la raíz primaria). Con pin, `BOOT_HOST` o `self` utilizable (Pages, localhost, vendor)
 * el núcleo nunca llega aquí: cero peticiones a `api.github.com` en el arranque.
 */
import { resolveRef } from '@jeff-aporta/iswc-base/core/cdn-ref.js';

/** SHA del tip de `main` (o `'main'` si la API no responde); memorizado por sesión en `cdn-ref`. */
export function resolverRef(): Promise<string> {
  return resolveRef();
}
