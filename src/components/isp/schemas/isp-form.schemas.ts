// @contexto INDICE.md · src/components/isp/README.md
/**
 * form-json.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

/** Control de formulario: siempre es un elemento del DOM. */
const ControlElSchema = z.intersection(z.custom<HTMLElement>(), z.object({
  value: z.union([z.string(), z.null()]).optional(),
  checked: z.boolean().optional(),
  values: z.union([z.array(z.string()), z.null()]).optional(),
  multiple: z.boolean().optional(),
  type: z.string().optional(),
  selectedOptions: z.array(z.custom<HTMLOptionElement>()).optional(),
  options: z.array(z.custom<HTMLOptionElement>()).optional(),
}));
export type ControlEl = z.infer<typeof ControlElSchema>;

const ControlValueSchema = z.union([z.string(), z.boolean(), z.array(z.string()), z.number(), z.null(), z.undefined()]);
export type ControlValue = z.infer<typeof ControlValueSchema>;

// ── controller-from-config.schemas ──
/**
 * controller-from-config.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const IspRecordSchema = z.record(z.string(), z.unknown());
export type IspRecord = z.infer<typeof IspRecordSchema>;

const IspActionKeySchema = z.union([z.literal('crear'), z.literal('modificar'), z.literal('visualizar'), z.literal('verificar'), z.literal('duplicar'), z.literal('recodificar'), z.literal('eliminar'), z.literal('consolidar')]);
export type IspActionKey = z.infer<typeof IspActionKeySchema>;

const IspColumnDefSchema = z.object({
  field: z.string(),
  header: z.string().optional(),
});

const IspConnectionSchema = z.object({
  host: z.string(),
  port: z.union([z.number(), z.null()]).optional(),
  https: z.boolean().optional(),
  restcontext: z.string().optional(),
});
export type IspConnection = z.infer<typeof IspConnectionSchema>;

const IspServerConfigSchema = z.object({
  useLocal: z.boolean().optional(),
  local: z.union([IspConnectionSchema, z.null()]).optional(),
  remote: z.union([IspConnectionSchema, z.null()]).optional(),
});
export type IspServerConfig = z.infer<typeof IspServerConfigSchema>;

const IspEndpointsSchema = z.object({
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

const IspTokenSchema = z.union([z.string(), z.function({ input: [], output: z.union([z.string(), z.null(), z.undefined()]) }), z.null(), z.undefined()]);
export type IspToken = z.infer<typeof IspTokenSchema>;

const IspListaArgsSchema = z.object({
  pagina: z.number().optional(),
  qregistros: z.number().optional(),
  filtro: z.object({
  sql: z.string().optional(),
}).optional(),
});
export type IspListaArgs = z.infer<typeof IspListaArgsSchema>;

/** Pagina que devuelve `Lista`. */
const IspListaResultSchema = z.object({
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
});
export type IspListaResult = z.infer<typeof IspListaResultSchema>;

const IspControllerConfigSchema = z.object({
  kind: z.union([z.literal('catalog'), z.literal('btnref')]).optional(),
  entrie: z.string().optional(),
  primaryKeys: z.array(z.string()).optional(),
  columns: z.array(IspColumnDefSchema).optional(),
  ColumnsBtnRef: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  labelPk: z.string().optional(),
  sizePk: z.number().optional(),
  klass: z.custom<new () => IspRecord>().optional(),
  actions: z.union([z.boolean(), z.array(IspActionKeySchema)]).optional(),
  mock: z.array(IspRecordSchema).optional(),
  server: IspServerConfigSchema.optional(),
  endpoints: IspEndpointsSchema.optional(),
  recurso: z.string().optional(),
  token: IspTokenSchema.optional(),
});
export type IspControllerConfig = z.infer<typeof IspControllerConfigSchema>;

const IspControllerSchema = z.object({
  entrie: z.string(),
  primaryKeys: z.array(z.string()),
  columns: z.array(IspColumnDefSchema),
  Columns: z.record(z.string(), z.string()),
  ColumnsBtnRef: z.array(z.string()),
  multiSelect: z.boolean(),
  labelPk: z.string().optional(),
  sizePk: z.number().optional(),
  klass: z.custom<new () => IspRecord>(),
  get CtxBtnRef(): z.ZodOptional<z.ZodUnion<readonly [typeof IspControllerSchema, z.ZodNull]>> { return z.union([IspControllerSchema, z.null()]).optional(); },
  Lista: z.function({ input: [IspListaArgsSchema.optional()], output: z.promise(IspListaResultSchema) }),
  actCrear: z.function({ input: [IspRecordSchema], output: z.promise(IspRecordSchema) }).optional(),
  actModificar: z.function({ input: [IspRecordSchema], output: z.promise(IspRecordSchema) }).optional(),
  actVisualizar: z.function({ input: [IspRecordSchema], output: z.promise(IspRecordSchema) }).optional(),
  actVerificar: z.function({ input: [IspRecordSchema], output: z.promise(z.object({
  mensajes: z.array(z.object({
  itdmensaje: z.unknown(),
  mensaje: z.string(),
})),
})) }).optional(),
  actEliminar: z.function({ input: [IspRecordSchema], output: z.promise(IspRecordSchema) }).optional(),
  actDuplicar: z.function({ input: [IspRecordSchema, IspRecordSchema], output: z.promise(z.literal(true)) }).optional(),
  actRecodificar: z.function({ input: [IspRecordSchema, IspRecordSchema], output: z.promise(z.literal(true)) }).optional(),
  actConsolidar: z.function({ input: [IspRecordSchema, IspRecordSchema], output: z.promise(z.literal(true)) }).optional(),
  /* TODO: parse fail readonly _store: IspRecord[] */
});
export type IspController = z.infer<typeof IspControllerSchema>;

const IspHttpEnvelopeSchema = z.object({
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

/**
 * Controller ISP mutable: el mismo contrato pero sin `readonly`, porque la
 * factory le añade `actXxx` y `_store` despues de crearlo.
 */
export type MutableIspController = { -readonly [K in keyof IspController]: IspController[K] };
