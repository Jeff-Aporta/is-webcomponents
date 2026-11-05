/**
 * json-dialog.schemas.ts — props de `<iswc-json-dialog>`.
 */
import { z } from "zod";

/** Resultado de validar el texto: `normalized` es lo que viaja en `iswc-json-apply`. */
export const JsonValidacionSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()),
  normalized: z.unknown(),
});
export type JsonValidacion = z.infer<typeof JsonValidacionSchema>;

type JsonValidador = (texto: string) => JsonValidacion;

export const JsonDialogPropsSchema = z.object({
  open: z.boolean(),
  titulo: z.string(),
  /** JSON inicial: se toma al abrir, no en cada sincronización. */
  valor: z.string(),
  readonly: z.boolean(),
  /** Validador del consumidor; sin él, basta con que sea JSON válido. */
  validar: z.custom<JsonValidador>((v) => v === null || typeof v === "function").nullable(),
  textoCerrar: z.string(),
  textoCancelar: z.string(),
  textoAplicar: z.string(),
});
export type JsonDialogProps = z.infer<typeof JsonDialogPropsSchema>;

/** Lo que este componente usa de sus piezas del kit. */
export type JsonDialogoEl = HTMLElement & { open: boolean };
export type JsonEditorEl = HTMLElement & { value: string };
export type JsonBotonEl = HTMLElement & { disabled: boolean };
