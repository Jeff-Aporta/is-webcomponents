/**
 * parallax-collage.schemas.ts — capas de `<iswc-parallax-collage>`.
 *
 * Coordenadas: centro de la capa en % del lienzo; `ancho` en % de su ancho.
 */
import { z } from "zod";

const ZAnimacionCapa = z.enum(["flotar", "mecer", "girar", "latir", "ninguna"]);
const ZFormaCapa = z.enum(["circulo", "anillo", "triangulo", "zigzag", "puntos"]);
const ZColorCapa = z.enum(["acento", "contraste", "marca", "suave"]);

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

const ZCapaImagen = ZCapaBase.extend({ tipo: z.literal("imagen"), src: z.string().min(1) }).strict();
const ZCapaForma = ZCapaBase.extend({ tipo: z.literal("forma"), forma: ZFormaCapa, color: ZColorCapa.optional() }).strict();
const ZCapa = z.discriminatedUnion("tipo", [ZCapaImagen, ZCapaForma]);
export const ZCapas = z.array(ZCapa);

export type Capa = z.infer<typeof ZCapa>;
