/**
 * parallax-collage.schemas.ts — capas de `<iswc-parallax-collage>`.
 *
 * Coordenadas: centro de la capa en % del lienzo; `ancho` en % de su ancho.
 */
import { z } from "zod";

export const ZAnimacionCapa = z.enum(["flotar", "mecer", "girar", "latir", "ninguna"]);
export const ZFormaCapa = z.enum(["circulo", "anillo", "triangulo", "zigzag", "puntos"]);
export const ZColorCapa = z.enum(["acento", "contraste", "marca", "suave"]);

const ZCapaBase = z.object({
  x: z.number(),
  y: z.number(),
  ancho: z.number().positive(),
  /** Orden de apilado. */
  z: z.number().int().optional(),
  /** Profundidad del parallax: 0 = quieta; sin valor, sale de `z`. */
  prof: z.number().min(0).optional(),
  anim: ZAnimacionCapa.optional(),
  /** Desfase de `anim`, en segundos. */
  retraso: z.number().optional(),
  /** Giro de reposo, en grados. */
  giro: z.number().optional(),
});

export const ZCapaImagen = ZCapaBase.extend({ tipo: z.literal("imagen"), src: z.string().min(1) }).strict();
export const ZCapaForma = ZCapaBase.extend({ tipo: z.literal("forma"), forma: ZFormaCapa, color: ZColorCapa.optional() }).strict();
export const ZCapa = z.discriminatedUnion("tipo", [ZCapaImagen, ZCapaForma]);
export const ZCapas = z.array(ZCapa);

export const ZEfectoCollage = z.enum(["ninguno", "desplazar", "rotar", "capas"]);
export const ZDireccionCollage = z.enum(["corriente", "pegajoso"]);

export type Capa = z.infer<typeof ZCapa>;
export type EfectoCollage = z.infer<typeof ZEfectoCollage>;
export type DireccionCollage = z.infer<typeof ZDireccionCollage>;
