// @vendor 2026-10-14T15:03:31.623Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/client/tools/render-lote.mjs
// Bundle autocontenido de src/vendor-distributions/client/tools/render-lote.ts (scripts/build-online.mjs): se ejecuta online con Deno desde @main. No editar: la fuente es src/vendor-distributions/client/tools/render-lote.ts.

// src/vendor-distributions/client/tools/render-lote.ts
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync as existsSync2 } from "node:fs";
import { mkdir as mkdir3, readdir, readFile as readFile3, rename as rename2, writeFile as writeFile3 } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir as tmpdir2 } from "node:os";
import { dirname as dirname3, join as join3, relative as relative2, resolve as resolve2 } from "node:path";
import process2 from "node:process";
import { pathToFileURL as pathToFileURL2 } from "node:url";

// src/vendor-distributions/client/tools/render-diagram.ts
import { mkdir as mkdir2, writeFile as writeFile2, rm, rename, readFile as readFile2 } from "node:fs/promises";

// src/vendor-distributions/shared/lib/obj.ts
import {
  nullable as zNullable,
  object as zObject,
  optional as zOptional,
  safeParse,
  ZodArray,
  ZodCatch,
  ZodDefault,
  ZodExactOptional,
  ZodLazy,
  ZodNonOptional,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodPipe,
  ZodPrefault,
  ZodPromise,
  ZodReadonly,
  ZodRecord,
  ZodSuccess,
  ZodUnion
} from "npm:zod@^4.4.3";

