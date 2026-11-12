// @contexto INDICE.md · src/components/navigation/README.md
/**
 * mega-menu.schemas.ts — tipos de `<iswc-mega-menu>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type MegaMenuEventos = { 'iswc-show': undefined; 'iswc-after-show': undefined; 'iswc-after-hide': undefined; 'iswc-select': { href: string | null; text: string } };
