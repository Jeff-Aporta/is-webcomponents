// @contexto INDICE.md · src/components/isp/README.md
/**
 * isp-record-utils.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

/**
 * Registro ISP: plano o con `getProp`/`setProp`/`.f`. El indice abierto
 * deja leer y escribir claves por nombre (`titulo`, `codigo`…).
 */
export type IspRecord = {
  getProp?: (key: string) => unknown;
  setProp?: (key: string, value: unknown) => void;
  toJSON?: (conClase?: boolean) => unknown;
  clone?: () => IspRecord;
  f?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Fila plana para la grilla: los datos del registro mas su referencia. */
export type GridRow = {
  id?: string | number;
  __record?: IspRecord;
  [key: string]: unknown;
};

/** Definicion cruda de una columna ISP (puede anidar subcolumnas). */
type IspColumnDef = {
  caption?: string;
  size?: number;
  align?: 'left' | 'right' | 'center';
  visible?: boolean;
  filter?: boolean;
  type?: string;
  children?: IspColumnsMap;
};
/** Mapa anidado de columnas ISP. */
export type IspColumnsMap = Record<string, IspColumnDef>;

const IspColumnDefSchema: z.ZodType<IspColumnDef> = z.object({
  caption: z.string().optional(),
  size: z.number().optional(),
  align: z.union([z.literal('left'), z.literal('right'), z.literal('center')]).optional(),
  visible: z.boolean().optional(),
  filter: z.boolean().optional(),
  type: z.union([z.literal('number'), z.literal('currency'), z.literal('date'), z.literal('dateTime'), z.literal('bool'), z.string()]).optional(),
  get children(): z.ZodOptional<z.ZodRecord<z.ZodString, typeof IspColumnDefSchema>> { return z.record(z.string(), IspColumnDefSchema).optional(); },
});

const FlatGridColumnSchema = z.object({
  field: z.string(),
  header: z.string(),
  width: z.number().optional(),
  align: z.union([z.literal('left'), z.literal('right'), z.literal('center')]),
  hide: z.boolean(),
  sortable: z.boolean(),
  filter: z.boolean(),
  type: z.union([z.literal('number'), z.literal('date'), z.literal('enum'), z.literal('text')]),
});
export type FlatGridColumn = z.infer<typeof FlatGridColumnSchema>;

