// @contexto INDICE.md · src/components/media/README.md
/**
 * barcode-scanner.ts — Tipos del subset de Barcode Detector que usa el componente.
 */

/** Código detectado por BarcodeDetector. */
export interface DetectedBarcode {
  rawValue: string;
  format: string;
}

/** Instancia creada por BarcodeDetector. */
export interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

/** Constructor de BarcodeDetector. */
export interface BarcodeDetectorCtor {
  new (init?: { formats?: string[] }): BarcodeDetectorInstance;
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type BarcodeScannerEventos = { 'iswc-error': { message: string }; 'iswc-detect': { barcodes: DetectedBarcode[]; rawValue: string; format: string } };
