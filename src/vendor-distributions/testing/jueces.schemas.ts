// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * jueces.schemas.ts — contratos de los jueces opcionales de las pruebas: JEV (TypeSafe, preguntas
 * sí/no, de opción y de escala sobre un texto) y un juez LLM (chat OpenAI-compatible).
 */
import { z } from 'zod';

/** Entrada `jev` del archivo de llaves. */
export const ZLlaveJev = z.object({
  nombre: z.string().min(1).default('jev'),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default('jev-latest'),
  baseUrl: z.string().trim().min(1).default('https://api.typesafe.ai/v1'),
}).passthrough().transform((j) => ({ ...j, baseUrl: j.baseUrl.replace(/\/+$/, '') }));
export type LlaveJev = z.output<typeof ZLlaveJev>;

/** Pregunta JEV: `noul` (sí/no, probabilidad 0..1), `choice` (una de varias), `score` (escala ordinal). */
export const ZPreguntaJev = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), instructions: z.string().min(1) }),
  z.object({ type: z.literal('choice'), instructions: z.string().min(1), criteria: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('score'), instructions: z.string().min(1), criteria: z.array(z.string()).min(2) }),
]);
export type PreguntaJev = z.infer<typeof ZPreguntaJev>;

/** Respuesta de una pregunta (campos según el tipo). */
export const ZRespuestaJev = z.object({
  type: z.enum(['noul', 'choice', 'score']),
  noul: z.number().optional(),
  choice: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
}).passthrough();
export type RespuestaJev = z.infer<typeof ZRespuestaJev>;

export const ZCuerpoJev = z.object({ model: z.string().optional(), answers: z.record(z.string(), ZRespuestaJev) }).passthrough();

/**
 * Veredicto de un juez opcional: o evaluó (con sus respuestas) o NO evaluó y dice por qué (sin llave,
 * en cooldown, sin saldo, caído). Nunca lanza: quien lo usa decide si avisar o saltar.
 */
export type VeredictoJuez<T> = { evaluado: true; respuestas: T; juez: string } | { evaluado: false; motivo: string };

export interface OpcionesJuez {
  /** Archivo de llaves (fuera del repo). */
  rutaLlaves: string;
  /** `fetch` inyectable (pruebas). */
  fetchFn?: typeof fetch;
  /** Default 60 s. */
  timeoutMs?: number;
  now?: () => number;
}

/** Lo mínimo del contexto de una prueba que la capa opcional necesita (`definirPruebas` o `node:test`). */
export interface ContextoCapa {
  aviso?: (mensaje: string) => void;
  saltar?: (motivo: string) => never;
  skip?: (motivo?: string) => void;
}
