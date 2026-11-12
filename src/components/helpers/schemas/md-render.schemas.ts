// @contexto INDICE.md · src/components/helpers/README.md
/**
 * md-render.schemas.ts — tipos de `<iswc-md-render>`.
 *
 * Los contratos de los renderers por elemento (`renderers`) viven en `md-lite.schemas.ts` y se
 * re-exportan desde aquí: el consumidor importa un solo módulo de tipos para el componente.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MdRenderEventos = { 'iswc-input': { value: string }; 'iswc-change': { value: string }; 'iswc-persist': { value: string } };
