/**
 * app-nav.schemas.ts — Forma de `rows` de <iswc-app-nav> (contrato público, ver specs/app-shell/spec.md).
 */
import { z } from "zod";

export const AppNavTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  href: z.string().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
});
export type AppNavTab = z.infer<typeof AppNavTabSchema>;

export const AppNavRowSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  value: z.string().optional(),
  parent: z.string().optional(),
  tabs: z.array(AppNavTabSchema),
});
export type AppNavRow = z.infer<typeof AppNavRowSchema>;
