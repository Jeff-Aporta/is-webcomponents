// @contexto INDICE.md · src/utils/README.md
/**
 * section-schema.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const SectionIdSchema = z.unknown() /* TODO: cannot convert */;
export type SectionId = z.infer<typeof SectionIdSchema>;

const FichaWarningSchema = z.object({
  level: z.literal("warn"),
  section: SectionIdSchema,
  message: z.string(),
});

const FichaInspectionSchema = z.object({
  missing: z.array(FichaWarningSchema),
  spuriousExclude: z.array(FichaWarningSchema),
  unknownExclude: z.array(FichaWarningSchema),
});
export type FichaInspection = z.infer<typeof FichaInspectionSchema>;

const FichaSchema = z.unknown() /* TODO: cannot convert */;
export type Ficha = z.infer<typeof FichaSchema>;