// src/vendor-distributions/shared/schemas.ts
import { z } from "npm:zod@^4.4.3";
var ZConsulta = z.lazy(
  () => z.union([z.boolean(), z.number(), z.string(), z.null(), z.undefined(), z.record(z.string(), ZConsulta)])
);
var ZJson = z.lazy(
  () => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(ZJson), z.record(z.string(), ZJson)])
);
var ZAccionObj = z.discriminatedUnion("op", [
  z.object({ op: z.literal("push"), valor: ZJson }),
  z.object({ op: z.literal("update"), valor: ZJson }),
  z.object({ op: z.literal("insert"), valor: ZJson }),
  z.object({ op: z.literal("delete"), query: ZConsulta }),
  z.object({ op: z.literal("get"), query: ZConsulta }),
  z.object({ op: z.literal("getValue"), query: ZConsulta })
]);
var ZRefObj = z.object({
  path: z.string().min(1),
  query: ZConsulta,
  actions: z.array(ZAccionObj).optional()
});
var ZCooldownLlave = z.union([z.string().datetime({ offset: true }), z.literal(-1)]);
var ZEntradaLlave = z.object({ nombre: z.string().min(1).optional(), model: z.string().optional(), cooldownHasta: ZCooldownLlave.optional() }).passthrough();
var ZProveedorLlm = z.object({
  /** Id del proveedor (`deepseek`, `minimax`, `openai`…); por defecto el `model`. */
  nombre: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
  /** Base del API sin barra final. Default OpenAI. */
  baseUrl: z.string().trim().min(1).default("https://api.openai.com/v1"),
  /** Cuerpo extra que el proveedor exige o acepta (p. ej. MiniMax: `{ thinking: { type: 'disabled' } }`). */
  extra: z.record(z.string(), z.unknown()).optional()
}).transform((p) => ({ ...p, nombre: p.nombre ?? p.model, baseUrl: p.baseUrl.replace(/\/+$/, "") }));
var ZArchivoProveedores = z.object({ proveedores: z.array(z.unknown()).default([]) });
var ZCacheProveedor = z.object({ nombre: z.string().min(1), ts: z.number() });
var ZLlaveJev = z.object({
  nombre: z.string().min(1).default("jev"),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default("jev-latest"),
  baseUrl: z.string().trim().min(1).default("https://api.typesafe.ai/v1")
}).passthrough().transform((j) => ({ ...j, baseUrl: j.baseUrl.replace(/\/+$/, "") }));
var ZPreguntaJev = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), instructions: z.string().min(1) }),
  z.object({ type: z.literal("choice"), instructions: z.string().min(1), criteria: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal("score"), instructions: z.string().min(1), criteria: z.array(z.string()).min(2) })
]);
var ZRespuestaJev = z.object({
  type: z.enum(["noul", "choice", "score"]),
  noul: z.number().optional(),
  choice: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional()
}).passthrough();
var ZCuerpoJev = z.object({ model: z.string().optional(), answers: z.record(z.string(), ZRespuestaJev) }).passthrough();
var ZPerfilVendor = z.enum(["server", "client"]);
var ZArchivoVendor = z.object({
  /** Ruta en el repo (p. ej. `dist/cdn/vendor-distributions/shared/lib/obj.ts` o `skills/iswc-foundation`). */
  desde: z.string().min(1),
  /** Ruta en el consumidor, relativa a `raiz` (p. ej. `src/sources/000 Base/ISU/obj.ts` o `skills/iswc-foundation`). */
  hacia: z.string().min(1),
  /** Documentación del archivo en el repo (va como `@doc` en la cabecera). */
  doc: z.string().min(1).optional(),
  /** `true`: `desde` es una carpeta; se trae el árbol completo bajo `hacia` (listado del checkout local o de jsDelivr). */
  carpeta: z.boolean().optional()
});
var ZPinVendor = z.object({
  /** `false` no corre el protocolo de pines. Default `true`. */
  activo: z.boolean().default(true),
  /** Rutas (relativas a `raiz`) a barrer en busca de pines. Default: las de `pin-update.mjs` (front típico). */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que no se barren. Default: `node_modules, vendor, dist, .tmp-scss, .git`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Archivo que debe existir en el pin para darlo por publicado. Default `dist/cdn/core/loader.min.js`. */
  verificar: z.string().min(1).optional(),
  /** Pin a usar como fuente web cuando el consumidor no cita ningún `<repo>@<sha40>` (p. ej. un server sin front). */
  sha: z.string().regex(/^[0-9a-f]{40}$/).optional()
});
var ZConfigVendor = z.object({
  /** `dueño/repo` en GitHub (el kit u otro: el barrido sirve para cualquier repo). */
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  /** Rama que se sigue (para el protocolo de pines y como respaldo sin pin). */
  rama: z.string().min(1).default("main"),
  /** Checkout local del repo (opcional): compite por fecha con la web; si no existe, se omite. */
  local: z.string().optional(),
  /**
   * Perfil del consumidor (`server` o `client`): solo se bajan `vendor-distributions/shared/` y
   * `vendor-distributions/<perfil>/`; con `server`, además, ningún archivo puede traer dependencias de
   * navegador. Sin perfil se baja todo (modo anterior) con aviso.
   */
  perfil: ZPerfilVendor.optional(),
  /** Raíz del consumidor (base de `hacia` y del barrido). Por defecto, el directorio desde el que se corre. */
  raiz: z.string().optional(),
  /** Carpetas a barrer en busca de cabeceras `@vendor` (relativas a `raiz`). Default: toda la raíz. */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que el barrido no entra, además de `node_modules, .git, dist, _entregable, .tmp*`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Protocolo de pines y pin de respaldo (ver `ZPinVendor`). */
  pin: ZPinVendor.optional(),
  /** Altas: lo que aún no existe en el consumidor. Vacío = solo barrido. */
  archivos: z.array(ZArchivoVendor).default([])
});
var IconIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
var OpcionesDescargaSchema = z.object({
  /** Raíz de la app (carpeta o URL `file:`). */
  raiz: z.union([z.string(), z.instanceof(URL)]),
  /** Archivos o carpetas a barrer, relativos a la raíz. */
  roots: z.array(z.string()).min(1),
  /** Carpeta de salida, relativa a la raíz: ahí va `iconify/`. */
  salida: z.string().optional(),
  /** Ids que el barrido no puede ver (armados en ejecución, o los que pintan los componentes del kit: el aviso `[iswc-icon] falta en local:` los nombra). */
  extra: z.array(IconIdSchema).optional(),
  /** Nombres de carpeta que no se barren. */
  ignorar: z.array(z.string()).optional(),
  /** Extensiones barridas. */
  extensiones: z.array(z.string()).optional(),
  /** Borrar SVG de `iconify/` que ya nadie usa. */
  podar: z.boolean().optional(),
  /** Sin red: conserva lo que ya está en disco. */
  offline: z.boolean().optional(),
  /** API de Iconify. */
  api: z.string().url().optional(),
  /** Descargas en paralelo. */
  concurrencia: z.number().int().positive().optional(),
  /** Silencio en consola. */
  silencioso: z.boolean().optional()
});
var ResumenDescargaSchema = z.object({
  archivos: z.number(),
  encontrados: z.number(),
  descargados: z.array(IconIdSchema),
  existentes: z.number(),
  inexistentes: z.array(IconIdSchema),
  podados: z.array(IconIdSchema),
  avisos: z.array(z.string()),
  /** Carpeta de los SVG, relativa a la raíz (`assets/iconify`). */
  carpeta: z.string()
});
var CajaIconifySchema = { width: z.number().optional(), height: z.number().optional(), left: z.number().optional(), top: z.number().optional() };
var IconifyJsonSchema = z.object({
  ...CajaIconifySchema,
  icons: z.record(z.string(), z.object({ body: z.string(), ...CajaIconifySchema })).optional(),
  aliases: z.record(z.string(), z.unknown()).optional()
});
var EditableSchema = z.object({
  slug: z.string().optional(),
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
  payload: z.unknown()
});
var OpcionesEditablesSchema = z.object({
  /** Slugs a renderizar (vacío = todos). */
  only: z.array(z.string()).optional(),
  /** Archivos de solo soporte (incrustados por otros): no se dibujan. */
  soporte: z.array(z.string()).optional(),
  /** Defaults si el editable no los trae. */
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional()
});
var EditableLoteSchema = z.object({
  /** Nombre de salida; por defecto el del archivo sin `.json`. */
  slug: z.string().optional(),
  /** Módulo de docs al que pertenece (entra en la huella). */
  module: z.string().optional(),
  /** Custom element del kit (`iswc-flowchart`, `iswc-er-diagram`…). */
  tag: z.string(),
  /** Módulo relativo a `<kit>/dist/cdn/` (`diagrams/flowchart.min.js`). */
  script: z.string(),
  attrs: z.record(z.string(), z.string()).optional(),
  /** Payload declarativo; puede llevar referencias `{ path, query, actions }` relativas al editable. */
  payload: z.unknown(),
  oficial: z.boolean().optional()
});
var OpcionesLoteDatosSchema = z.object({
  /** Carpeta de editables `<slug>.json`. */
  carpeta: z.string().min(1),
  /** Carpeta de salida de los SVG. */
  salidaSvg: z.string().min(1),
  /** Carpeta de salida de los PNG (si `png`). */
  salidaPng: z.string().min(1),
  /** Archivo de caché; por defecto `<carpeta>/diagramas-iswc.cache.json`. */
  cache: z.string().optional(),
  /**
   * Raíz de un checkout del kit (opcional): si está, `dist/cdn/…` y Playwright salen de ahí. Sin él (o para lo que
   * falte), `dist/cdn/…` se pide a `https://raw.githubusercontent.com/<repo>/<pinKit|main>/` y Playwright sale del
   * `package.json` del directorio actual (o de `npm:playwright`).
   */
  kit: z.string().min(1).optional(),
  /** Sello del kit que entra en la huella; por defecto `<kit>/PIN` o `dist/cdn/build-stamp.json`. */
  pinKit: z.string().optional(),
  /** Slugs a procesar (vacío = todos). */
  solo: z.array(z.string()).optional(),
  /** Ignora el caché: renderiza todo. */
  forzar: z.boolean().optional(),
  /** Intentos por diagrama (Chromium a veces no arranca). Default 5. */
  intentos: z.number().int().positive().optional(),
  /** Timeout del render de cada diagrama (ms). Default 300_000. */
  timeoutMs: z.number().int().positive().optional(),
  /** Espera tras ready antes de extraer (ms). Default 500. */
  settleMs: z.number().int().nonnegative().optional(),
  /** También PNG. Default true. */
  png: z.boolean().optional()
});
var EntradaCacheSchema = z.object({
  huella: z.string().length(64),
  svg: z.string(),
  png: z.string().nullable(),
  fecha: z.string(),
  ancho: z.number().nullable(),
  alto: z.number().nullable()
});
var CacheLoteSchema = z.object({
  version: z.number().int(),
  diagramas: z.record(z.string(), EntradaCacheSchema)
});

