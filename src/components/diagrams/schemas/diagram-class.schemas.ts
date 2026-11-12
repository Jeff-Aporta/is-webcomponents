// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * diagram-class.schemas.ts — familia de clases: especificación, relación, paquete y disposición.
 *
 * Tipos del diagrama de clases: clases, relaciones, paquetes UML y el layout que los dibuja.
 */
import { z } from 'zod';
import { DiagramGroupSchema } from './diagram-base.schemas.js';

const ClassSpecClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  stereotype: z.string().optional(),
  group: z.string().optional(),
  hue: z.number().optional(),
  /** Paquete (agrupador dibujado) que contiene la clase. */
  package: z.string().optional(),
  /** Color de acento hex (cabecera, borde, aristas que emite). */
  color: z.string().optional(),
  /** Relleno de la caja en estilo `vp` (#hex). */
  fill: z.string().optional(),
  attributes: z.array(z.string()),
  methods: z.array(z.string()),
});
export type ClassSpecClass = z.infer<typeof ClassSpecClassSchema>;

const ClassRelationKindSchema = z.union([z.literal('association'), z.literal('inheritance'), z.literal('composition'), z.literal('aggregation'), z.literal('dependency'), z.literal('realization')]);
export type ClassRelationKind = z.infer<typeof ClassRelationKindSchema>;

const ClassSpecRelationSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: ClassRelationKindSchema,
  label: z.string().optional(),
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  group: z.number().optional(),
});
export type ClassSpecRelation = z.infer<typeof ClassSpecRelationSchema>;

/** Agrupador dibujado de un diagrama de clases (paquete UML). */
const ClassPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  stereotype: z.string().optional(),
  /** Icono Iconify del rótulo (con fondo circular). */
  icon: z.string().optional(),
  parent: z.string().optional(),
  /** Relleno del agrupador (#hex). */
  palette: z.string().optional(),
  /** Acento de las clases que contiene (#hex); si falta, se deriva de `palette`. */
  accent: z.string().optional(),
  /** Clases por fila dentro del paquete, o columnas de su rejilla de subpaquetes. */
  cols: z.number().optional(),
  /** Relleno de las clases que contiene en estilo `vp` (#hex). */
  classFill: z.string().optional(),
});
export type ClassPackage = z.infer<typeof ClassPackageSchema>;

/** Opciones de empaque cuando hay paquetes (modo capas, como componentes). */
const ClassLayoutOptsSchema = z.object({
  /** Máximo de miembros por sección; los demás se resumen en un renglón «N más». 5 por defecto; `0` sin tope. */
  maxMembers: z.number().optional(),
  layerCols: z.number().optional(),
  nestedCols: z.number().optional(),
  colGutter: z.number().optional(),
  nestedRowGap: z.number().optional(),
  nestedPkgGap: z.number().optional(),
  pkgRowGap: z.number().optional(),
  lanePitch: z.number().optional(),
  /** Mismas perillas de rieles que el diagrama de componentes (`resolvePackingGaps`). */
  laneNearFactor: z.number().optional(),
  pkgBorderClearance: z.number().optional(),
  pkgBorderNearFactor: z.number().optional(),
  pkgCrossFactor: z.number().optional(),
  /**
   * `uml` (default), `card` (cabecera con acento, cuerpo blanco y sombra) o
   * `vp` (Visual Paradigm / iswc: cajas rectas pastel, borde negro,
   * paquetes con pestaña y título centrado).
   */
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
  /** Sobreescritura del campo de costos del router (ver `routing-costs.ts`). */
  routing: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  /**
   * Consolidación de rieles (efecto estándar, encendido por defecto):
   * `ends` — las aristas que llegan al mismo punto (`->` o el O del `-(O-`)
   * convergen en abanico (rieles paralelos pegados, una sola punta);
   * `starts` — las que salen del mismo origen salen juntas. `false` apaga los
   * incentivos de consolidación. Acepta un booleano para ambos.
   */
  consolidate: z.union([z.boolean(), z.object({ starts: z.boolean().optional(), ends: z.boolean().optional() })]).optional(),

  /**
   * Conjunto de generalización explícito (barra + tronco) para padres con
   * 3+ hijos en otra franja. Apagado por defecto: la barra es un riel
   * compartido; sin ella los hijos convergen por el incentivo del router.
   */
  inheritanceBus: z.boolean().optional(),
});
export type ClassLayoutOpts = z.infer<typeof ClassLayoutOptsSchema>;

const ClassSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]),
  classes: z.array(ClassSpecClassSchema),
  relations: z.array(ClassSpecRelationSchema),
  groups: z.array(DiagramGroupSchema).optional(),
  packages: z.array(ClassPackageSchema).optional(),
  layout: ClassLayoutOptsSchema.optional(),
});
export type ClassSpec = z.infer<typeof ClassSpecSchema>;

/**
 * Un miembro de clase como ítem de lista: la visibilidad es la viñeta (`+ - # ~`, sin texto debajo:
 * sangría colgante), la firma va en su(s) renglón(es) y el tipo en renglón(es) aparte como texto
 * secundario. `y` es el desplazamiento dentro de la sección. Nada se corta: lo largo salta de línea.
 */
const ClassMemberLayoutSchema = z.object({
  vis: z.string(),
  firma: z.array(z.string()),
  tipo: z.array(z.string()),
  y: z.number(),
  /** Renglón resumen: cuántos miembros quedaron sin mostrar (tope `layout.maxMembers`). */
  mas: z.number().optional(),
});

const ClassLayoutSectionSchema = z.object({
  type: z.union([z.literal('header'), z.literal('attributes'), z.literal('methods')]),
  y: z.number(),
  h: z.number(),
  rows: z.array(z.string()),
  members: z.array(ClassMemberLayoutSchema).optional(),
});
export type ClassLayoutSection = z.infer<typeof ClassLayoutSectionSchema>;

const ClassLayoutNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  name: z.string(),
  stereotype: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(ClassLayoutSectionSchema),
  dividerYs: z.array(z.number()),
  hue: z.number().optional(),
  group: z.string().optional(),
  package: z.string().optional(),
  /** Acento resuelto (#hex): clase > paquete > hue. */
  color: z.string().optional(),
  /** Relleno resuelto en estilo `vp`: clase > paquete (`classFill`). */
  fill: z.string().optional(),
  overflow: z.union([z.literal('grow'), z.literal('shrink')]).optional(),
});
export type ClassLayoutNode = z.infer<typeof ClassLayoutNodeSchema>;

const ClassLayoutEdgeSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: ClassRelationKindSchema,
  /** Color hex del emisor (modo paquetes). */
  color: z.string().optional(),
  /** Tramo de un bus de herencia: sin decoración propia (el triángulo va en el tronco). */
  noTip: z.boolean().optional(),
  label: z.string().optional(),
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  path: z.string(),
  targetTipX: z.number(),
  targetTipY: z.number(),
  targetAngle: z.number(),
  sourceTipX: z.number(),
  sourceTipY: z.number(),
  sourceAngle: z.number(),
  labelX: z.number(),
  labelY: z.number(),
  labelW: z.number().optional(),
  hue: z.number().optional(),
});
export type ClassLayoutEdge = z.infer<typeof ClassLayoutEdgeSchema>;

const ClassLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  nodes: z.array(ClassLayoutNodeSchema),
  edges: z.array(ClassLayoutEdgeSchema),
  groups: z.array(DiagramGroupSchema).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  legendX: z.number(),
  /** Agrupadores empacados (modo paquetes), en orden de pintura (padres antes). */
  packages: z.array(ClassPackageSchema.extend({
    x: z.number(), y: z.number(), w: z.number(), h: z.number(), depth: z.number(),
    /** Estilo `vp`: rótulo centrado salvo que tape la vertical de una clase directa. */
    titleAlign: z.union([z.literal('center'), z.literal('left')]).optional(),
  })).optional(),
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
});
export type ClassLayout = z.infer<typeof ClassLayoutSchema>;
