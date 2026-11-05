/**
 * llm-agent-prompt.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const SkillDocSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type SkillDoc = z.infer<typeof SkillDocSchema>;

const LoadAgentPromptOptsSchema = z.object({
  importMetaUrl: z.string().optional(),
  force: z.boolean().optional(),
});
export type LoadAgentPromptOpts = z.infer<typeof LoadAgentPromptOptsSchema>;

const BuildLlmPromptOptsSchema = z.object({
  sha: z.string().optional(),
  base: z.string().optional(),
});
export type BuildLlmPromptOpts = z.infer<typeof BuildLlmPromptOptsSchema>;

