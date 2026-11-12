// @contexto INDICE.md · src/components/isp/README.md
/**
 * accordion-group.schemas.ts — tipos de `<iswc-accordion-group>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type AccordionGroupEventos = { 'iswc-accordion-change': { open: string[]; opened: string | null; closed: string | null } };
