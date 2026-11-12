// @contexto INDICE.md · src/components/helpers/README.md
/**
 * ui.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ElChildSchema = z.union([z.custom<Node>(), z.string(), z.null(), z.literal(false), z.literal(true)]);
export type ElChild = z.infer<typeof ElChildSchema>;

const ElAttrsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined(), z.function({ input: [z.custom<Event>()], output: z.void() })]));
export type ElAttrs = z.infer<typeof ElAttrsSchema>;

/**
 * Valor marcado como HTML de confianza dentro de `html` (lo marca `raw()`).
 * La clave es un símbolo único que define `helpers/ui.ts`; aqui solo vive
 * el tipo, para que el modulo de schemas no meta `zod` en el bundle.
 */
export type Crudo = { [key: symbol]: string };

const HandlerEntrySchema = z.object({
  evento: z.string(),
  fn: z.function({ input: [z.custom<Event>()], output: z.void() }),
});
export type HandlerEntry = z.infer<typeof HandlerEntrySchema>;

