// @vendor 2026-10-14T06:21:55.173Z Jeff-Aporta/is-webcomponents@main src/vendor-distributions/shared/lib/obj.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md
/**
 * obj.ts — operaciones VIRTUALES sobre objetos JSON (en memoria), comunes a todo iswc y a sus
 * consumidores (ISS, ISW, DER). Las FÍSICAS (leer otros JSON por `path`) viven en `ref-obj.ts`.
 *
 * `Obj` reúne, como métodos estáticos (sin tocar el `Object` global), lo que un consumidor necesita
 * para leer y modificar PARTES de un objeto sin afectar el resto. Nada lee archivos ni la red:
 *
 *   Obj.insert(base, cambios, schema?)  upsert profundo: lo no mencionado se conserva; `null` quita (lo
 *                                       resuelve el schema de la propiedad, ver `insert`).
 *   Obj.insertIgnore(base, nuevos)      agrega solo lo que NO existe (no pisa).
 *   Obj.update(base, cambios)           cambia solo lo que YA existe (no crea).
 *   Obj.replace(base, valor)            reemplazo directo (lo que aplica cuando no hay molde Zod).
 *   Obj.delete(base, query)             quita lo que marque la consulta.
 *   Obj.get(base, query)                la estructura desde la raíz con solo lo marcado.
 *   Obj.getValue(base, query)           el valor EXACTO de la única hoja truthy (sin estructura); `null`
 *                                       si no existe (el que llama decide qué hacer).
 *   Obj.aplicar(base, acciones)         las anteriores en orden (`TAccionObj[]`).
 *
 * Consulta: copia la forma del dato y marca con truthy (`!!x`) lo pedido; `"*"` = todos, y
 * `"[campo=valor]"` = el primer elemento con ese campo (ver la sección `obj` de `shared/schemas.ts`). Nada muta: cada
 * operación devuelve un objeto nuevo. Importable por URL desde Deno (`zod` en el import map del consumidor):
 * https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/shared/lib/obj.ts
 * Bundle `obj.min.js` (Zod incluido) para el navegador en `dist/cdn/lib/`.
 *
 * Skill: src/vendor-distributions/shared/lib/obj.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md
 */
import {
  nullable as zNullable, object as zObject, optional as zOptional, safeParse, ZodArray, ZodCatch, ZodDefault, ZodExactOptional, ZodLazy,
  ZodNonOptional, ZodNullable, ZodObject, ZodOptional, ZodPipe, ZodPrefault, ZodPromise, ZodReadonly, ZodRecord, ZodSuccess, ZodUnion, type z,
} from "zod";
import { ZConsulta, type TAccionObj, type TCodigoObj, type TConsulta } from "../schemas.js";

// `.ts` explícito: así el módulo se importa tal cual por URL (Deno remoto no adivina extensiones).

/** Error de `Obj`: `codigo` dice qué falló y `ruta` dónde (claves separadas por punto). */
/** Campos declarados (sin parameter properties): el modulo se carga tambien con Node en modo strip-only. */
export class ObjError extends Error {
  readonly codigo: TCodigoObj;
  readonly ruta: string;
  constructor(codigo: TCodigoObj, mensaje: string, ruta = "") {
    super(ruta ? `${mensaje} (en ${ruta})` : mensaje);
    this.name = "ObjError";
    this.codigo = codigo;
    this.ruta = ruta;
  }
}

const esPlano = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};
const SELECTOR = /^\[([^=\]]+)=([^\]]*)\]$/;
const unir = (ruta: string, k: string): string => (ruta ? `${ruta}.${k}` : k);

/** Claves de `dato` que nombra la clave de consulta `k` (normal, `*` o `[campo=valor]`). */
function claves(dato: unknown, k: string): string[] {
  const contenedor = Array.isArray(dato) || esPlano(dato);
  if (!contenedor) return [];
  const todas = Array.isArray(dato) ? dato.map((_, i) => String(i)) : Object.keys(dato as object);
  if (k === "*") return todas;
  const sel = k.match(SELECTOR);
  if (sel) {
    const [, campo, valor] = sel;
    const hallada = todas.find((c) => {
      const el = (dato as Record<string, unknown>)[c];
      return esPlano(el) && String(el[campo!.trim()]) === valor!.trim();
    });
    return hallada === undefined ? [] : [hallada];
  }
  return Object.prototype.hasOwnProperty.call(dato, k) ? [k] : [];
}
const leer = (dato: unknown, k: string): unknown => (dato as Record<string, unknown>)[k];

