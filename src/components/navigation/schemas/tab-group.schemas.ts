// @contexto INDICE.md · src/components/navigation/README.md
/**
 * tab-group.schemas.ts — tipos de `<iswc-tab-group>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TabGroupEventos = { 'iswc-tab-show': { name: string; panel: HTMLElement | null; tab: HTMLElement | null } };

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TabEventos = { 'iswc-tab-close': { tab: HTMLElement; name: string | null } };
