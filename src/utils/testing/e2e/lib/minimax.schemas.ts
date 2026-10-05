/**
 * minimax.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ResultadoGeneradorSchema = z.object({
  role: z.literal('assistant'),
  content: z.object({
  type: z.literal('text'),
  text: z.string(),
}),
  outputFormat: z.literal('json_schema'),
  structuredContent: z.unknown(),
  usage: z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
}),
});
export type ResultadoGenerador = z.infer<typeof ResultadoGeneradorSchema>;


export const OpcionesGeneradorSchema = z.object({
  apiKey: z.string(),
  model: z.string(),
  baseUrl: z.string().optional(),
});
export type OpcionesGenerador = z.infer<typeof OpcionesGeneradorSchema>;


export const ParamsGeneradorSchema = z.object({
  systemPrompt: z.string().optional(),
  messages: z.array(z.object({
  role: z.string(),
  content: z.unknown(),
})).optional(),
  temperature: z.number().optional(),
  responseFormat: z.object({
  schema: z.unknown().optional(),
}).optional(),
});
export type ParamsGenerador = z.infer<typeof ParamsGeneradorSchema>;


export const ParteContenidoSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional(),
  mimeType: z.string().optional(),
  data: z.string().optional(),
  content: z.array(z.object({
  type: z.string().optional(),
  text: z.string().optional(),
})).optional(),
  input: z.unknown().optional(),
});
export type ParteContenido = z.infer<typeof ParteContenidoSchema>;

