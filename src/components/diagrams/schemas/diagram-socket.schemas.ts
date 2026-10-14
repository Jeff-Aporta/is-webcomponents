/**
 * diagram-socket.schemas.ts — tipos del pintor del conector `-(O-` / `-(O=` (ver diagram-socket.ts).
 */
import { z } from 'zod';

/** Medidas del conector: largo del palo, radio del socket `(` y radio de la bola O (px). */
export const MedidasSocketSchema = z.object({ palo: z.number(), socket: z.number(), bola: z.number() });
export type MedidasSocket = z.infer<typeof MedidasSocketSchema>;

const PuntoSchema = z.object({ x: z.number(), y: z.number() });

/** Opciones de `pintarSocket`. */
export const OpcionesSocketSchema = z.object({
  /** Borde del expositor donde nace el palo. */
  tip: PuntoSchema,
  /** Unitario de la bola hacia el expositor. */
  dir: PuntoSchema,
  medidas: MedidasSocketSchema,
  /** Color del trazo y ancho de línea. */
  color: z.string(),
  ancho: z.number(),
  /** Relleno de la bola (por defecto `SOCKET_FILL`). */
  relleno: z.string().optional(),
  /** Pulso de radar en la O (si la animación está activa). */
  pulso: z.boolean(),
  /** Prefijo de clases CSS (`flow-edge` → `flow-edge__lollipop`, `flow-edge__socket`). */
  clase: z.string(),
});
export type OpcionesSocket = z.infer<typeof OpcionesSocketSchema>;