// src/vendor-distributions/shared/lib/obj.ts
var ObjError = class extends Error {
  codigo;
  ruta;
  constructor(codigo, mensaje, ruta = "") {
    super(ruta ? `${mensaje} (en ${ruta})` : mensaje);
    this.name = "ObjError";
    this.codigo = codigo;
    this.ruta = ruta;
  }
};
var esPlano = (v) => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};
var SELECTOR = /^\[([^=\]]+)=([^\]]*)\]$/;
var unir = (ruta, k) => ruta ? `${ruta}.${k}` : k;
function claves(dato, k) {
  const contenedor = Array.isArray(dato) || esPlano(dato);
  if (!contenedor) return [];
  const todas = Array.isArray(dato) ? dato.map((_, i) => String(i)) : Object.keys(dato);
  if (k === "*") return todas;
  const sel = k.match(SELECTOR);
  if (sel) {
    const [, campo, valor] = sel;
    const hallada = todas.find((c) => {
      const el = dato[c];
      return esPlano(el) && String(el[campo.trim()]) === valor.trim();
    });
    return hallada === void 0 ? [] : [hallada];
  }
  return Object.prototype.hasOwnProperty.call(dato, k) ? [k] : [];
}
var leer = (dato, k) => dato[k];
var copia = (v) => Array.isArray(v) ? [...v] : { ...v };
function envueltoDe(s) {
  if (s instanceof ZodOptional || s instanceof ZodExactOptional || s instanceof ZodNullable || s instanceof ZodDefault || s instanceof ZodPrefault || s instanceof ZodNonOptional || s instanceof ZodSuccess || s instanceof ZodCatch || s instanceof ZodReadonly || s instanceof ZodLazy || s instanceof ZodPromise || s instanceof ZodArray) return s.unwrap();
  if (s instanceof ZodPipe) return s.def.in;
  return void 0;
}
function objetoInterno(schema) {
  let actual = schema;
  for (let i = 0; i < 10 && actual; i++) {
    if (actual instanceof ZodObject || actual instanceof ZodRecord) return actual;
    actual = envueltoDe(actual);
  }
  return void 0;
}
function campoDe(schema, k) {
  const o = objetoInterno(schema);
  if (o instanceof ZodObject) {
    const declarado = o.shape[k];
    return declarado ? { campo: declarado, libre: false } : { campo: o.def.catchall, libre: true };
  }
  if (o instanceof ZodRecord) return { campo: o.def.valueType, libre: true };
  return { libre: true };
}
function nullDe({ campo, libre }) {
  if (libre || !campo) return { borrar: true };
  const sinValor = safeParse(campo, void 0);
  if (sinValor.success) return sinValor.data === void 0 ? { borrar: true } : { valor: sinValor.data };
  for (const vacio of [null, [], {}, ""]) {
    const r = safeParse(campo, vacio);
    if (r.success) return { valor: r.data };
  }
  return { nada: true };
}
var Obj = class _Obj {
  /**
   * Upsert profundo: `cambios` sobre `base`, nivel por nivel. `undefined` = no tocar; arreglos se
   * reemplazan completos; `null` = quitar, según el schema de la propiedad (opcional → se borra;
   * con default → el default; obligatoria → el primer vacío que acepte; si ninguno, no se toca;
   * sin schema → se borra). Una clave `[campo=valor]` apunta a un elemento de un arreglo.
   */
  static push(base, cambios, schema) {
    if (!esPlano(cambios)) return cambios === void 0 ? base : cambios;
    const out = esPlano(base) || Array.isArray(base) ? copia(base) : {};
    for (const [k, v] of Object.entries(cambios)) {
      if (v === void 0) continue;
      const destino = claves(out, k)[0] ?? (SELECTOR.test(k) || k === "*" ? void 0 : k);
      if (destino === void 0) continue;
      const campo = campoDe(schema, destino);
      if (v === null) {
        const r = nullDe(campo);
        if ("borrar" in r) {
          if (Array.isArray(out)) out.splice(Number(destino), 1);
          else delete out[destino];
        } else if ("valor" in r) out[destino] = r.valor;
        continue;
      }
      const actual = out[destino];
      out[destino] = esPlano(v) && (esPlano(actual) || Array.isArray(actual)) ? _Obj.push(actual, v, campo.campo) : v;
    }
    return out;
  }
  /** `push` + validación del resultado con el schema (lanza el ZodError si queda fuera). */
  static pushZod(schema, base, cambios) {
    return schema.parse(_Obj.push(esPlano(base) ? base : {}, esPlano(cambios) ? cambios : {}, schema));
  }
  /**
   * Schema de un FRAGMENTO de push para `schema` (un objeto): cada clave declarada es opcional y
   * acepta `null` («quitar»); un objeto anidado también se valida como fragmento. Cliente y
   * servidor validan así el mismo fragmento.
   */
  static esquemaPush(schema) {
    const o = objetoInterno(schema);
    if (!(o instanceof ZodObject)) return schema;
    const declarado = o.shape;
    const shape = Object.fromEntries(Object.entries(declarado).map(([k, campo]) => {
      const interno = objetoInterno(campo);
      return [k, zOptional(zNullable(interno instanceof ZodObject ? _Obj.esquemaPush(interno) : campo))];
    }));
    const fragmento = zObject(shape);
    return o.def.catchall ? fragmento.catchall(zNullable(o.def.catchall)) : fragmento.strict();
  }
  /**
   * `v` con las claves de objeto escritas como las declara `schema` (comparación sin mayúsculas),
   * recursivo por objetos, arreglos, opcionales y uniones. Para datos que llegan con las claves en
   * minúsculas (p. ej. el stack InSoft baja a minúsculas el contenido de las columnas JSON). Claves
   * que el schema no declara quedan tal cual.
   */
  static restaurarClaves(v, schema) {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) return _Obj.restaurarClaves(v, schema.unwrap());
    if (schema instanceof ZodDefault || schema instanceof ZodCatch || schema instanceof ZodReadonly) return _Obj.restaurarClaves(v, schema.def.innerType);
    if (schema instanceof ZodArray) return Array.isArray(v) ? v.map((x) => _Obj.restaurarClaves(x, schema.element)) : v;
    if (schema instanceof ZodUnion) {
      for (const opcion of schema.options) {
        const candidato = _Obj.restaurarClaves(v, opcion);
        if (safeParse(opcion, candidato).success) return candidato;
      }
      return v;
    }
    if (schema instanceof ZodObject && v !== null && typeof v === "object" && !Array.isArray(v)) {
      const shape = schema.shape;
      const declaradas = Object.keys(shape);
      const out = {};
      for (const [k, valor] of Object.entries(v)) {
        const canonica = declaradas.find((d) => d.toLowerCase() === k.toLowerCase());
        const campo = canonica === void 0 ? void 0 : shape[canonica];
        out[canonica ?? k] = campo ? _Obj.restaurarClaves(valor, campo) : valor;
      }
      return out;
    }
    return v;
  }
  /** `true` si `v` es un objeto plano (literal o `Object.create(null)`). */
  static esPlano(v) {
    return esPlano(v);
  }
  /** Cambia solo lo que YA existe en `base` (profundo); lo que no existe se ignora. */
  static update(base, cambios) {
    if (!esPlano(cambios) || !(esPlano(base) || Array.isArray(base))) return base;
    const out = copia(base);
    for (const [k, v] of Object.entries(cambios)) {
      for (const c of claves(out, k)) {
        const actual = out[c];
        out[c] = esPlano(v) && (esPlano(actual) || Array.isArray(actual)) ? _Obj.update(actual, v) : v;
      }
    }
    return out;
  }
  /** Agrega solo lo que NO existe en `base` (profundo); nunca pisa un valor. */
  static insert(base, nuevos) {
    if (!esPlano(nuevos)) return base;
    const out = esPlano(base) || Array.isArray(base) ? copia(base) : {};
    for (const [k, v] of Object.entries(nuevos)) {
      const existentes = claves(out, k);
      if (!existentes.length) {
        if (k !== "*" && !SELECTOR.test(k)) out[k] = v;
        continue;
      }
      for (const c of existentes) {
        const actual = out[c];
        if (esPlano(v) && (esPlano(actual) || Array.isArray(actual))) out[c] = _Obj.insert(actual, v);
      }
    }
    return out;
  }
  /** Quita de `base` lo que marque la consulta (hojas truthy). */
  static delete(base, query) {
    _Obj.validarConsulta(query);
    if (!esPlano(query) || !(esPlano(base) || Array.isArray(base))) return base;
    let out = copia(base);
    const borrar = [];
    for (const [k, q] of Object.entries(query)) {
      for (const c of claves(out, k)) {
        if (esPlano(q)) out[c] = _Obj.delete(leer(out, c), q);
        else if (q) borrar.push(c);
      }
    }
    if (Array.isArray(out)) out = out.filter((_, i) => !borrar.includes(String(i)));
    else for (const c of borrar) delete out[c];
    return out;
  }
  /**
   * La estructura de `base` restringida a lo que marque la consulta (varias claves). Un arreglo
   * consultado con `*` o `[campo=valor]` sigue siendo arreglo (con los elementos elegidos).
   */
  static get(base, query) {
    _Obj.validarConsulta(query);
    if (!esPlano(query)) return query ? base : void 0;
    if (!(esPlano(base) || Array.isArray(base))) return void 0;
    const out = {};
    const elegidos = [];
    for (const [k, q] of Object.entries(query)) {
      if (!q) continue;
      for (const c of claves(base, k)) {
        const v = esPlano(q) ? _Obj.get(leer(base, c), q) : leer(base, c);
        if (v === void 0) continue;
        if (Array.isArray(base)) elegidos.push(v);
        else out[c] = v;
      }
    }
    return Array.isArray(base) ? elegidos : out;
  }
  /**
   * El valor EXACTO de la única hoja truthy de la consulta, sin la estructura que lo contiene.
   * Si el camino no existe en `base` devuelve `null` (el que llama decide: los diagramas lo tratan
   * como error). Lanza si la consulta no marca exactamente una hoja (`ninguno` / `varios`, también
   * con `*`): eso es un error de la consulta, no del dato.
   */
  static getValue(base, query) {
    _Obj.validarConsulta(query);
    const camino = _Obj.caminoUnico(query);
    let actual = base;
    let ruta = "";
    for (const k of camino) {
      if (k === "*") throw new ObjError("varios", "getValue no admite \xAB*\xBB (marcar\xEDa varias hojas)", ruta);
      const [c] = claves(actual, k);
      ruta = unir(ruta, k);
      if (c === void 0) return null;
      actual = leer(actual, c);
    }
    return actual === void 0 ? null : actual;
  }
  /** Aplica las acciones en orden; cada una recibe el resultado de la anterior. */
  static aplicar(base, acciones = []) {
    let v = base;
    acciones.forEach((a, i) => {
      try {
        switch (a.op) {
          case "push":
            v = _Obj.push(v, a.valor);
            break;
          case "update":
            v = _Obj.update(v, a.valor);
            break;
          case "insert":
            v = _Obj.insert(v, a.valor);
            break;
          case "delete":
            v = _Obj.delete(v, a.query);
            break;
          case "get":
            v = _Obj.get(v, a.query);
            break;
          case "getValue":
            v = _Obj.getValue(v, a.query);
            break;
        }
      } catch (e) {
        if (e instanceof ObjError) throw new ObjError(e.codigo, `acci\xF3n ${i} (${a.op}): ${e.message}`, e.ruta);
        throw e;
      }
    });
    return v;
  }
  /** `true` si `v` tiene forma de referencia (`path` + `query`). */
  static esRef(v) {
    return esPlano(v) && typeof v.path === "string" && "query" in v && ZRefObj.safeParse(v).success;
  }
  /**
   * Resuelve cada referencia `{ path, query, actions }` que haya en `valor` (a cualquier
   * profundidad): carga el JSON de `path` (relativo a `base`), toma con `getValue` el valor exacto
   * que marque la consulta (si no existe, error) y aplica las acciones. Lo traído puede tener a
   * su vez referencias (relativas a su propio archivo). Las props extra de una referencia se
   * ignoran con un aviso; una referencia mal formada, un `path` que no carga o una consulta sin
   * resultado lanzan `ObjError` con la ruta.
   */
  static async resolver(valor, opciones) {
    const avisar = opciones.avisar ?? ((m) => console.warn(`[Obj] ${m}`));
    const tope = opciones.profundidad ?? 16;
    const cache = /* @__PURE__ */ new Map();
    const cargar = (url) => {
      if (!cache.has(url)) {
        cache.set(url, opciones.cargar(url).catch((e) => {
          throw new ObjError("carga", `no se pudo leer ${url}: ${e instanceof Error ? e.message : String(e)}`);
        }));
      }
      return cache.get(url);
    };
    const visitar = async (v, base, ruta, pila) => {
      if (Array.isArray(v)) return Promise.all(v.map((x, i) => visitar(x, base, unir(ruta, String(i)), pila)));
      if (!esPlano(v)) return v;
      if (typeof v.path === "string" && "query" in v) {
        const r = ZRefObj.safeParse(v);
        if (!r.success) throw new ObjError("ref", `referencia mal formada: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`, ruta);
        const extra = Object.keys(v).filter((k) => k !== "path" && k !== "query" && k !== "actions");
        if (extra.length) avisar(`${ruta || "(ra\xEDz)"}: claves ignoradas en la referencia: ${extra.join(", ")}`);
        const url = resolverUrl(r.data.path, base);
        const id = `${url}#${JSON.stringify(r.data.query)}`;
        if (pila.includes(id)) throw new ObjError("ciclo", `referencia circular: ${[...pila, id].join(" \u2192 ")}`, ruta);
        if (pila.length >= tope) throw new ObjError("ciclo", `m\xE1s de ${tope} referencias anidadas`, ruta);
        const doc = await cargar(url);
        let traido;
        try {
          traido = _Obj.getValue(doc, r.data.query);
        } catch (e) {
          if (e instanceof ObjError) throw new ObjError(e.codigo, `${r.data.path}: ${e.message}`, ruta);
          throw e;
        }
        if (traido === null) {
          throw new ObjError("no-existe", `${r.data.path}: el valor no existe (${_Obj.caminoUnico(r.data.query).join(".")}); def\xEDnalo en la fuente o ajuste path/query`, ruta);
        }
        const resuelto = await visitar(traido, url, ruta, [...pila, id]);
        try {
          return _Obj.aplicar(resuelto, r.data.actions);
        } catch (e) {
          if (e instanceof ObjError) throw new ObjError(e.codigo, e.message, ruta);
          throw e;
        }
      }
      const out = {};
      for (const [k, x] of Object.entries(v)) out[k] = await visitar(x, base, unir(ruta, k), pila);
      return out;
    };
    return visitar(valor, opciones.base, "", []);
  }
  /** Caminos de las hojas truthy de una consulta (claves tal cual, `*` y selectores incluidos). */
  static hojas(query, prefijo = []) {
    if (!esPlano(query)) return query ? [prefijo] : [];
    return Object.entries(query).flatMap(([k, q]) => _Obj.hojas(q, [...prefijo, k]));
  }
  /** El único camino truthy de la consulta (el de `getValue`); lanza si hay cero o más de uno. */
  static caminoUnico(query) {
    const hs = _Obj.hojas(query);
    if (hs.length === 0) throw new ObjError("ninguno", "getValue: la consulta no marca ninguna hoja truthy");
    if (hs.length > 1) throw new ObjError("varios", `getValue: la consulta marca ${hs.length} hojas (${hs.map((h) => h.join(".")).join(", ")})`);
    return hs[0];
  }
  /** Lanza `ObjError("consulta")` si `query` no es una consulta válida. */
  static validarConsulta(query) {
    const r = ZConsulta.safeParse(query);
    if (!r.success) throw new ObjError("consulta", `consulta inv\xE1lida: ${r.error.issues[0]?.message ?? ""}`);
  }
};
function resolverUrl(path, base) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) && !/^[a-z]:[\\/]/i.test(path)) return path;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(base) || base.startsWith("file:")) return new URL(path, base).href;
  const sep = base.replace(/\\/g, "/");
  const dir = sep.slice(0, sep.lastIndexOf("/") + 1);
  const partes = (path.startsWith("/") || /^[a-z]:\//i.test(path.replace(/\\/g, "/")) ? path.replace(/\\/g, "/") : dir + path).split("/");
  const out = [];
  for (const p of partes) {
    if (p === "..") out.pop();
    else if (p !== ".") out.push(p);
  }
  return out.join("/");
}

