// @contexto INDICE.md · src/components/isp/README.md
/**
 * float-card.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

/** `<iswc-float-card>` del preview. */
const FloatCardLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  open: z.boolean(),
  locked: z.boolean().optional(),
  _fcOff: z.function({ input: [], output: z.void() }).optional(),
}));
export type FloatCardLike = z.infer<typeof FloatCardLikeSchema>;

/** `<iswc-flex-options>` del preview. */
const FlexOptionsLikeSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  actions: z.array(z.unknown()),
}));
export type FlexOptionsLike = z.infer<typeof FlexOptionsLikeSchema>;

