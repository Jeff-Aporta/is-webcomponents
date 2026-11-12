// @contexto INDICE.md · src/components/files/README.md
/**
 * file-view.schemas.ts — tipos de `<iswc-file-view>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type FileViewEventos = { 'iswc-error': { reason: string; kind: string }; 'iswc-load': unknown; 'iswc-dispatch': { tag: string; kind: string; mode: string } };
