/**
 * block-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BreakpointSchema = z.unknown() /* TODO: cannot convert */;
export type Breakpoint = z.infer<typeof BreakpointSchema>;


export const BreakpointFlagsSchema = z.record(z.string(), z.boolean());
export type BreakpointFlags = z.infer<typeof BreakpointFlagsSchema>;


export const LerpwFnSchema = z.function({ input: [z.string(), z.string()], output: z.number() });
export type LerpwFn = z.infer<typeof LerpwFnSchema>;

