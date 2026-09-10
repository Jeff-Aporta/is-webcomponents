/**
 * Carga definiciones JSON desde disco (helper compartido).
 *
 * Lee `src/components/<cat>/<tag>.json` o `src/pages/<tag>.json` según
 * el tag. Cachea en memoria para no releer si el motor audita dos veces.
 *
 * Tolerante a:
 *   - archivo no encontrado (devuelve null)
 *   - JSON malformado (registra y devuelve null)
 *   - JSON con comentarios (usa regex para removerlos)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const cache = new Map<string, { def: any; fuente: string } | null>();

/**
 * Carga la definición JSON de un tag.
 * @param tag tag del componente o nombre de página (home/theming/ecosystem)
 * @param raiz raíz del proyecto (donde vive src/)
 * @returns objeto con `def` parseada y `fuente` raw, o null si no se pudo cargar.
 */
export function cargarDefinicion(tag: string, raiz: string): { def: any; fuente: string } | null {
  if (cache.has(tag)) return cache.get(tag)!;

  const candidatas: string[] = [];
  // Páginas (home, theming, ecosystem, phase7).
  candidatas.push(join(raiz, 'src', 'pages', `${tag}.json`));
  // Componentes: probar todas las categorías (buscar recursivo).
  candidatas.push(buscarJsonEnComponentes(raiz, tag));

  for (const ruta of candidatas) {
    if (!ruta || !existsSync(ruta)) continue;
    let raw: string;
    try {
      raw = readFileSync(ruta, 'utf8');
    } catch {
      continue;
    }
    try {
      const def = JSON.parse(limpiarJson(raw));
      const out = { def, fuente: raw };
      cache.set(tag, out);
      return out;
    } catch (err) {
      cache.set(tag, null);
      return null;
    }
  }

  cache.set(tag, null);
  return null;
}

/** Variante que solo parsea y devuelve la def o null. */
export function leerDefinicion(tag: string, raiz: string): any | null {
  const c = cargarDefinicion(tag, raiz);
  return c ? c.def : null;
}

/** Limpia comentarios de bloque y de línea en JSON (tolerante). */
function limpiarJson(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Busca el primer <tag>.json bajo src/components/. */
function buscarJsonEnComponentes(raiz: string, tag: string): string {
  // Convención: el archivo se llama <tag-sin-prefijo-is>.json. p.ej.
  // is-button → button.json. Algunos casos especiales (toast-item) mantienen
  // el sufijo. Probamos ambas formas.
  const sinPrefijo = tag.replace(/^is-/, '');
  const candidates = [
    join(raiz, 'src', 'components', 'actions', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'media', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'feedback', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'layout', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'navigation', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'forms', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'data', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'data-viz', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'diagrams', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'overlays', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'helpers', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'isp', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'code', `${sinPrefijo}.json`),
    join(raiz, 'src', 'components', 'charts', `${sinPrefijo}.json`),
    // Algunos archivos SÍ llevan el prefijo is- completo (raro, pero lo
    // respetamos).
    join(raiz, 'src', 'components', 'isp', `${tag}.json`),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

/** Vacía la caché (útil entre rondas de Stagehand o al reauditar). */
export function limpiarCache(): void {
  cache.clear();
}