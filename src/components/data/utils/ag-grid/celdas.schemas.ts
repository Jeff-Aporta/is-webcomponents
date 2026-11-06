/**
 * ag-grid/celdas/schemas — Formas de los parametros declarativos de la parcela.
 *
 * Solo tipos en runtime de render (`import type`): zod no corre por celda. Los
 * esquemas quedan para validar configuraciones JSON desde demos y pruebas.
 */
import { z } from 'zod';

const FormatoNumeroSchema = z.object({ locale: z.string().optional(), decimales: z.number().optional(), minDecimales: z.number().optional(), maxDecimales: z.number().optional(), compacto: z.boolean().optional(), signo: z.boolean().optional() });
export type FormatoNumero = z.infer<typeof FormatoNumeroSchema>;

const FormatoMonedaSchema = FormatoNumeroSchema.extend({ moneda: z.string().optional(), mostrar: z.enum(['symbol', 'narrowSymbol', 'code', 'name']).optional() });
export type FormatoMoneda = z.infer<typeof FormatoMonedaSchema>;

const FormatoPorcentajeSchema = FormatoNumeroSchema.extend({ escala: z.enum(['fraccion', 'ciento']).optional() });
export type FormatoPorcentaje = z.infer<typeof FormatoPorcentajeSchema>;

const FormatoFechaSchema = z.object({ locale: z.string().optional(), formato: z.enum(['iso', 'corta', 'media', 'larga', 'hora', 'fechaHora', 'relativa']).optional(), zona: z.string().optional(), ahora: z.number().optional() });
export type FormatoFecha = z.infer<typeof FormatoFechaSchema>;

const FormatoValorSchema = z.enum(['numero', 'moneda', 'porcentaje']);
export type FormatoValor = z.infer<typeof FormatoValorSchema>;

const EstiloPuntoSchema = z.object({ fill: z.string().optional(), stroke: z.string().optional(), size: z.number().optional() });
export type EstiloPunto = z.infer<typeof EstiloPuntoSchema>;

const PuntoEstiladoSchema = z.object({ first: z.boolean(), last: z.boolean(), min: z.boolean(), max: z.boolean(), yValue: z.number(), xIndex: z.number() });
type PuntoEstilado = z.infer<typeof PuntoEstiladoSchema>;

const OpcionesSparklineSchema = z.object({
  type: z.enum(['line', 'area', 'bar', 'column']).optional(),
  direction: z.enum(['vertical', 'horizontal']).optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  fill: z.string().optional(),
  fillOpacity: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  xKey: z.string().optional(),
  yKey: z.string().optional(),
  padding: z.object({ top: z.number().optional(), right: z.number().optional(), bottom: z.number().optional(), left: z.number().optional() }).optional(),
  marker: z.object({ enabled: z.boolean().optional(), size: z.number().optional(), fill: z.string().optional(), stroke: z.string().optional() }).optional(),
  interpolation: z.object({ type: z.enum(['linear', 'smooth', 'step']).optional() }).optional(),
  tendencia: z.boolean().optional(),
  marcarUltimo: z.boolean().optional(),
  itemStyler: z.custom<(p: PuntoEstilado) => EstiloPunto | null | undefined>().optional(),
});
export type OpcionesSparkline = z.infer<typeof OpcionesSparklineSchema>;

const UmbralSchema = z.object({ hasta: z.number(), tono: z.string() });
export type Umbral = z.infer<typeof UmbralSchema>;

const AccionCeldaSchema = z.object({ id: z.string(), texto: z.string().optional(), icono: z.string().optional(), svg: z.string().optional(), tono: z.string().optional(), deshabilitado: z.unknown().optional(), visible: z.unknown().optional(), onClick: z.unknown().optional() });
export type AccionCelda = z.infer<typeof AccionCeldaSchema>;

const ParamsCeldaSchema = z.looseObject({ value: z.unknown(), valueFormatted: z.string().nullable().optional(), data: z.unknown(), node: z.unknown(), colDef: z.unknown(), column: z.unknown(), rowIndex: z.number().optional(), api: z.unknown(), context: z.unknown() });
export type ParamsCelda = z.infer<typeof ParamsCeldaSchema>;

const TipoDatoSchema = z.enum(['text', 'number', 'boolean', 'date', 'dateString', 'object']);
export type TipoDato = z.infer<typeof TipoDatoSchema>;

const DefinicionTipoSchema = z.looseObject({ baseDataType: z.string().optional(), extendsDataType: z.string().optional(), valueFormatter: z.unknown().optional(), valueParser: z.unknown().optional() });
export type DefinicionTipo = z.infer<typeof DefinicionTipoSchema>;

const ParamsTemaSchema = z.record(z.string(), z.union([z.string(), z.number()]));
export type ParamsTema = z.infer<typeof ParamsTemaSchema>;

const MedidasTemaSchema = z.object({ rowHeight: z.number().nullable(), headerHeight: z.number().nullable() });
export type MedidasTema = z.infer<typeof MedidasTemaSchema>;

const CambioCeldaSchema = z.object({ anterior: z.unknown(), nuevo: z.unknown(), desde: z.number() });
export type CambioCelda = z.infer<typeof CambioCeldaSchema>;

const PresentacionCeldaSchema = z.object({ clases: z.string(), estilo: z.string(), titulo: z.string().optional() });
export type PresentacionCelda = z.infer<typeof PresentacionCeldaSchema>;

const PresentacionFilaSchema = z.object({ clases: z.string(), estilo: z.string() });
export type PresentacionFila = z.infer<typeof PresentacionFilaSchema>;

const ParamsFlashSchema = z.object({ rowNodes: z.array(z.unknown()).optional(), columns: z.array(z.unknown()).optional(), flashDuration: z.number().optional(), fadeDuration: z.number().optional(), direccion: z.enum(['up', 'down']).optional() });
export type ParamsFlash = z.infer<typeof ParamsFlashSchema>;
