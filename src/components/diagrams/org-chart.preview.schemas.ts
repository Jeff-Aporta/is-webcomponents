/**
 * org-chart.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const OrgSelectDetailSchema = z.object({
  node: z.object({
  title: z.string().optional(),
  name: z.string().optional(),
}),
});
export type OrgSelectDetail = z.infer<typeof OrgSelectDetailSchema>;


export const OrgToggleDetailSchema = z.object({
  id: z.string(),
  collapsed: z.boolean(),
});
export type OrgToggleDetail = z.infer<typeof OrgToggleDetailSchema>;

