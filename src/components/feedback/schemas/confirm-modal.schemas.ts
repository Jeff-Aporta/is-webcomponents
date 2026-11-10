// @contexto INDICE.md · src/components/feedback/README.md
/**
 * confirm-modal.schemas.ts — tipos de `<iswc-confirm-modal>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ConfirmModalEventos = { 'iswc-confirm-show': { trigger: HTMLElement | null }; 'iswc-confirm-hide': { trigger: HTMLElement | null }; 'iswc-confirm-confirm': { trigger: HTMLElement | null }; 'iswc-confirm-cancel': { trigger: HTMLElement | null } };
