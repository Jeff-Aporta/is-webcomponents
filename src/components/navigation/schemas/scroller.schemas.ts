// @contexto INDICE.md · src/components/navigation/README.md
/**
 * scroller.schemas.ts — tipos de `<iswc-scroller>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ScrollerEventos = { 'iswc-scroll-start': undefined; 'iswc-scroll-end': undefined; 'iswc-scroll-overflow': { overflowing: boolean }; 'iswc-scroll-position': { scrollLeft: number; scrollTop: number } };
