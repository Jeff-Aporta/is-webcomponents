import { z } from 'zod';
import type { SequenceActorSpec, SequenceFragmentSpec, SequenceMessageSpec } from '@jeff-aporta/iswc-base/components/diagrams/schemas/sequence-spec.schemas.js';

/**
 * Contratos de `<iswc-server-api-docs>` (W54: los tipos viven en *.schemas.ts).
 *
 * Dos capas:
 *   1. ENTRADA — el documento que publica un server: el documento iswc `kind:"config"` (el que sirve
 *      el ISS en `GET /api/docs?v=json`) u OpenAPI 3. Tolerante a propósito (`.loose()`): las claves
 *      que el visor no lee pasan y un documento viejo sigue cargando; lo que sí se exige es lo que el
 *      visor usa para pintar (summary, templates conocidos, ids de catálogo que resuelven). El server
 *      aplica su propio schema estricto; este es el del consumidor.
 *   2. MODELO — lo que el visor pinta, ya normalizado desde cualquiera de los dos formatos.
 */

// ── Entrada: documento iswc `kind:"config"` ────────────────────────────────

export const METODOS_API = ['get', 'post', 'put', 'patch', 'delete', 'query', 'options', 'head'] as const;
export const ServerApiDocsMetodoSchema = z.enum(METODOS_API);

/** Templates de respuesta que el visor expande a respuestas concretas (200/401/403/404). */
const TEMPLATES_RESPUESTA = ['ok', 'auth', 'authForbidden', 'authNotFound', 'deleteEnvelope', 'raw'] as const;

const ObjetoJsonSchema = z.record(z.string(), z.unknown());

const iswcServidorSchema = z.object({ url: z.string().min(1), description: z.string().optional() }).loose();

const iswcNavSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requiresSession: z.boolean().optional(),
}).loose();

const iswcAuthSchema = z.object({
  enabled: z.boolean().optional(),
  loginKind: z.string().optional(),
  loginPath: z.string().optional(),
  loginUrl: z.string().optional(),
  app: z.string().optional(),
  provider: z.string().optional(),
}).loose();

const iswcViewerSchema = z.object({
  ns: z.string().optional(),
  brand: z.object({ title: z.string().optional(), icon: z.string().optional() }).loose().optional(),
  auth: iswcAuthSchema.optional(),
  exports: z.record(z.string(), z.string()).optional(),
  nav: z.array(iswcNavSchema).optional(),
  servers: z.array(iswcServidorSchema).optional(),
}).loose();

const iswcSubgrupoSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
}).loose();

const iswcTagSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subgroups: z.array(iswcSubgrupoSchema).optional(),
}).loose();

const iswcParametroSchema = z.object({
  name: z.string().min(1),
  in: z.enum(['path', 'query', 'header', 'cookie']),
  required: z.boolean().optional(),
  description: z.string().optional(),
  schema: ObjetoJsonSchema.optional(),
  example: z.unknown().optional(),
}).loose();

const iswcRespuestasSchema = z.object({
  template: z.enum(TEMPLATES_RESPUESTA),
  description: z.string().optional(),
  payload: z.string().optional(),
  schema: z.string().optional(),
  items: z.record(
    z.string().regex(/^\d{3}$/, 'el código de respuesta va en 3 dígitos'),
    z.object({ description: z.string().optional(), schema: ObjetoJsonSchema.optional(), example: z.unknown().optional(), payload: z.string().optional() }).loose(),
  ).optional(),
}).loose();

const iswcOperacionSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subgroup: z.string().optional(),
  security: z.enum(['bearer', 'Bearer', 'none']).optional(),
  doc: z.string().optional(),
  parameters: z.array(iswcParametroSchema).optional(),
  requestBody: z.object({
    bodyKey: z.string().optional(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    content: ObjetoJsonSchema.optional(),
    schema: ObjetoJsonSchema.optional(),
    example: z.unknown().optional(),
  }).loose().optional(),
  responses: iswcRespuestasSchema.optional(),
  tryitConfirm: z.string().optional(),
  tryitAttachments: z.union([z.string(), ObjetoJsonSchema]).optional(),
}).loose();

const iswcAdjuntoSchema = z.object({
  field: z.string().min(1),
  max: z.number().int().min(1).optional(),
  encoding: z.string().optional(),
}).loose();

