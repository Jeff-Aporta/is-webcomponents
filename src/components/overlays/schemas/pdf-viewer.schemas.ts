/**
 * pdf-viewer.schemas.ts — tipos de `<iswc-pdf-viewer>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type PdfViewerEventos = { 'iswc-load': undefined; 'iswc-error': { reason: 'fetch' } | undefined };
