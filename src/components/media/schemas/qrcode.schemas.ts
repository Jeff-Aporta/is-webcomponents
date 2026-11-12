// @contexto INDICE.md · src/components/media/README.md
/**
 * qrcode.ts — Tipos del módulo `qrcode-generator` cargado por CDN.
 */

/** Instancia creada por la factoría de qrcode-generator. */
export interface QRInstance {
  addData(data: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}

/** Factoría de qrcode-generator: tipo de QR y nivel de corrección. */
export interface QRLib {
  (typeNumber: number, errorCorrectionLevel: string): QRInstance;
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type QrcodeEventos = { 'iswc-render': { svg: SVGElement } };
