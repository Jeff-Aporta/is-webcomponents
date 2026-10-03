/**
 * pipeline-grouping.schema.ts — esquemas Zod para tipos locales del pipeline.
 */

import { z } from "zod";
import type { RowNode } from "./types.js";

/** Un valor distinto de la columna, con las hojas que lo comparten. */
export const CuboSchema = z.object({
  value: z.unknown(),
  label: z.string(),
  leaves: z.array(z.custom<RowNode>()),
});
export type Cubo = z.infer<typeof CuboSchema>;
