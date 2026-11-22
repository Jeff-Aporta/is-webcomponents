// @contexto INDICE.md · src/core/README.md
/**
 * attrs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 *
 * Los catálogos cerrados (intent / tone / button-shape / media-shape) NO se
 * copian aquí: el schema los deriva de la constante viva del core
 * (`core/attrs.ts`), de modo que el tipo no puede quedarse atrás si el core
 * añade un valor.
 */
import { z } from 'zod';
import { BUTTON_SHAPE, INTENT_VALUES, MEDIA_SHAPE, TONE_VALUES } from '../attrs.js';

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
/**
 * Intenciones semánticas (atributo `color`): el catálogo vivo del core
 * (`INTENT_VALUES`), no una copia.
 */
const IntentSchema = z.enum(INTENT_VALUES);
export type Intent = z.infer<typeof IntentSchema>;

// ── tone.schemas ──
/**
 * tone.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/**
 * Niveles de relleno (atributo `variant`): el catálogo vivo del core
 * (`TONE_VALUES`), no una copia.
 */
const ToneSchema = z.enum(TONE_VALUES);
export type Tone = z.infer<typeof ToneSchema>;

// ── button-shape.schemas ──
/**
 * button-shape.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/**
 * Contornos del botón (atributo `shape`): el catálogo vivo del core
 * (`BUTTON_SHAPE`), no una copia.
 */
const ButtonShapeSchema = z.enum(BUTTON_SHAPE);
export type ButtonShape = z.infer<typeof ButtonShapeSchema>;

// ── media-shape.schemas ──
/**
 * media-shape.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/**
 * Recorte visual de media (atributo `shape`): el catálogo vivo del core
 * (`MEDIA_SHAPE`), no una copia.
 */
const MediaShapeSchema = z.enum(MEDIA_SHAPE);
export type MediaShape = z.infer<typeof MediaShapeSchema>;
