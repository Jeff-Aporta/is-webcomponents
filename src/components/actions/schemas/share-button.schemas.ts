/**
 * share-button.schemas.ts — tipos de `<iswc-share-button>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ShareButtonEventos = { 'iswc-share': { how: 'shared' | 'copied'; url: string; text: string; title: string }; 'iswc-error': undefined };
