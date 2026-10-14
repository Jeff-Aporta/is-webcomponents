/**
 * speech.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const SpeechRecognitionEventSchema = z.object({
  resultIndex: z.number(),
  results: SpeechRecognitionResultListSchema,
});
export type SpeechRecognitionEvent = z.infer<typeof SpeechRecognitionEventSchema>;


export const SpeechRecognitionResultListSchema = z.object({
  /* TODO: parse fail readonly length: number */
  /* TODO: parse fail [index: number]: SpeechRecognitionResult */
});
export type SpeechRecognitionResultList = z.infer<typeof SpeechRecognitionResultListSchema>;


export const SpeechRecognitionResultSchema = z.object({
  /* TODO: parse fail readonly length: number */
  isFinal: z.boolean(),
  /* TODO: parse fail [index: number]: SpeechRecognitionAlternative */
});
export type SpeechRecognitionResult = z.infer<typeof SpeechRecognitionResultSchema>;


export const SpeechRecognitionAlternativeSchema = z.object({
  transcript: z.string(),
  confidence: z.number(),
});
export type SpeechRecognitionAlternative = z.infer<typeof SpeechRecognitionAlternativeSchema>;


export const SpeechRecognitionErrorEventSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
export type SpeechRecognitionErrorEvent = z.infer<typeof SpeechRecognitionErrorEventSchema>;


export const SpeechRecognitionInstanceSchema = z.object({
  lang: z.string(),
  continuous: z.boolean(),
  interimResults: z.boolean(),
  onresult: z.union([z.function({ input: [z.unknown() /* TODO: ref SpeechRecognitionEvent */], output: z.void() }), z.null()]),
  onerror: z.union([z.function({ input: [z.unknown() /* TODO: ref SpeechRecognitionErrorEvent */], output: z.void() }), z.null()]),
  onend: z.union([z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }), z.null()]),
  start: z.function({ input: [], output: z.void() }),
  stop: z.function({ input: [], output: z.void() }),
  abort: z.function({ input: [], output: z.void() }).optional(),
});
export type SpeechRecognitionInstance = z.infer<typeof SpeechRecognitionInstanceSchema>;


export const SpeechRecognitionCtorSchema = z.unknown() /* TODO: cannot convert */;
export type SpeechRecognitionCtor = z.infer<typeof SpeechRecognitionCtorSchema>;


export const SpeechRecognitionConstructorBagSchema = z.object({
  SpeechRecognition: SpeechRecognitionCtorSchema.optional(),
  webkitSpeechRecognition: SpeechRecognitionCtorSchema.optional(),
});
export type SpeechRecognitionConstructorBag = z.infer<typeof SpeechRecognitionConstructorBagSchema>;

