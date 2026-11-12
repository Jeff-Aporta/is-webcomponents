// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * use-case-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import type { UseCaseLayoutActor, UseCaseLayoutCase, UseCaseLayoutLink } from './use-case-spec.schemas.js';
import { z } from "zod";
import type { DiagramRenderDetail, DiagramToggleDetail, DiagramViewerDetail } from './diagram-base.schemas.js';

const NodeNodeEntrySchema = z.object({
  n: z.union([z.custom<UseCaseLayoutActor>(() => true), z.custom<UseCaseLayoutCase>(() => true)]),
  g: z.custom<SVGGElement>(() => true),
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;

const LinkNodeEntrySchema = z.object({
  l: z.custom<UseCaseLayoutLink>(() => true),
  g: z.custom<SVGGElement>(() => true),
});
export type LinkNodeEntry = z.infer<typeof LinkNodeEntrySchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type UseCaseDiagramEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-toggle-group': DiagramToggleDetail; 'iswc-open-viewer': DiagramViewerDetail };
