/**
 * meta-list.schemas.ts — tipos de `<iswc-meta-list>` (lista de metadatos clave → valor por grupos).
 */
import { z } from "zod";

/** Una fila: etiqueta y valor (texto, código o etiquetas). */
export const MetaRowSchema = z.object({
  /** Clave visible (columna izquierda). */
  label: z.string(),
  /** Valor en texto plano. */
  value: z.string().optional(),
  /** Pinta el valor en monoespaciado (rutas, ids, código). */
  mono: z.boolean().optional(),
  /** Valor como etiquetas `iswc-tag` (pill). */
  tags: z.array(z.string()).optional(),
  /** Texto atenuado si la fila no trae valor; sin él, la fila vacía no se pinta. */
  empty: z.string().optional(),
});
export type MetaRow = z.infer<typeof MetaRowSchema>;

/** Un grupo de filas con título opcional. Un grupo sin filas visibles no se pinta. */
export const MetaGroupSchema = z.object({
  title: z.string().optional(),
  rows: z.array(MetaRowSchema),
});
export type MetaGroup = z.infer<typeof MetaGroupSchema>;

/** Disposición: `grid` (clave | valor en columnas) o `stacked` (clave sobre valor). */
export const MetaListLayoutSchema = z.enum(["grid", "stacked"]);
export type MetaListLayout = z.infer<typeof MetaListLayoutSchema>;
