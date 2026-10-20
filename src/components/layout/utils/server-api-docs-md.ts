/**
 * server-api-docs-md.ts — dominio puro de `<iswc-server-api-docs>` (sin DOM ni red).
 *
 * Valida el documento que publica un server (InSoft `kind:"config"` u OpenAPI 3) con Zod, dice si admite
 * el parse ESTRICTO del documento v2 (`server-api-docs-md.schemas.ts`, el que los servers vendorizan), lo
 * normaliza al modelo Swagger-like que el visor pinta (`ServerApiDocsModelo`) y arma lo que «Probar»
 * necesita: URL, cURL, la petición de login del proveedor y el diagrama de secuencia de cada endpoint.
 * Todo es determinista: lo prueban los tests de caja negra del kit.
 */
import { ApiDocsDocumentoSchema } from '../schemas/server-api-docs-md.schemas.js';
import type { SequenceActorSpec, SequenceFragmentSpec, SequenceMessageSpec } from '../../diagrams/schemas/sequence-spec.schemas.js';
import {
  InsoftDocumentoSchema,
  METODOS_API,
  OpenApiDocumentoSchema,
  ServerApiDocsMetodoSchema,
  type ServerApiDocsAdjunto,
  type ServerApiDocsAuth,
  type ServerApiDocsEstricto,
  type ServerApiDocsGrupo,
  type ServerApiDocsLogin,
  type ServerApiDocsModelo,
  type ServerApiDocsOperacion,
  type ServerApiDocsParametro,
  type ServerApiDocsRespuesta,
  type ServerApiDocsSecuencia,
  type ServerApiDocsValidacion,
  type ServerApiDocsValores,
  type ServerApiDocsObjeto as Obj,
} from '../schemas/server-api-docs.schemas.js';

const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def);
const esObjeto = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);

/** Orquestador público de InSoft: canjea credenciales por JWT cuando el documento no trae `loginUrl`. */
export const LOGIN_ORQUESTADOR = 'https://main-orchestrator.jeffaporta.workers.dev';
/** Empresa por defecto cuando el login responde `MULTI_EMPRESA` (lo mismo que hace el portal). */
export const ITERCERO_POR_DEFECTO = '810000630';

/** Formato del documento por su forma (sin validarlo). */
export function formatoDe(doc: unknown): ServerApiDocsValidacion['formato'] {
  const d = obj(doc);
  if (d.kind === 'config') return 'insoft';
  if (typeof d.openapi === 'string') return 'openapi';
  return 'desconocido';
}

/** ¿Se puede pintar? Basta el formato y un `paths` objeto: un documento con avisos sigue cargando. */
export const esMaterializable = (doc: unknown): boolean => formatoDe(doc) !== 'desconocido' && esObjeto(obj(doc).paths);

/** Valida con Zod: cada problema con su ruta JSON (`paths › /x › get › doc: «x» no existe en catalog.docs`). */
export function validarDocumentoApi(doc: unknown): ServerApiDocsValidacion {
  const formato = formatoDe(doc);
  if (formato === 'desconocido') return { ok: false, formato, errores: ['(raíz): el documento no es InSoft (kind:"config") ni OpenAPI 3 (openapi:"3.x")'] };
  const r = (formato === 'insoft' ? InsoftDocumentoSchema : OpenApiDocumentoSchema).safeParse(doc);
  if (r.success) return { ok: true, formato, errores: [] };
  return { ok: false, formato, errores: r.error.issues.map((i) => `${i.path.length ? i.path.map(String).join(' › ') : '(raíz)'}: ${i.message}`) };
}

/**
 * ¿Admite el parse estricto (InSoft `kind:"config"` v2, `ApiDocsDocumentoSchema`)? Cada error con su ruta
 * JSON. Un OpenAPI 3 no aplica (el estricto es el contrato InSoft); un InSoft v1 aplica y no lo admite.
 */
