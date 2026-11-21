// @contexto INDICE.md · src/components/code/README.md
/**
 * code.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { CodeDocumentSchema as CodeDocumentDataSchema } from "./code-model.schemas.js";
import type {
  CodeDocument,
  CodeMarkInput,
} from "./code-model.schemas.js";
import type { CodeThemeConfig } from "./code-theme.schemas.js";

const CodeDocSchema = CodeDocumentDataSchema;
export type CodeDoc = z.infer<typeof CodeDocSchema>;

interface CodeElement extends HTMLElement {
  lang: string;
  mode: 'inline' | 'block';
  value: string;
  lineNumbers: boolean | string;
  ready: boolean;
  themeConfig: CodeThemeConfig | null;
  setMarks(marks: readonly CodeMarkInput[]): void;
  code2json(opts: { marks?: readonly CodeMarkInput[] }): CodeDocument;
  setDocument(doc: CodeDocument): void;
  format(): void;
  refresh(): void;
}

const IswcCodeElSchema = z.custom<CodeElement>(
  (value) => typeof HTMLElement !== "undefined" && value instanceof HTMLElement,
);
export type IswcCodeEl = z.infer<typeof IswcCodeElSchema>;

interface FormatElement extends HTMLElement {
  format(): void;
}

const IswcFormatElSchema = z.custom<FormatElement>(
  (value) => typeof HTMLElement !== "undefined" && value instanceof HTMLElement,
);
export type IswcFormatEl = z.infer<typeof IswcFormatElSchema>;
