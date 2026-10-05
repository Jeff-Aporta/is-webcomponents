/**
 * section-schema.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SectionIdSchema = z.unknown() /* TODO: cannot convert */;
export type SectionId = z.infer<typeof SectionIdSchema>;


export const ContentBlockSchema = z.unknown() /* TODO: cannot convert */;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;


export const SectionTableRowSchema = z.unknown() /* TODO: cannot convert */;
export type SectionTableRow = z.infer<typeof SectionTableRowSchema>;


export const SectionTableSchema = z.unknown() /* TODO: cannot convert */;
export type SectionTable = z.infer<typeof SectionTableSchema>;


export const AtributosRowSchema = z.unknown() /* TODO: cannot convert */;
export type AtributosRow = z.infer<typeof AtributosRowSchema>;


export const PropRowSchema = z.unknown() /* TODO: cannot convert */;
export type PropRow = z.infer<typeof PropRowSchema>;


export const StateRowSchema = z.unknown() /* TODO: cannot convert */;
export type StateRow = z.infer<typeof StateRowSchema>;


export const EventoRowSchema = z.unknown() /* TODO: cannot convert */;
export type EventoRow = z.infer<typeof EventoRowSchema>;


export const SlotRowSchema = z.unknown() /* TODO: cannot convert */;
export type SlotRow = z.infer<typeof SlotRowSchema>;


export const PartRowSchema = z.unknown() /* TODO: cannot convert */;
export type PartRow = z.infer<typeof PartRowSchema>;


export const ApiJsRowSchema = z.unknown() /* TODO: cannot convert */;
export type ApiJsRow = z.infer<typeof ApiJsRowSchema>;


export const ExampleSchema = z.unknown() /* TODO: cannot convert */;
export type Example = z.infer<typeof ExampleSchema>;


export const ExamplesSchema = z.unknown() /* TODO: cannot convert */;
export type Examples = z.infer<typeof ExamplesSchema>;


export const SectionsMapSchema = z.unknown() /* TODO: cannot convert */;
export type SectionsMap = z.infer<typeof SectionsMapSchema>;


export const ExcludeListSchema = z.unknown() /* TODO: cannot convert */;
export type ExcludeList = z.infer<typeof ExcludeListSchema>;


export const FichaWarningSchema = z.object({
  level: z.literal("warn"),
  section: SectionIdSchema,
  message: z.string(),
});
export type FichaWarning = z.infer<typeof FichaWarningSchema>;


export const FichaInspectionSchema = z.object({
  missing: z.array(FichaWarningSchema),
  spuriousExclude: z.array(FichaWarningSchema),
  unknownExclude: z.array(FichaWarningSchema),
});
export type FichaInspection = z.infer<typeof FichaInspectionSchema>;


export const FichaSchema = z.unknown() /* TODO: cannot convert */;
export type Ficha = z.infer<typeof FichaSchema>;