export function validarEstricto(doc: unknown): ServerApiDocsEstricto {
  if (formatoDe(doc) !== 'insoft') return { aplica: false, ok: false, errores: [] };
  const r = ApiDocsDocumentoSchema.safeParse(doc);
  if (r.success) return { aplica: true, ok: true, errores: [] };
  return { aplica: true, ok: false, errores: r.error.issues.map((i) => `${i.path.length ? i.path.map(String).join(' › ') : '(raíz)'}: ${i.message}`) };
}

/** Id estable de la operación: `operationId` o método + ruta (`get_conversacion_by_iconversacion`). */
export const idDeOperacion = (metodo: string, ruta: string, operationId?: unknown): string =>
  typeof operationId === 'string' && operationId ? operationId : `${metodo}_${ruta.replace(/\{(\w+)\}/g, 'by_$1').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`;

// ── Respuestas InSoft (templates → códigos concretos) ────────────────────────

const ENCABEZADO = {
  type: 'object',
  properties: {
    resultado: { type: 'boolean' }, tiempo: { type: 'number' }, fhentrada: { type: 'string', format: 'date-time' },
    fhsalida: { type: 'string', format: 'date-time' }, imensaje: { type: 'integer' }, mensaje: { type: 'string' },
  },
};
const SOBRE = { type: 'object', properties: { encabezado: ENCABEZADO, respuesta: { type: 'object' } } };
const SOBRE_ERROR = { type: 'object', required: ['encabezado'], properties: { encabezado: ENCABEZADO } };
const error = (imensaje: number, mensaje: string) => ({ encabezado: { resultado: false, tiempo: -1, imensaje, mensaje } });
const R401: ServerApiDocsRespuesta = { codigo: '401', descripcion: 'No autorizado', schema: SOBRE_ERROR, ejemplo: error(401020, 'No se ha definido el parámetro de autenticación, por favor verifique que esté enviando el header, query o parámetro "authorization".') };
const R403: ServerApiDocsRespuesta = { codigo: '403', descripcion: 'Sin permisos', schema: SOBRE_ERROR, ejemplo: error(403010, 'No tiene permisos para acceder a este recurso.') };
const R404: ServerApiDocsRespuesta = { codigo: '404', descripcion: 'No encontrado', schema: SOBRE_ERROR, ejemplo: error(404010, 'No se ha encontrado el recurso solicitado.') };

/** JSON Schema deducido de un ejemplo (lo que el endpoint devuelve cuando el documento no trae schema). */
export function schemaDeEjemplo(v: unknown): Obj {
  if (Array.isArray(v)) return { type: 'array', items: v.length ? schemaDeEjemplo(v[0]) : { type: 'object' } };
  if (v === null || v === undefined) return { type: 'object' };
  if (typeof v === 'object') return { type: 'object', properties: Object.fromEntries(Object.entries(obj(v)).map(([k, x]) => [k, schemaDeEjemplo(x)])) };
  if (typeof v === 'number') return { type: Number.isInteger(v) ? 'integer' : 'number' };
  if (typeof v === 'boolean') return { type: 'boolean' };
  return /^\d{4}-\d{2}-\d{2}T/.test(String(v)) ? { type: 'string', format: 'date-time' } : { type: 'string' };
}

