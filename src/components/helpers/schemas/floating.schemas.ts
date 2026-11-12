// @contexto INDICE.md · src/components/helpers/README.md
/**
 * floating.schemas.ts — tipos de `<iswc-floating>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type FloatingEventos = { 'iswc-reposition': { placement: string; x: number; y: number }; 'iswc-hover-bridge': { hovering: boolean } };
