import { z } from 'zod';

/**
 * server-api-docs-md.schemas.ts — modelo ESTRICTO del documento InSoft `kind:"config"` versión 2 que un
 * server publica para `<iswc-server-api-docs>` (el ISS lo guarda en `patyia_sys_values`, fila `doc`).
 *
 * Es el contrato del documento Swagger-like: por endpoint, método, ruta, sesión y permiso, parámetros,
 * cuerpo y respuestas con sus schemas y ejemplos. Nada documental (sin markdown largo por operación ni
 * portada en prosa). Todo objeto es `.strict()` (una clave de más es error), los textos y los ids tienen
 * forma fija y `superRefine` cierra la integridad referencial: cada id nombra algo que existe y nada del
 * catálogo queda huérfano. Solo depende de `zod`: los servers lo vendorizan tal cual y validan al escribir.
 *
 * El visor sigue pintando documentos tolerantes (`server-api-docs.schemas.ts`, InSoft v1 u OpenAPI 3) y
 * con este schema dice si el documento admite el parse estricto (`validarEstricto` de `server-api-docs-md`).
 */

/** Métodos HTTP que admite el documento estricto. */
export const ApiDocsMetodoSchema = z.enum(['get', 'post', 'put', 'patch', 'delete']);
export type ApiDocsMetodo = z.infer<typeof ApiDocsMetodoSchema>;

/** Id de catálogo, tag de subgrupo o plantilla: kebab-case en minúsculas. */
export const ApiDocsIdSchema = z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, 'id kebab-case en minúsculas');
/** Icono Iconify de la colección mdi. */
export const ApiDocsIconoSchema = z.string().regex(/^mdi:[a-z0-9-]+$/, 'icono mdi:<nombre>');
/** Ruta del server sin el prefijo `/api`, con parámetros `{nombre}`. */
export const ApiDocsRutaSchema = z.string().regex(/^\/[A-Za-z0-9_\-/{}.]*$/, 'ruta /x/{pk}');
/** Permiso que exige el endpoint (id SEG `METODO:/ruta`, `QUERY:/x` o `CFG:/x`). */
export const ApiDocsPermisoSchema = z.string().regex(/^[A-Z]+:\/[A-Za-z0-9_\-/{}.]*$/, 'permiso METODO:/ruta');
/** Controller y método que atienden el endpoint (`TClaseController.metodo`). */
export const ApiDocsControllerSchema = z.string().regex(/^T[A-Za-z0-9]+\.[A-Za-z0-9_]+$/, 'controller TClase.metodo');
/** Código HTTP de tres dígitos. */
export const ApiDocsCodigoSchema = z.string().regex(/^[1-5]\d\d$/, 'código HTTP de 3 dígitos');
/** Texto de una línea, sin markdown de bloque. */
const textoApiDocs = () => z.string().trim().min(1);

/** Tipos de JSON Schema que describe el documento. */
export const ApiDocsTipoSchema = z.enum(['object', 'array', 'string', 'integer', 'number', 'boolean']);
/** Formatos de cadena que el visor reconoce. */
export const ApiDocsFormatoSchema = z.enum(['date-time', 'date', 'uri', 'email', 'uuid', 'binary']);

/** Subconjunto estricto de JSON Schema que usan parámetros, cuerpos y respuestas (recursivo). */
export const ApiDocsJsonSchemaSchema = z.strictObject({
  type: ApiDocsTipoSchema,
  description: textoApiDocs().optional(),
  format: ApiDocsFormatoSchema.optional(),
  enum: z.array(z.union([z.string(), z.number()])).min(1).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  default: z.json().optional(),
  example: z.json().optional(),
  required: z.array(textoApiDocs()).optional(),
  get properties() {
    return z.record(textoApiDocs(), ApiDocsJsonSchemaSchema).optional();
  },
  get items() {
    return ApiDocsJsonSchemaSchema.optional();
  },
});
export type ApiDocsJsonSchema = z.infer<typeof ApiDocsJsonSchemaSchema>;

