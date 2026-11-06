// render.schemas.ts: contratos de tipos de render.ts.

/** Ventana a pintar. Los gaps son espaciadores en em que dan el tamaño total. */
export interface GridWindow {
  rows: number[]; cols: number[];
  topGapAt: number; topGap: number; bottomGap: number;
  leftGapAt: number; leftGap: number; rightGap: number;
}

/** Opciones de presentación. */
export interface RenderOptions { showFormulas: boolean; headings: boolean; activeCell: { r: number; c: number } | null; zoom: number }
