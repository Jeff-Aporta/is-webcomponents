// @contexto INDICE.md · src/components/helpers/README.md
/**
 * offscreen-canvas.schemas.ts — tipos de `<iswc-offscreen-canvas>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type OffscreenCanvasEventos = { 'iswc-ready': { offscreen: OffscreenCanvas | null; fallback: boolean } };
