// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * use-case-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const NodeNodeEntrySchema = z.object({
  n: z.union([z.unknown() /* TODO: ref UseCaseLayoutActor */, z.unknown() /* TODO: ref UseCaseLayoutCase */]),
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type NodeNodeEntry = z.infer<typeof NodeNodeEntrySchema>;

const LinkNodeEntrySchema = z.object({
  l: z.unknown() /* TODO: ref UseCaseLayoutLink */,
  g: z.unknown() /* TODO: ref SVGGElement */,
});
export type LinkNodeEntry = z.infer<typeof LinkNodeEntrySchema>;

