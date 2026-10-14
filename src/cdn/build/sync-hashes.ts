/**
 * Barrido determinista de `?v=`: con el mapa de hashes anterior y el nuevo (`asset-hashes.json`),
 * reemplaza cada `v=<viejo>` por `v=<nuevo>` en todos los archivos de texto de las raíces dadas.
 *
 * Un hash de 6 caracteres [0-9a-z] es aleatorio a efectos prácticos y solo se reemplaza cuando va
 * pegado a `?v=` o `&v=` y no sigue otro carácter del alfabeto, así que no toca nada más. Si un
 * hash viejo nombraba a dos archivos con hashes nuevos distintos, es ambiguo y no se toca (lo
 * resuelve el sellado por ruta del build).
 *
 * El build lo corre solo tras escribir el mapa nuevo; otra app lo importa de dist/cdn/build/.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEXTO = /\.(?:html?|md|m?js|ts|json|css|txt)$/i;
const OMITIR = new Set(['node_modules', '.git', '.tmp', '.tmp-scss', 'assets']);

/** `viejo → nuevo` de los archivos cuyo hash cambió; los ambiguos quedan fuera. */
export function cambiosDeHash(viejos: Record<string, string>, nuevos: Record<string, string>): Map<string, string> {
  const cambios = new Map<string, string>();
  const ambiguos = new Set<string>();
  for (const [ruta, viejo] of Object.entries(viejos)) {
    const nuevo = nuevos[ruta];
    if (!nuevo || nuevo === viejo) continue;
    if (cambios.has(viejo) && cambios.get(viejo) !== nuevo) ambiguos.add(viejo);
    cambios.set(viejo, nuevo);
  }
  for (const h of ambiguos) cambios.delete(h);
  return cambios;
}

/** Reemplaza en un texto; devuelve el texto nuevo. */
export function reemplazarHashes(texto: string, cambios: Map<string, string>): string {
  if (!cambios.size) return texto;
  return texto.replace(/([?&]v=)([0-9a-z]+)(?![0-9a-z])/g, (todo, pre: string, h: string) => {
    const nuevo = cambios.get(h);
    return nuevo ? pre + nuevo : todo;
  });
}

function* archivos(dir: string): Generator<string> {
  for (const n of readdirSync(dir)) {
    if (OMITIR.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else if (TEXTO.test(n) && n !== 'asset-hashes.json') yield p;
  }
}

/** Barre las raíces (carpetas o archivos); devuelve cuántos archivos cambió. */
export function barrerHashes(viejos: Record<string, string>, nuevos: Record<string, string>, raices: string[]): number {
  const cambios = cambiosDeHash(viejos, nuevos);
  if (!cambios.size) return 0;
  let n = 0;
  for (const raiz of raices) {
    const lista = statSync(raiz).isDirectory() ? archivos(raiz) : [raiz];
    for (const f of lista) {
      const prev = readFileSync(f, 'utf8');
      if (!prev.includes('v=')) continue;
      const next = reemplazarHashes(prev, cambios);
      if (next === prev) continue;
      writeFileSync(f, next);
      n++;
    }
  }
  return n;
}

