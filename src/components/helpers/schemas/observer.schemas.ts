// @contexto INDICE.md · src/components/helpers/README.md
/**
 * observer.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ObserverTypeSchema = z.union([z.literal('intersection'), z.literal('mutation'), z.literal('resize')]);
export type ObserverType = z.infer<typeof ObserverTypeSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type ObserverEventos = { 'iswc-intersect': { entry: IntersectionObserverEntry }; 'iswc-mutate': { records: MutationRecord[] }; 'iswc-resize': { entries: ResizeObserverEntry[] } };
