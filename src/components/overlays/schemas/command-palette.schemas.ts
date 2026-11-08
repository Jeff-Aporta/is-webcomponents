/**
 * command-palette.schemas.ts — tipos de `<iswc-command-palette>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CommandPaletteEventos = { 'iswc-show': undefined; 'iswc-after-show': undefined; 'iswc-hide': undefined; 'iswc-after-hide': undefined; 'iswc-select': { command: { id: string; run?: () => void }; id: string } };
