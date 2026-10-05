/**
 * dropdown.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const PlacementSchema = z.unknown() /* TODO: cannot convert */;
export type Placement = z.infer<typeof PlacementSchema>;


export const DropdownItemElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  disabled: z.boolean().optional(),
  type: z.string().optional(),
  closeSubmenu: z.function({ input: [], output: z.void() }).optional(),
}));
export type DropdownItemEl = z.infer<typeof DropdownItemElSchema>;

