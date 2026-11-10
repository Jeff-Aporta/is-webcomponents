// @contexto INDICE.md · src/components/forms/README.md
/**
 * doc-editor.schemas.ts — tipos de `<iswc-doc-editor>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DocEditorEventos = { 'iswc-focus': { id: string }; 'iswc-change': { blocks: { id: string; type: string; text: string; checked: boolean }[] } };
