// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * component-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import type { DiagramRenderDetail, DiagramViewerDetail } from './diagram-base.schemas.js';
import { CajaSchema, PaqueteSchema, PuntoSchema } from './diagram-uml.schemas.js';

const InterfaceStemPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type InterfaceStemPoint = z.infer<typeof InterfaceStemPointSchema>;

const LayoutPackageSchema = z.intersection(PaqueteSchema, z.object({
  titleBox: CajaSchema.optional(),
}));
export type LayoutPackage = z.infer<typeof LayoutPackageSchema>;

const AnchorPointSchema = PuntoSchema;
export type AnchorPoint = z.infer<typeof AnchorPointSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ComponentDiagramEventos = { 'iswc-render': DiagramRenderDetail; 'iswc-open-viewer': DiagramViewerDetail };
