// @contexto INDICE.md · src/core/README.md
/**
 * attrs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const StyleAttrDefSchema = z.union([z.string(), z.object({
  prop: z.string(),
  onlyColorValues: z.boolean().optional(),
})]);
export type StyleAttrDef = z.infer<typeof StyleAttrDefSchema>;

const StyleAttrMapSchema = z.record(z.string(), StyleAttrDefSchema);
export type StyleAttrMap = z.infer<typeof StyleAttrMapSchema>;

/** Base que `withStyleAttrs` acepta: el molde `IswcElement` o cualquier constructor de `HTMLElement` (patrón mixin de TS: `any[]`). */
// deno-lint-ignore no-explicit-any
export type Constructor = new (...args: any[]) => HTMLElement;


// ── intent.schemas ──
/**
 * intent.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const IntentSchema = z.unknown() /* TODO: cannot convert */;
export type Intent = z.infer<typeof IntentSchema>;

// ── tone.schemas ──
/**
 * tone.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const ToneSchema = z.unknown() /* TODO: cannot convert */;
export type Tone = z.infer<typeof ToneSchema>;

// ── button-shape.schemas ──
/**
 * button-shape.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const ButtonShapeSchema = z.unknown() /* TODO: cannot convert */;
export type ButtonShape = z.infer<typeof ButtonShapeSchema>;

// ── media-shape.schemas ──
/**
 * media-shape.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const MediaShapeSchema = z.unknown() /* TODO: cannot convert */;
export type MediaShape = z.infer<typeof MediaShapeSchema>;