const iswcCatalogSchema = z.object({
  docs: z.record(z.string(), z.string()).optional(),
  payloads: ObjetoJsonSchema.optional(),
  requestBodies: ObjetoJsonSchema.optional(),
  schemas: z.record(z.string(), ObjetoJsonSchema).optional(),
  tryitConfirm: z.record(z.string(), z.object({ title: z.string().optional(), message: z.string().optional() }).loose()).optional(),
  tryitAttachments: z.object({
    templates: z.record(z.string(), z.object({ images: iswcAdjuntoSchema.optional(), audios: iswcAdjuntoSchema.optional() }).loose()).optional(),
  }).loose().optional(),
}).loose();

/** El documento iswc `kind:"config"` con su integridad referencial (lo que un id nombra existe). */
export const iswcDocumentoSchema = z.object({
  kind: z.literal('config'),
  version: z.number().optional(),
  info: z.object({ title: z.string().min(1), version: z.string().optional(), description: z.string().optional() }).loose().optional(),
  viewer: iswcViewerSchema.optional(),
  tags: z.array(iswcTagSchema).optional(),
  paths: z.record(z.string().startsWith('/', 'la ruta empieza por /'), z.partialRecord(ServerApiDocsMetodoSchema, iswcOperacionSchema)),
  catalog: iswcCatalogSchema.optional(),
}).loose().superRefine((d, ctx) => {
  const cat = d.catalog ?? {};
  const falta = (path: PropertyKey[], que: string, id: string) => ctx.addIssue({ code: 'custom', path, message: `«${id}» no existe en ${que}` });
  const tags = new Map((d.tags ?? []).map((t) => [t.name, new Set((t.subgroups ?? []).map((s) => s.id))]));
  (d.viewer?.nav ?? []).forEach((n, i) => (n.tags ?? []).forEach((t, j) => {
    if (d.tags && !tags.has(t)) falta(['viewer', 'nav', i, 'tags', j], 'tags[].name', t);
  }));
  for (const [ruta, ops] of Object.entries(d.paths)) {
    for (const [metodo, op] of Object.entries(ops ?? {})) {
      if (!op) continue;
      const p = (...resto: PropertyKey[]) => ['paths', ruta, metodo, ...resto];
      if (op.doc && !cat.docs?.[op.doc]) falta(p('doc'), 'catalog.docs', op.doc);
      if (op.requestBody?.bodyKey && !(op.requestBody.bodyKey in (cat.requestBodies ?? {}))) falta(p('requestBody', 'bodyKey'), 'catalog.requestBodies', op.requestBody.bodyKey);
      const r = op.responses;
      if (r?.payload && !(r.payload in (cat.payloads ?? {}))) falta(p('responses', 'payload'), 'catalog.payloads', r.payload);
      if (r?.template === 'deleteEnvelope' && r.schema && !cat.schemas?.[r.schema]) falta(p('responses', 'schema'), 'catalog.schemas', r.schema);
      for (const [codigo, item] of Object.entries(r?.items ?? {})) {
        if (item.payload && !(item.payload in (cat.payloads ?? {}))) falta(p('responses', 'items', codigo, 'payload'), 'catalog.payloads', item.payload);
      }
      if (op.tryitConfirm && !(op.tryitConfirm in (cat.tryitConfirm ?? {}))) falta(p('tryitConfirm'), 'catalog.tryitConfirm', op.tryitConfirm);
      if (typeof op.tryitAttachments === 'string' && !(op.tryitAttachments in (cat.tryitAttachments?.templates ?? {}))) falta(p('tryitAttachments'), 'catalog.tryitAttachments.templates', op.tryitAttachments);
      if (!d.tags) continue;
      for (const [j, t] of (op.tags ?? []).entries()) {
        const subgrupos = tags.get(t);
        if (!subgrupos) falta(p('tags', j), 'tags[].name', t);
        else if (op.subgroup && subgrupos.size && !subgrupos.has(op.subgroup)) falta(p('subgroup'), `tags[«${t}»].subgroups`, op.subgroup);
      }
    }
  }
});

// ── Entrada: OpenAPI 3 (lo mínimo que el visor lee) ──────────────────────────

