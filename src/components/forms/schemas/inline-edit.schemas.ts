/**
 * inline-edit.schemas.ts — tipos de `<iswc-inline-edit>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type InlineEditEventos = { 'iswc-edit': Record<string, never>; 'iswc-save': { value: string; previous: string | null }; 'iswc-cancel': { value: string; previous: string | null } };
