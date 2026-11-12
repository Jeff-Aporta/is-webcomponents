// @contexto INDICE.md · src/components/charts/README.md
/**
 * chart.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/**
 * `<iswc-chart>` del preview: el elemento con su propiedad `config`.
 */
export type IswcChartElement = HTMLElement & {
  config?: {
    type?: string;
    data?: {
      labels?: string[];
      datasets?: Array<{ label?: string; data: number[]; tension?: number; fill?: boolean }>;
    };
    options?: Record<string, unknown>;
  };
};

