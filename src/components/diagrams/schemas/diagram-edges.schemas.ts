/**
 * diagram-arrow.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const ArrowPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type ArrowPoint = z.infer<typeof ArrowPointSchema>;

const SvgArrowHeadOptsSchema = z.object({
  d: z.string(),
  tip: ArrowPointSchema,
  color: z.string(),
  len: z.number().optional(),
  halfWidth: z.number().optional(),
  className: z.union([z.string(), z.null()]).optional(),
  fallbackDir: ArrowPointSchema.optional(),
});
export type SvgArrowHeadOpts = z.infer<typeof SvgArrowHeadOptsSchema>;

// ── diagram-edge-spread.schemas ──
/**
 * diagram-edge-spread.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const SpreadPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type SpreadPoint = z.infer<typeof SpreadPointSchema>;

const SpreadItemSchema = z.object({
  e: z.object({
  path: z.string(),
}),
  pts: z.array(SpreadPointSchema),
});
export type SpreadItem = z.infer<typeof SpreadItemSchema>;

// ── diagram-edge-style.schemas ──
/**
 * diagram-edge-style.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const EdgeWithHueSchema = z.object({
  hue: z.number().optional(),
  /* TODO: member [key: string]: unknown */
});
export type EdgeWithHue = z.infer<typeof EdgeWithHueSchema>;

/** Caja con color propio (emisor / receptor de la paleta W60). */
const ColoredSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
});
export type Colored = z.infer<typeof ColoredSchema>;

/** Arista con color propio. */
const EdgedSchema = z.object({
  from: z.string(),
  to: z.string(),
  color: z.string().optional(),
});
export type Edged = z.infer<typeof EdgedSchema>;
