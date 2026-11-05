/**
 * stat-group.schemas.ts — props de `<iswc-stat-group>`.
 */
import { z } from "zod";

/** Un indicador: lo que pinta un `iswc-stat`. El `id` identifica la celda entre refrescos. */
const StatGroupItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  helper: z.string().default(""),
  icon: z.string().default(""),
  color: z.enum(["brand", "neutral", "success", "warning", "danger"]).default("brand"),
  trend: z.string().default(""),
  trendDirection: z.enum(["up", "down", "flat", ""]).default(""),
});
export type StatGroupItem = z.infer<typeof StatGroupItemSchema>;

export const StatGroupPropsSchema = z.object({
  /** `null` pinta esqueletos: los datos aún no llegan. */
  items: z.array(StatGroupItemSchema).nullable(),
  esqueletos: z.number().int().nonnegative(),
});
export type StatGroupProps = z.infer<typeof StatGroupPropsSchema>;
