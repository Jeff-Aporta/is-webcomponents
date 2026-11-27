// @contexto INDICE.md · src/cdn/loader.md
/**
 * server-api-docs-plugin — el visor de secuencias del flujo de cada operación es del PLUGIN de diagramas (`iswd-`, repo
 * `Jeff-Aporta/iswc-diagrams`), no del kit: se carga con `iswcLoader.loadPlugin` fijado por SHA (`deno task shas` dice
 * cuál es el último). El kit solo arma el JSON del diagrama.
 */
import type { LoaderConPlugins } from '@jeff-aporta/iswc-base/components/layout/schemas/server-api-docs.schemas.js';

export const PLUGIN_DIAGRAMAS = {
  app: 'diagrams',
  repo: 'Jeff-Aporta/iswc-diagrams',
  sha: '0000000000000000000000000000000000000000',
  prefijo: 'iswd-',
  tags: ['iswd-sequence-diagram'],
} as const;

/** Pide el plugin de diagramas; sin loader en la página, el flujo queda como JSON sin pintar (no rompe la ficha). */
export function cargarDiagramas(): Promise<unknown> {
  const loader = (globalThis as { iswcLoader?: LoaderConPlugins }).iswcLoader;
  return loader?.loadPlugin?.({ ...PLUGIN_DIAGRAMAS, tags: [...PLUGIN_DIAGRAMAS.tags] }).catch((e: unknown) => console.warn('[server-api-docs] plugin de diagramas:', e)) ?? Promise.resolve(null);
}