export const OpenApiDocumentoSchema = z.object({
  openapi: z.string().regex(/^3\./, 'openapi 3.x'),
  info: z.object({ title: z.string().min(1), version: z.string().optional(), description: z.string().optional() }).loose(),
  servers: z.array(iswcServidorSchema).optional(),
  tags: z.array(z.object({ name: z.string().min(1), description: z.string().optional() }).loose()).optional(),
  paths: z.record(z.string().startsWith('/', 'la ruta empieza por /'), z.record(z.string(), z.unknown())),
  components: z.object({ schemas: z.record(z.string(), ObjetoJsonSchema).optional() }).loose().optional(),
}).loose();

/** Resultado de validar la entrada: cada error con su ruta JSON (`paths › /x › get › doc: …`). */
const ServerApiDocsValidacionSchema = z.object({
  ok: z.boolean(),
  formato: z.enum(['iswc', 'openapi', 'desconocido']),
  errores: z.array(z.string()),
});
export type ServerApiDocsValidacion = z.infer<typeof ServerApiDocsValidacionSchema>;

/** ¿El documento admite el parse estricto (iswc v2)? `aplica: false` para OpenAPI 3. */
const ServerApiDocsEstrictoSchema = z.object({ aplica: z.boolean(), ok: z.boolean(), errores: z.array(z.string()) });
export type ServerApiDocsEstricto = z.infer<typeof ServerApiDocsEstrictoSchema>;

// ── Modelo normalizado (lo que el visor pinta) ───────────────────────────────

const ServerApiDocsParametroSchema = z.object({
  nombre: z.string(),
  en: z.enum(['path', 'query', 'header', 'cookie']),
  requerido: z.boolean(),
  descripcion: z.string(),
  tipo: z.string(),
  ejemplo: z.unknown().optional(),
});
export type ServerApiDocsParametro = z.infer<typeof ServerApiDocsParametroSchema>;

const ServerApiDocsRespuestaSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  schema: z.unknown().optional(),
  ejemplo: z.unknown().optional(),
});
export type ServerApiDocsRespuesta = z.infer<typeof ServerApiDocsRespuestaSchema>;

const ServerApiDocsAdjuntoSchema = z.object({ tipo: z.enum(['images', 'audios']), campo: z.string(), max: z.number().int().min(1) });
export type ServerApiDocsAdjunto = z.infer<typeof ServerApiDocsAdjuntoSchema>;

const ServerApiDocsOperacionSchema = z.object({
  /** Identidad estable (`get_conversacion_by_iconversacion`): va en `?s=`. */
  id: z.string(),
  metodo: ServerApiDocsMetodoSchema,
  ruta: z.string(),
  resumen: z.string(),
  descripcion: z.string(),
  tag: z.string(),
  subgrupo: z.string(),
  /** Exige `Authorization: Bearer`. */
  sesion: z.boolean(),
  /** Permiso que exige (`permission` iswc o `x-permission` OpenAPI; `''` si no lo declara). */
  permiso: z.string(),
  /** Controller que lo atiende (`TClase.metodo`; `''` si no lo declara). */
  controller: z.string(),
  parametros: z.array(ServerApiDocsParametroSchema),
  cuerpo: z.object({ requerido: z.boolean(), descripcion: z.string(), schema: z.unknown().optional(), ejemplo: z.unknown().optional() }).nullable(),
  respuestas: z.array(ServerApiDocsRespuestaSchema),
  adjuntos: z.array(ServerApiDocsAdjuntoSchema),
  confirmar: z.object({ titulo: z.string(), mensaje: z.string() }).nullable(),
});
export type ServerApiDocsOperacion = z.infer<typeof ServerApiDocsOperacionSchema>;

const ServerApiDocsSubgrupoSchema = z.object({ id: z.string(), nombre: z.string(), icono: z.string(), descripcion: z.string(), operaciones: z.array(z.string()) });
const ServerApiDocsGrupoSchema = z.object({ nombre: z.string(), descripcion: z.string(), subgrupos: z.array(ServerApiDocsSubgrupoSchema) });
export type ServerApiDocsGrupo = z.infer<typeof ServerApiDocsGrupoSchema>;

