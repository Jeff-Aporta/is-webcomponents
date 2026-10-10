/**
 * sequence-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { EmbedBoxSchema, NodeEmbedSpecSchema } from "../_shared/diagram-embed.schemas.js";

export const SequenceActorSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.union([z.literal('participant'), z.literal('actor')]).optional(),
  icon: z.string().optional(),
  hue: z.number().optional(),
});
export type SequenceActorSpec = z.infer<typeof SequenceActorSpecSchema>;


/**
 * Subproceso que inicia un mensaje al llegar: el MISMO nodo `kind: "nested"`
 * de `diagram-embed.schemas.ts` (src / diagram, maxW / maxH, bg) más un
 * `title` opcional para la franja superior del recuadro.
 */
export const SequenceNestedSpecSchema = NodeEmbedSpecSchema.extend({
  kind: z.literal('nested'),
  title: z.string().optional(),
});
export type SequenceNestedSpec = z.infer<typeof SequenceNestedSpecSchema>;

export const SequenceMessageSpecSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string(),
  log: z.string().optional(),
  description: z.string().optional(),
  group: z.string().optional(),
  kind: z.union([z.literal('self'), z.literal('sync'), z.literal('async'), z.literal('reply'), z.string()]).optional(),
  step: z.number(),
  /** Recuadro con el proceso que este mensaje inicia, junto a la punta de la flecha. */
  nested: SequenceNestedSpecSchema.optional(),
});
export type SequenceMessageSpec = z.infer<typeof SequenceMessageSpecSchema>;


export const SequenceAltSpecSchema = z.object({
  /** Título de la bifurcación en la pestaña (default «alternativas»). */
  name: z.string().optional(),
  branches: z.array(z.object({
  condition: z.string(),
  messages: z.array(SequenceMessageSpecSchema),
})),
});
export type SequenceAltSpec = z.infer<typeof SequenceAltSpecSchema>;


/**
 * Grupo (subproceso): colorea las aristas de sus mensajes. `color` es un
 * nombre de paleta del tema (`auth`, `data`, `llm`…) o un hex; sin `color`
 * manda `hue`.
 */
export const SequenceGroupSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hue: z.number(),
  color: z.string().optional(),
  /** Icono Iconify que acompaña al título del grupo sobre el diagrama. */
  icon: z.string().optional(),
});
export type SequenceGroupSpec = z.infer<typeof SequenceGroupSpecSchema>;

/**
 * Región horizontal (fragmento UML) que agrupa filas de mensajes: `par`
 * (ocurren a la vez), `async` (no bloquea), `loop`, `opt`, `region`. Se
 * declara por ids de mensaje; el layout la acota a esas filas y a las
 * lifelines que participan (o a todas con `span: 'all'`).
 */
export const SequenceFragmentSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['par', 'async', 'loop', 'opt', 'alt', 'region']).default('region'),
  messages: z.array(z.string()).min(1),
  color: z.string().optional(),
  span: z.enum(['actors', 'all']).default('actors'),
  /** Condición para entrar (procesos opcionales): se muestra junto a la pestaña. */
  condition: z.string().optional(),
});
export type SequenceFragmentSpec = z.infer<typeof SequenceFragmentSpecSchema>;

export const SequenceResolvedSpecSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  actors: z.array(SequenceActorSpecSchema),
  groups: z.array(SequenceGroupSpecSchema).optional(),
  fragments: z.array(SequenceFragmentSpecSchema).optional(),
  /**
   * Leyenda aparte (arriba a la derecha). Con estilo cargado el default es
   * `false`: cada grupo anuncia su título e icono sobre la primera arista
   * donde aparece, sin ensanchar ni descentrar el lienzo.
   */
  legend: z.boolean().optional(),
  /** Repite las cabeceras al pie. Sin valor, lo decide el tema (`sequence.footerActors`). */
  footer: z.boolean().optional(),
  messages: z.array(SequenceMessageSpecSchema).optional(),
  preamble: z.array(SequenceMessageSpecSchema).optional(),
  alt: SequenceAltSpecSchema.optional(),
  epilogue: z.array(SequenceMessageSpecSchema).optional(),
});
export type SequenceResolvedSpec = z.infer<typeof SequenceResolvedSpecSchema>;


