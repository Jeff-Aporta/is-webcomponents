/**
 * figure.schemas.ts — tipos de `<iswc-figure>`.
 */
import { z } from "zod";

/** Marco visual de la figura: `framed` (borde, fondo, hover) o `plain`. */
export const FigureVariantSchema = z.enum(["framed", "plain"]);
export type FigureVariant = z.infer<typeof FigureVariantSchema>;

/** Ajuste de la imagen dentro de su caja. */
export const FigureFitSchema = z.enum(["contain", "cover"]);
export type FigureFit = z.infer<typeof FigureFitSchema>;

/** Detalle del evento cancelable `iswc-figure-open`. */
export const FigureOpenDetailSchema = z.object({ href: z.string() });
export type FigureOpenDetail = z.infer<typeof FigureOpenDetailSchema>;
