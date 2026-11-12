// @contexto INDICE.md · src/components/media/README.md
/**
 * media-recorder.schemas.ts — tipos de `<iswc-media-recorder>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MediaRecorderEventos = { 'iswc-error': { message: string }; 'iswc-start': { source: string }; 'iswc-stop': { blob: Blob; url: string; type: string } };
