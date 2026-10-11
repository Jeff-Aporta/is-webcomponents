/**
 * diagram-graph.ts — grafo dirigido de un diagrama (nodos por id, aristas `from → to`), común a
 * todos los motores que recorren el flujo: capas (node-link), reprocesos (swimlane), índices
 * jerárquicos (flowchart) y las herramientas que derivan una vista de otra (p. ej. la Seq de su
 * Seq in Vec en el consumidor).
 *
 *   - `aristasDeRetorno`: las aristas que cierran un ciclo (DFS blanco / gris / negro); quitándolas el
 *     grafo es un DAG y ningún recorrido se cuelga.
 *   - `grafoDirigido`: hijos hacia adelante (sin retornos, en el orden que pida el llamador),
 *     alcanzables desde cada nodo y la reunión de varias ramas (el primer nodo común).
 */

import type { AristaDirigida, GrafoDirigido, OpcionesGrafo } from './diagram-graph.schemas.js';

export type * from './diagram-graph.schemas.js';

/** Clave estable de una arista (para marcar retornos sin depender de ids opcionales). */
export const claveArista = (e: AristaDirigida): string => `${e.from}>${e.to}`;

/**
 * Aristas de retorno (las que cierran un ciclo, self-loops incluidos), como claves `from>to`. Se
 * recorre primero desde las fuentes (sin entradas) en el orden de `ids`, y luego lo que quede: el
 * mismo criterio en todos los diagramas, así un ciclo se corta siempre por la misma arista.
 */
export function aristasDeRetorno(ids: readonly string[], edges: readonly AristaDirigida[]): Set<string> {
  const presentes = new Set(ids);
  const hijos = new Map<string, string[]>();
  for (const id of ids) hijos.set(id, []);
  for (const e of edges) if (presentes.has(e.from) && presentes.has(e.to)) hijos.get(e.from)!.push(e.to);
  const conEntrada = new Set(edges.filter((e) => presentes.has(e.from) && presentes.has(e.to)).map((e) => e.to));
  const estado = new Map<string, 1 | 2>();
  const atras = new Set<string>();
  const visitar = (id: string): void => {
    estado.set(id, 1);
    for (const h of hijos.get(id) ?? []) {
      if (estado.get(h) === 1) atras.add(`${id}>${h}`);
      else if (!estado.has(h)) visitar(h);
    }
    estado.set(id, 2);
  };
  for (const id of ids) if (!conEntrada.has(id) && !estado.has(id)) visitar(id);
  for (const id of ids) if (!estado.has(id)) visitar(id);
  return atras;
}

/**
 * Grafo dirigido listo para recorrer. `orden` ordena los hijos (p. ej. por posición de lectura);
 * `termina` marca nodos que no se atraviesan (el fin de un flujo: su respuesta vuelve al inicio) y
 * que tampoco sirven de reunión.
 */
export function grafoDirigido(
  ids: readonly string[],
  edges: readonly AristaDirigida[],
  opts: OpcionesGrafo = {},
): GrafoDirigido {
  const presentes = new Set(ids);
  const aristas = edges.filter((e) => presentes.has(e.from) && presentes.has(e.to));
  const atras = aristasDeRetorno(ids, aristas);
  const termina = opts.termina ?? (() => false);
  const hijos = new Map<string, string[]>();
  for (const e of aristas) {
    if (atras.has(claveArista(e))) continue;
    hijos.set(e.from, [...(hijos.get(e.from) ?? []), e.to]);
  }
  const entradas = new Set(aristas.map((e) => e.to));
  const salidas = new Set(aristas.map((e) => e.from));
  const cache = new Map<string, string[]>();
  const siguientes = (id: string): string[] => {
    const m = cache.get(id);
    if (m) return m;
    const hs = termina(id) ? [] : [...new Set(hijos.get(id) ?? [])];
    if (opts.orden) hs.sort(opts.orden);
    cache.set(id, hs);
    return hs;
  };
  const alcance = new Map<string, Set<string>>();
  const alcanzables = (id: string): Set<string> => {
    const m = alcance.get(id);
    if (m) return m;
    const vistos = new Set<string>();
    const pila = [id];
    while (pila.length) for (const h of siguientes(pila.pop()!)) if (!vistos.has(h)) { vistos.add(h); pila.push(h); }
    alcance.set(id, vistos);
    return vistos;
  };
  const reunion = (ramas: readonly string[]): string | null => {
    if (!ramas.length) return null;
    const orden: string[] = [];
    const vistos = new Set<string>([ramas[0]!]);
    const cola = [ramas[0]!];
    while (cola.length) {
      const x = cola.shift()!;
      orden.push(x);
      for (const h of siguientes(x)) if (!vistos.has(h)) { vistos.add(h); cola.push(h); }
    }
    return orden.find((x) => !termina(x) && ramas.every((r) => r === x || alcanzables(r).has(x))) ?? null;
  };
  return {
    atras,
    fuentes: ids.filter((id) => !entradas.has(id) && salidas.has(id)),
    conEntrada: (id) => entradas.has(id),
    conSalida: (id) => salidas.has(id),
    siguientes,
    alcanzables,
    reunion,
  };
}
