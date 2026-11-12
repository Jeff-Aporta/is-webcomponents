// @contexto INDICE.md · src/components/helpers/README.md
/**
 * format-bytes.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ByteUnitSchema = z.union([
  z.literal('byte'),
  z.literal('kilobyte'),
  z.literal('megabyte'),
  z.literal('gigabyte'),
  z.literal('terabyte'),
  z.literal('petabyte'),
]);
export type ByteUnit = z.infer<typeof ByteUnitSchema>;

const FormatBytesOptionsSchema = z.object({
  locale: z.string().optional(),
  display: z.union([z.literal('short'), z.literal('long')]).optional(),
  autofit: z.boolean().optional(),
});
export type FormatBytesOptions = z.infer<typeof FormatBytesOptionsSchema>;

