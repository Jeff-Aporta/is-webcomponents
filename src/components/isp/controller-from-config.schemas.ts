/**
 * controller-from-config.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

export const IspRecordSchema = z.record(z.string(), z.unknown());
export type IspRecord = z.infer<typeof IspRecordSchema>;


export const IspActionKeySchema = z.union([z.literal('crear'), z.literal('modificar'), z.literal('visualizar'), z.literal('verificar'), z.literal('duplicar'), z.literal('recodificar'), z.literal('eliminar'), z.literal('consolidar')]);
export type IspActionKey = z.infer<typeof IspActionKeySchema>;


export const IspColumnDefSchema = z.object({
  field: z.string(),
  header: z.string().optional(),
});
export type IspColumnDef = z.infer<typeof IspColumnDefSchema>;


export const IspServerConfigSchema = z.object({
  useLocal: z.boolean().optional(),
  local: z.union([IspConnectionSchema, z.null()]).optional(),
  remote: z.union([IspConnectionSchema, z.null()]).optional(),
});
export type IspServerConfig = z.infer<typeof IspServerConfigSchema>;


export const IspConnectionSchema = z.object({
  host: z.string(),
  port: z.union([z.number(), z.null()]).optional(),
  https: z.boolean().optional(),
  restcontext: z.string().optional(),
});
export type IspConnection = z.infer<typeof IspConnectionSchema>;


export const IspEndpointsSchema = z.object({
  recurso: z.string().optional(),
  recursos: z.string().optional(),
  crud: z.string().optional(),
  listado: z.string().optional(),
  verificar: z.string().optional(),
  duplicar: z.string().optional(),
  recodificar: z.string().optional(),
  consolidar: z.string().optional(),
});
export type IspEndpoints = z.infer<typeof IspEndpointsSchema>;


export const IspTokenSchema = z.union([z.string(), z.function({ input: [], output: z.union([z.string(), z.null(), z.undefined()]) }), z.null(), z.undefined()]);
export type IspToken = z.infer<typeof IspTokenSchema>;


export const IspListaArgsSchema = z.object({
  pagina: z.number().optional(),
  qregistros: z.number().optional(),
  filtro: z.object({
  sql: z.string().optional(),
}).optional(),
});
export type IspListaArgs = z.infer<typeof IspListaArgsSchema>;


export const IspListaResultSchema = z.object({
  datos: z.array(IspRecordSchema),
  qregistros: z.number().optional(),
  totalregistros: z.number().optional(),
  pagina: z.number().optional(),
  totalpaginas: z.number().optional(),
});
export type IspListaResult = z.infer<typeof IspListaResultSchema>;


export const IspControllerConfigSchema = z.object({
  kind: z.union([z.literal('catalog'), z.literal('btnref')]).optional(),
  entrie: z.string().optional(),
  primaryKeys: z.array(z.string()).optional(),
  columns: z.array(IspColumnDefSchema).optional(),
  ColumnsBtnRef: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  labelPk: z.string().optional(),
  sizePk: z.number().optional(),
  klass: z.unknown() /* TODO: cannot convert */.optional(),
  actions: z.array(z.union([z.boolean(), IspActionKeySchema])).optional(),
  mock: z.array(IspRecordSchema).optional(),
  server: IspServerConfigSchema.optional(),
  endpoints: IspEndpointsSchema.optional(),
  recurso: z.string().optional(),
  token: IspTokenSchema.optional(),
});
export type IspControllerConfig = z.infer<typeof IspControllerConfigSchema>;


export const IspControllerSchema = z.object({
  entrie: z.string(),
  primaryKeys: z.array(z.string()),
  columns: z.array(IspColumnDefSchema),
  Columns: z.record(z.string(), z.string()),
  ColumnsBtnRef: z.array(z.string()),
  multiSelect: z.boolean(),
  labelPk: z.string().optional(),
  sizePk: z.number().optional(),
  klass: z.unknown() /* TODO: cannot convert */,
  CtxBtnRef: z.union([IspControllerSchema, z.null()]).optional(),
  Lista: z.function({ input: [z.unknown() /* TODO: ref IspListaArgs */], output: z.promise(z.unknown() /* TODO: ref IspListaResult */) }),
  actCrear: z.function({ input: [z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.unknown() /* TODO: ref IspRecord */) }).optional(),
  actModificar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.unknown() /* TODO: ref IspRecord */) }).optional(),
  actVisualizar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.unknown() /* TODO: ref IspRecord */) }).optional(),
  actVerificar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.object({
  mensajes: z.array(z.object({
  itdmensaje: z.unknown(),
  mensaje: z.string(),
})),
})) }).optional(),
  actEliminar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.unknown() /* TODO: ref IspRecord */) }).optional(),
  actDuplicar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */, z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.literal(true)) }).optional(),
  actRecodificar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */, z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.literal(true)) }).optional(),
  actConsolidar: z.function({ input: [z.unknown() /* TODO: ref IspRecord */, z.unknown() /* TODO: ref IspRecord */], output: z.promise(z.literal(true)) }).optional(),
  /* TODO: parse fail readonly _store: IspRecord[] */
});
export type IspController = z.infer<typeof IspControllerSchema>;


export const IspHttpEnvelopeSchema = z.object({
  encabezado: z.object({
  resultado: z.boolean().optional(),
  mensaje: z.string().optional(),
}).optional(),
  respuesta: z.object({
  datos: z.array(IspRecordSchema).optional(),
  pagina: z.number().optional(),
  qregistros: z.number().optional(),
  totalpaginas: z.number().optional(),
  totalregistros: z.number().optional(),
  verificacion: z.object({
  mensajes: z.array(z.object({
  itdmensaje: z.unknown(),
  mensaje: z.string(),
})),
}).optional(),
}).optional(),
  datos: z.array(IspRecordSchema).optional(),
});
export type IspHttpEnvelope = z.infer<typeof IspHttpEnvelopeSchema>;


export const MutableIspControllerSchema = z.object({
  /* TODO: member -readonly [K in keyof IspController]: IspController[K] */
});
export type MutableIspController = z.infer<typeof MutableIspControllerSchema>;

