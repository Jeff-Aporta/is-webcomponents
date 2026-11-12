// @contexto INDICE.md · src/components/data/README.md
/**
 * grid-ui.schemas.ts — Tipos de la capa de UI del data grid: popover, menú,
 * panel de columnas y panel de filtros.
 */
import { z } from 'zod';
import type { ColumnDef, FilterRule } from './grid-types.schemas.js';

/**
 * Popover del grid: un `div` normal que, si el navegador soporta la Popover
 * API, se abre en el top layer. `popover` es opcional porque la API todavia
 * no esta en todos los navegadores.
 */
export type GridPopoverEl = HTMLElement & { popover?: string };
const GridPopoverElSchema = z.custom<GridPopoverEl>();

/** Item de menú que se renderiza con `renderMenu`. */
const MenuItemSchema = z.object({
  label: z.string().optional(),
  icon: z.string().optional(),
  action: z.string().optional(),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  disabled: z.boolean().optional(),
  checked: z.boolean().optional(),
  separator: z.boolean().optional(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

/** Columnas del panel de visibilidad. */
export type RenderColumnsPanelOpts = {
  columns: ColumnDef[];
  isVisible: (field: string) => boolean;
  search?: string;
};

/** Reglas de filtro del panel: lista de reglas + operador lógico. */
export type FilterPanelModel = {
  items: FilterRule[];
  logicOperator?: 'and' | 'or';
};

/** Columnas y modelo con los que se pinta el panel de filtros. */
export type RenderFilterPanelOpts = {
  columns: ColumnDef[];
  model: FilterPanelModel;
};
