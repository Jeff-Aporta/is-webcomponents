// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const PageChangeDetailSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
});
export type PageChangeDetail = z.infer<typeof PageChangeDetailSchema>;

const StateSavedDetailSchema = z.object({
  key: z.string(),
  state: z.unknown(),
});
export type StateSavedDetail = z.infer<typeof StateSavedDetailSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type AgGridEventos = { 'iswc-quick-filter': { value: string }; 'iswc-state-saved': StateSavedDetail; 'iswc-page-change': PageChangeDetail; 'iswc-state-loaded': unknown; 'iswc-state-reset': { key: string }; 'iswc-row-menu': { row: string; anchor: HTMLElement } };
