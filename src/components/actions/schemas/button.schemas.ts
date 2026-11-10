// @contexto INDICE.md · src/components/actions/README.md
/**
 * button.schemas.ts — tipos de `<iswc-button>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ButtonEventos = { 'iswc-focus': { originalEvent: Event }; 'iswc-blur': { originalEvent: Event }; 'iswc-click': { originalEvent: Event }; 'iswc-invalid': { originalEvent: Event; validationMessage: string } };
