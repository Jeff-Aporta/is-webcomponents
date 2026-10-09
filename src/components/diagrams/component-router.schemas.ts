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

/** Puerto candidato: punto sobre una cara y la cara. */
export const RouterPortSchema = z.object({ x: z.number(), y: z.number(), side: LadoSchema });
export type RouterPort = z.infer<typeof RouterPortSchema>;

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
  /**
   * Puertos candidatos de salida / llegada (perímetro de la entidad, ver
   * `perimeterPorts`). Con candidatos, `from`/`to` son solo el fallback: el
   * router prueba todas las parejas y elige la más barata (búsqueda
   * multi-origen y multi-destino), y un puerto ya usado por una arista ajena
   * no se reutiliza.
   */
  fromCandidates: z.array(RouterPortSchema).optional(),
  toCandidates: z.array(RouterPortSchema).optional(),
  /**
   * Clave de SALIDA compartible (p. ej. `origen::arrow`): alrededor del puerto
   * por donde ya salió otra arista de la misma clave el paso se abarata
   * (factor ~0 en el puerto, 1 a `share.radius`) y ese puerto se puede
   * reutilizar. Fuera del radio, correr pegadas vuelve a costar: se separan.
   */
  startKey: z.string().optional(),
});
export type RouterEdge = z.infer<typeof RouterEdgeSchema>;

/**
 * Campo de costos compartido por todos los diagramas. Cada nodo de la grilla
 * parte de 1; brillo > 1 desincentiva, < 1 incentiva; `radius` en px con
 * caída lineal. Ver `routing-costs.ts` (defaults) y `layout.routing` del
 * payload (sobreescritura por diagrama).
 */
export const RoutingCostsSchema = z.object({
  grid: z.object({
    /** Paso de la cuadrícula (1U) y de los puertos del perímetro. */
    step: z.number().positive(),
    /** Aire mínimo arista↔entidad / conector / prohibido. */
    clearance: z.number().min(0),
    /** Separación deseada entre rieles paralelos (radio del brillo de riel vecino). */
    lanePitch: z.number().positive(),
    /** Tramo recto mínimo en cada extremo. */
    stub: z.number().min(0),
    /** Vueltas de negociación. */
    iterations: z.number().int().min(1),
    /** Giro: +B aditivo por cada vértice (px equivalentes); no depende del terreno. */
    turnPenalty: z.number().min(0),
    /** Piso del factor total (nunca gratis; mantiene admisible la heurística). */
    minFactor: z.number().positive().max(1),
  }),
  entity: z.object({
    /** Brillo máximo junto al hitbox de una entidad. */
    glow: z.number().min(0),
    /** Hasta dónde llega ese brillo más allá del hitbox (px). */
    radius: z.number().min(0),
  }),
  connector: z.object({
    /** Brillo máximo junto al hitbox de un conector -(O- ajeno (degradado radial). */
    glow: z.number().min(0),
    /** Radio del brillo medido desde el centro del conector (px). */
    radius: z.number().min(0),
  }),
  package: z.object({
    /** Brillo máximo corriendo paralelo a un borde de agrupador. */
    borderGlow: z.number().min(0),
    /** Radio del brillo de borde (px). */
    borderRadius: z.number().min(0),
    /** Factor por nivel de anidación (dentro de un agrupador ajeno). */
    nestingFactor: z.number().min(1),
    /** +A aditivo cada vez que el riel ENTRA en un agrupador (px equivalentes). */
    enter: z.number().min(0),
    /** +A aditivo cada vez que el riel SALE de un agrupador (px equivalentes). */
    exit: z.number().min(0),
  }),
  rail: z.object({
    /** Riel ajeno encima. */
    overlap: z.number().min(0),
    /** Riel ajeno a < lanePitch (máximo, decrece hasta 1 en el pitch). */
    near: z.number().min(0),
    /** Choque de frente con otra arista. */
    headOn: z.number().min(0),
    /** Cruzar perpendicular un riel ajeno. */
    cross: z.number().min(1),
    /** Riel del mismo conector dentro de su embudo (factor total). */
    sameFunnel: z.number().min(1),
    /** Ir por detrás del origen. */
    retreat: z.number().min(0),
    /** Historial de conflicto por vuelta. */
    history: z.number().min(0),
    /** Embudo del mismo conector, en múltiplos de lanePitch. */
    mergePitches: z.number().min(0),
  }),
  share: z.object({
    /** Radio del incentivo alrededor de una punta `->` de la misma clave (px). */
    radius: z.number().min(0),
    /** Costo por px del tramo ajeno reutilizado al unirse. */
    joinTail: z.number().min(0),
    /** +A aditivo por abrir una punta `->` nueva cuando ya hay una de la misma clave dentro del radio. */
    newTip: z.number().min(0),
  }),
});
export type RoutingCosts = z.infer<typeof RoutingCostsSchema>;
/** Sobreescritura parcial (cualquier sección, cualquier clave). */
export type RoutingCostsInput = { [K in keyof RoutingCosts]?: Partial<RoutingCosts[K]> };

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
  /**
   * Consolidación de rieles (efecto estándar, encendido por defecto):
   * `ends` — las aristas que llegan al mismo punto (`->` o el O del `-(O-`)
   * convergen en abanico (rieles paralelos pegados, una sola punta);
   * `starts` — las que salen del mismo origen salen juntas. `false` apaga los
   * incentivos de consolidación. Acepta un booleano para ambos.
   */
  consolidate: z.union([z.boolean(), z.object({ starts: z.boolean().optional(), ends: z.boolean().optional() })]).optional(),
  /** Sobreescritura del campo de costos (`layout.routing` del payload). Las opciones sueltas ganan. */
  costs: z.custom<RoutingCostsInput>((v) => v == null || typeof v === 'object').optional(),
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
  /** Por arista: costo total del riel (A→B en el campo de factores). Infinity sin ruta. */
  costs: z.array(z.number()),
  /** Por arista: puerto de salida y de llegada elegidos (el de llegada es el de la raíz si se unió). */
  fromPorts: z.array(z.union([RouterPortSchema, z.null()])),
  toPorts: z.array(z.union([RouterPortSchema, z.null()])),
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
