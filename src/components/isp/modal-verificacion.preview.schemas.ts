/**
 * modal-verificacion.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const MensajeItemSchema = z.object({
  itdmensaje: z.string(),
  mensaje: z.string(),
});
export type MensajeItem = z.infer<typeof MensajeItemSchema>;


export const VerificationControllerSchema = z.object({
  entrie: z.string(),
  actVerificar: z.function({ input: [z.union([z.object({
  nit: z.string().optional(),
  razon: z.string().optional(),
}), z.null(), z.undefined()])], output: z.promise(z.object({
  mensajes: z.array(z.unknown() /* TODO: ref MensajeItem */),
})) }),
});
export type VerificationController = z.infer<typeof VerificationControllerSchema>;


export const ModalVerificacionElSchema = z.object({
  controller: VerificationControllerSchema,
  record: z.object({
  nit: z.string(),
  razon: z.string(),
}),
  show: z.function({ input: [], output: z.void() }),
});
export type ModalVerificacionEl = z.infer<typeof ModalVerificacionElSchema>;

