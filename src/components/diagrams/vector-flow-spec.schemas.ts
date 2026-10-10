/**
 * vector-flow-spec.schemas.ts — contrato del «diagrama de flujo en vector».
 *
 * Un vector de columnas: cada columna es un sub-diagrama restringido a los tipos de entidad que
 * acepta (su contexto); las aristas son los puentes entre columnas. Se compila al motor del
 * flowchart (una columna = un carril), así ruteo, animación, índices y colores son los mismos.
 */
import { z } from 'zod';

/** Tipos de entidad que una columna puede aceptar. */
export const ZTipoVector = z.enum([
  // entidades incrustadas
  'cliente', 'componente', 'controller', 'pojo', 'tabla',
  // piezas del flujo
  'paso', 'decision', 'variables', 'barra', 'inicio', 'fin', 'nota', 'anidado',
]);
export type TTipoVector = z.infer<typeof ZTipoVector>;

/** Tipos de columna con reglas por defecto (`custom`: solo lo que diga `accepts`). */
export const ZTipoColumna = z.enum(['clientes', 'componentes', 'flujo', 'controllers', 'modelos', 'tablas', 'custom']);
export type TTipoColumna = z.infer<typeof ZTipoColumna>;

/** Un grupo dentro de una columna (región con título). */
export const ZGrupoVector = z.object({ id: z.string().min(1), label: z.string().min(1) });
export type TGrupoVector = z.infer<typeof ZGrupoVector>;

/**
 * Un nodo del vector: los mismos campos que un nodo del flowchart (forma, kind y su entidad, vars,
 * ícono…), sin `lane` (lo pone su columna). `group` es el id de un grupo de su columna. `klass`
 * (en un controller): id del nodo de su POJO; si ambos están, la arista `klass` se agrega sola.
 */
export const ZNodoVector = z.object({
  id: z.string().min(1),
  group: z.string().optional(),
  klass: z.string().optional(),
}).passthrough();
export type TNodoVector = z.infer<typeof ZNodoVector>;

export const ZColumnaVector = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tipo: ZTipoColumna.default('custom'),
  /** Tipos aceptados; si falta, los del `tipo` de la columna. */
  accepts: z.array(ZTipoVector).optional(),
  groups: z.array(ZGrupoVector).optional(),
  align: z.literal('center').optional(),
  nodes: z.array(ZNodoVector).default([]),
});
export type TColumnaVector = z.infer<typeof ZColumnaVector>;

export const ZAristaVector = z.object({ from: z.string().min(1), to: z.string().min(1) }).passthrough();
export type TAristaVector = z.infer<typeof ZAristaVector>;

/** El payload `vectorFlow`: columnas en orden (izquierda → derecha) y las aristas que las unen. */
export const ZVectorFlow = z.object({
  title: z.string().optional(),
  steps: z.union([z.literal('auto'), z.boolean()]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(ZColumnaVector).min(1),
  edges: z.array(ZAristaVector).default([]),
}).passthrough();
export type TVectorFlow = z.infer<typeof ZVectorFlow>;
