/**
 * component-router.ts — Zod schemas para los tipos del router ortogonal.
 *
 * Los tipos viven aquí y no en el módulo (regla W54): el router, el
 * diagrama de componentes, el de clases y el DER los comparten.
 */
import { z } from "zod";
import { CajaSchema, LadoSchema, PuntoSchema } from "../_shared/diagram-tipos.schemas.js";

const SetDeTextoSchema = z.custom<ReadonlySet<string>>((v) => v instanceof Set);

export const RouterBoxSchema = CajaSchema.extend({
  id: z.string(),
});
export type RouterBox = z.infer<typeof RouterBoxSchema>;

export const RouterPackageSchema = RouterBoxSchema.extend({
  prohibido: z.boolean().optional(),
});
export type RouterPackage = z.infer<typeof RouterPackageSchema>;

export const RouterWorldSchema = z.object({
  /** Entidades (cajas). Nunca se dibuja encima. */
  components: z.array(RouterBoxSchema),
  /** Agrupadores: costo por anidación y por cercanía al borde; muro si prohibido. */
  packages: z.array(RouterPackageSchema),
  /** Títulos de agrupador (ya inflados). Muro. */
  titles: z.array(CajaSchema),
  /** Hitbox de cada conector -(O- (glifo + aire). Muro salvo para su propia llegada. */
  rings: z.array(RouterBoxSchema),
});
export type RouterWorld = z.infer<typeof RouterWorldSchema>;

export const RouterEdgeSchema = z.object({
  id: z.string(),
  /** Punto en la cara del origen y cara por la que sale. */
  from: PuntoSchema,
  fromSide: LadoSchema,
  /** Punto de llegada (dorso de la C acoplada al O) y cara del O. */
  to: PuntoSchema,
  toSide: LadoSchema,
  fromBox: RouterBoxSchema,
  toBox: RouterBoxSchema,
  /** Hitbox del conector destino (la punta B queda fuera de él). */
  toRing: RouterBoxSchema.optional(),
  /** Agrupadores que contienen al origen: un prohibido aquí no es muro. */
  fromPkgs: SetDeTextoSchema,
  /** Agrupadores que contienen al destino: solo el stub final puede rozarlos. */
  toPkgs: SetDeTextoSchema,
  /**
   * Destino = conector -(O-: se llega por cualquiera de sus 3 lados libres.
   * Sin él (p.ej. DER), la llegada es perpendicular a la cara `toSide`.
   */
  toConnector: z.boolean().optional(),
  /**
   * Remate `->` compartible. Aristas con la misma clave (mismo destino y
   * mismo remate) pueden terminar en la punta de otra: es un INCENTIVO, no
   * una restricción. Cerca de los rieles de la misma clave el paso es más
   * barato (radio de 3 celdas, más cerca = más ahorro) y cualquier nodo de
   * esos rieles es una meta alternativa; si llegar ahí cuesta más que el
   * puerto propio (mucho giro o rodeo), la arista hace su propia `->`.
   * Sin clave (p. ej. `-(O-`) la conexión es única.
   */
  shareKey: z.string().optional(),
});
export type RouterEdge = z.infer<typeof RouterEdgeSchema>;

export const RouterOptsSchema = z.object({
  step: z.number().optional(),
  /** Distancia mínima arista↔entidad / conector / prohibido. */
  clearance: z.number().optional(),
  /** Separación deseada entre rieles paralelos. */
  lanePitch: z.number().optional(),
  laneNearFactor: z.number().optional(),
  pkgBorderClearance: z.number().optional(),
  pkgBorderNearFactor: z.number().optional(),
  pkgCrossFactor: z.number().optional(),
  turnPenalty: z.number().optional(),
  iterations: z.number().optional(),
  /** Largo mínimo del tramo recto en cada extremo (marcas de cardinalidad). */
  stub: z.number().optional(),
  /** Radio (px) del incentivo alrededor de cada punta `->` de la misma clave. Default 150. */
  shareRadius: z.number().optional(),
  /** Radio (px) del brillo de desincentivo que emite cada entidad más allá de su hitbox. Default 2·clearance. */
  entityGlow: z.number().optional(),
});
export type RouterOpts = z.infer<typeof RouterOptsSchema>;

export const RouteResultSchema = z.object({
  paths: z.array(z.union([z.array(PuntoSchema), z.null()])),
  /** Por arista: reglas duras violadas (vacío = legal). */
  violations: z.array(z.array(z.string())),
  /**
   * Tramos (px) de riel con otro riel ajeno paralelo a < lanePitch fuera
   * del embudo final. > 0 = corredor sin ancho suficiente → re-empacar.
   */
  crowding: z.number(),
  /**
   * Por arista: índice de la arista cuya punta `->` comparte (la raíz de la
   * cadena), o null si llega con su propia punta.
   */
  joinedTo: z.array(z.union([z.number(), z.null()])),
});
export type RouteResult = z.infer<typeof RouteResultSchema>;

export const PortLinkSchema = z.object({
  from: z.string(),
  to: z.string(),
  /** Cara fija opcional (autor). */
  fromSide: LadoSchema.optional(),
  toSide: LadoSchema.optional(),
});
export type PortLink = z.infer<typeof PortLinkSchema>;

export const PortPlanSchema = z.object({
  fromSide: LadoSchema,
  toSide: LadoSchema,
  from: PuntoSchema,
  to: PuntoSchema,
});
export type PortPlan = z.infer<typeof PortPlanSchema>;
