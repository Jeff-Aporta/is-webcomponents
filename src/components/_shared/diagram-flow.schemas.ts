/**
 * diagram-flow.schemas.ts — tipos de la animación de flujo de los rieles (ver diagram-flow.ts).
 */
import { z } from "zod";

export const ZOpcionesFlujo = z.object({
  /** El riel es punteado (anima su patrón) o continuo (lleva la línea de puntos encima). */
  punteado: z.boolean(),
  /** De la punta al origen (p. ej. herencia en clases). */
  reverse: z.boolean().optional(),
  /** Color y ancho del riel (para la línea de puntos). */
  color: z.string().optional(),
  ancho: z.number().optional(),
  /** Patrón del riel punteado si no es el estándar (`stroke-dasharray` del path). */
  dasharray: z.string().optional(),
});
export type TOpcionesFlujo = z.infer<typeof ZOpcionesFlujo>;
