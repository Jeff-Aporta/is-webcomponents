// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * venn-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { DiagramRenderDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const VennLayoutCircleSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  hue: z.number(),
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
  labelX: z.number(),
  labelY: z.number(),
});

const VennLayoutRegionSchema = z.object({
  id: z.string(),
  sets: z.array(z.string()),
  label: z.string().optional(),
  value: z.number().optional(),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  hues: z.array(z.number()),
});

const CircleNodeEntrySchema = z.object({
  c: VennLayoutCircleSchema,
  g: z.custom<SVGGElement>(() => true),
});
export type CircleNodeEntry = z.infer<typeof CircleNodeEntrySchema>;

const RegionNodeEntrySchema = z.object({
  r: VennLayoutRegionSchema,
  g: z.custom<SVGGElement>(() => true),
});
export type RegionNodeEntry = z.infer<typeof RegionNodeEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type VennDiagramEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-open-viewer': DiagramViewerDetail };
