/**
 * component-spec.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";
import { OpcionesEmpaqueSchema } from "../_shared/diagram-tipos.schemas.js";

export const HttpEndpointSchema = z.object({
  methods: z.array(z.string()),
  path: z.string(),
});
export type HttpEndpoint = z.infer<typeof HttpEndpointSchema>;


export const EdgeKindSchema = z.union([z.literal('dependency'), z.literal('association'), z.literal('realization'), z.literal('assembly')]);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;


export const SpecEdgeSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
  id: z.string(),
  from: z.string(),
  to: z.string(),
  fromInterface: z.string().optional(),
  toInterface: z.string().optional(),
  label: z.string().optional(),
  hue: z.number().optional(),
  /** Stroke hex (#080 / #800). Gana sobre hue. */
  color: z.string().optional(),
  kind: EdgeKindSchema,
});
export type SpecEdge = z.infer<typeof SpecEdgeSchema>;


export const LayoutModeSchema = z.union([z.literal('manual'), z.literal('triptych'), z.string()]);
export type LayoutMode = z.infer<typeof LayoutModeSchema>;


export const ComponentSpecResultSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  layout: OpcionesEmpaqueSchema,
  packages: z.array(z.unknown() /* TODO: ref Paquete */),
  components: z.array(z.unknown() /* TODO: ref Componente */),
  interfaces: z.array(z.unknown() /* TODO: ref InterfazUml */),
  edges: z.array(SpecEdgeSchema),
});
export type ComponentSpecResult = z.infer<typeof ComponentSpecResultSchema>;


export const WireResultSchema = z.object({
  components: z.array(z.unknown() /* TODO: ref Componente */),
  interfaces: z.array(z.unknown() /* TODO: ref InterfazUml */),
  edges: z.array(SpecEdgeSchema),
});
export type WireResult = z.infer<typeof WireResultSchema>;


export const LayoutComponentSchema = z.object({
  stereoY: z.number().optional(),
  labelY: z.number().optional(),
  itemsY: z.number().optional(),
  itemBubbles: z.array(z.object({
  methods: z.array(z.string()),
  path: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  badgeW: z.number(),
})).optional(),
  itemLineHeight: z.number(),
  lineHeight: z.number(),
  lines: z.array(z.string()),
  itemLines: z.array(z.string()),
});
export type LayoutComponent = z.infer<typeof LayoutComponentSchema>;


export const LayoutInterfaceSchema = z.object({
  hue: z.number().optional(),
  cx: z.number(),
  cy: z.number(),
});
export type LayoutInterface = z.infer<typeof LayoutInterfaceSchema>;


export const LayoutEdgeSchema = z.object({
  /** Invierte el sentido de la animación de flujo de esta arista (ver _shared/diagram-flow). */
  reverse: z.boolean().optional(),
  fromX: z.number(),
  fromY: z.number(),
  toX: z.number(),
  toY: z.number(),
  path: z.string(),
  color: z.string().optional(),
  hue: z.number().optional(),
  _fromPt: z.union([z.unknown() /* TODO: ref Punto */, z.null()]).optional(),
  _toPt: z.union([z.unknown() /* TODO: ref Punto */, z.null()]).optional(),
  _fromSide: z.unknown() /* TODO: ref Lado */.optional(),
  _toSide: z.unknown() /* TODO: ref Lado */.optional(),
});
export type LayoutEdge = z.infer<typeof LayoutEdgeSchema>;


export const ComponentLayoutSchema = z.object({
  width: z.number(),
  height: z.number(),
  packages: z.array(z.unknown() /* TODO: ref Paquete */),
  components: z.array(LayoutComponentSchema),
  interfaces: z.array(LayoutInterfaceSchema),
  edges: z.array(LayoutEdgeSchema),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titleY: z.number(),
  subtitleY: z.number(),
  /** Pintura de componentes (`layout.boxStyle` del payload). */
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
  /** Remate de aristas (`layout.connector` del payload). */
  connector: z.union([z.literal('assembly'), z.literal('arrow')]).optional(),
  /**
   * Consolidación de rieles (efecto estándar, encendido por defecto):
   * `ends` — las aristas que llegan al mismo punto (`->` o el O del `-(O-`)
   * convergen en abanico (rieles paralelos pegados, una sola punta);
   * `starts` — las que salen del mismo origen salen juntas. `false` apaga los
   * incentivos de consolidación. Acepta un booleano para ambos.
   */
  consolidate: z.union([z.boolean(), z.object({ starts: z.boolean().optional(), ends: z.boolean().optional() })]).optional(),

});
export type ComponentLayout = z.infer<typeof ComponentLayoutSchema>;