function respuestasInsoft(cat: Obj, def: unknown): ServerApiDocsRespuesta[] {
  const r = obj(def);
  const payloads = obj(cat.payloads);
  const payload = (k: unknown): unknown => (typeof k === 'string' && k in payloads ? payloads[k] : {});
  const contenido = esObjeto(r.schema) ? schemaDeCatalogo(cat, r.schema) : schemaDeEjemplo(payload(r.payload));
  const sobre = { ...SOBRE, properties: { ...SOBRE.properties, respuesta: contenido } };
  const ok = (schema: unknown = sobre): ServerApiDocsRespuesta => ({ codigo: '200', descripcion: str(r.description, 'OK'), schema, ejemplo: payload(r.payload) });
  switch (str(r.template)) {
    case 'auth':
    case 'authForbidden': return [ok(), R401, R403];
    case 'authNotFound': return [ok(), R401, R404];
    case 'deleteEnvelope': {
      const fila = obj(obj(cat.schemas)[str(r.schema)]);
      return [ok({ ...SOBRE, properties: { ...SOBRE.properties, respuesta: Object.keys(fila).length ? fila : { type: 'object' } } }), R401, R404];
    }
    case 'raw': {
      const items = Object.entries(obj(r.items)).map(([codigo, v]): ServerApiDocsRespuesta => {
        const it = obj(v);
        const ejemplo = it.example ?? (it.payload ? payload(it.payload) : undefined);
        return { codigo, descripcion: str(it.description, 'OK'), schema: it.schema ?? (ejemplo !== undefined ? schemaDeEjemplo(ejemplo) : { type: 'object' }), ejemplo };
      });
      return items.length ? items : [{ codigo: '200', descripcion: 'OK', schema: { type: 'object' } }];
    }
    case '':
      return Object.keys(r).length ? [ok()] : [{ codigo: '200', descripcion: 'OK', schema: { type: 'object' }, ejemplo: {} }];
    default: return [ok()];
  }
}

// ── Piezas comunes ───────────────────────────────────────────────────────────

const tipoDeSchema = (s: unknown): string => {
  const o = obj(s);
  const t = str(o.type, o.$ref ? str(o.$ref).split('/').pop() ?? 'object' : 'string');
  return t === 'array' ? `${tipoDeSchema(o.items)}[]` : o.enum ? `${t} (${arr(o.enum).map(String).join(' | ')})` : t;
};

const parametro = (p: Obj): ServerApiDocsParametro => {
  const en = str(p.in);
  return {
    nombre: str(p.name),
    en: en === 'path' || en === 'header' || en === 'cookie' ? en : 'query',
    requerido: p.required === true || en === 'path',
    descripcion: str(p.description),
    tipo: tipoDeSchema(p.schema),
    ...(p.example !== undefined ? { ejemplo: p.example } : obj(p.schema).default !== undefined ? { ejemplo: obj(p.schema).default } : {}),
  };
};

