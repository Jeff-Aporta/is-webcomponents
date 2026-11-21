// @contexto INDICE.md · src/components/charts/README.md
/**
 * chart.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/**
 * Factory que registra un chart con tipo fijo (`<iswc-bar-chart>`,
 * `<iswc-pie-chart>`, …). La exponen los wrappers via
 * `window.__isDefineTypedChart`.
 */
export type TypedChartFactory = (
  tag: string,
  fixedType: string,
  drawMarks: (ctx: ChartCtx) => void,
  styleModuleUrl?: string,
) => unknown;

const ChartDataPointSchema = z.union([z.number(), z.object({
  x: z.number().optional(),
  y: z.number(),
  r: z.number().optional(),
})]);
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;

export const ChartDatasetSchema = z.object({
  label: z.string().optional(),
  data: z.array(ChartDataPointSchema),
});
/** Dataset de Chart.js: acepta claves extra (`curve`, `stepped`, …). */
export type ChartDataset = z.infer<typeof ChartDatasetSchema> & { [key: string]: unknown };

const ChartConfigSchema = z.object({
  type: z.string().optional(),
  data: z.object({
  labels: z.array(z.string()).optional(),
  datasets: z.array(ChartDatasetSchema).optional(),
}).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

const LegendEntrySchema = z.object({
  label: z.string(),
  index: z.number(),
  hidden: z.boolean(),
});
export type LegendEntry = z.infer<typeof LegendEntrySchema>;

const HitRecordSchema = z.object({
  el: z.custom<Element>().nullable().optional(),
  x: z.number(),
  y: z.number(),
  radius: z.number().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
  value: z.union([z.number(), z.string()]).optional(),
  display: z.string().optional(),
  color: z.string().optional(),
  crosshair: z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
}).optional(),
});
export type HitRecord = z.infer<typeof HitRecordSchema>;

const ResolvedOptionsSchema = z.object({
  type: z.string(),
  horizontal: z.boolean(),
  stacked: z.boolean(),
  gridMode: z.union([z.string(), z.null()]),
  min: z.union([z.number(), z.null()]),
  max: z.union([z.number(), z.null()]),
  beginAtZero: z.boolean(),
  animate: z.boolean(),
  tooltip: z.boolean(),
  legendDisplay: z.union([z.boolean(), z.null()]),
  legendPosition: z.string(),
  title: z.union([z.string(), z.null()]),
  xLabel: z.union([z.string(), z.null()]),
  yLabel: z.union([z.string(), z.null()]),
  doughnutRatio: z.union([z.number(), z.null()]),
});
export type ResolvedOptions = z.infer<typeof ResolvedOptionsSchema>;

/**
 * Contexto de pintado que recibe `drawMarks`: el lienzo, los datos ya
 * proyectados y las utilidades de escala. Es una `interface` (y no un
 * `type`) porque `drawMarks` se referencia a si mismo.
 */
/**
 * Hook de pintado de un tipo de chart. Ademas de pintar, puede declarar
 * `domainValues` (el rango real del eje) y `plotPad` (el aire que pide).
 */
export interface DrawMarks {
  (ctx: ChartCtx): void;
  /** Rango real del eje cuando el tipo lo sabe mejor que el motor. */
  domainValues?: (datasets: readonly ChartDataset[], labels: readonly string[], opts: ResolvedOptions) => number[];
  /** Padding en px que el tipo pide (bubble y similares). */
  plotPad?: (ds: readonly ChartDataset[]) => number;
}

export interface ChartCtx {
  svg: HTMLElement;
  group: SVGGElement;
  plot: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  data: { labels: string[]; datasets: ChartDataset[] };
  sliceMask: boolean[] | null;
  colors: string[];
  fills: string[];
  text: string;
  grid: string;
  surface: string;
  unit?: number;
  style: { barRadius: number; barGap: number; lineWidth: number; pointRadius: number; sliceGap: number };
  opts: ResolvedOptions;
  fmt: (n: number) => string;
  addHit: (hit: HitRecord) => void;
  scaleLinear: (domain: [number, number], range: [number, number]) => (v: number) => number;
  scaleBand: (count: number, range: [number, number], gapRatio?: number) => { step: number; bandwidth: number; start: (i: number) => number };
  niceTicks: (min: number, max: number, count?: number) => number[];
  drawMarks?: DrawMarks | null;
  radial?: { cx: number; cy: number; rMax: number; innerRatio: number };
  numeric?: boolean;
  xScale?: (v: number) => number;
  yScale?: (v: number) => number;
  band?: { step: number; bandwidth: number; start: (v: number) => number };
  vScale?: (v: number) => number;
  vDomain?: [number, number];
  horizontal?: boolean;
  pt?: (x: number, y: number) => { x: number; y: number };
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ChartEventos = { 'iswc-render': { svg: SVGElement }; 'iswc-turtle-state': { playing: boolean; idx: number; total: number; replay: number }; 'iswc-open-viewer': { payload: unknown } };
