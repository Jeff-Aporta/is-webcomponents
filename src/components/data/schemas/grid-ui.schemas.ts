/**
 * grid-ui.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const GridPopoverElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  popover: z.string().optional(),
  showPopover: z.function({ input: [], output: z.void() }).optional(),
  hidePopover: z.function({ input: [], output: z.void() }).optional(),
}));
export type GridPopoverEl = z.infer<typeof GridPopoverElSchema>;


export const MenuItemSchema = z.object({
  label: z.string().optional(),
  icon: z.string().optional(),
  action: z.string().optional(),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  disabled: z.boolean().optional(),
  checked: z.boolean().optional(),
  separator: z.boolean().optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;


export const RenderColumnsPanelOptsSchema = z.object({
  columns: z.array(z.unknown() /* TODO: cannot convert */),
  isVisible: z.function({ input: [z.string()], output: z.boolean() }),
  search: z.string().optional(),
});
export type RenderColumnsPanelOpts = z.infer<typeof RenderColumnsPanelOptsSchema>;


export const FilterPanelModelSchema = z.object({
  items: z.array(z.unknown() /* TODO: ref FilterRule */),
  logicOperator: z.union([z.literal('and'), z.literal('or')]).optional(),
});
export type FilterPanelModel = z.infer<typeof FilterPanelModelSchema>;


export const RenderFilterPanelOptsSchema = z.object({
  columns: z.array(z.unknown() /* TODO: cannot convert */),
  model: FilterPanelModelSchema,
});
export type RenderFilterPanelOpts = z.infer<typeof RenderFilterPanelOptsSchema>;