/** `$ref` a `#/catalog/schemas/x` resuelto (un nivel, lo que el documento InSoft usa). */
function schemaDeCatalogo(cat: Obj, schema: unknown): unknown {
  const ref = str(obj(schema).$ref).match(/#\/catalog\/schemas\/([^/]+)$/)?.[1];
  const def = ref ? obj(obj(cat.schemas)[ref]) : {};
  return ref && Object.keys(def).length ? def : schema;
}

const adjuntos = (plantilla: unknown): ServerApiDocsAdjunto[] => (['images', 'audios'] as const).flatMap((tipo) => {
  const a = obj(obj(plantilla)[tipo]);
  return a.field ? [{ tipo, campo: str(a.field), max: typeof a.max === 'number' && a.max > 0 ? a.max : 5 }] : [];
});

// ── InSoft kind:"config" ─────────────────────────────────────────────────────

function operacionInsoft(cat: Obj, metodo: ServerApiDocsOperacion['metodo'], ruta: string, def: Obj): ServerApiDocsOperacion {
  const params = arr(def.parameters).map(obj).filter((p) => p.name);
  // QUERY no admite `?q=`: esos campos viajan en el cuerpo JSON (el server respondería 400).
  const enCuerpo = metodo === 'query' ? params.filter((p) => p.in === 'query') : [];
  const rb = obj(def.requestBody);
  const json = obj(obj(obj(rb.content)['application/json']));
  const ejemploRb = rb.bodyKey ? obj(cat.requestBodies)[str(rb.bodyKey)] : rb.example ?? json.example;
  const cuerpo: ServerApiDocsOperacion['cuerpo'] = Object.keys(rb).length
    ? { requerido: rb.required !== false, descripcion: str(rb.description, 'Cuerpo de la petición'), schema: schemaDeCatalogo(cat, rb.schema ?? json.schema ?? { type: 'object' }), ejemplo: ejemploRb }
    : enCuerpo.length
      ? { requerido: false, descripcion: 'Filtros de la consulta', schema: { type: 'object', properties: Object.fromEntries(enCuerpo.map((p) => [str(p.name), p.schema ?? { type: 'string' }])) }, ejemplo: Object.fromEntries(enCuerpo.flatMap((p) => (p.example !== undefined ? [[str(p.name), p.example]] : []))) }
      : null;
  const att = def.tryitAttachments;
  const confirmar = obj(obj(cat.tryitConfirm)[str(def.tryitConfirm)]);
  return {
    id: idDeOperacion(metodo, ruta, def.operationId),
    metodo,
    ruta,
    resumen: str(def.summary, ruta),
    descripcion: str(def.description),
    tag: str(arr(def.tags)[0], 'General'),
    subgrupo: str(def.subgroup),
    sesion: def.security === 'bearer' || def.security === 'Bearer',
    permiso: str(def.permission),
    controller: str(def.controller),
    parametros: params.filter((p) => !enCuerpo.includes(p)).map(parametro),
    cuerpo,
    respuestas: respuestasInsoft(cat, def.responses),
    adjuntos: adjuntos(typeof att === 'string' ? obj(obj(obj(cat.tryitAttachments).templates)[att]) : att),
    confirmar: def.tryitConfirm ? { titulo: str(confirmar.title, str(def.summary)), mensaje: str(confirmar.message, '¿Ejecutar esta operación contra el servidor?') } : null,
  };
}

// ── OpenAPI 3 ────────────────────────────────────────────────────────────────

function operacionOpenApi(doc: Obj, metodo: ServerApiDocsOperacion['metodo'], ruta: string, def: Obj, comunes: unknown[]): ServerApiDocsOperacion {
  const json = (contenido: unknown): Obj => obj(obj(contenido)['application/json']);
  const ejemplo = (m: Obj): unknown => m.example ?? obj(Object.values(obj(m.examples))[0]).value ?? obj(m.schema).example;
  const rb = obj(def.requestBody);
  const mrb = json(rb.content);
  const seguridad = arr(def.security ?? doc.security);
  return {
    id: idDeOperacion(metodo, ruta, def.operationId),
    metodo,
    ruta,
    resumen: str(def.summary, ruta),
    descripcion: str(def.description),
    tag: str(arr(def.tags)[0], 'General'),
    subgrupo: str(def['x-isa-subgroup']),
    sesion: seguridad.some((s) => Object.keys(obj(s)).length > 0),
    permiso: str(def['x-permission']),
    controller: str(def['x-controller']),
    parametros: [...comunes, ...arr(def.parameters)].map(obj).filter((p) => p.name).map(parametro),
    cuerpo: Object.keys(rb).length ? { requerido: rb.required === true, descripcion: str(rb.description, 'Cuerpo de la petición'), schema: mrb.schema, ejemplo: ejemplo(mrb) } : null,
    respuestas: Object.entries(obj(def.responses)).map(([codigo, v]) => {
      const m = json(obj(v).content);
      return { codigo, descripcion: str(obj(v).description), schema: m.schema, ejemplo: ejemplo(m) };
    }),
    adjuntos: adjuntos(def.tryitAttachments),
    confirmar: null,
  };
}

// ── Modelo ───────────────────────────────────────────────────────────────────

const slug = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'api';

function authInsoft(viewer: Obj): ServerApiDocsAuth | null {
  const a = obj(viewer.auth);
  if (!Object.keys(a).length || a.enabled === false) return null;
  const patyia = a.provider === 'patyia-portal';
  return {
    proveedor: patyia ? 'patyia-portal' : 'orquestador',
    loginUrl: str(a.loginUrl, patyia ? '' : LOGIN_ORQUESTADOR),
    loginPath: str(a.loginPath, patyia ? '/auth/portal-login' : '/auth/login'),
    app: str(a.app, patyia ? 'isa-patyia' : 'swagger'),
  };
}

/** Grupos (tag → subgrupos → ids) en el orden que declara el documento; lo no declarado, detrás. */
function agrupar(ops: ServerApiDocsOperacion[], tags: Obj[], orden: string[]): ServerApiDocsGrupo[] {
  const meta = new Map(tags.map((t) => [str(t.name), t]));
  const nombres = [...new Set([...orden, ...tags.map((t) => str(t.name)), ...ops.map((o) => o.tag)])].filter((n) => ops.some((o) => o.tag === n));
  return nombres.map((nombre) => {
    const t = meta.get(nombre) ?? {};
    const declarados = arr(t.subgroups ?? t['x-isa-subgroups']).map(obj);
    const delTag = ops.filter((o) => o.tag === nombre);
    const ids = [...new Set([...declarados.map((s) => str(s.id)), ...delTag.map((o) => o.subgrupo)])];
    return {
      nombre,
      descripcion: str(t.description),
      subgrupos: ids.map((id) => {
        const s = declarados.find((d) => d.id === id) ?? {};
        return { id, nombre: str(s.name, id || 'General'), icono: str(s.icon), descripcion: str(s.description), operaciones: delTag.filter((o) => o.subgrupo === id).map((o) => o.id) };
      }).filter((s) => s.operaciones.length),
    };
  });
}

/**
 * Documento → modelo del visor. Lanza si no es materializable (sin formato o sin `paths`); un
 * documento con avisos de validación se normaliza igual (tolerante, como el visor anterior).
 */
export function normalizarDocumentoApi(doc: unknown): ServerApiDocsModelo {
  if (!esMaterializable(doc)) throw new Error(validarDocumentoApi(doc).errores.join('\n') || 'documento sin paths');
  const d = obj(doc);
  const insoft = formatoDe(doc) === 'insoft';
  const info = obj(d.info);
  const viewer = obj(d.viewer);
  const cat = obj(d.catalog);
  const ops: ServerApiDocsOperacion[] = [];
  for (const [ruta, item] of Object.entries(obj(d.paths))) {
    const metodos = obj(item);
    for (const metodo of METODOS_API) {
      const def = metodos[metodo];
      if (!esObjeto(def)) continue;
      const m = ServerApiDocsMetodoSchema.parse(metodo);
      ops.push(insoft ? operacionInsoft(cat, m, ruta, obj(def)) : operacionOpenApi(d, m, ruta, obj(def), arr(metodos.parameters)));
    }
  }
  const titulo = str(info.title, 'API');
  const exportes = obj(viewer.exports);
  const ordenNav = arr(viewer.nav).flatMap((n) => arr(obj(n).tags).map(String));
  return {
    formato: insoft ? 'insoft' : 'openapi',
    titulo,
    version: str(info.version),
    descripcion: str(info.description),
    marca: { titulo: str(obj(viewer.brand).title, titulo), icono: str(obj(viewer.brand).icon, 'mdi:api') },
    auth: insoft ? authInsoft(viewer) : null,
    servidores: arr(insoft ? viewer.servers : d.servers).map(obj).filter((s) => s.url).map((s) => ({ url: str(s.url).replace(/\/+$/, ''), descripcion: str(s.description) })),
    grupos: agrupar(ops, arr(d.tags).map(obj), ordenNav),
    operaciones: ops,
    exportes: { documento: str(exportes.isDownloadName, `${slug(titulo)}.docs.json`), openapi: str(exportes.openApiDownloadName, `${slug(titulo)}.openapi.json`) },
  };
}

// ── «Probar» ─────────────────────────────────────────────────────────────────

/** URL final: base sin `/` final + ruta con `{x}` sustituidos (codificados) + query no vacía. */
export function urlDeOperacion(base: string, op: Pick<ServerApiDocsOperacion, 'ruta'>, valores: ServerApiDocsValores = {}): string {
  const ruta = op.ruta.replace(/\{([^}]+)\}/g, (m, n: string) => (valores.path?.[n] ? encodeURIComponent(valores.path[n]!) : m));
  const qs = new URLSearchParams(Object.entries(valores.query ?? {}).filter(([, v]) => v !== '')).toString();
  return `${base.replace(/\/+$/, '')}${ruta}${qs ? `?${qs}` : ''}`;
}

