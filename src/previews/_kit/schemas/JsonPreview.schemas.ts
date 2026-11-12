// @contexto INDICE.md · src/previews/README.md
/**
 * JsonPreview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Los contratos viven en los schemas compartidos del preview; aquí sólo se
 * exponen los aliases que consume la clase.
 */
import { z } from "zod";
import type {
  PreviewBehaviorModule,
  PreviewDefinition,
  PreviewMountContext,
} from "./preview.schemas.ts";
import type { FichaLikeDefinition } from "./ficha-bridge.schemas.ts";

export const DefinicionPreviewSchema = z.custom<FichaLikeDefinition>();
export type DefinicionPreview = z.infer<typeof DefinicionPreviewSchema>;

export const CtxMontajeSchema = z.custom<PreviewMountContext>();
export type CtxMontaje = z.infer<typeof CtxMontajeSchema>;

export const ModuloBehaviorSchema = z.custom<PreviewBehaviorModule>();
export type ModuloBehavior = z.infer<typeof ModuloBehaviorSchema>;

export const ConDefinicionSchema = z.object({
  definition: z.custom<PreviewDefinition>(),
});
export type ConDefinicion = z.infer<typeof ConDefinicionSchema>;
