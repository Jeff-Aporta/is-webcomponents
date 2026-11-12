// @contexto INDICE.md · src/components/data-viz/README.md
/**
 * heatmap.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const HeatmapCfgSchema = z.object({
  xLabels: z.array(z.unknown()).optional(),
  yLabels: z.array(z.unknown()).optional(),
  data: z.array(z.unknown()).optional(),
  points: z.array(z.object({
  x: z.unknown(),
  y: z.unknown(),
  v: z.number(),
})).optional(),
});
export type HeatmapCfg = z.infer<typeof HeatmapCfgSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type HeatmapEventos = { 'iswc-render': { svg: SVGElement }; 'iswc-cell-hover': { x: string; y: string; value: number } };