const comillas = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** JSON en una línea para el cURL; un cuerpo que no es JSON va tal cual (el usuario lo está escribiendo). */
function compacto(texto: string): string {
  try {
    return JSON.stringify(JSON.parse(texto));
  } catch {
    return texto;
  }
}

/** cURL equivalente a la petición (el token se muestra recortado si se pide `ocultarToken`). */
export function curlDe(base: string, op: Pick<ServerApiDocsOperacion, 'ruta' | 'metodo' | 'sesion'>, valores: ServerApiDocsValores & { cuerpo?: string; token?: string; ocultarToken?: boolean } = {}): string {
  const lineas = [`curl -X ${op.metodo.toUpperCase()} ${comillas(urlDeOperacion(base, op, valores))}`, `  -H 'Accept: application/json'`];
  if (op.sesion || valores.token) {
    const t = valores.token ? (valores.ocultarToken ? `${valores.token.slice(0, 12)}…` : valores.token) : '<token>';
    lineas.push(`  -H ${comillas(`Authorization: Bearer ${t}`)}`);
  }
  if (valores.cuerpo?.trim()) lineas.push(`  -H 'Content-Type: application/json'`, `  -d ${comillas(compacto(valores.cuerpo.trim()))}`);
  return lineas.join(' \\\n');
}

