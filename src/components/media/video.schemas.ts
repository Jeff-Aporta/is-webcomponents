/**
 * video.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IswcCheckIconButtonSchema = z.object({
  checked: z.boolean(),
  icon: z.string(),
});
export type IswcCheckIconButton = z.infer<typeof IswcCheckIconButtonSchema>;