/** Copia superficial del contenedor (arreglo u objeto). */
const copia = (v: unknown): Record<string, unknown> | unknown[] => (Array.isArray(v) ? [...v] : { ...(v as object) });

/* ── insert con schema (los `null` los resuelve el schema de la propiedad) ─────────────────────── */

function envueltoDe(s: z.core.$ZodType): z.core.$ZodType | undefined {
  if (s instanceof ZodOptional || s instanceof ZodExactOptional || s instanceof ZodNullable || s instanceof ZodDefault || s instanceof ZodPrefault
    || s instanceof ZodNonOptional || s instanceof ZodSuccess || s instanceof ZodCatch || s instanceof ZodReadonly || s instanceof ZodLazy
    || s instanceof ZodPromise || s instanceof ZodArray) return s.unwrap();
  if (s instanceof ZodPipe) return s.def.in;
  return undefined;
}
function objetoInterno(schema: z.core.$ZodType | undefined): z.ZodObject | z.ZodRecord | undefined {
  let actual = schema;
  for (let i = 0; i < 10 && actual; i++) {
    if (actual instanceof ZodObject || actual instanceof ZodRecord) return actual;
    actual = envueltoDe(actual);
  }
  return undefined;
}
function campoDe(schema: z.core.$ZodType | undefined, k: string): { campo?: z.core.$ZodType | undefined; libre: boolean } {
  const o = objetoInterno(schema);
  if (o instanceof ZodObject) {
    const declarado = (o.shape as Record<string, z.core.$ZodType>)[k];
    return declarado ? { campo: declarado, libre: false } : { campo: o.def.catchall, libre: true };
  }
  if (o instanceof ZodRecord) return { campo: o.def.valueType, libre: true };
  return { libre: true };
}
/** Un `null` en la propiedad: borrarla, ponerle su valor «sin valor» o no tocarla. */
function nullDe({ campo, libre }: { campo?: z.core.$ZodType | undefined; libre: boolean }): { borrar: true } | { valor: unknown } | { nada: true } {
  if (libre || !campo) return { borrar: true };
  const sinValor = safeParse(campo, undefined);
  if (sinValor.success) return sinValor.data === undefined ? { borrar: true } : { valor: sinValor.data };
  for (const vacio of [null, [], {}, ""]) {
    const r = safeParse(campo, vacio);
    if (r.success) return { valor: r.data };
  }
  return { nada: true };
}

/* ── Obj ──────────────────────────────────────────────────────────────────────────────────────── */

export class Obj {
  /**
   * Upsert profundo: `cambios` sobre `base`, nivel por nivel. `undefined` = no tocar; arreglos se
   * reemplazan completos; `null` = quitar, según el schema de la propiedad (opcional → se borra;
   * con default → el default; obligatoria → el primer vacío que acepte; si ninguno, no se toca;
   * sin schema → se borra). Una clave `[campo=valor]` apunta a un elemento de un arreglo.
   */
  static insert<T>(base: T, cambios: unknown, schema?: z.core.$ZodType): T {
    if (!esPlano(cambios)) return (cambios === undefined ? base : cambios) as T;
    const out = (esPlano(base) || Array.isArray(base) ? copia(base) : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(cambios)) {
      if (v === undefined) continue;
      const destino = claves(out, k)[0] ?? (SELECTOR.test(k) || k === "*" ? undefined : k);
      if (destino === undefined) continue;
      const campo = campoDe(schema, destino);
      if (v === null) {
        const r = nullDe(campo);
        if ("borrar" in r) {
          if (Array.isArray(out)) out.splice(Number(destino), 1); else delete out[destino];
        } else if ("valor" in r) out[destino] = r.valor;
        continue;
      }
      const actual = out[destino];
      out[destino] = esPlano(v) && (esPlano(actual) || Array.isArray(actual)) ? Obj.insert(actual, v, campo.campo) : v;
    }
    return out as T;
  }

