// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * quadrant-chart.ts — Zod schemas propios del componente.
 *
 * El layout (QuadrantLayout, QuadrantLayoutPoint, QuadrantLayoutQuadrant,
 * QuadrantLayoutAxes, QuadrantLayoutAxisLabel) vive en
 * `quadrant-spec.schemas.ts`; aquí solo lo que el componente añade por encima.
 */
import { z } from "zod";
import { QuadrantLayoutPointSchema } from "./quadrant-spec.schemas.js";
import type { DiagramRenderDetail, DiagramToggleDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const PointEntrySchema = z.object({
  pt: QuadrantLayoutPointSchema,
  g: z.custom<SVGGElement>(() => true),
});
export type PointEntry = z.infer<typeof PointEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type QuadrantChartEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
