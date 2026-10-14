/**
 * preview-controls.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const OpcionPanelSchema = z.object({
  value: z.unknown(),
  label: z.string(),
  icon: z.string().optional(),
  html: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.boolean().optional(),
});
export type OpcionPanel = z.infer<typeof OpcionPanelSchema>;


export const PanelInfoSchema = z.object({
  description: z.string().optional(),
  type: z.string().optional(),
  default: z.string().optional(),
  values: z.array(z.string()).optional(),
  example: z.string().optional(),
});
export type PanelInfo = z.infer<typeof PanelInfoSchema>;


export const ControlPanelSchema = z.object({
  control: z.string(),
  prop: z.string(),
  label: z.string(),
  group: z.string().optional(),
  disclosure: z.boolean().optional(),
  options: z.array(z.union([z.string(), OpcionPanelSchema])).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().optional(),
  default: z.unknown().optional(),
  value: z.unknown().optional(),
  info: PanelInfoSchema.optional(),
});
export type ControlPanel = z.infer<typeof ControlPanelSchema>;