/** Cómo se inicia sesión para «Probar»: proveedor + endpoint ya resuelto contra la base activa. */
const ServerApiDocsAuthSchema = z.object({
  proveedor: z.enum(['patyia-portal', 'orquestador']),
  /** Base del login; vacía = la base de la API activa (el server se autentica a sí mismo). */
  loginUrl: z.string(),
  loginPath: z.string(),
  app: z.string(),
});
export type ServerApiDocsAuth = z.infer<typeof ServerApiDocsAuthSchema>;

export const ServerApiDocsModeloSchema = z.object({
  formato: z.enum(['iswc', 'openapi']),
  titulo: z.string(),
  version: z.string(),
  descripcion: z.string(),
  marca: z.object({ titulo: z.string(), icono: z.string() }),
  auth: ServerApiDocsAuthSchema.nullable(),
  servidores: z.array(z.object({ url: z.string(), descripcion: z.string() })),
  grupos: z.array(ServerApiDocsGrupoSchema),
  operaciones: z.array(ServerApiDocsOperacionSchema),
  exportes: z.object({ documento: z.string(), openapi: z.string() }),
});
export type ServerApiDocsModelo = z.infer<typeof ServerApiDocsModeloSchema>;

/** Petición de login ya armada por el proveedor (endpoint, headers y cuerpo del POST). */
const ServerApiDocsLoginSchema = z.object({ endpoint: z.string(), headers: z.record(z.string(), z.string()), body: z.record(z.string(), z.unknown()) });
export type ServerApiDocsLogin = z.infer<typeof ServerApiDocsLoginSchema>;

/** Respuesta del login que el visor acepta: `{ ok: true, token }` (el resto se conserva). */
export const ServerApiDocsLoginRespuestaSchema = z.object({ ok: z.literal(true), token: z.string().min(1) }).loose();

/** Sesión guardada en `sessionStorage` (`iswc:server-api-docs:sesion`). */
export const ServerApiDocsSesionSchema = z.object({ token: z.string().min(1), usuario: z.string() });
export type ServerApiDocsSesion = z.infer<typeof ServerApiDocsSesionSchema>;

/** Valores que el usuario llenó en «Probar»: parámetros de ruta y de query por nombre. */
const ServerApiDocsValoresSchema = z.object({ path: z.record(z.string(), z.string()).optional(), query: z.record(z.string(), z.string()).optional() });
export type ServerApiDocsValores = z.infer<typeof ServerApiDocsValoresSchema>;

/** Objeto JSON genérico que el dominio lee con lectores tipados (sin `as`). */
export type ServerApiDocsObjeto = Record<string, unknown>;

// ── Eventos ──────────────────────────────────────────────────────────────────

/** `iswc-server-api-docs-page`: la vista que se acaba de abrir (`''` = portada). */
const ServerApiDocsPageDetailSchema = z.object({ id: z.string(), titulo: z.string(), metodo: z.string(), ruta: z.string() });
export type ServerApiDocsPageDetail = z.infer<typeof ServerApiDocsPageDetailSchema>;

/** `iswc-server-api-docs-response`: resultado de «Probar». */
const ServerApiDocsResponseDetailSchema = z.object({ id: z.string(), url: z.string(), status: z.number(), ms: z.number() });
export type ServerApiDocsResponseDetail = z.infer<typeof ServerApiDocsResponseDetailSchema>;

// ── Superficies de los componentes del kit que el visor usa ──────────────────

export type ServerApiDocsLayout = HTMLElement & {
  panels: { start: boolean };
  toggleStart(): void;
  scrollContentTo(y: number): void;
  refreshToc(): void;
  scrollToHeading(id: string): void;
};
export type ServerApiDocsIndice = HTMLElement & { items: unknown[]; current: string; textos: Partial<{ placeholder: string; sinResultados: string; resumen: string }>; focusSearch(): void };
export type ServerApiDocsCampo = HTMLElement & { value: string };

/** Payload de `<iswc-sequence-diagram>` que arma `secuenciaDeOperacion` (el visor lo pinta con `diagram-style="iswc"`). */
export type ServerApiDocsSecuencia = { sequence: { title: string; actors: SequenceActorSpec[]; messages: SequenceMessageSpec[]; fragments: SequenceFragmentSpec[] } };
