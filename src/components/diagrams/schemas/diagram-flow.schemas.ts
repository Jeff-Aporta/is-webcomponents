/**
 * diagram-flow.schemas.ts — tipos de la animación de flujo de los rieles (ver diagram-flow.ts).
 */
import { z } from "zod";

/**
 * Puntos de un riel continuo personalizados (`dots` de la arista). Por defecto: el color de la arista
 * y un diámetro de su ancho + `FLUJO.puntos.grosorExtra`.
 */
export const ZPuntosRiel = z.object({
  color: z.string().optional(),
  size: z.number().positive().optional(),
});
export type TPuntosRiel = z.infer<typeof ZPuntosRiel>;

export const ZOpcionesFlujo = z.object({
  /** El riel es punteado (anima su patrón) o continuo (lleva la línea de puntos encima). */
  punteado: z.boolean(),
  /** De la punta al origen (p. ej. herencia en clases). */
  reverse: z.boolean().optional(),
  /** Color y ancho del riel (si no, los del `path`): los puntos toman ese color por defecto. */
  color: z.string().optional(),
  ancho: z.number().optional(),
  /** Puntos personalizados por el consumidor: color y tamaño (diámetro, px). */
  puntos: ZPuntosRiel.optional(),
  /** Patrón del riel punteado si no es el estándar (`stroke-dasharray` del path). */
  dasharray: z.string().optional(),
});
export type TOpcionesFlujo = z.infer<typeof ZOpcionesFlujo>;
