// @contexto INDICE.md · src/components/charts/README.md
/**
 * treemap.schemas.ts — tipos de `<iswc-treemap>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TreemapEventos = { 'iswc-render': { layout?: unknown; svg: SVGElement }; 'iswc-open-viewer': { payload: unknown } };
