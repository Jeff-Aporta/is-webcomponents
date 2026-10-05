/**
 * chart.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const TypedChartFactorySchema = z.unknown() /* TODO: cannot convert */;
export type TypedChartFactory = z.infer<typeof TypedChartFactorySchema>;


export const ChartDataPointSchema = z.union([z.number(), z.object({
  x: z.number().optional(),
  y: z.number(),
  r: z.number().optional(),
})]);
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;


export const ChartDatasetSchema = z.object({
  label: z.string().optional(),
  data: z.array(ChartDataPointSchema),
  /* TODO: member [key: string]: unknown */
});
export type ChartDataset = z.infer<typeof ChartDatasetSchema>;


export const ChartConfigSchema = z.object({
  type: z.string().optional(),
  data: z.object({
  labels: z.array(z.string()).optional(),
  datasets: z.array(ChartDatasetSchema).optional(),
}).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;


export const LegendEntrySchema = z.object({
  label: z.string(),
  index: z.number(),
  hidden: z.boolean(),
});
export type LegendEntry = z.infer<typeof LegendEntrySchema>;


export const HitRecordSchema = z.object({
  el: z.union([z.unknown() /* TODO: ref Element */, z.null()]).optional(),
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


export const ResolvedOptionsSchema = z.object({
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


export const DrawMarksFnSchema = z.function({ input: [z.function({ input: [z.unknown() /* TODO: ref ChartCtx */], output: z.unknown() /* TODO: cannot convert */ })], output: z.unknown() /* TODO: cannot convert */ });
export type DrawMarksFn = z.infer<typeof DrawMarksFnSchema>;


export const ChartCtxSchema = z.object({
  svg: z.unknown() /* TODO: ref HTMLElement */,
  group: z.unknown() /* TODO: ref SVGGElement */,
  plot: z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}),
  width: z.number(),
  height: z.number(),
  data: z.object({
  labels: z.array(z.string()),
  datasets: z.array(ChartDatasetSchema),
}),
  sliceMask: z.union([z.array(z.boolean()), z.null()]),
  colors: z.array(z.string()),
  fills: z.array(z.string()),
  text: z.string(),
  grid: z.string(),
  surface: z.string(),
  style: z.object({
  barRadius: z.number(),
  barGap: z.number(),
  lineWidth: z.number(),
  pointRadius: z.number(),
  sliceGap: z.number(),
}),
  opts: ResolvedOptionsSchema,
  fmt: z.function({ input: [z.number()], output: z.string() }),
  addHit: z.function({ input: [z.unknown() /* TODO: ref HitRecord */], output: z.void() }),
  scaleLinear: z.unknown() /* TODO: cannot convert */,
  scaleBand: z.unknown() /* TODO: cannot convert */,
  niceTicks: z.unknown() /* TODO: cannot convert */,
  drawMarks: z.union([DrawMarksFnSchema, z.null()]).optional(),
  radial: z.object({
  cx: z.number(),
  cy: z.number(),
  rMax: z.number(),
  innerRatio: z.number(),
}).optional(),
  numeric: z.boolean().optional(),
  xScale: z.function({ input: [z.number()], output: z.number() }).optional(),
  yScale: z.function({ input: [z.number()], output: z.number() }).optional(),
  band: z.object({
  step: z.number(),
  bandwidth: z.number(),
  start: z.function({ input: [z.number()], output: z.number() }),
}).optional(),
  vScale: z.function({ input: [z.number()], output: z.number() }).optional(),
  vDomain: z.tuple([z.number(), z.number()]).optional(),
  horizontal: z.boolean().optional(),
  pt: z.function({ input: [z.number(), z.number()], output: z.object({
  x: z.number(),
  y: z.number(),
}) }).optional(),
});
export type ChartCtx = z.infer<typeof ChartCtxSchema>;

