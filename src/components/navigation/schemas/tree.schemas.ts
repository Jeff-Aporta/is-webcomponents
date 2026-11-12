// @contexto INDICE.md · src/components/navigation/README.md
/**
 * tree.schemas.ts — tipos de `<iswc-tree>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TreeEventos = { 'iswc-tree-toggle': { item: HTMLElement; expanded: boolean }; 'iswc-tree-select': { item: HTMLElement; selected: boolean; selectedItems: HTMLElement[] } };
