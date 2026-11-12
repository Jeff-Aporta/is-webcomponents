// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * er-editor.schemas.ts — tipos de `<iswc-er-editor>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ErEditorEventos = { 'iswc-state-change': { entities: unknown; relations: unknown } };
