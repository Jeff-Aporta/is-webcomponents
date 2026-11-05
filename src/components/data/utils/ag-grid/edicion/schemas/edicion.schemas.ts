/**
 * ag-grid/edicion — Schemas de la parcela de edicion e interaccion.
 *
 * Los modulos solo importan los tipos (`import type`): el zod no viaja al
 * bundle del componente. Los nombres de opciones son los de AG Grid.
 */
import { z } from 'zod';

/* ── Posiciones y rangos ──────────────────────────────────────────────── */

const PosicionSchema = z.object({ fila: z.number(), col: z.number() });
export type Posicion = z.infer<typeof PosicionSchema>;

/** Rango rectangular inclusivo, siempre normalizado (desde <= hasta). */
const RangoSchema = z.object({ filaDesde: z.number(), filaHasta: z.number(), colDesde: z.number(), colHasta: z.number() });
export type Rango = z.infer<typeof RangoSchema>;

const DireccionSchema = z.enum(['arriba', 'abajo', 'izquierda', 'derecha']);
export type Direccion = z.infer<typeof DireccionSchema>;

/* ── Relleno ──────────────────────────────────────────────────────────── */

const EjeRellenoSchema = z.enum(['x', 'y', 'xy']);
export type EjeRelleno = z.infer<typeof EjeRellenoSchema>;

const PlanRellenoSchema = z.object({ eje: z.enum(['x', 'y']).nullable(), inverso: z.boolean(), final: RangoSchema, nuevas: RangoSchema.nullable(), reducidas: RangoSchema.nullable() });
export type PlanRelleno = z.infer<typeof PlanRellenoSchema>;

/* ── Historial y lote ─────────────────────────────────────────────────── */

const CambioCeldaSchema = z.object({ nodoId: z.string(), colId: z.string(), antes: z.unknown(), despues: z.unknown() });
export type CambioCelda = z.infer<typeof CambioCeldaSchema>;

const AccionHistorialSchema = z.object({ cambios: z.array(CambioCeldaSchema) });
export type AccionHistorial = z.infer<typeof AccionHistorialSchema>;

const PendienteSchema = z.object({ nodoId: z.string(), colId: z.string(), valor: z.unknown() });
export type Pendiente = z.infer<typeof PendienteSchema>;

/* ── Validacion ───────────────────────────────────────────────────────── */

const TipoValidacionSchema = z.enum(['texto', 'numero', 'fecha']);
export type TipoValidacion = z.infer<typeof TipoValidacionSchema>;

const ReglasValidacionSchema = z.object({ maxLength: z.number().optional(), min: z.union([z.number(), z.string(), z.date()]).optional(), max: z.union([z.number(), z.string(), z.date()]).optional() });
export type ReglasValidacion = z.infer<typeof ReglasValidacionSchema>;

const TextosValidacionSchema = z.object({ muyLargo: z.string(), menorQue: z.string(), mayorQue: z.string(), noNumero: z.string(), noFecha: z.string() });
export type TextosValidacion = z.infer<typeof TextosValidacionSchema>;

/* ── Seleccion de filas ───────────────────────────────────────────────── */

const ModoFilasSchema = z.enum(['singleRow', 'multiRow']);

const ClicSeleccionSchema = z.union([z.boolean(), z.literal('enableSelection'), z.literal('enableDeselection')]);

const AlcanceTodoSchema = z.enum(['all', 'filtered', 'currentPage']);
export type AlcanceTodo = z.infer<typeof AlcanceTodoSchema>;

const OpcionesFilasSchema = z.object({ mode: ModoFilasSchema, checkboxes: z.unknown(), headerCheckbox: z.boolean(), enableClickSelection: ClicSeleccionSchema, enableSelectionWithoutKeys: z.boolean(), hideDisabledCheckboxes: z.boolean(), selectAll: AlcanceTodoSchema, copySelectedRows: z.boolean(), ctrlASelectsRows: z.boolean(), isRowSelectable: z.unknown() });
export type OpcionesFilas = z.infer<typeof OpcionesFilasSchema>;

const GestoFilaSchema = z.object({ id: z.string(), ctrl: z.boolean(), shift: z.boolean(), ancla: z.string().nullable(), ordenados: z.array(z.string()) });
export type GestoFila = z.infer<typeof GestoFilaSchema>;

/* ── Filas fijadas y arrastre ─────────────────────────────────────────── */

const LadoFijadoSchema = z.enum(['top', 'bottom']);
export type LadoFijado = z.infer<typeof LadoFijadoSchema>;

const PermisoFijadoSchema = z.union([z.boolean(), LadoFijadoSchema]);
export type PermisoFijado = z.infer<typeof PermisoFijadoSchema>;

const CondicionArrastreSchema = z.object({ ordenado: z.boolean(), filtrado: z.boolean(), paginado: z.boolean(), modelo: z.string() });
export type CondicionArrastre = z.infer<typeof CondicionArrastreSchema>;

/* ── Navegacion ───────────────────────────────────────────────────────── */

/** Lo que la navegacion necesita saber de la grilla, sin tocar el DOM. */
const MapaNavegacionSchema = z.object({ totalFilas: z.number(), totalCols: z.number(), navegable: z.function({ input: [z.number(), z.number()], output: z.boolean() }) });
export type MapaNavegacion = z.infer<typeof MapaNavegacionSchema>;

/* ── Editores ─────────────────────────────────────────────────────────── */

const OpcionListaSchema = z.object({ valor: z.unknown(), texto: z.string() });
export type OpcionLista = z.infer<typeof OpcionListaSchema>;

const BusquedaListaSchema = z.enum(['match', 'matchAny', 'fuzzyMatch']);
export type BusquedaLista = z.infer<typeof BusquedaListaSchema>;