/** Color del kit por método HTTP (la única tabla: chips del índice, cabecera y botón «Enviar»). */
export const COLOR_METODO: Readonly<Record<string, string>> = { get: 'info', post: 'success', put: 'warning', patch: 'brand', delete: 'danger', query: 'brand' };

/** Color del kit por código de respuesta (401/403 se distinguen del resto de 4xx por el texto, no el color). */
export const colorDeCodigo = (codigo: string | number): 'success' | 'warning' | 'danger' | 'neutral' => {
  const n = Number(codigo);
  return n >= 200 && n < 300 ? 'success' : n >= 400 && n < 500 ? 'warning' : n >= 500 ? 'danger' : 'neutral';
};

// ── Login ────────────────────────────────────────────────────────────────────

const cesar = (texto: string, n: number): string => texto.replace(/[A-Za-z]/g, (c) => {
  const base = c <= 'Z' ? 65 : 97;
  return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base);
});

/** Contraseña «envuelta» del orquestador (César por día UTC + prefijo/sufijo): contrato, no cifrado. */
export const envolverClave = (plana: string, dia = new Date().getUTCDate()): string => (plana ? cesar(`abc123${plana}xyz987`, dia) : plana);

/**
 * Petición de login del proveedor del documento. `patyia-portal` manda la contraseña en claro (el
 * server hace md5) y el correo tal cual; `orquestador` la envuelve y quita el dominio contapyme.
 */
