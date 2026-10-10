/**
 * diagram-embed.schemas.ts — contrato de los NODOS ESPECIALES reutilizables
 * entre diagramas (`kind` de nodo).
 *
 *   { "kind": "nested",   "diagram": { "tag": "iswc-sequence-diagram", "payload": {…} } }
 *   { "kind": "nested",   "src": "diagramas/conversacion-turno.json" }
 *   { "kind": "tableder", "table": { "name": "patyia_conversaciones", "attributes": [ … ] } }
 *   { "kind": "component","component": { "name": "PatyIA API", "stereotype": "Azure", "items": [ … ] } }
 *   { "kind": "class",    "class": { "name": "TConversationTicketController", "attributes": [ … ], "methods": [ … ] } }
 *
 * - `nested`: otro diagrama del kit, dibujado DENTRO del nodo escalado tipo
 *   `object-fit: contain` (máximo `maxW` × `maxH`, por defecto 200 px por lado).
 * - `tableder`: una tabla del DER (`iswc-er-diagram`), a tamaño natural.
 * - `component`: una caja del diagrama de componentes
 *   (`iswc-component-diagram`), a tamaño natural.
 * - `class`: una clase del diagrama de clases (`iswc-class-diagram`), a
 *   tamaño natural (controladores, POJOs…).
 *
 * Los tres se pintan reutilizando el web component dueño de la forma: el
 * diagrama se monta fuera de pantalla, su SVG se copia (vectorial, con ids
 * prefijados) dentro del nodo y el export estático lo conserva.
 */
import { z } from "zod";

/** Clase de nodo especial. Ausente = nodo normal del diagrama. */
export const DiagramNodeKindSchema = z.union([z.literal('nested'), z.literal('tableder'), z.literal('component'), z.literal('class')]);
export type DiagramNodeKind = z.infer<typeof DiagramNodeKindSchema>;

/** Diagrama referenciado: mismo formato que el editable del ISS (tag/script/attrs/payload). */
export const EmbeddedDiagramSchema = z.object({
  /** Web component que lo pinta (`iswc-flowchart`, `iswc-sequence-diagram`, …). */
  tag: z.string().regex(/^iswc-[a-z0-9-]+$/),
  payload: z.unknown(),
  /** Bundle relativo a la raíz del CDN (`diagrams/sequence-diagram.min.js`); por defecto se deduce del tag. */
  script: z.string().optional(),
  /** Atributos del host; `diagram-style` se hereda del diagrama padre si falta. */
  attrs: z.record(z.string(), z.string()).optional(),
});
export type EmbeddedDiagram = z.infer<typeof EmbeddedDiagramSchema>;

/** Archivo editable apuntado por `src`: el formato del ISS, o un payload suelto. */
export const EmbeddedDiagramFileSchema = z.object({
  tag: z.string().regex(/^iswc-[a-z0-9-]+$/).optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
  payload: z.unknown().optional(),
}).passthrough();
export type EmbeddedDiagramFile = z.infer<typeof EmbeddedDiagramFileSchema>;

/** Campos de un nodo especial, tal como llegan en el JSON del nodo. */
export const NodeEmbedSpecSchema = z.object({
  kind: DiagramNodeKindSchema,
  /** `nested`: diagrama inline (también sirve de respaldo si `src` no carga). */
  diagram: EmbeddedDiagramSchema.optional(),
  /** `nested`: ruta a un JSON editable (relativa al documento). Gana sobre `diagram`. */
  src: z.string().optional(),
  /** Fondo del recuadro (`nested`). Estilo insoft: blanco por defecto. */
  bg: z.string().optional(),
  /** Tamaño máximo del diagrama anidado dentro del recuadro (contain). */
  maxW: z.number().positive().optional(),
  maxH: z.number().positive().optional(),
  /** `tableder`: entidad en el formato de `iswc-er-diagram` (`name`, `attributes`). */
  table: z.record(z.string(), z.unknown()).optional(),
  /** `component`: componente en el formato de `iswc-component-diagram` (`name`, `stereotype`, `items`). */
  component: z.record(z.string(), z.unknown()).optional(),
  /** `class`: clase en el formato de `iswc-class-diagram` (`name`, `stereotype?`, `attributes`, `methods`, `fill?`: token del tema o hex). */
  class: z.record(z.string(), z.unknown()).optional(),
});
export type NodeEmbedSpec = z.infer<typeof NodeEmbedSpecSchema>;

/** Caja en píxeles. */
export const EmbedBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type EmbedBox = z.infer<typeof EmbedBoxSchema>;

/** Tamaño natural de un diagrama capturado (lo que mide su contenido). */
export const EmbedSizeSchema = z.object({
  w: z.number().positive(),
  h: z.number().positive(),
});
export type EmbedSize = z.infer<typeof EmbedSizeSchema>;

/** SVG capturado de un diagrama montado fuera de pantalla. */
export const EmbedCaptureSchema = z.object({
  /** Hijos del `<svg>` capturado, con ids prefijados y estilos acotados. */
  markup: z.string(),
  /** Caja del contenido en coordenadas del svg capturado (viewBox recortado). */
  box: EmbedBoxSchema,
  /** Clase que acota los `<style>` copiados al svg anidado. */
  scope: z.string(),
});
export type EmbedCapture = z.infer<typeof EmbedCaptureSchema>;

/** Host de diagrama del kit (DiagramElementBase): lo mínimo que usa la captura. */
export const DiagramHostLikeSchema = z.custom<HTMLElement & { updateComplete: () => Promise<void> }>(
  (v) => typeof HTMLElement !== 'undefined' && v instanceof HTMLElement && typeof Reflect.get(v, 'updateComplete') === 'function',
);
export type DiagramHostLike = z.infer<typeof DiagramHostLikeSchema>;

/** Opciones de captura. */
export const EmbedCaptureOptsSchema = z.object({
  /** `import.meta.url` del bundle que captura: base para resolver el bundle del tag. */
  moduleUrl: z.string(),
  /** Estilo heredado del diagrama padre (`insoft`), si el anidado no trae el suyo. */
  styleName: z.string().nullable().optional(),
  /** Prefijo único para los ids del svg copiado. */
  idPrefix: z.string(),
});
export type EmbedCaptureOpts = z.infer<typeof EmbedCaptureOptsSchema>;
