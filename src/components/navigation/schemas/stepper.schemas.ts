// @contexto INDICE.md · src/components/navigation/README.md
/**
 * stepper.schemas.ts — tipos de `<iswc-stepper>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type StepperEventos = { 'iswc-stepper-complete': undefined; 'iswc-stepper-change': { from: number; to: number; step: unknown } };
