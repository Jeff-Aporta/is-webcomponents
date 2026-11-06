/**
 * 00-as-row.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const BridgeCallStatSchema = z.object({
  count: z.number(),
  since: z.number(),
  loggedAt: z.number().optional(),
  cutAt: z.number().optional(),
});
export type BridgeCallStat = z.infer<typeof BridgeCallStatSchema>;

const AdapterConfigSchema = z.object({
  floatCard: z.unknown() /* TODO: ref FloatCardConfig */.optional(),
  /* TODO: parse fail [key: string]: unknown */
});
export type AdapterConfig = z.infer<typeof AdapterConfigSchema>;

const HotkeyClickHandlerSchema = z.union([z.function({ input: [], output: z.void() }), z.null()]);
export type HotkeyClickHandler = z.infer<typeof HotkeyClickHandlerSchema>;

const HotkeyListSchema = z.array(z.union([z.unknown() /* TODO: ref TreeActionEntry */, z.undefined(), z.null(), z.literal(false)]));
export type HotkeyList = z.infer<typeof HotkeyListSchema>;
