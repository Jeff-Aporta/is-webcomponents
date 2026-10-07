/**
 * component-pack.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const ClusterColumnSchema = z.object({
  items: z.array(z.unknown() /* TODO: ref Componente */),
});
export type ClusterColumn = z.infer<typeof ClusterColumnSchema>;


export const GroupConvSchema = z.object({
  xs: z.array(z.number()),
  ys: z.array(z.number()),
  occ: z.array(z.array(z.boolean())),
});
export type GroupConv = z.infer<typeof GroupConvSchema>;


export const RouteAvoidOptsSchema = z.object({
  clearance: z.number().optional(),
  fromSide: z.unknown() /* TODO: ref Lado */.optional(),
  toSide: z.unknown() /* TODO: ref Lado */.optional(),
  fromBox: z.unknown() /* TODO: ref Caja */.optional(),
  toBox: z.unknown() /* TODO: ref Caja */.optional(),
  /** Paquete propio origen: el tramo medio no puede reentrar. */
  fromPkg: z.unknown() /* TODO: ref Caja */.optional(),
  /** Paquete propio destino: el tramo medio no puede atravesarlo. */
  toPkg: z.unknown() /* TODO: ref Caja */.optional(),
  usedSegs: z.array(z.object({
  a: z.unknown() /* TODO: ref Punto */,
  b: z.unknown() /* TODO: ref Punto */,
})).optional(),
  frame: z.unknown() /* TODO: ref Caja */.optional(),
  wrapBoxes: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  /** Paquetes del diagrama: sus bordes repelen aristas (margen). */
  pkgBoxes: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  /** Distancia mínima entre rieles (carriles H/V). Default LANE_PITCH (20). */
  lanePitch: z.number().optional(),
  /**
   * Factor ADITIVO por cada arista/borde cercano (no multiplicativo).
   * Coste de paso = base · (1 + nearCount · laneNearFactor).
   * Default 3.
   */
  laneNearFactor: z.number().optional(),
  /** Margen arista ↔ borde de agrupador. Default PKG_BORDER_CLEARANCE (40). */
  pkgBorderClearance: z.number().optional(),
  /** Costo ×factor^depth al atravesar interior de agrupador(es). Default 3. */
  pkgCrossFactor: z.number().optional(),
  /** Agrupadores: costo suave (no muro duro). */
  softPkgs: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  /**
   * Textos / títulos: muro duro (Infinity en el A*) — la arista NO puede
   * pasar encima, se rechaza en `legal()` y se bloquea en `gridRoute`.
   */
  textBoxes: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  /**
   * W54: agrupadores prohibidos (`prohibido: true` en el payload). Se
   * tratan como muro duro (Infinity) — la arista no puede atravesarlos.
   */
  prohibitedPkgs: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  /**
   * W56 (fan-out por origen): índice de esta arista entre las N que
   * salen del mismo `from` (0..N-1). Permite centrar el abanico
   * perpendicular al `fromSide` (no global) para que 5 aristas desde
   * ISW-TestPatyIA → 5 destinos en `pkg-api` no caigan sobre la misma
   * celda de destino.
   */
  sourceOffsetIndex: z.number().optional(),
  /** W56: total de aristas que comparten el mismo `from`. */
  sourceEdgeCount: z.number().optional(),
  _loose: z.boolean().optional(),
  rank: z.number().optional(),
  total: z.number().optional(),
});
export type RouteAvoidOpts = z.infer<typeof RouteAvoidOptsSchema>;

/**
 * gridRoute options — versión interna del subset de RouteAvoidOpts que
 * consume el A* (regla 5/6: coste aditivo por aristas/borde cercanos).
 */
export const GridRouteOptsSchema = z.object({
  softPkgs: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  textBoxes: z.array(z.unknown() /* TODO: ref Caja */).optional(),
  pkgCrossFactor: z.number().optional(),
  lanePitch: z.number().optional(),
  laneNearFactor: z.number().optional(),
  /** Ejes X de bordes de agrupadores (cuestan como aristas). */
  borderXs: z.array(z.number()).optional(),
  /** Ejes Y de bordes de agrupadores. */
  borderYs: z.array(z.number()).optional(),
  /** W54: agrupadores prohibidos (muro duro). */
  prohibitedPkgs: z.array(z.unknown() /* TODO: ref Caja */).optional(),
});
export type GridRouteOpts = z.infer<typeof GridRouteOptsSchema>;

