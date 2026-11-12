// @contexto INDICE.md · src/components/data/README.md
/**
 * kanban.schemas.ts — tipos de `<iswc-kanban-column>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type KanbanColumnEventos = { 'iswc-kanban-move': { card: HTMLElement; from: number; to: HTMLElement } };

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type KanbanCardEventos = { 'iswc-kanban-card-click': { card: HTMLElement; column: HTMLElement } };
