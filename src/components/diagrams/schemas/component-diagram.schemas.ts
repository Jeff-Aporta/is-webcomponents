/**
 * component-diagram.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const InterfaceStemPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type InterfaceStemPoint = z.infer<typeof InterfaceStemPointSchema>;


export const LayoutPackageSchema = z.intersection(z.unknown() /* TODO: ref Paquete */, z.object({
  titleBox: z.unknown() /* TODO: ref Caja */.optional(),
}));
export type LayoutPackage = z.infer<typeof LayoutPackageSchema>;


export const AnchorPointSchema = z.unknown() /* TODO: ref Punto */;
export type AnchorPoint = z.infer<typeof AnchorPointSchema>;

