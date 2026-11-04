/**
 * attrs.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const StyleAttrDefSchema = z.union([z.string(), z.object({
  prop: z.string(),
  onlyColorValues: z.boolean().optional(),
})]);
export type StyleAttrDef = z.infer<typeof StyleAttrDefSchema>;


export const StyleAttrMapSchema = z.record(z.string(), StyleAttrDefSchema);
export type StyleAttrMap = z.infer<typeof StyleAttrMapSchema>;


/** Base que `withStyleAttrs` acepta: el molde `IswcElement` o cualquier constructor de `HTMLElement` (patrón mixin de TS: `any[]`). */
// deno-lint-ignore no-explicit-any
export type Constructor = new (...args: any[]) => HTMLElement;


export const CtxSchema = z.unknown() /* TODO: ref ClassAccessorDecoratorContext<...> */;
export type Ctx = z.infer<typeof CtxSchema>;

