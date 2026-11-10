// @contexto INDICE.md · src/components/forms/README.md
/**
 * dropzone.schemas.ts — tipos de `<iswc-dropzone>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DropzoneEventos = { 'iswc-error': { id?: string | null; file?: File; reason: 'max-files' | 'max-size' | 'accept'; limit?: number }; 'iswc-upload-start': { id: string; file: File }; 'iswc-upload-progress': { id: string; file: File; progress: number }; 'iswc-upload-end': { id: string; file: File; ok: boolean }; 'iswc-files-change': { files: { id: string; file: File; name: string; size: number; type: string; status: string; progress: number; url: string }[] } };
