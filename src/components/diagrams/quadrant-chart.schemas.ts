/**
 * quadrant-chart.ts — Zod schemas propios del componente.
 *
 * El layout (QuadrantLayout, QuadrantLayoutPoint, QuadrantLayoutQuadrant,
 * QuadrantLayoutAxes, QuadrantLayoutAxisLabel) vive en
 * `quadrant-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { QuadrantLayoutPointSchema } from "./quadrant-spec.schemas.js";

export const PointEntrySchema = z.object({
  pt: QuadrantLayoutPointSchema,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type PointEntry = z.infer<typeof PointEntrySchema>;
