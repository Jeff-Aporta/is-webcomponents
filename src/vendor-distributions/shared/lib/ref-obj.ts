// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md
/**
 * ref-obj.ts — operaciones FÍSICAS sobre JSON: referencias `{ path, query, actions }` a OTROS
 * documentos (fuente de verdad). `RefObj.resolver` lee cada `path` (fetch en el navegador, fs en
 * Deno/Node: lo decide `cargar`), toma el valor con `Obj.getValue` y le aplica las acciones
 * virtuales de `Obj`. Lo usan los diagramas de iswc y sus herramientas de render.
 *
 *   RefObj.esRef(v)                   ¿`v` tiene forma de referencia?
 *   RefObj.resolver(valor, opciones)  cambia cada referencia por el valor que señala, recursivo.
 *   resolverUrl(path, base)           `path` relativo a `base` (URL o ruta de archivo).
 *
 * Importable por URL desde Deno:
 * https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/shared/lib/ref-obj.ts
 * Skill: src/vendor-distributions/shared/lib/obj.md
 */
import { ZRefObj, type TOpcionesResolver, type TRefObj } from "../schemas.ts";
import { Obj, ObjError } from "./obj.ts";

const esPlano = (v: unknown): v is Record<string, unknown> => Obj.esPlano(v);
const unir = (ruta: string, k: string): string => (ruta ? `${ruta}.${k}` : k);

export class RefObj {
  /** `true` si `v` tiene forma de referencia (`path` + `query`). */
  static esRef(v: unknown): v is TRefObj {
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
  static async resolver(valor: unknown, opciones: TOpcionesResolver): Promise<unknown> {
    const avisar = opciones.avisar ?? ((m: string) => console.warn(`[RefObj] ${m}`));
    const tope = opciones.profundidad ?? 16;
    const cache = new Map<string, Promise<unknown>>();
    const cargar = (url: string): Promise<unknown> => {
      if (!cache.has(url)) {
        cache.set(url, opciones.cargar(url).catch((e) => {
          throw new ObjError("carga", `no se pudo leer ${url}: ${e instanceof Error ? e.message : String(e)}`);
        }));
      }
      return cache.get(url)!;
    };
    const visitar = async (v: unknown, base: string, ruta: string, pila: readonly string[]): Promise<unknown> => {
      if (Array.isArray(v)) return Promise.all(v.map((x, i) => visitar(x, base, unir(ruta, String(i)), pila)));
      if (!esPlano(v)) return v;
      if (typeof v.path === "string" && "query" in v) {
        const r = ZRefObj.safeParse(v);
        if (!r.success) throw new ObjError("ref", `referencia mal formada: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`, ruta);
        const extra = Object.keys(v).filter((k) => k !== "path" && k !== "query" && k !== "actions");
        if (extra.length) avisar(`${ruta || "(raíz)"}: claves ignoradas en la referencia: ${extra.join(", ")}`);
        const url = resolverUrl(r.data.path, base);
        const id = `${url}#${JSON.stringify(r.data.query)}`;
        if (pila.includes(id)) throw new ObjError("ciclo", `referencia circular: ${[...pila, id].join(" → ")}`, ruta);
        if (pila.length >= tope) throw new ObjError("ciclo", `más de ${tope} referencias anidadas`, ruta);
        const doc = await cargar(url);
        // La consulta de una referencia es SIEMPRE un getValue: el valor exacto, o error si no existe.
        let traido: unknown;
        try {
          traido = Obj.getValue(doc, r.data.query);
        } catch (e) {
          if (e instanceof ObjError) throw new ObjError(e.codigo, `${r.data.path}: ${e.message}`, ruta);
          throw e;
        }
        if (traido === null) {
          throw new ObjError("no-existe", `${r.data.path}: el valor no existe (${Obj.caminoUnico(r.data.query).join(".")}); defínalo en la fuente o ajuste path/query`, ruta);
        }
        const resuelto = await visitar(traido, url, ruta, [...pila, id]);
        try {
          return Obj.aplicar(resuelto, r.data.actions);
        } catch (e) {
          if (e instanceof ObjError) throw new ObjError(e.codigo, e.message, ruta);
          throw e;
        }
      }
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = await visitar(x, base, unir(ruta, k), pila);
      return out;
    };
    return visitar(valor, opciones.base, "", []);
  }
}

/** `path` relativo a `base` (URL o ruta de archivo, con `/` o `\`). */
export function resolverUrl(path: string, base: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) && !/^[a-z]:[\\/]/i.test(path)) return path;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(base) || base.startsWith("file:")) return new URL(path, base).href;
  const sep = base.replace(/\\/g, "/");
  const dir = sep.slice(0, sep.lastIndexOf("/") + 1);
  const partes = (path.startsWith("/") || /^[a-z]:\//i.test(path.replace(/\\/g, "/")) ? path.replace(/\\/g, "/") : dir + path).split("/");
  const out: string[] = [];
  for (const p of partes) {
    if (p === "..") out.pop();
    else if (p !== ".") out.push(p);
  }
  return out.join("/");
}
