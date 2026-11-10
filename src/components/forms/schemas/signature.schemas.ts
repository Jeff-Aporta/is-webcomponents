// @contexto INDICE.md · src/components/forms/README.md
/**
 * signature.schemas.ts — tipos de `<iswc-signature>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SignatureEventos = { 'iswc-change': { strokes: { x: number; y: number }[][] }; 'iswc-stroke-end': { dataURL: string } };
