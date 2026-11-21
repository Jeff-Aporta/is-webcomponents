// @contexto INDICE.md · src/components/code/README.md
/**
 * code.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { HighlightLine as CoreHighlightLine } from "@jeff-aporta/iswc-base/core/schemas/code-highlight.schemas.js";
import {
  CodeMarkSchema as CodeMarkDataSchema,
  CodeDocumentSchema as CodeDocumentDataSchema,
  CodeDocOptsSchema as CodeDocOptsDataSchema,
} from "./code-model.schemas.js";
import { CodeFormatConfigSchema as CodeFormatConfigDataSchema } from "./code-format.schemas.js";

const CodeMarkSchema = CodeMarkDataSchema;
export type CodeMark = z.infer<typeof CodeMarkSchema>;

const CodeDocumentSchema = CodeDocumentDataSchema;
export type CodeDocument = z.infer<typeof CodeDocumentSchema>;

const CodeFormatConfigSchema = CodeFormatConfigDataSchema;
export type CodeFormatConfig = z.infer<typeof CodeFormatConfigSchema>;

const CodeDocOptsSchema = CodeDocOptsDataSchema;
export type CodeDocOpts = z.infer<typeof CodeDocOptsSchema>;

const CodeLangDefSchema = z.object({
  id: z.string(),
  aliases: z.array(z.string()).optional(),
  heavy: z.boolean().optional(),
  load: z.function({ input: [], output: z.promise(z.void()) }).optional(),
  lineClass: z.function({ input: [z.string()], output: z.union([z.string(), z.null()]) }).optional(),
});
export type CodeLangDef = z.infer<typeof CodeLangDefSchema>;

interface TooltipElement extends HTMLElement {
  open: boolean;
}

const IswcTooltipElSchema = z.custom<TooltipElement>(
  (value) => typeof HTMLElement !== "undefined" && value instanceof HTMLElement,
);
export type IswcTooltipEl = z.infer<typeof IswcTooltipElSchema>;

const HighlightLineSchema = z.custom<CoreHighlightLine>();
export type HighlightLine = z.infer<typeof HighlightLineSchema>;

const HighlightResultSchema = z.object({
  lines: z.array(HighlightLineSchema),
  html: z.string(),
  withNumbers: z.boolean(),
});
export type HighlightResult = z.infer<typeof HighlightResultSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type CodeEventos = { 'iswc-change': { value: string; formatted?: boolean; format?: string }; 'iswc-error': { error: string }; 'iswc-ready': { lang: string; value: string }; 'iswc-input': { value: string }; 'iswc-cursor': { line: number; ch: number; index: number }; 'iswc-mark-activate': { mark: unknown; phase: 'enter' | 'leave' } };
