/**
 * pager.schemas.ts — tipos de `<iswc-pager>`.
 */
import { z } from "zod";

/** Lado del paginador. */
export const PagerDirectionSchema = z.enum(["prev", "next"]);
export type PagerDirection = z.infer<typeof PagerDirectionSchema>;

/** Detalle del evento cancelable `iswc-pager-navigate` (`href` vacío si el lado es un botón). */
export const PagerNavigateDetailSchema = z.object({ direction: PagerDirectionSchema, href: z.string() });
export type PagerNavigateDetail = z.infer<typeof PagerNavigateDetailSchema>;
