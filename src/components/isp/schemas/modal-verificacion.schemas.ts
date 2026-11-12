// @contexto INDICE.md · src/components/isp/README.md
/**
 * modal-verificacion.schemas.ts — tipos de `<iswc-modal-verificacion>`.
 */

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ModalVerificacionEventos = { 'iswc-verificacion': { mensajes: unknown[]; qinfos: unknown[]; qwarning: unknown[]; qerrores: unknown[] }; 'iswc-verificacion-error': { message: string; error: unknown }; 'iswc-cancel': Record<string, never> };
