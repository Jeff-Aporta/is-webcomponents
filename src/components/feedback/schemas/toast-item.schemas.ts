/**
 * toast-item.schemas.ts — tipos de `<iswc-toast-item>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ToastItemEventos = { 'iswc-after-show': { color: string; message: string; caption: string | undefined; log: unknown }; 'iswc-after-hide': undefined };
