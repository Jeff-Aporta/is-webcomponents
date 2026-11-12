// @contexto INDICE.md · src/components/layout/README.md
/**
 * scrollspy.schemas.ts — tipos de `<iswc-scrollspy>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ScrollspyEventos = { 'iswc-deactivated': { id: string; link: HTMLElement | null }; 'iswc-activated': { id: string; link: HTMLElement } };
