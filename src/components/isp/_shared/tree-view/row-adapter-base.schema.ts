/**
 * row-adapter-base.schema.ts — esquemas Zod para tipos locales del adapter.
 */

import { z } from "zod";
import type { RowAdapterBridge } from "./_types.js";

/** Bridge que `paintRow` pasa a `TreeRowAdapter` (alias local tipado). */
export const TRAContextSchema = z.intersection(
  z.custom<RowAdapterBridge>(),
  z.object({
    forceRefresh: z.function().optional(),
  }),
);
export type TRAContext = z.infer<typeof TRAContextSchema>;
