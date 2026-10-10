/**
 * diagram-vocab.ts — Zod schemas del vocabulario común de diagramas.
 *
 * Todo lo que un diagrama puede dibujar se nombra aquí: estructuras de nodo,
 * tipos de arista, familias, estilos de trazo y la política con la que un
 * diagrama restringe qué acepta. Los motores consumen estos tipos; el JSON
 * del consumidor se valida contra ellos.
 */
import { z } from "zod";

/** Diagramas del kit que participan del vocabulario. */
export const DiagramKindIdSchema = z.enum([
  'component', 'er', 'class', 'sequence', 'flowchart', 'state', 'block',
  'swimlane', 'usecase', 'mindmap', 'org-chart', 'timeline', 'gantt',
  'sankey', 'quadrant', 'venn', 'journey',
]);
export type DiagramKindId = z.infer<typeof DiagramKindIdSchema>;

/** Familias de arista: cada una tiene semántica y remates propios. */
export const EdgeFamilySchema = z.enum(['connector', 'relational', 'signal', 'flow', 'structural']);
export type EdgeFamily = z.infer<typeof EdgeFamilySchema>;

/** Glifo en un extremo de arista. */
export const EndGlyphSchema = z.enum([
  'none', 'arrow', 'open-arrow', 'triangle', 'diamond', 'filled-diamond',
  'ball', 'socket', 'crow-one', 'crow-many', 'crow-zero-one', 'crow-zero-many', 'dot',
]);
export type EndGlyph = z.infer<typeof EndGlyphSchema>;

/** Trazo de la línea. */
export const LineDashSchema = z.enum(['solid', 'dashed', 'dotted']);
export type LineDash = z.infer<typeof LineDashSchema>;

/**
 * Estilo geométrico de las aristas. `orthogonal` es el router de siempre;
 * `curved` conserva ese recorrido y redondea cada giro con Bézier (capa de
 * diseño encima, no otro algoritmo); `straight` une extremos en recta.
 */
export const EdgeStyleSchema = z.enum(['orthogonal', 'curved', 'bezier', 'straight']);
export type EdgeStyle = z.infer<typeof EdgeStyleSchema>;

/** Cardinalidad relacional (familia `relational`). */
export const CardinalitySchema = z.enum(['one', 'many', 'zero-one', 'zero-many', 'one-many']);
export type Cardinality = z.infer<typeof CardinalitySchema>;

/** Definición de un tipo de arista en el vocabulario. */
export const EdgeKindDefSchema = z.object({
  id: z.string().min(1),
  family: EdgeFamilySchema,
  label: z.string(),
  /** Para qué sirve y dónde conviene (recomendación, nunca imposición). */
  usage: z.string(),
  recommendedFor: z.array(DiagramKindIdSchema),
  start: EndGlyphSchema.default('none'),
  end: EndGlyphSchema.default('none'),
  dash: LineDashSchema.default('solid'),
  /** Semántica de dirección: `expose`/`consume` (conectores), `query`/`deliver` (relacionales)… */
  direction: z.enum(['none', 'forward', 'both', 'expose', 'consume', 'query', 'deliver']).default('forward'),
  /** Acepta cardinalidades en los extremos. */
  cardinal: z.boolean().default(false),
});
export type EdgeKindDef = z.infer<typeof EdgeKindDefSchema>;
/** Entrada del registro (los campos con default son opcionales). */
export type EdgeKindDefInput = z.input<typeof EdgeKindDefSchema>;

/** Definición de una estructura de nodo en el vocabulario. */
export const NodeStructureDefSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  usage: z.string(),
  recommendedFor: z.array(DiagramKindIdSchema),
  /** Campos que la estructura sabe pintar (documentación viva para editores). */
  fields: z.array(z.string()).default([]),
  /** Puede contener otros nodos (paquete, franja, región). */
  container: z.boolean().default(false),
  /** Soporta icono Iconify (`icon: "mdi:server"`). */
  icon: z.boolean().default(true),
});
export type NodeStructureDef = z.infer<typeof NodeStructureDefSchema>;
export type NodeStructureDefInput = z.input<typeof NodeStructureDefSchema>;

/** Almacén compartido en `globalThis` (un registro por página). */
export const VocabStoreSchema = z.object({
  edges: z.custom<Map<string, EdgeKindDef>>((v) => v instanceof Map),
  nodes: z.custom<Map<string, NodeStructureDef>>((v) => v instanceof Map),
});
export type VocabStore = z.infer<typeof VocabStoreSchema>;

/**
 * Política de un diagrama: qué estructuras y aristas acepta. Sin política
 * todo es compatible (dibujo libre). `allow*` cierra la lista; `deny*`
 * recorta. Lo rechazado no se pinta y se reporta.
 */
export const DiagramPolicySchema = z.object({
  allowNodes: z.array(z.string()).optional(),
  denyNodes: z.array(z.string()).optional(),
  allowEdges: z.array(z.string()).optional(),
  denyEdges: z.array(z.string()).optional(),
  /** Familias enteras (p. ej. solo `signal` en un diagrama de señalamiento). */
  allowFamilies: z.array(EdgeFamilySchema).optional(),
  denyFamilies: z.array(EdgeFamilySchema).optional(),
  /** Estilo de arista por defecto del diagrama. */
  edgeStyle: EdgeStyleSchema.optional(),
});
export type DiagramPolicy = z.infer<typeof DiagramPolicySchema>;

/** Resultado de aplicar una política a una lista de ítems. */
export const PolicyReportSchema = z.object({
  acceptedIds: z.array(z.string()),
  rejected: z.array(z.object({ id: z.string(), kind: z.string(), reason: z.string() })),
});
export type PolicyReport = z.infer<typeof PolicyReportSchema>;