export function peticionLogin(auth: ServerApiDocsAuth, base: string, usuario: string, clave: string, itercero = ''): ServerApiDocsLogin {
  const raiz = (auth.loginUrl || base).replace(/\/+$/, '');
  const endpoint = `${raiz}${auth.loginPath.startsWith('/') ? '' : '/'}${auth.loginPath}`;
  const body: Record<string, unknown> = auth.proveedor === 'patyia-portal'
    ? { semail: usuario.trim(), password: clave }
    : { semail: usuario.trim().replace(/@contapyme\.(com|co)$/i, ''), password: envolverClave(clave), app: auth.app };
  if (itercero) body.itercero = itercero;
  return { endpoint, headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-App-Id': auth.app }, body };
}

// ── Exportar ─────────────────────────────────────────────────────────────────

/** Modelo → OpenAPI 3.0.3 (para Postman, Insomnia o cualquier herramienta estándar). */
export function aOpenApi(m: ServerApiDocsModelo, base = ''): Obj {
  const paths: Record<string, Obj> = {};
  for (const op of m.operaciones) {
    paths[op.ruta] ??= {};
    paths[op.ruta]![op.metodo] = {
      operationId: op.id,
      summary: op.resumen,
      ...(op.descripcion ? { description: op.descripcion } : {}),
      ...(op.permiso ? { 'x-permission': op.permiso } : {}),
      ...(op.controller ? { 'x-controller': op.controller } : {}),
      tags: [op.tag],
      ...(op.sesion ? { security: [{ Bearer: [] }] } : {}),
      ...(op.parametros.length ? { parameters: op.parametros.map((p) => ({ name: p.nombre, in: p.en, required: p.requerido, description: p.descripcion, schema: { type: p.tipo.replace(/[[\] (].*$/, '') || 'string' }, ...(p.ejemplo !== undefined ? { example: p.ejemplo } : {}) })) } : {}),
      ...(op.cuerpo ? { requestBody: { required: op.cuerpo.requerido, description: op.cuerpo.descripcion, content: { 'application/json': { schema: op.cuerpo.schema ?? { type: 'object' }, ...(op.cuerpo.ejemplo !== undefined ? { example: op.cuerpo.ejemplo } : {}) } } } } : {}),
      responses: Object.fromEntries(op.respuestas.map((r) => [r.codigo, { description: r.descripcion || 'OK', content: { 'application/json': { schema: r.schema ?? { type: 'object' }, ...(r.ejemplo !== undefined ? { example: r.ejemplo } : {}) } } }])),
    };
  }
  return {
    openapi: '3.0.3',
    info: { title: m.titulo, version: m.version || '1.0.0', description: m.descripcion },
    servers: (m.servidores.length ? m.servidores : base ? [{ url: base, descripcion: 'Activo' }] : []).map((s) => ({ url: s.url, description: s.descripcion })),
    tags: m.grupos.map((g) => ({ name: g.nombre, description: g.descripcion })),
    paths,
    components: { securitySchemes: { Bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  };
}

// ── Diagrama de secuencia por endpoint ───────────────────────────────────────

/**
 * Secuencia del endpoint: cliente → server (con Bearer si exige sesión) → permiso → controller → respuesta;
 * las respuestas que no son 2xx van en un fragmento `alt`. Se arma solo con lo que declara el documento.
 */
export function secuenciaDeOperacion(op: ServerApiDocsOperacion, server = 'API'): ServerApiDocsSecuencia {
  const [clase, metodo] = op.controller.split('.');
  const actors: SequenceActorSpec[] = [
    { id: 'C', label: 'Cliente', icon: 'mdi:monitor-cellphone', kind: 'participant' },
    { id: 'S', label: server, icon: 'mdi:server', kind: 'participant' },
    ...(clase ? [{ id: 'K', label: clase, icon: 'mdi:cog-outline', kind: 'participant' as const }] : []),
  ];
  const messages: SequenceMessageSpec[] = [];
  const msg = (from: string, to: string, label: string, kind: string): string => {
    const id = `m${messages.length + 1}`;
    messages.push({ id, from, to, label, kind, step: messages.length + 1, stepLabel: String(messages.length + 1) });
    return id;
  };
  msg('C', 'S', `${op.metodo.toUpperCase()} ${op.ruta}${op.sesion ? ' · Bearer JWT' : ''}`, 'sync');
  if (op.sesion) msg('S', 'S', op.permiso ? `Permiso ${op.permiso}` : 'Valida la sesión', 'self');
  if (clase) {
    msg('S', 'K', `${metodo || 'atender'}()`, 'sync');
    msg('K', 'S', 'resultado', 'reply');
  }
  const exito = op.respuestas.filter((r) => /^2/.test(r.codigo));
  for (const r of exito.length ? exito : [{ codigo: '200', descripcion: 'OK' }]) msg('S', 'C', `${r.codigo} ${r.descripcion}`, 'reply');
  const errores = op.respuestas.filter((r) => !/^2/.test(r.codigo)).map((r) => msg('S', 'C', `${r.codigo} ${r.descripcion}`, 'reply'));
  const fragments: SequenceFragmentSpec[] = errores.length ? [{ id: 'f1', name: 'alt', kind: 'alt', messages: errores, span: 'actors', condition: 'si falla' }] : [];
  return { sequence: { title: `${op.resumen} (${op.metodo.toUpperCase()} ${op.ruta})`, actors, messages, fragments } };
}
