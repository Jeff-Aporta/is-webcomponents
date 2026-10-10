/**
 * obj.schemas.ts — tipos de `Obj` (operaciones sobre objetos JSON) y de las referencias
 * `{ path, query, actions }`. Los tipos viven aquí y no en el módulo (regla W54).
 *
 * Consulta (`query`): un objeto que copia la forma del dato y marca con un valor TRUTHY (`!!x`) lo
 * que se pide. Además de las claves normales:
 *   - `"*"`: todas las claves de un objeto o todos los elementos de un arreglo;
 *   - `"[campo=valor]"`: el primer elemento (de un arreglo o de los valores de un objeto) cuyo
 *     `campo` vale `valor` (comparación como texto). Así un diccionario de entidades en arreglo
 *     (`entities`, `classes`…) se consulta por nombre.
 */
import { z } from "zod";

/** Hoja o rama de una consulta. Una hoja cuenta si es truthy; un objeto desciende. */
export type TConsulta = boolean | number | string | null | undefined | { [k: string]: TConsulta };
export const ZConsulta: z.ZodType<TConsulta> = z.lazy(() =>
  z.union([z.boolean(), z.number(), z.string(), z.null(), z.undefined(), z.record(z.string(), ZConsulta)])
);

/** Valor JSON. */
export type TJson = string | number | boolean | null | TJson[] | { [k: string]: TJson };
export const ZJson: z.ZodType<TJson> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(ZJson), z.record(z.string(), ZJson)])
);

/**
 * Acciones que se aplican en orden sobre el valor (`Obj.aplicar`):
 *   - `push`: upsert profundo (lo no mencionado se conserva; `null` quita);
 *   - `update`: cambia solo lo que YA existe (no crea claves);
 *   - `insert`: agrega solo lo que NO existe (no pisa);
 *   - `delete`: quita lo que marque la consulta;
 *   - `get`: la estructura desde la raíz con solo lo que marque la consulta (varias claves);
 *   - `getValue`: el valor exacto de la única hoja marcada, sin estructura (`null` si no existe).
 */
export const ZAccionObj = z.discriminatedUnion("op", [
  z.object({ op: z.literal("push"), valor: ZJson }),
  z.object({ op: z.literal("update"), valor: ZJson }),
  z.object({ op: z.literal("insert"), valor: ZJson }),
  z.object({ op: z.literal("delete"), query: ZConsulta }),
  z.object({ op: z.literal("get"), query: ZConsulta }),
  z.object({ op: z.literal("getValue"), query: ZConsulta }),
]);
export type TAccionObj = z.infer<typeof ZAccionObj>;

/**
 * Referencia a un valor de otro JSON (fuente de verdad): `path` (relativo al documento que la
 * contiene), `query` (SIEMPRE un `getValue`: marca exactamente una hoja y trae ese valor exacto) y
 * `actions` opcionales que adaptan lo traído. Sirve para cualquier valor: texto, número, booleano,
 * objeto, arreglo. Si el valor no existe es un error (hay que definirlo o ajustar path/query). Las
 * props extra se ignoran con un aviso.
 */
export const ZRefObj = z.object({
  path: z.string().min(1),
  query: ZConsulta,
  actions: z.array(ZAccionObj).optional(),
});
export type TRefObj = z.infer<typeof ZRefObj>;

/** Cómo leer un `path` (fetch en el navegador, fs en Node/Deno). */
export type TCargarJson = (url: string) => Promise<unknown>;

/** Opciones de `Obj.resolver`. */
export interface TOpcionesResolver {
  /** Lector del JSON de cada `path` (ya resuelto contra `base`). */
  cargar: TCargarJson;
  /** URL o ruta del documento que contiene las referencias (base de los `path` relativos). */
  base: string;
  /** Avisos no fatales (claves extra, consultas sin resultado en `get`). Por defecto, console.warn. */
  avisar?: (mensaje: string) => void;
  /** Tope de anidamiento de referencias (contra ciclos). Por defecto 16. */
  profundidad?: number;
}

/** Códigos de error de `Obj`. */
export type TCodigoObj = "consulta" | "no-existe" | "varios" | "ninguno" | "ref" | "ciclo" | "carga" | "accion";
