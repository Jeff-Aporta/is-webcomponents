// @contexto INDICE.md · src/components/forms/README.md
/**
 * rte.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const RteCommandDefSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  run: z.function({ input: [z.unknown() /* TODO: ref HTMLElement */], output: z.void() }),
});
export type RteCommandDef = z.infer<typeof RteCommandDefSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type RteEventos = { 'iswc-blur': undefined; 'iswc-source-change': { source: boolean }; 'iswc-input': undefined; 'iswc-change': { value: string; text: string } };
