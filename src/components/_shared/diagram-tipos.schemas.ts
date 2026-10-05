/**
 * diagram-tipos.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const CajaSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Caja = z.infer<typeof CajaSchema>;


export const ComponenteSchema = z.intersection(CajaSchema, z.object({
  id: z.string(),
  package: z.union([z.string(), z.undefined()]).optional(),
  name: z.string().optional(),
  stereotype: z.union([z.string(), z.undefined()]).optional(),
  hue: z.union([z.number(), z.undefined()]).optional(),
  provides: z.array(z.unknown()).optional(),
  requires: z.array(z.unknown()).optional(),
  connects: z.array(z.unknown()).optional(),
  items: z.array(z.unknown()).optional(),
}));
export type Componente = z.infer<typeof ComponenteSchema>;


export const PaqueteSchema = z.intersection(CajaSchema, z.object({
  id: z.string(),
  name: z.string().optional(),
  stereotype: z.union([z.string(), z.undefined()]).optional(),
  hue: z.union([z.number(), z.undefined()]).optional(),
  parent: z.union([z.string(), z.undefined()]).optional(),
}));
export type Paquete = z.infer<typeof PaqueteSchema>;


export const AristaSchema = z.object({
  from: z.string(),
  to: z.string(),
  /* TODO: member [extra: string]: unknown */
});
export type Arista = z.infer<typeof AristaSchema>;


export const LadoSchema = z.union([z.literal('top'), z.literal('right'), z.literal('bottom'), z.literal('left')]);
export type Lado = z.infer<typeof LadoSchema>;


export const OpcionesEmpaqueSchema = z.object({
  mode: z.union([z.literal('manual'), z.literal('triptych'), z.string()]).optional(),
  ungroup: z.array(z.unknown()).optional(),
  colGutter: z.number().optional(),
  pkgCorridor: z.number().optional(),
  rowGap: z.number().optional(),
  minGap: z.number().optional(),
  pad: z.number().optional(),
  tabH: z.number().optional(),
  clearance: z.number().optional(),
  sourceGap: z.number().optional(),
  fromBox: CajaSchema.optional(),
  toBox: CajaSchema.optional(),
  fromSide: LadoSchema.optional(),
  toSide: LadoSchema.optional(),
  sources: z.array(z.unknown()).optional(),
  sourceSides: z.record(z.string(), z.unknown()).optional(),
  wrapBoxes: z.array(z.unknown() /* TODO: cannot convert */).optional(),
  frame: CajaSchema.optional(),
  usedSegs: z.array(z.unknown()).optional(),
});
export type OpcionesEmpaque = z.infer<typeof OpcionesEmpaqueSchema>;


export const PuntoSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Punto = z.infer<typeof PuntoSchema>;


export const InterfazUmlSchema = z.object({
  id: z.string(),
  component: z.string(),
  name: z.union([z.string(), z.undefined()]).optional(),
  side: LadoSchema,
  offset: z.number(),
  kind: z.union([z.literal('provided'), z.literal('required')]),
  cx: z.number().optional(),
  cy: z.number().optional(),
  docked: z.boolean().optional(),
});
export type InterfazUml = z.infer<typeof InterfazUmlSchema>;

