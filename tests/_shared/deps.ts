// @contexto INDICE.md · tests/_shared/README.md
/**
 * deps.ts — el grafo publicado entero para los tests (F7, tarea 0.1): `dist/cdn/deps.json` es un índice (tag →
 * categoría) y cada categoría tiene su `deps/<cat>.json` (más `deps/core.json`). `leerDeps` los une en la forma de
 * siempre (`{ sha, tags, core, v }`); null si no hay build.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unirDeps } from '../../src/cdn/build/graph.ts';
import type { DepsJson } from '../../src/cdn/build/graph.schemas.ts';
import type { DepsIndice } from '../../src/cdn/build/graph.schemas.ts';

/** Categorías del índice más `core`. */
export function partesDeps(indice: DepsIndice): string[] {
  return [...new Set([...Object.values(indice.categorias), 'core'])].sort();
}

/** Índice + partes de `dist` (carpeta `dist/cdn`) unidos en un `DepsJson`. */
export function leerDeps(dist: string): DepsJson | null {
  const ruta = join(dist, 'deps.json');
  if (!existsSync(ruta)) return null;
  const indice = JSON.parse(readFileSync(ruta, 'utf8')) as DepsIndice;
  const partes: Record<string, DepsJson> = {};
  for (const cat of partesDeps(indice)) partes[cat] = JSON.parse(readFileSync(join(dist, 'deps', `${cat}.json`), 'utf8'));
  return unirDeps(partes, indice.sha);
}
