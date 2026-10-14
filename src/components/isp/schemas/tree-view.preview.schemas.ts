/**
 * tree-view.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const DemoNodeSchema = z.object({
  iplan: z.string().optional(),
  titulo: z.string().optional(),
});
export type DemoNode = z.infer<typeof DemoNodeSchema>;


export const IsTreeViewElSchema = z.object({
  customs: z.union([z.unknown() /* TODO: ref TreeCustomsBase */, z.null()]),
  list: z.array(z.unknown()),
  addEventListener: z.function({ input: [z.string(), z.unknown() /* TODO: ref EventListener */], output: z.void() }),
});
export type IsTreeViewEl = z.infer<typeof IsTreeViewElSchema>;

