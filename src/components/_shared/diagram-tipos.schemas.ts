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
  /** Color hex de caja/aristas (#080, #800…). */
  color: z.union([z.string(), z.undefined()]).optional(),
  /** Icono Iconify (`mdi:server`) del avatar en `boxStyle: 'card'`; sin él, iniciales. */
  icon: z.union([z.string(), z.undefined()]).optional(),
  /** Relleno de la caja en `boxStyle: 'vp'` (#hex). */
  fill: z.union([z.string(), z.undefined()]).optional(),
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
  /**
   * W54: si `true`, el agrupador es un muro duro (Infinity) para el ruteo de
   * aristas — equivalente a un texto de título. Útil para agrupadores
   * "decorativos" (p.ej. el paquete "«PostgreSQL» clientesis" del lab
   * ISS-AyudasCPIA) por los que las aristas no deben colarse. La única
   * manera de alcanzar un componente dentro es a través del perímetro del
   * paquete, no del interior.
   */
  prohibido: z.boolean().optional(),
  /**
   * Modo `layers`: componentes por fila dentro de este paquete y, si tiene
   * subpaquetes, columnas de su rejilla. Gana sobre `layerCols`/`nestedCols`.
   */
  cols: z.number().optional(),
  /**
   * Lo fija el empaque `layers`: el rótulo va en la esquina del rect (donde
   * lo pinta el theme sin pestaña), no sobre los hijos directos. El
   * obstáculo de ruteo tiene que estar donde está la tinta.
   */
  titleAtCorner: z.boolean().optional(),
  /** `boxStyle: 'vp'`: rótulo centrado en la franja superior (Visual Paradigm). */
  titleCenter: z.boolean().optional(),
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
  /** Hueco entre componentes en paquetes no-Apps (OpenAI, API anidada…). */
  nestedRowGap: z.number().optional(),
  /** Hueco entre paquetes raíz apilados en columna (OpenAI/DS/R2…). */
  pkgRowGap: z.number().optional(),
  minGap: z.number().optional(),
  /** Distancia mínima entre rieles H/V de aristas (px). Default 20. */
  lanePitch: z.number().optional(),
  /** ×N si el tramo está a < lanePitch de otro riel. Default 3. */
  laneNearFactor: z.number().optional(),
  /** Margen arista ↔ borde de agrupador (px). Default 56. */
  pkgBorderClearance: z.number().optional(),
  /** ×N si el tramo está a < pkgBorderClearance de un borde. Default 9. */
  pkgBorderNearFactor: z.number().optional(),
  /** Multiplicador de costo al atravesar interior de agrupador; W61: ^depth. Default 3. */
  pkgCrossFactor: z.number().optional(),
  /** Hueco horizontal entre paquetes hermanos anidados (API↔PG). Default 88. */
  nestedPkgGap: z.number().optional(),
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
  /** Permite tramos en diagonal (línea recta) entre conectores. */
  allowDiagonal: z.boolean().optional(),
  /** Sobreescritura del campo de costos del router (ver `routing-costs.ts`). */
  routing: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  /** `orthogonal` (default) | `curved` (mismo recorrido, giros Bézier) | `straight`. Solo pintura. */
  edgeStyle: z.union([z.literal('orthogonal'), z.literal('curved'), z.literal('straight')]).optional(),
  /** Modo `layers`: componentes por fila dentro de cada franja. Default 6. */
  layerCols: z.number().optional(),
  /** Modo `layers`: columnas de la rejilla de subpaquetes de una franja. Default 2. */
  nestedCols: z.number().optional(),
  /**
   * Pintura de los componentes: `uml` (default, cabecera «estereotipo») o
   * `card` (tarjeta de organigrama: blanca, avatar con iniciales y sombra),
   * que contrasta con cualquier fondo de agrupador.
   */
  boxStyle: z.union([z.literal('uml'), z.literal('card'), z.literal('vp')]).optional(),
  /**
   * Remate de las aristas sintetizadas: `assembly` (default, conector UML
   * `-(O-`) o `arrow` (punta de flecha que llega perpendicular a la cara del
   * destino, sin lollipops). El ruteo es el mismo: solo cambia el remate.
   */
  connector: z.union([z.literal('assembly'), z.literal('arrow')]).optional(),
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

