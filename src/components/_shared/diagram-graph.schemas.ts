/**
 * diagram-graph.schemas.ts — tipos del grafo dirigido común de los diagramas (ver diagram-graph.ts).
 */
import { z } from 'zod';

/** Arista dirigida mínima: basta con `from` y `to` (cualquier arista de cualquier diagrama la cumple). */
export const AristaDirigidaSchema = z.object({ from: z.string(), to: z.string() });
export type AristaDirigida = z.infer<typeof AristaDirigidaSchema>;

/** Grafo listo para recorrer (lo devuelve `grafoDirigido`). */
export type GrafoDirigido = {
  /** Aristas de retorno (claves `from>to`). */
  atras: Set<string>;
  /** Nodos con alguna salida y ninguna entrada (en el orden dado). */
  fuentes: string[];
  /** ¿Tiene alguna entrada (contando retornos)? */
  conEntrada: (id: string) => boolean;
  /** ¿Tiene alguna salida (contando retornos)? */
  conSalida: (id: string) => boolean;
  /** Hijos hacia adelante (sin retornos ni repetidos), en el orden de lectura del llamador. */
  siguientes: (id: string) => string[];
  /** Todo lo alcanzable desde `id` hacia adelante (sin `id`), memorizado. */
  alcanzables: (id: string) => Set<string>;
  /** Donde se reúnen varias ramas: el primer nodo (por cercanía a la primera) alcanzable desde todas. */
  reunion: (ramas: readonly string[]) => string | null;
};

/** Opciones de `grafoDirigido`: orden de los hijos y nodos que no se atraviesan. */
export type OpcionesGrafo = { orden?: (a: string, b: string) => number; termina?: (id: string) => boolean };