// src/vendor-distributions/client/tools/render-diagram.ts
import process from "node:process";
import { join as join2, dirname as dirname2, isAbsolute, relative } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

// src/vendor-distributions/client/tools/static-server.ts
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, extname, resolve } from "node:path";
var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".ts": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json",
  ".woff2": "font/woff2"
};
function startStaticServer(root, remoto) {
  const absRoot = resolve(root);
  const memoria = /* @__PURE__ */ new Map();
  const inmutable = !!remoto && /\/[0-9a-f]{40}\/$/.test(remoto);
  const traer = async (rel) => {
    if (!remoto || !rel.startsWith("dist/cdn/")) return null;
    const enMemoria = memoria.get(rel);
    if (enMemoria !== void 0) return enMemoria;
    const enDisco = join(absRoot, ".iswc-remoto", rel);
    if (inmutable && existsSync(enDisco)) {
      const b = new Uint8Array(await readFile(enDisco));
      memoria.set(rel, b);
      return b;
    }
    let cuerpo = null;
    for (let i = 0; i < 3 && cuerpo === null; i++) {
      try {
        const r = await fetch(remoto + rel);
        if (r.ok) cuerpo = new Uint8Array(await r.arrayBuffer());
        else {
          await r.body?.cancel();
          if (r.status === 404) break;
        }
      } catch {
      }
    }
    memoria.set(rel, cuerpo);
    if (cuerpo && inmutable) {
      await mkdir(dirname(enDisco), { recursive: true });
      await writeFile(enDisco, cuerpo);
    }
    return cuerpo;
  };
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel || rel.endsWith("/")) rel += "index.html";
      const abs = join(absRoot, rel);
      const cabeceras = (f) => ({
        "Content-Type": TYPES[extname(f)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      });
      if (!abs.startsWith(absRoot)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      if (existsSync(abs)) {
        res.writeHead(200, cabeceras(abs));
        createReadStream(abs).pipe(res);
        return;
      }
      void traer(rel.split("\\").join("/")).then((cuerpo) => {
        if (!cuerpo) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, cabeceras(rel));
        res.end(cuerpo);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolvePromise({
        port,
        base: `http://127.0.0.1:${port}/`,
        close: () => server.close()
      });
    });
  });
}