  /** `insert` + validación del resultado con el schema (lanza el ZodError si queda fuera). */
  static insertZod<S extends z.ZodType>(schema: S, base: z.infer<S> | null | undefined, cambios: unknown): z.infer<S> {
    return schema.parse(Obj.insert(esPlano(base) ? base : {}, esPlano(cambios) ? cambios : {}, schema));
  }

  /**
   * Schema de un FRAGMENTO de insert para `schema` (un objeto): cada clave declarada es opcional y
   * acepta `null` («quitar»); un objeto anidado también se valida como fragmento. Cliente y
   * servidor validan así el mismo fragmento.
   */
  static esquemaInsert(schema: z.ZodType): z.ZodType {
    const o = objetoInterno(schema);
    if (!(o instanceof ZodObject)) return schema;
    const declarado = o.shape as Record<string, z.core.$ZodType>;
    const shape = Object.fromEntries(Object.entries(declarado).map(([k, campo]) => {
      const interno = objetoInterno(campo);
      return [k, zOptional(zNullable(interno instanceof ZodObject ? Obj.esquemaInsert(interno) : campo))];
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
  static restaurarClaves(v: unknown, schema: z.core.$ZodType): unknown {
    if (schema instanceof ZodOptional || schema instanceof ZodNullable) return Obj.restaurarClaves(v, schema.unwrap());
    if (schema instanceof ZodDefault || schema instanceof ZodCatch || schema instanceof ZodReadonly) return Obj.restaurarClaves(v, schema.def.innerType);
    if (schema instanceof ZodArray) return Array.isArray(v) ? v.map((x) => Obj.restaurarClaves(x, schema.element)) : v;
    if (schema instanceof ZodUnion) {
      for (const opcion of schema.options) {
        const candidato = Obj.restaurarClaves(v, opcion);
        if (safeParse(opcion, candidato).success) return candidato;
      }
      return v;
    }
    if (schema instanceof ZodObject && v !== null && typeof v === "object" && !Array.isArray(v)) {
      const shape = schema.shape as Record<string, z.core.$ZodType>;
      const declaradas = Object.keys(shape);
      const out: Record<string, unknown> = {};
      for (const [k, valor] of Object.entries(v)) {
        const canonica = declaradas.find((d) => d.toLowerCase() === k.toLowerCase());
        const campo = canonica === undefined ? undefined : shape[canonica];
        out[canonica ?? k] = campo ? Obj.restaurarClaves(valor, campo) : valor;
      }
      return out;
    }
    return v;
  }

  /** `true` si `v` es un objeto plano (literal o `Object.create(null)`). */
  static esPlano(v: unknown): v is Record<string, unknown> {
    return esPlano(v);
  }

  /** Cambia solo lo que YA existe en `base` (profundo); lo que no existe se ignora. */
  static update<T>(base: T, cambios: unknown): T {
    if (!esPlano(cambios) || !(esPlano(base) || Array.isArray(base))) return base;
    const out = copia(base) as Record<string, unknown>;
    for (const [k, v] of Object.entries(cambios)) {
      for (const c of claves(out, k)) {
        const actual = out[c];
        out[c] = esPlano(v) && (esPlano(actual) || Array.isArray(actual)) ? Obj.update(actual, v) : v;
      }
    }
    return out as T;
  }

  /** Reemplazo directo: `valor` sustituye a `base` (`undefined` = no tocar). Es lo que aplica sin molde Zod. */
  static replace<T>(base: T, valor: unknown): T {
    return (valor === undefined ? base : valor) as T;
  }

  /** Agrega solo lo que NO existe en `base` (profundo); nunca pisa un valor. */
  static insertIgnore<T>(base: T, nuevos: unknown): T {
    if (!esPlano(nuevos)) return base;
    const out = (esPlano(base) || Array.isArray(base) ? copia(base) : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(nuevos)) {
      const existentes = claves(out, k);
      if (!existentes.length) {
        if (k !== "*" && !SELECTOR.test(k)) out[k] = v;
        continue;
      }
      for (const c of existentes) {
        const actual = out[c];
        if (esPlano(v) && (esPlano(actual) || Array.isArray(actual))) out[c] = Obj.insertIgnore(actual, v);
      }
    }
    return out as T;
  }

  /** Quita de `base` lo que marque la consulta (hojas truthy). */
  static delete<T>(base: T, query: TConsulta): T {
    Obj.validarConsulta(query);
    if (!esPlano(query) || !(esPlano(base) || Array.isArray(base))) return base;
    let out = copia(base) as Record<string, unknown> | unknown[];
    const borrar: string[] = [];
    for (const [k, q] of Object.entries(query)) {
      for (const c of claves(out, k)) {
        if (esPlano(q)) (out as Record<string, unknown>)[c] = Obj.delete(leer(out, c), q);
        else if (q) borrar.push(c);
      }
    }
    if (Array.isArray(out)) out = out.filter((_, i) => !borrar.includes(String(i)));
    else for (const c of borrar) delete (out as Record<string, unknown>)[c];
    return out as T;
  }

  /**
   * La estructura de `base` restringida a lo que marque la consulta (varias claves). Un arreglo
   * consultado con `*` o `[campo=valor]` sigue siendo arreglo (con los elementos elegidos).
   */
  static get(base: unknown, query: TConsulta): unknown {
    Obj.validarConsulta(query);
    if (!esPlano(query)) return query ? base : undefined;
    if (!(esPlano(base) || Array.isArray(base))) return undefined;
    const out: Record<string, unknown> = {};
    const elegidos: unknown[] = [];
    for (const [k, q] of Object.entries(query)) {
      if (!q) continue;
      for (const c of claves(base, k)) {
        const v = esPlano(q) ? Obj.get(leer(base, c), q) : leer(base, c);
        if (v === undefined) continue;
        if (Array.isArray(base)) elegidos.push(v); else out[c] = v;
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
  static getValue(base: unknown, query: TConsulta): unknown {
    Obj.validarConsulta(query);
    const camino = Obj.caminoUnico(query);
    let actual: unknown = base;
    let ruta = "";
    for (const k of camino) {
      if (k === "*") throw new ObjError("varios", "getValue no admite «*» (marcaría varias hojas)", ruta);
      const [c] = claves(actual, k);
      ruta = unir(ruta, k);
      if (c === undefined) return null;
      actual = leer(actual, c);
    }
    return actual === undefined ? null : actual;
  }

  /** Aplica las acciones en orden; cada una recibe el resultado de la anterior. */
  static aplicar(base: unknown, acciones: readonly TAccionObj[] = []): unknown {
    let v = base;
    acciones.forEach((a, i) => {
      try {
        switch (a.op) {
          case "insert": v = Obj.insert(v, a.valor); break;
          case "insertIgnore": v = Obj.insertIgnore(v, a.valor); break;
          case "update": v = Obj.update(v, a.valor); break;
          case "replace": v = Obj.replace(v, a.valor); break;
          case "delete": v = Obj.delete(v, a.query); break;
          case "get": v = Obj.get(v, a.query); break;
          case "getValue": v = Obj.getValue(v, a.query); break;
        }
      } catch (e) {
        if (e instanceof ObjError) throw new ObjError(e.codigo, `acción ${i} (${a.op}): ${e.message}`, e.ruta);
        throw e;
      }
    });
    return v;
  }

  /** Caminos de las hojas truthy de una consulta (claves tal cual, `*` y selectores incluidos). */
  static hojas(query: TConsulta, prefijo: string[] = []): string[][] {
    if (!esPlano(query)) return query ? [prefijo] : [];
    return Object.entries(query).flatMap(([k, q]) => Obj.hojas(q, [...prefijo, k]));
  }

  /** El único camino truthy de la consulta (el de `getValue`); lanza si hay cero o más de uno. */
  static caminoUnico(query: TConsulta): string[] {
    const hs = Obj.hojas(query);
    if (hs.length === 0) throw new ObjError("ninguno", "getValue: la consulta no marca ninguna hoja truthy");
    if (hs.length > 1) throw new ObjError("varios", `getValue: la consulta marca ${hs.length} hojas (${hs.map((h) => h.join(".")).join(", ")})`);
    return hs[0]!;
  }

  /** Lanza `ObjError("consulta")` si `query` no es una consulta válida. */
  static validarConsulta(query: unknown): asserts query is TConsulta {
    const r = ZConsulta.safeParse(query);
    if (!r.success) throw new ObjError("consulta", `consulta inválida: ${r.error.issues[0]?.message ?? ""}`);
  }
}
