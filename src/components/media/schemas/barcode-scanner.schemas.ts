/**
 * barcode-scanner.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const BarcodeDetectorCtorSchema = z.object({
  /* TODO: parse fail new (init?: { formats?: string[] }): BarcodeDetectorInstance */
});
export type BarcodeDetectorCtor = z.infer<typeof BarcodeDetectorCtorSchema>;


export const BarcodeDetectorInstanceSchema = z.object({
  detect: z.function({ input: [z.unknown() /* TODO: ref CanvasImageSource */], output: z.promise(z.array(z.unknown() /* TODO: ref DetectedBarcode */)) }),
});
export type BarcodeDetectorInstance = z.infer<typeof BarcodeDetectorInstanceSchema>;


export const DetectedBarcodeSchema = z.object({
  rawValue: z.string(),
  format: z.string(),
});
export type DetectedBarcode = z.infer<typeof DetectedBarcodeSchema>;

