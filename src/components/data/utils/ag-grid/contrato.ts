/**
 * ag-grid/contrato — Contrato de plugins de <iswc-ag-grid>.
 *
 * Cada carpeta (celdas, filtros, edicion, filas, ...) exporta
 *
 *     export function instalar(grid: GridHost): Desinstalar | void
 *
 * y NO toca ag-grid.ts, ag-grid.scss ni datagrid-core: el host (ag-grid.ts) es
 * quien implementa `GridHost`, llama a `instalar` en su constructor (el plugin
 * NO puede asumir que haya datos ni columnas todavia) y corre `Desinstalar` en
 * disconnectedCallback. Solo imports de tipo desde aqui: nada de runtime.
 *
 * Reglas para los plugins:
 *   - Sin px ni rem: tamanos en em. Los anchos de columna y alturas de fila
 *     son unidades logicas (1u = 1/16em); usa `grid.em(u)` para pasar a CSS.
 *   - Nada de document.head ni document.body: lo flotante va por
 *     `grid.flotante()` (popover nativo en top layer, dentro del shadow).
 *   - Estilos del plugin: archivo `<carpeta>/estilos.scss` con clases `iswc-ag-*`
 *     y tokens `--iswc-grid-*`; el coordinador lo incluye desde ag-grid.scss.
 *   - Celdas: renderer por string HTML y sin custom elements por celda salvo
 *     que `montar` demuestre rendir con virtualizacion; el pool recicla el DOM.
 *   - Todo texto visible sale de `grid.texto(clave, porDefecto)` (localeText).
 *   - Eventos: nombres de AG Grid en camelCase. `grid.emitir('cellValueChanged', d)`
 *     llega a `addEventListener` de la api, a `gridOptions.onCellValueChanged`
 *     y como CustomEvent `iswc-cell-value-changed` del host.
 *
 * Acuerdos con el host (ag-grid.ts):
 *   - Metodos reservados en `exponer`: presentarCelda(ctx)->PresentacionCelda y
 *     presentarFila(node,indice)->PresentacionFila (celdas); ordenarPorClic(colId,ev)
 *     y setQuickFilter (filtros). Si existen, el host los usa en vez de los suyos.
 *   - `grid.valor`/`textoCelda` delegan en celdas/valores.ts.
 *   - `Rect` va en unidades logicas, relativo a la capa, y se calcula por layout:
 *     responde tambien para filas fuera de la ventana virtual.
 *   - Cada render del cuerpo emite `pintado`. Las celdas llevan data-col-id y
 *     data-row-id; `presentarCelda().clases` sobrevive al reciclado.
 *   - `grid.menu`: el host pinta y abre; el plugin solo devuelve items.
 *   - sideBar, openToolPanel y paneles: filtros. Contador y paginador: host.
 *   - Con `rowSelection` objeto, la seleccion por clic/teclado es de edicion; el
 *     checkbox llega a `celdaClic` con colId `__seleccion` (encabezado: indice -1).
 *   - Los `teclado` de plugins corren antes que el del host.
 */

import type { Desinstalar, Rect, PresentacionCelda, PresentacionFila, GridHost } from './contrato.schemas.js';
export type * from './contrato.schemas.js';
import type { ColumnFilter, ColumnState, DisplayRow, FilterModel, GridApi, GridState, RowData, RowNode, SortModel } from '../../schemas/datagrid-types.schemas.js';

/* ── Identidad del plugin ─────────────────────────────────────────────── */


/* ── Opciones ─────────────────────────────────────────────────────────── */


/* ── Celdas ───────────────────────────────────────────────────────────── */


/* ── Filtros ──────────────────────────────────────────────────────────── */


/* ── Pipeline de filas ────────────────────────────────────────────────── */

/**
 * Transforma filas tras la etapa nativa. `aplanar` recibe y devuelve
 * DisplayRow[] (grupos, detalle, totales). Debe ser pura: el host la memoiza
 * y solo la repite cuando cambia lo que `depende` declara.
 */



/* ── UI extensible ────────────────────────────────────────────────────── */




/* ── Host ─────────────────────────────────────────────────────────────── */


export type { ColumnFilter, ColumnState, DisplayRow, FilterModel, GridApi, GridState, RowData, RowNode, SortModel };
