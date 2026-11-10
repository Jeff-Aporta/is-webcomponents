// @contexto INDICE.md · src/components/overlays/README.md
/**
 * window.schemas.ts — tipos de `<iswc-window>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type WindowEventos = { 'iswc-show': undefined; 'iswc-after-show': undefined; 'iswc-minimize': undefined; 'iswc-maximize': undefined; 'iswc-restore': { was: 'normal' | 'minimized' | 'maximized' }; 'iswc-hide': undefined; 'iswc-after-hide': undefined };
