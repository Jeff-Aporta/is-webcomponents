/**
 * modal-base.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ModalBaseCtorSchema = z.intersection(z.unknown() /* TODO: cannot convert */, z.object({
  __TEMPLATE: z.unknown() /* TODO: ref HTMLTemplateElement */,
  observedAttributes: z.array(z.unknown() /* TODO: cannot convert */),
}));
export type ModalBaseCtor = z.infer<typeof ModalBaseCtorSchema>;

