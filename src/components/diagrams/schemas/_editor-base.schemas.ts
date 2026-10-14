/**
 * _editor-base.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const EditorModeSchema = z.union([z.literal('view'), z.literal('edit')]);
export type EditorMode = z.infer<typeof EditorModeSchema>;


export const EditorSpecLikeSchema = z.object({
  /* TODO: parse fail readonly nodes: readonly unknown[] */
  /* TODO: parse fail readonly edges?: readonly unknown[] */
});
export type EditorSpecLike = z.infer<typeof EditorSpecLikeSchema>;


export const IswcStateChangeDetailSchema = z.object({
  spec: z.unknown() /* TODO: ref Spec */,
  tag: z.string().optional(),
});
export type IswcStateChangeDetail = z.infer<typeof IswcStateChangeDetailSchema>;


export const IswcEditorConstructorSchema = z.object({
  /* TODO: parse fail readonly observedAttributes: string[] */
  /* TODO: parse fail new (...args: ConstructorParameters<typeof HTMLElement>): HT */
});
export type IswcEditorConstructor = z.infer<typeof IswcEditorConstructorSchema>;


export const EditorSpecGetSchema = z.object({
  /* TODO: parse fail readonly spec: Spec */
});
export type EditorSpecGet = z.infer<typeof EditorSpecGetSchema>;

