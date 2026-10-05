/**
 * code-highlight.schema.ts — esquemas Zod para los tipos del highlighter.
 *
 * Solo los tipos LOCALES (no exportados) se migran aquí. Los tipos exportados
 * con importers externos (Token, HighlightLine) permanecen inline en
 * code-highlight.ts para no romper a los consumidores.
 */

import { z } from "zod";

/** Resultado interno de `scanHtmlTagInner`: posición y si el tag se autocerró. */
export const TagInnerSchema = z.object({
  pos: z.number(),
  selfClose: z.boolean(),
});
export type TagInner = z.infer<typeof TagInnerSchema>;
