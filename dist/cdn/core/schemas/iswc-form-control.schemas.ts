/**
 * iswc-form-control.schemas.ts — tipos de `core/iswc-form-control.ts`.
 */

/** Resultado de `validar()`: banderas de `ValidityState` y mensaje (vacío si es válido). */
export type Validez = [flags: ValidityStateFlags, mensaje: string];
/** Valor que el control entrega al `<form>`. */
export type ValorFormulario = FormDataEntryValue | FormData | null;
/** Control nativo interno cuya validez se refleja (input, textarea, select). */
export type ControlNativo = HTMLElement & { validity?: ValidityState; validationMessage?: string };
