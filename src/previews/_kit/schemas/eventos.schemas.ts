/**
 * eventos.schemas.ts — eventos del componente en el estándar `iswc-preview/v1` (HOW-6).
 */
import { z } from "zod";

/** Un evento: nombre, tipo de `detail` (texto del `.schemas.ts`) y si se puede vetar; lo escribe `scripts/sondas/eventos.ts`. */
export const ZEvento = z.object({ name: z.string().min(1), detail: z.string(), cancelable: z.boolean() }).strict();
