/**
 * toons.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const ToonTextoSchema = z.object({
  texto: z.string(),
  variantes: z.array(z.string()).optional(),
});

const ToonControlSchema = z.object({
  control: z.string(),
  prop: z.string(),
  label: z.string(),
});

const ToonDocSchema = z.object({
  /* TODO: member $schema: 'toon/v1' */
  tag: z.string(),
  textos: z.record(z.string(), ToonTextoSchema).optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  controles: z.array(ToonControlSchema).optional(),
});
export type ToonDoc = z.infer<typeof ToonDocSchema>;