/** Referencia a un schema del catálogo (`#/catalog/schemas/<id>`). */
export const ApiDocsRefSchema = z.object({ $ref: z.string().regex(/^#\/catalog\/schemas\/[a-z][a-z0-9-]*$/, 'ref #/catalog/schemas/<id>') }).strict();
export type ApiDocsRef = z.infer<typeof ApiDocsRefSchema>;

export const ApiDocsInfoSchema = z.object({
  title: textoApiDocs(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'versión semver x.y.z'),
  /** Una o dos líneas: qué expone la API (sin markdown de bloque ni diagramas). */
  description: textoApiDocs().max(400).refine((s) => !/\n\s*\n|```|<[a-z]/i.test(s), 'descripción de una línea, sin bloques ni etiquetas'),
}).strict();

/** Cómo inicia sesión «Probar»: el portal del propio server o el orquestador de InSoft. */
export const ApiDocsAuthSchema = z.object({
  enabled: z.boolean(),
  loginKind: z.enum(['portal', 'orquestador']),
  loginPath: z.string().startsWith('/'),
  app: textoApiDocs(),
  provider: z.enum(['patyia-portal', 'orquestador']),
}).strict();

export const ApiDocsServidorSchema = z.object({ url: z.url(), description: textoApiDocs() }).strict();

export const ApiDocsViewerSchema = z.object({
  /** Espacio de nombres del server (`ISS`). */
  ns: z.string().regex(/^[A-Z][A-Z0-9]*$/, 'ns en mayúsculas'),
  brand: z.object({ title: textoApiDocs(), icon: ApiDocsIconoSchema }).strict(),
  auth: ApiDocsAuthSchema,
  exports: z.object({
    openApiDownloadName: z.string().regex(/\.openapi\.json$/, 'termina en .openapi.json'),
    isDownloadName: z.string().regex(/\.json$/, 'termina en .json'),
  }).strict(),
  servers: z.array(ApiDocsServidorSchema).min(1).optional(),
}).strict();

export const ApiDocsSubgrupoSchema = z.object({ id: ApiDocsIdSchema, name: textoApiDocs(), icon: ApiDocsIconoSchema, description: textoApiDocs() }).strict();
export const ApiDocsTagSchema = z.object({ name: textoApiDocs(), description: textoApiDocs(), subgroups: z.array(ApiDocsSubgrupoSchema).min(1) }).strict();

export const ApiDocsParametroSchema = z.object({
  name: textoApiDocs(),
  in: z.enum(['path', 'query']),
  required: z.boolean(),
  description: textoApiDocs(),
  schema: ApiDocsJsonSchemaSchema,
  example: z.json().optional(),
}).strict();
export type ApiDocsParametro = z.infer<typeof ApiDocsParametroSchema>;

export const ApiDocsCuerpoSchema = z.object({
  required: z.boolean(),
  description: textoApiDocs(),
  schema: z.union([ApiDocsRefSchema, ApiDocsJsonSchemaSchema]),
  /** Ejemplo del cuerpo en `catalog.requestBodies`. */
  bodyKey: ApiDocsIdSchema,
}).strict();

/** Respuesta concreta de un código (template `raw`). */
export const ApiDocsItemRespuestaSchema = z.object({
  description: textoApiDocs(),
  schema: ApiDocsJsonSchemaSchema.optional(),
  payload: ApiDocsIdSchema.optional(),
  example: z.json().optional(),
}).strict();

/**
 * Respuestas: un template que el visor expande a códigos concretos (`ok` → 200; `auth`/`authForbidden` →
 * 200/401/403; `authNotFound` → 200/401/404; `deleteEnvelope` → 200 con la fila borrada/401/404) o `raw`
 * con cada código declarado. `schema` (opcional en los templates) describe el contenido de `respuesta`.
 */
export const ApiDocsRespuestasSchema = z.discriminatedUnion('template', [
  z.object({ template: z.literal('ok'), description: textoApiDocs(), payload: ApiDocsIdSchema, schema: z.union([ApiDocsRefSchema, ApiDocsJsonSchemaSchema]).optional() }).strict(),
  z.object({ template: z.literal('auth'), description: textoApiDocs(), payload: ApiDocsIdSchema, schema: z.union([ApiDocsRefSchema, ApiDocsJsonSchemaSchema]).optional() }).strict(),
  z.object({ template: z.literal('authForbidden'), description: textoApiDocs(), payload: ApiDocsIdSchema, schema: z.union([ApiDocsRefSchema, ApiDocsJsonSchemaSchema]).optional() }).strict(),
  z.object({ template: z.literal('authNotFound'), description: textoApiDocs(), payload: ApiDocsIdSchema, schema: z.union([ApiDocsRefSchema, ApiDocsJsonSchemaSchema]).optional() }).strict(),
  z.object({ template: z.literal('deleteEnvelope'), description: textoApiDocs(), payload: ApiDocsIdSchema, schema: ApiDocsIdSchema }).strict(),
  z.object({ template: z.literal('raw'), items: z.record(ApiDocsCodigoSchema, ApiDocsItemRespuestaSchema).refine((i) => Object.keys(i).length > 0, 'raw sin items') }).strict(),
]);
export type ApiDocsRespuestas = z.infer<typeof ApiDocsRespuestasSchema>;

export const ApiDocsOperacionSchema = z.object({
  summary: textoApiDocs().max(80),
  description: textoApiDocs().max(400),
  tags: z.tuple([textoApiDocs()]),
  subgroup: ApiDocsIdSchema,
  security: z.enum(['bearer', 'none']),
  /** Permiso del endpoint; obligatorio con `security: "bearer"`, prohibido sin sesión. */
  permission: ApiDocsPermisoSchema.optional(),
  controller: ApiDocsControllerSchema,
  parameters: z.array(ApiDocsParametroSchema).min(1).optional(),
  requestBody: ApiDocsCuerpoSchema.optional(),
  responses: ApiDocsRespuestasSchema,
  /** Plantilla de adjuntos de «Probar» (`catalog.tryitAttachments.templates`). */
  tryitAttachments: ApiDocsIdSchema.optional(),
}).strict().superRefine((op, ctx) => {
  if (op.security === 'bearer' && !op.permission) ctx.addIssue({ code: 'custom', path: ['permission'], message: 'un endpoint con sesión declara su permiso' });
  if (op.security === 'none' && op.permission) ctx.addIssue({ code: 'custom', path: ['permission'], message: 'un endpoint público no declara permiso' });
});
export type ApiDocsOperacion = z.infer<typeof ApiDocsOperacionSchema>;

const ApiDocsAdjuntoSchema = z.object({
  max: z.number().int().min(1).max(20),
  field: textoApiDocs(),
  encoding: z.literal('dataUrl'),
  filePicker: z.boolean().optional(),
  clipboard: z.boolean().optional(),
}).strict();

export const ApiDocsCatalogSchema = z.object({
  /** Ejemplos de `respuesta` por id (lo que devuelve el endpoint dentro del sobre). */
  payloads: z.record(ApiDocsIdSchema, z.json()),
  /** Ejemplos de cuerpo por id (`requestBody.bodyKey`). */
  requestBodies: z.record(ApiDocsIdSchema, z.json()),
  schemas: z.record(ApiDocsIdSchema, ApiDocsJsonSchemaSchema),
  tryitAttachments: z.object({
    templates: z.record(ApiDocsIdSchema, z.object({
      mode: z.literal('json'),
      bodyRawRule: z.literal('merge'),
      audios: ApiDocsAdjuntoSchema.optional(),
      images: ApiDocsAdjuntoSchema.optional(),
    }).strict().refine((t) => !!t.audios || !!t.images, 'plantilla sin adjuntos')),
  }).strict(),
}).strict();

/** Documento estricto: InSoft `kind:"config"` versión 2 (Swagger-like) con integridad referencial. */
export const ApiDocsDocumentoSchema = z.object({
  kind: z.literal('config'),
  version: z.literal(2),
  info: ApiDocsInfoSchema,
  viewer: ApiDocsViewerSchema,
  tags: z.array(ApiDocsTagSchema).min(1),
  paths: z.record(ApiDocsRutaSchema, z.partialRecord(ApiDocsMetodoSchema, ApiDocsOperacionSchema)),
  catalog: ApiDocsCatalogSchema,
}).strict().superRefine((d, ctx) => {
  const falta = (path: PropertyKey[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  const usados = { payloads: new Set<string>(), requestBodies: new Set<string>(), schemas: new Set<string>(), tryitAttachments: new Set<string>() };
  const tablas: Record<keyof typeof usados, Record<string, unknown>> = {
    payloads: d.catalog.payloads, requestBodies: d.catalog.requestBodies, schemas: d.catalog.schemas, tryitAttachments: d.catalog.tryitAttachments.templates,
  };
  const usar = (tipo: keyof typeof usados, id: string, path: PropertyKey[]) => {
    usados[tipo].add(id);
    if (!(id in tablas[tipo])) falta(path, `«${id}» no existe en catalog.${tipo}`);
  };
  const refs = (v: unknown, path: PropertyKey[]) => {
    for (const m of JSON.stringify(v ?? null).matchAll(/"#\/catalog\/schemas\/([a-z0-9-]+)"/g)) usar('schemas', m[1] ?? '', path);
  };
  const nombres = new Set<string>();
  d.tags.forEach((t, i) => {
    if (nombres.has(t.name)) falta(['tags', i, 'name'], `tag «${t.name}» repetido`);
    nombres.add(t.name);
  });
  const subgrupos = new Map(d.tags.map((t) => [t.name, new Set(t.subgroups.map((s) => s.id))]));
  const permisos = new Map<string, string>();
  for (const [ruta, ops] of Object.entries(d.paths)) {
    const enRuta = [...ruta.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] ?? '').sort();
    if (!Object.keys(ops).length) falta(['paths', ruta], 'ruta sin métodos');
    for (const [metodo, op] of Object.entries(ops)) {
      if (!op) continue;
      const p = ['paths', ruta, metodo];
      const tag = op.tags[0];
      const delTag = subgrupos.get(tag);
      if (!delTag) falta([...p, 'tags', 0], `tag «${tag}» no existe en tags`);
      else if (!delTag.has(op.subgroup)) falta([...p, 'subgroup'], `subgrupo «${op.subgroup}» no existe en el tag «${tag}»`);
      const declarados = (op.parameters ?? []).filter((x) => x.in === 'path').map((x) => x.name).sort();
      if (JSON.stringify(declarados) !== JSON.stringify(enRuta)) falta([...p, 'parameters'], `parámetros de ruta ${JSON.stringify(declarados)} ≠ ${JSON.stringify(enRuta)}`);
      if (op.permission) {
        const otro = permisos.get(op.permission);
        if (otro && otro !== `${metodo} ${ruta}` && !op.permission.startsWith('CFG:')) falta([...p, 'permission'], `permiso «${op.permission}» ya lo declara ${otro}`);
        permisos.set(op.permission, `${metodo} ${ruta}`);
      }
      if (op.requestBody) {
        usar('requestBodies', op.requestBody.bodyKey, [...p, 'requestBody', 'bodyKey']);
        refs(op.requestBody.schema, [...p, 'requestBody', 'schema']);
      }
      const r = op.responses;
      if (r.template === 'raw') {
        for (const [codigo, item] of Object.entries(r.items)) {
          if (item.payload) usar('payloads', item.payload, [...p, 'responses', 'items', codigo, 'payload']);
          refs(item.schema, [...p, 'responses', 'items', codigo, 'schema']);
        }
      } else {
        usar('payloads', r.payload, [...p, 'responses', 'payload']);
        if (r.template === 'deleteEnvelope') usar('schemas', r.schema, [...p, 'responses', 'schema']);
        else refs(r.schema, [...p, 'responses', 'schema']);
      }
      if (op.tryitAttachments) usar('tryitAttachments', op.tryitAttachments, [...p, 'tryitAttachments']);
    }
  }
  for (const s of Object.values(d.catalog.schemas)) refs(s, ['catalog', 'schemas']);
  for (const tipo of ['payloads', 'requestBodies', 'schemas', 'tryitAttachments'] as const) {
    for (const id of Object.keys(tablas[tipo])) if (!usados[tipo].has(id)) falta(['catalog', tipo, id], `«${id}» de catalog.${tipo} no lo usa ningún endpoint`);
  }
});
export type ApiDocsDocumento = z.infer<typeof ApiDocsDocumentoSchema>;
