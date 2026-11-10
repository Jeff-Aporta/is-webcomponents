// @contexto INDICE.md · src/components/forms/README.md
/**
 * time-clock.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ParsedTimeSchema = z.object({
  h: z.number(),
  m: z.number(),
  s: z.number(),
});
export type ParsedTime = z.infer<typeof ParsedTimeSchema>;

const RingItemSchema = z.object({
  label: z.string(),
  raw: z.number(),
});
export type RingItem = z.infer<typeof RingItemSchema>;

const ViewSchema = z.union([z.literal('hours'), z.literal('minutes'), z.literal('seconds')]);
export type View = z.infer<typeof ViewSchema>;

const MeridiemSchema = z.union([z.literal('AM'), z.literal('PM')]);
export type Meridiem = z.infer<typeof MeridiemSchema>;

const CommitOptsSchema = z.object({
  advance: z.boolean().optional(),
});
export type CommitOpts = z.infer<typeof CommitOptsSchema>;

const PickOptsSchema = z.object({
  advance: z.boolean().optional(),
});
export type PickOpts = z.infer<typeof PickOptsSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TimeClockEventos = { 'iswc-view-change': { view: View }; 'iswc-change': { value: string } };
