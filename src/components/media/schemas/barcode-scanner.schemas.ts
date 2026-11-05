/**
 * barcode-scanner.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const BarcodeDetectorCtorSchema = z.object({
  /* TODO: parse fail new (init?: { formats?: string[] }): BarcodeDetectorInstance */
});
export type BarcodeDetectorCtor = z.infer<typeof BarcodeDetectorCtorSchema>;

const DetectedBarcodeSchema = z.object({
  rawValue: z.string(),
  format: z.string(),
});
export type DetectedBarcode = z.infer<typeof DetectedBarcodeSchema>;

