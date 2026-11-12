// @contexto INDICE.md · src/components/preview/README.md
/**
 * slots-pg.schemas.ts — tipos de `<iswc-slots-pg>`.
 */

/** Pestaña elegida al conectar. */
export type SlotsPgTab = 'simple' | 'slots';

/** Valor público del atributo `default-tab`. */
export type SlotsPgDefaultTab = 'auto' | SlotsPgTab;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SlotsPgEventos = { 'iswc-slots-pg-restart': { tag: string; slots: number } };
