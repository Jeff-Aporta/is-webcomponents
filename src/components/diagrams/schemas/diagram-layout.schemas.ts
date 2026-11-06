/**
 * diagram-graph.schemas.ts — tipos del grafo dirigido común de los diagramas (ver diagram-graph.ts).
 */
import { z } from 'zod';

/** Arista dirigida mínima: basta con `from` y `to` (cualquier arista de cualquier diagrama la cumple). */
const AristaDirigidaSchema = z.object({ from: z.string(), to: z.string() });
export type AristaDirigida = z.infer<typeof AristaDirigidaSchema>;

/** Grafo listo para recorrer (lo devuelve `grafoDirigido`). */
export type GrafoDirigido = {
  /** Aristas de retorno (claves `from>to`). */
  atras: Set<string>;
  /** Nodos con alguna salida y ninguna entrada (en el orden dado). */
  fuentes: string[];
  /** ¿Tiene alguna entrada (contando retornos)? */
  conEntrada: (id: string) => boolean;
  /** ¿Tiene alguna salida (contando retornos)? */
  conSalida: (id: string) => boolean;
  /** Hijos hacia adelante (sin retornos ni repetidos), en el orden de lectura del llamador. */
  siguientes: (id: string) => string[];
  /** Todo lo alcanzable desde `id` hacia adelante (sin `id`), memorizado. */
  alcanzables: (id: string) => Set<string>;
  /** Donde se reúnen varias ramas: el primer nodo (por cercanía a la primera) alcanzable desde todas. */
  reunion: (ramas: readonly string[]) => string | null;
};

/** Opciones de `grafoDirigido`: orden de los hijos y nodos que no se atraviesan. */
export type OpcionesGrafo = { orden?: (a: string, b: string) => number; termina?: (id: string) => boolean };

// ── diagram-flow.schemas ──
/**
 * diagram-flow.schemas.ts — tipos de la animación de flujo de los rieles (ver diagram-flow.ts).
 */
/**
 * Puntos de un riel continuo personalizados (`dots` de la arista). Por defecto: el color de la arista
 * y un diámetro de su ancho + `FLUJO.puntos.grosorExtra`.
 */
export const ZPuntosRiel = z.object({
  color: z.string().optional(),
  size: z.number().positive().optional(),
});
export type TPuntosRiel = z.infer<typeof ZPuntosRiel>;

const ZOpcionesFlujo = z.object({
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

// ── node-link-layout.schemas ──
/**
 * node-link-layout.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const GraphNodeSchema = z.object({
  id: z.string(),
  w: z.number().optional(),
  h: z.number().optional(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

const NodeRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type NodeRect = z.infer<typeof NodeRectSchema>;

const EdgeAnchorXYSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type EdgeAnchorXY = z.infer<typeof EdgeAnchorXYSchema>;

const PositionedNodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  layer: z.number(),
  order: z.number(),
});

const LayoutOptsSchema = z.object({
  direction: z.union([z.literal('TB'), z.literal('BT'), z.literal('LR'), z.literal('RL')]).optional(),
  layerGap: z.number().optional(),
  nodeGap: z.number().optional(),
  align: z.union([z.literal('center'), z.literal('start')]).optional(),
});
export type LayoutOpts = z.infer<typeof LayoutOptsSchema>;

const LayoutResultSchema = z.object({
  nodes: z.array(PositionedNodeSchema),
  width: z.number(),
  height: z.number(),
  layers: z.map(z.string(), z.number()),
});
export type LayoutResult = z.infer<typeof LayoutResultSchema>;
