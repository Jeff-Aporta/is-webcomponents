// @contexto INDICE.md · src/components/feedback/README.md
/**
 * progress-bar.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ProgressBarElSchema = z.object({
  value: z.number(),
  label: z.string(),
});
export type ProgressBarEl = z.infer<typeof ProgressBarElSchema>;