// src/vendor-distributions/client/tools/hosts.ts
var DIAGRAM_HOSTS = [
  "iswc-er-diagram",
  "iswc-sequence-diagram",
  "iswc-flowchart",
  "iswc-state-diagram",
  "iswc-class-diagram",
  "iswc-block-diagram",
  "iswc-component-diagram",
  "iswc-swimlane-diagram",
  "iswc-use-case-diagram",
  "iswc-timeline",
  "iswc-gantt",
  "iswc-sankey-diagram",
  "iswc-quadrant-chart",
  "iswc-venn-diagram",
  "iswc-mindmap",
  "iswc-org-chart"
];
function probeSvgExpression(hosts = DIAGRAM_HOSTS) {
  return `(() => {
  const hosts = document.querySelectorAll(${JSON.stringify(hosts.join(", "))});
  const vale = (s) => {
    if (!s) return false;
    const r = s.getBoundingClientRect();
    return r.width > 10 && r.height > 10;
  };
  for (const h of hosts) {
    if (h.shadowRoot) {
      const s = h.shadowRoot.querySelector('svg');
      if (vale(s)) return s;
    }
    const s = h.querySelector('svg');
    if (vale(s)) return s;
  }
  for (const s of document.querySelectorAll('svg')) if (vale(s)) return s;
  return null;
})()`;
}

// src/vendor-distributions/client/tools/sanitize-svg.ts
function sanitizeSvgRoot(svgOuter) {
  const m = svgOuter.match(/<svg[^>]*>/);
  const rootTag = m ? m[0] : "";
  const vb = rootTag.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
  let width = null;
  let height = null;
  if (vb) {
    width = Math.round(Number(vb[3]));
    height = Math.round(Number(vb[4]));
  }
  let svg = svgOuter;
  if (rootTag) {
    const styleM = rootTag.match(/\sstyle="([^"]*)"/);
    const prev = styleM ? styleM[1] : "";
    const bgM = prev.match(/background\s*:\s*([^;]+)/i);
    let bg = (bgM ? bgM[1].trim() : "") || "#FFFFFF";
    if (/^rgba?\(\s*255\s*,\s*255\s*,\s*255/i.test(bg) || /^#fff(fff)?$/i.test(bg) || /^white$/i.test(bg)) {
      bg = "#FFFFFF";
    }
    const sinStyle = rootTag.replace(/\sstyle="[^"]*"/, "");
    const conBg = sinStyle.replace(
      /^<svg\b/,
      `<svg style="background:${bg}"`
    );
    svg = svgOuter.replace(rootTag, conBg);
  }
  return { svg, width, height };
}
function staticSvgWrapper(svgOuter, opts = {}) {
  const links = (opts.cssHrefs ?? []).map((href) => `<link rel="stylesheet" href="${href}">`).join("\n    ");
  const w = opts.width;
  const h = opts.height;
  const size = w && h ? `width: ${w}px; height: ${h}px;` : "width: auto; height: auto;";
  return `<!doctype html>
<html lang="es" class="theme-light" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  ${links}
  <style>
    html, body { margin: 0; padding: 0; background: #FFFFFF; color-scheme: light; }
    body { display: inline-block; }
    svg { display: block; ${size} }
    *, *::before, *::after { animation: none !important; transition: none !important; }
  </style>
</head>
<body>
${svgOuter}
</body>
</html>`;
}

