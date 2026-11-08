/**
 * popconfirm.schemas.ts — tipos de `<iswc-popconfirm>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type PopconfirmEventos = { 'iswc-popconfirm-show': { trigger: HTMLElement | null }; 'iswc-popconfirm-hide': { trigger: HTMLElement | null }; 'iswc-popconfirm-confirm': { trigger: HTMLElement | null }; 'iswc-popconfirm-cancel': { trigger: HTMLElement | null } };