export const LeadingIconTokenSchema = z.object({
  iconId: z.string(),
  hue: z.number().optional(),
  rest: z.string(),
});
export type LeadingIconToken = z.infer<typeof LeadingIconTokenSchema>;


export const FlatMessageSchema = z.object({
  m: SequenceMessageSpecSchema,
  kind: z.union([z.literal('self'), z.literal('sync'), z.literal('async'), z.literal('reply'), z.string()]),
  fromIdx: z.number(),
  toIdx: z.number(),
  labelW: z.number(),
  branch: z.string().optional(),
  branchFirst: z.boolean().optional(),
  /** Tamaño del recuadro `nested` (marco completo), si el mensaje lo trae. */
  nestedW: z.number().optional(),
  nestedH: z.number().optional(),
});
export type FlatMessage = z.infer<typeof FlatMessageSchema>;


export const SequenceLayoutActorSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  label: z.string(),
  icon: z.string(),
  hue: z.number(),
  kind: z.string(),
});
export type SequenceLayoutActor = z.infer<typeof SequenceLayoutActorSchema>;


export const SequenceLayoutLifelineSchema = z.object({
  id: z.string(),
  x: z.number(),
  y1: z.number(),
  y2: z.number(),
});
export type SequenceLayoutLifeline = z.infer<typeof SequenceLayoutLifelineSchema>;


export const SequenceLayoutMessageSchema = z.object({
  id: z.string(),
  step: z.number(),
  label: z.string(),
  log: z.string().optional(),
  description: z.string().optional(),
  kind: z.string(),
  y: z.number(),
  fromX: z.number(),
  toX: z.number(),
  path: z.string(),
  lineX1: z.number(),
  lineX2: z.number(),
  arrowTipX: z.number(),
  arrowTipY: z.number(),
  arrowDir: z.number(),
  labelX: z.number(),
  labelW: z.number(),
  labelY: z.number(),
  labelH: z.number(),
  branch: z.string().optional(),
  branchFirst: z.boolean().optional(),
  groupHue: z.number().optional(),
  /** Nombre de paleta o hex del grupo; el renderer lo resuelve con el tema. */
  groupColor: z.string().optional(),
  /** Título del grupo: solo en la primera arista de cada tramo del grupo. */
  groupTitle: z.string().optional(),
  /** Icono del grupo: en todas sus aristas, junto al índice. */
  groupIcon: z.string().optional(),
  /** Subproceso del mensaje: spec, marco del recuadro, caja del diagrama (contain) y franja del título. */
  nested: SequenceNestedSpecSchema.optional(),
  nestedBox: EmbedBoxSchema.optional(),
  nestedEmbedBox: EmbedBoxSchema.optional(),
  nestedTitleBox: EmbedBoxSchema.optional(),
});
export type SequenceLayoutMessage = z.infer<typeof SequenceLayoutMessageSchema>;


export const SequenceLayoutAltBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string(),
});
export type SequenceLayoutAltBox = z.infer<typeof SequenceLayoutAltBoxSchema>;


/** Región horizontal ya acotada en píxeles. */
export const SequenceLayoutFragmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  color: z.string().optional(),
  condition: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  /** Nivel de anidación (0 = exterior) para el orden de pintado. */
  depth: z.number(),
});
export type SequenceLayoutFragment = z.infer<typeof SequenceLayoutFragmentSchema>;

export const SequenceLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  actors: z.array(SequenceLayoutActorSchema),
  lifelines: z.array(SequenceLayoutLifelineSchema),
  messages: z.array(SequenceLayoutMessageSchema),
  altBox: SequenceLayoutAltBoxSchema.optional(),
  fragments: z.array(SequenceLayoutFragmentSchema).optional(),
  /** Grupos de la leyenda; vacío cuando la leyenda está apagada. */
  groups: z.array(SequenceGroupSpecSchema).optional(),
  legendX: z.number(),
  legendColX: z.array(z.number()),
  legendMaxRows: z.number(),
  /** Centro vertical de las cabeceras repetidas al pie (si las hay). */
  footerY: z.number().optional(),
});
export type SequenceLayout = z.infer<typeof SequenceLayoutSchema>;

