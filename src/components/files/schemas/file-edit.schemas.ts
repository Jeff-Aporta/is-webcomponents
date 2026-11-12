// @contexto INDICE.md · src/components/files/README.md
/**
 * file-edit.schemas.ts — tipos de `<iswc-file-edit>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type FileEditEventos = { 'iswc-error': { reason: string; kind: string }; 'iswc-load': unknown; 'iswc-change': unknown; 'iswc-dispatch': { tag: string; kind: string; mode: string } };
