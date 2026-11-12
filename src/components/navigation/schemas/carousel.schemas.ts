// @contexto INDICE.md · src/components/navigation/README.md
/**
 * carousel.schemas.ts — tipos de `<iswc-carousel>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CarouselEventos = { 'iswc-carousel-slide-end': undefined; 'iswc-carousel-change': { from: number; to: number; item: unknown }; 'iswc-carousel-play': undefined; 'iswc-carousel-pause': { reason: string } };
