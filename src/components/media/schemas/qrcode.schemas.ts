/**
 * qrcode.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const QRInstanceSchema = z.object({
  addData: z.function({ input: [z.string()], output: z.void() }),
  make: z.function({ input: [], output: z.void() }),
  getModuleCount: z.function({ input: [], output: z.number() }),
  isDark: z.function({ input: [z.number(), z.number()], output: z.boolean() }),
});
export type QRInstance = z.infer<typeof QRInstanceSchema>;


export const QRLibSchema = z.function({ input: [z.number(), z.string()], output: z.unknown() /* TODO: ref QRInstance */ });
export type QRLib = z.infer<typeof QRLibSchema>;