// src/vendor-distributions/client/tools/render-diagram.ts
var READY_FLAG = "__ISWC_RENDER_READY__";
var ERR_FLAG = "__ISWC_RENDER_ERR__";
var TMP_DIR_NAME = ".iswc-render-tmp";
function isPageJob(job) {
  return "pageUrl" in job && typeof job.pageUrl === "string";
}
function attrsToHtml(attrs = {}) {
  return Object.entries(attrs).map(([k, v]) => `${k}=${JSON.stringify(String(v))}`).join(" ");
}
function buildHostHtml(opts) {
  const tag = opts.tag || "iswc-component-diagram";
  const attrStr = attrsToHtml(opts.attrs);
  const css = opts.css || `html,body{margin:0;padding:8px;background:#fff}${tag}{display:block;width:100%;min-height:400px}`;
  const payloadLit = JSON.stringify(opts.payload ?? null);
  return `<!doctype html>
<html lang="es" class="theme-light" data-theme="light">
<head><meta charset="utf-8"/>
<style>${css}</style>
</head>
<body>
<${tag} id="d" ${attrStr}></${tag}>
<script type="module">
  try {
    await import(${JSON.stringify(opts.scriptUrl)});
    await customElements.whenDefined(${JSON.stringify(tag)});
    const el = document.getElementById('d');
    el.payload = ${payloadLit};
    if (typeof el.updateComplete === 'function') await el.updateComplete();
    window.${ERR_FLAG} = null;
  } catch (e) {
    window.${ERR_FLAG} = String(e && e.stack || e);
  }
  window.${READY_FLAG} = true;
</script>
</body></html>`;
}
async function extractSvg(page) {
  const probe = probeSvgExpression();
  const extraido = await page.evaluate(`(() => {
    const svg = ${probe};
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((l) => l.href).filter(Boolean);
    return {
      svgOuter: svg.outerHTML,
      hrefs,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  })()`);
  if (!extraido?.svgOuter) throw new Error("sin <svg> de diagrama en el shadow DOM");
  return extraido;
}
async function waitReady(page, timeoutMs) {
  const probe = probeSvgExpression();
  await page.waitForFunction(
    `() => window.${READY_FLAG} === true || !!(${probe})`,
    null,
    { timeout: timeoutMs }
  );
  const err = await page.evaluate(`window.${ERR_FLAG} || null`);
  if (err) throw new Error(`render fail: ${err}`);
}
async function writeServedHtml(serveRoot, html, stem) {
  const dir = join2(serveRoot, TMP_DIR_NAME);
  await mkdir2(dir, { recursive: true });
  const abs = join2(dir, `${stem}-${Date.now()}.html`);
  await writeFile2(abs, html, "utf8");
  const rel = relative(serveRoot, abs).replace(/\\/g, "/");
  return { abs, rel };
}
function absolutizeScript(scriptUrl, base) {
  if (/^https?:\/\//i.test(scriptUrl) || scriptUrl.startsWith("file:")) return scriptUrl;
  return base + scriptUrl.replace(/^\/+/, "");
}
var PNG_MAX_PX = 36e6;
function pngCanvasSize(width, height, scale = 2, maxPx = PNG_MAX_PX) {
  const k = width && height ? Math.min(1, Math.sqrt(maxPx / (width * height * scale * scale))) : 1;
  return {
    k,
    width: width ? Math.floor(width * k) : width,
    height: height ? Math.floor(height * k) : height
  };
}
async function capturePng(ctx, sano, hrefs, id) {
  const lienzo = pngCanvasSize(sano.width, sano.height, 2);
  const wrap = staticSvgWrapper(sano.svg, { width: lienzo.width, height: lienzo.height, cssHrefs: hrefs });
  const wrapPath = join2(tmpdir(), `iswc-png-${id}-${Date.now()}.html`);
  await writeFile2(wrapPath, wrap, "utf8");
  try {
    const page2 = await ctx.newPage();
    if (page2.emulateMedia) await page2.emulateMedia({ colorScheme: "light" });
    await page2.goto(pathToFileURL(wrapPath).href, { waitUntil: "load", timeout: 6e4 });
    await page2.waitForTimeout(400);
    const handle = await page2.$("svg");
    if (!handle) throw new Error("sin <svg> en wrapper PNG");
    const buf = await handle.screenshot({ type: "png", scale: "device", timeout: 6e4 });
    await page2.close();
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  } finally {
    await rm(wrapPath, { force: true }).catch(() => {
    });
  }
}
async function runOnePage(browser, pageUrl, opts, id) {
  const timeoutMs = opts.timeoutMs ?? 9e4;
  const settleMs = opts.settleMs ?? 400;
  const viewport = opts.viewport ?? { width: 1920, height: 1200 };
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: opts.png ? 2 : 1,
    colorScheme: "light"
  });
  try {
    const page = await ctx.newPage();
    if (page.emulateMedia) await page.emulateMedia({ colorScheme: "light" });
    await page.goto(pageUrl, {
      waitUntil: "networkidle",
      timeout: Math.max(timeoutMs, 6e4)
    });
    await waitReady(page, timeoutMs);
    await page.evaluate(`(async () => {
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      // 1) Las hojas de las webfonts (<link data-iswc-font>) terminan de cargar.
      for (let i = 0; i < 50; i++) {
        const links = [...document.querySelectorAll('link[data-iswc-font]')];
        if (links.every((l) => l.sheet)) break;
        await espera(100);
      }
      // 2) Las caras que usa el diagrama cargan (fonts.ready cubre las pedidas).
      await espera(50);
      await document.fonts.ready;
      // 3) El diagrama repite el layout al detectar el cambio de ancho.
      await espera(400);
      await document.fonts.ready;
    })()`);
    if (settleMs > 0) await page.waitForTimeout(settleMs);
    const extraido = await extractSvg(page);
    const sano = sanitizeSvgRoot(extraido.svgOuter);
    let svg = sano.svg;
    if (opts.transformSvg) svg = opts.transformSvg(svg);
    const errorXml = await page.evaluate(`(() => {
      const d = new DOMParser().parseFromString(${JSON.stringify(sinInyeccion(svg))}, 'image/svg+xml');
      const e = d.querySelector('parsererror');
      return e ? (e.textContent || 'parsererror').slice(0, 300) : '';
    })()`);
    if (errorXml) throw new Error(`SVG mal formado (${id}): ${errorXml}`);
    let png;
    if (opts.png) {
      png = await capturePng(ctx, sano, extraido.hrefs, id);
    }
    return { svg, width: sano.width, height: sano.height, png };
  } finally {
    await ctx.close();
  }
}
async function renderDiagramBatch(jobs, opts) {
  let server = null;
  let browser = null;
  const written = [];
  const results = [];
  try {
    let base = "";
    if (opts.serveRoot) {
      server = await startStaticServer(opts.serveRoot, opts.remoteBase);
      base = server.base;
    }
    browser = await opts.chromium.launch({ headless: true });
    for (const { id, job } of jobs) {
      try {
        let pageUrl;
        if (isPageJob(job)) {
          pageUrl = job.pageUrl;
        } else {
          if (!opts.serveRoot || !base) {
            throw new Error(`job ${id}: sint\xE9tico requiere serveRoot`);
          }
          const scriptUrl = absolutizeScript(job.scriptUrl, base);
          const html = buildHostHtml({
            scriptUrl,
            tag: job.tag,
            payload: await payloadResuelto(job),
            attrs: job.attrs,
            css: job.css
          });
          const w = await writeServedHtml(opts.serveRoot, html, id);
          written.push(w.abs);
          pageUrl = base + w.rel;
        }
        const result = await runOnePage(browser, pageUrl, opts, id);
        results.push({ id, result });
      } catch (e) {
        results.push({ id, error: String(e.message || e) });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {
    });
    if (server) server.close();
    for (const f of written) await rm(f, { force: true }).catch(() => {
    });
  }
  return results;
}
async function writeDiagramOutputs(result, outSvg, outPng) {
  const atomic = async (file, data) => {
    await mkdir2(dirname2(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    await writeFile2(tmp, data);
    await rename(tmp, file);
  };
  await atomic(outSvg, sinInyeccion(result.svg));
  if (outPng && result.png) await atomic(outPng, result.png);
}
function sinInyeccion(svg) {
  return svg.replace(/<\/svg>/g, "</svg >");
}
async function payloadResuelto(job) {
  if (!job.payloadBase) return job.payload;
  return Obj.resolver(job.payload, {
    base: job.payloadBase,
    cargar: async (url) => JSON.parse(/^https?:/i.test(url) ? await (await fetch(url)).text() : await readFile2(url.startsWith("file:") ? new URL(url) : url, "utf8"))
  });
}

// src/vendor-distributions/client/tools/render-lote.ts
var VERSION = 1;
var CACHE_NOMBRE = "diagramas-iswc.cache.json";
var ENV_OPCIONES = "ISWC_RENDER_LOTE";
var esCache = (f) => f.endsWith(".cache.json");
function canonico(v) {
  const ordenar = (x) => Array.isArray(x) ? x.map(ordenar) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, ordenar(x[k])])) : x;
  return JSON.stringify(ordenar(v));
}
var sha256 = (texto) => createHash("sha256").update(texto).digest("hex");
async function pinDelKit(kit) {
  if (!kit) return "";
  for (const f of [join3(kit, "PIN"), join3(kit, "dist", "cdn", "build-stamp.json")]) {
    if (existsSync2(f)) return (await readFile3(f, "utf8")).trim();
  }
  return "";
}
var rutaCache = (op) => resolve2(op.cache ?? join3(op.carpeta, CACHE_NOMBRE));
async function leerCache(archivo) {
  const vacio = { version: VERSION, diagramas: {} };
  if (!existsSync2(archivo)) return vacio;
  try {
    const c = CacheLoteSchema.parse(JSON.parse(await readFile3(archivo, "utf8")));
    return c.version === VERSION ? c : vacio;
  } catch {
    return vacio;
  }
}
async function anotarCache(archivo, slug, entrada) {
  const c = await leerCache(archivo);
  c.diagramas[slug] = entrada;
  await mkdir3(dirname3(archivo), { recursive: true });
  const tmp = `${archivo}.tmp-${process2.pid}`;
  await writeFile3(tmp, JSON.stringify(c, null, 2) + "\n", "utf8");
  await rename2(tmp, archivo);
}
var relPosix = (desde, a) => relative2(dirname3(desde), a).replaceAll("\\", "/");
async function planificarLote(op) {
  const o = OpcionesLoteDatosSchema.parse(op);
  const carpeta = resolve2(o.carpeta);
  const cache = rutaCache(o);
  const pinKit = o.pinKit ?? await pinDelKit(o.kit);
  const png = o.png ?? true;
  const solo = new Set(o.solo ?? []);
  const previo = o.forzar ? { version: VERSION, diagramas: {} } : await leerCache(cache);
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith(".json") && !f.startsWith("_") && !esCache(f) && resolve2(carpeta, f) !== cache).sort();
  const diagramas = [];
  for (const f of archivos) {
    const archivo = join3(carpeta, f);
    let slug = f.replace(/\.json$/, "");
    const salidas = (s) => ({ svg: resolve2(o.salidaSvg, `${s}.svg`), png: png ? resolve2(o.salidaPng, `${s}.png`) : null });
    try {
      const spec = EditableLoteSchema.parse(JSON.parse(await readFile3(archivo, "utf8")));
      slug = spec.slug || slug;
      if (solo.size && !solo.has(slug)) continue;
      const payload = await payloadResuelto({ scriptUrl: "", payload: spec.payload, payloadBase: archivo });
      const job = {
        tag: spec.tag,
        scriptUrl: `dist/cdn/${spec.script.replace(/^\/+/, "")}`,
        payload,
        attrs: spec.attrs ?? {}
      };
      const huella = sha256(canonico({ version: VERSION, pinKit, module: spec.module ?? null, tag: job.tag, script: job.scriptUrl, attrs: job.attrs, payload }));
      const { svg, png: pngSalida } = salidas(slug);
      const antes = previo.diagramas[slug];
      const motivo = o.forzar ? "forzado" : !antes ? "sin cach\xE9" : antes.huella !== huella ? "huella distinta" : !existsSync2(svg) ? "falta el SVG" : pngSalida && !existsSync2(pngSalida) ? "falta el PNG" : "";
      diagramas.push({ slug, archivo, accion: motivo ? "render" : "skip", motivo: motivo || "sin cambios", huella, svg, png: pngSalida, job });
    } catch (e) {
      if (solo.size && !solo.has(slug)) continue;
      const { svg, png: pngSalida } = salidas(slug);
      diagramas.push({ slug, archivo, accion: "error", motivo: String(e.message || e), huella: "", svg, png: pngSalida });
    }
  }
  return { carpeta, cache, pinKit, diagramas };
}
var REPO_KIT = import.meta.url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\//)?.[1] ?? import.meta.url.match(/cdn\.jsdelivr\.net\/gh\/([^/]+\/[^/@]+)@/)?.[1] ?? "Jeff-Aporta/is-webcomponents";
var baseRemota = (pinKit) => `https://raw.githubusercontent.com/${REPO_KIT}/${pinKit && /^[0-9a-f]{40}$/.test(pinKit) ? pinKit : "main"}/`;
var raizServida = (kit) => resolve2(kit ?? join3(tmpdir2(), "iswc-render-lote"));
async function chromiumDisponible(kit) {
  for (const base of [kit, process2.cwd()]) {
    if (!base || !existsSync2(join3(base, "node_modules"))) continue;
    try {
      return createRequire(pathToFileURL2(join3(base, "package.json")))("playwright").chromium;
    } catch {
    }
  }
  const especificador = "npm:playwright@1.63.0";
  const mod = await import(especificador);
  if (!tieneChromium(mod)) throw new Error("render-lote: no hay Playwright (ni en el kit, ni en el proyecto, ni npm:playwright)");
  return mod.chromium;
}
function tieneChromium(x) {
  const c = x && typeof x === "object" ? Reflect.get(x, "chromium") : void 0;
  return !!c && typeof c === "object" && typeof Reflect.get(c, "launch") === "function";
}
async function renderizarUno(op, slug) {
  const plan = await planificarLote({ ...op, solo: [slug], forzar: true });
  const d = plan.diagramas[0];
  if (!d) throw new Error(`ning\xFAn diagrama con slug ${slug}`);
  if (d.accion === "error" || !d.job) throw new Error(d.motivo);
  const [r] = await renderDiagramBatch([{ id: slug, job: d.job }], {
    chromium: op.chromium ?? await chromiumDisponible(op.kit),
    serveRoot: raizServida(op.kit),
    remoteBase: baseRemota(plan.pinKit),
    timeoutMs: op.timeoutMs ?? 3e5,
    settleMs: op.settleMs ?? 500,
    png: op.png ?? true
  });
  if (!r?.result) throw new Error(r?.error ?? "sin resultado");
  await writeDiagramOutputs(r.result, d.svg, d.png ?? void 0);
  return { ancho: r.result.width, alto: r.result.height };
}
var lineaOk = (slug, m) => `OK ${slug}.svg (${m.ancho}x${m.alto})`;
function renderizarEnHijo(op, slug) {
  const remoto = /^https?:/.test(import.meta.url);
  const reload = remoto ? [`--reload=${new URL(import.meta.url).origin}${new URL(import.meta.url).pathname.split("/").slice(0, 3).join("/")}/`] : [];
  const r = spawnSync(process2.execPath, [
    "run",
    "-A",
    "--no-check",
    "--sloppy-imports",
    ...reload,
    import.meta.url,
    "--one",
    slug
  ], {
    encoding: "utf8",
    input: "",
    // stdin propio (pipe vacío): un handle heredado o 'ignore' daba os error 6 al lanzar el navegador
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process2.env, [ENV_OPCIONES]: JSON.stringify(op) }
  });
  const ok = (r.stdout || "").split("\n").find((l) => l.startsWith("OK ")) ?? null;
  const detalle = (r.stderr || "").split("\n").filter((l) => l.trim()).slice(0, 4).join(" | ") || "sin detalle";
  return { ok: r.status === 0 ? ok : null, detalle, status: r.status };
}
async function renderizarLote(op) {
  const log = op.log ?? console.log;
  const { log: _l, chromium: _c, ...datos } = op;
  const plan = await planificarLote(op);
  const res = { renderizados: [], sinCambios: [], fallidos: [], cache: plan.cache };
  if (!plan.diagramas.length) {
    log(`render-lote: ning\xFAn diagrama coincide (${(op.solo ?? []).join(", ") || "carpeta vac\xEDa"})`);
    return res;
  }
  const intentos = op.intentos ?? 5;
  for (const d of plan.diagramas) {
    if (d.accion === "skip") {
      log(`SKIP ${d.slug} (sin cambios)`);
      res.sinCambios.push(d.slug);
      continue;
    }
    if (d.accion === "error") {
      log(`FAIL ${d.slug}: ${d.motivo}`);
      res.fallidos.push({ slug: d.slug, motivo: d.motivo });
      continue;
    }
    let ok = null;
    let motivo = "";
    for (let i = 1; i <= intentos && !ok; i++) {
      const r = op.chromium ? await renderizarUno(op, d.slug).then((m) => ({ ok: lineaOk(d.slug, m), detalle: "", status: 0 })).catch((e) => ({ ok: null, detalle: String(e.message || e), status: 1 })) : renderizarEnHijo(datos, d.slug);
      ok = r.ok;
      if (!ok) {
        motivo = `intento ${i}/${intentos}, status ${r.status}: ${r.detalle}`;
        log(`${i === intentos ? "FAIL" : "reintento"} ${d.slug} (${motivo})`);
      }
    }
    if (!ok) {
      res.fallidos.push({ slug: d.slug, motivo });
      continue;
    }
    const [, ancho, alto] = ok.match(/\((\d+|null)x(\d+|null)\)/) ?? [];
    await anotarCache(plan.cache, d.slug, {
      huella: d.huella,
      svg: relPosix(plan.cache, d.svg),
      png: d.png ? relPosix(plan.cache, d.png) : null,
      fecha: (/* @__PURE__ */ new Date()).toISOString(),
      ancho: ancho && ancho !== "null" ? Number(ancho) : null,
      alto: alto && alto !== "null" ? Number(alto) : null
    });
    log(ok);
    res.renderizados.push(d.slug);
  }
  log(`lote \xB7 ${res.renderizados.length} renderizados \xB7 ${res.sinCambios.length} sin cambios \xB7 ${res.fallidos.length} fallidos`);
  return res;
}
function argumentos(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? true;
  }
  return out;
}
function opcionesDeCli(argv) {
  const a = argumentos(argv);
  const texto = (k) => typeof a[k] === "string" ? a[k] : void 0;
  const kit = texto("kit") ?? process2.env.ISWC_KIT;
  return OpcionesLoteDatosSchema.parse({
    carpeta: texto("carpeta"),
    salidaSvg: texto("svg"),
    salidaPng: texto("png") ?? texto("svg"),
    cache: texto("cache"),
    kit,
    pinKit: texto("pin"),
    solo: texto("solo")?.split(",").map((s) => s.trim()).filter(Boolean),
    forzar: a.forzar === true,
    png: a["sin-png"] === true ? false : void 0,
    intentos: texto("intentos") ? Number(texto("intentos")) : void 0,
    timeoutMs: texto("timeout") ? Number(texto("timeout")) : void 0
  });
}
async function cli() {
  const argv = process2.argv.slice(2);
  const one = argv.indexOf("--one");
  if (one >= 0) {
    const op = OpcionesLoteDatosSchema.parse(JSON.parse(process2.env[ENV_OPCIONES] ?? "null") ?? opcionesDeCli(argv));
    const slug = argv[one + 1];
    try {
      console.log(lineaOk(slug, await renderizarUno(op, slug)));
      process2.exit(0);
    } catch (e) {
      console.error(`error ${slug}: ${e.message || e}`);
      process2.exit(1);
    }
  }
  const r = await renderizarLote(opcionesDeCli(argv));
  process2.exit(r.fallidos.length ? 1 : 0);
}
var esPrincipal = import.meta.main ?? (process2.argv[1] ? process2.argv[1] === import.meta.url || pathToFileURL2(resolve2(process2.argv[1])).href === import.meta.url : false);
if (esPrincipal) await cli();
export {
  CACHE_NOMBRE,
  REPO_KIT,
  VERSION,
  anotarCache,
  baseRemota,
  canonico,
  leerCache,
  pinDelKit,
  planificarLote,
  raizServida,
  renderizarLote,
  renderizarUno,
  rutaCache,
  sha256
};
