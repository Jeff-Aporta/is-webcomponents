/**
 * element-base.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ElementBaseConstructorSchema = z.object({
  observedAttributes: z.array(z.string()).optional(),
  styleAttrs: z.unknown() /* TODO: ref StyleAttrMap */.optional(),
  TEMPLATE: z.unknown() /* TODO: ref HTMLTemplateElement */.optional(),
  __TEMPLATE: z.unknown() /* TODO: ref HTMLTemplateElement */.optional(),
});
export type ElementBaseConstructor = z.infer<typeof ElementBaseConstructorSchema>;

