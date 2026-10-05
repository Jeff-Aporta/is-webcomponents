/**
 * diagram-edge-spread.schema.ts — esquemas Zod para tipos locales del spread.
 */

import { z } from "zod";

/** Tramo alineado detectado durante el barrido. */
export const RunSchema = z.object({
  ii: z.number(),
  i: z.number(),
  j: z.number(),
  pos: z.number(),
  a: z.number(),
  b: z.number(),
});
export type Run = z.infer<typeof RunSchema>;
