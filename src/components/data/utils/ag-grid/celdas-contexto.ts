// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas-contexto — Arma el contexto de una celda fuera del ciclo de
 * render (tooltips, clics, flash) y aplica el renderer de una columna.
 */
import type { RegistroRenderers, Seleccion, Funcion } from './celdas-contexto.schemas.js';
import type { ColDefAg, ContextoCelda, GridHost, RendererCelda, RendererMontable } from './contrato.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import { paramsCelda } from './celdas-valores.js';

export function contextoCelda(grid: GridHost, col: ColumnState, node: RowNode, rowIndex: number): ContextoCelda {
  return { grid, col, def: grid.defDe(col), node, data: node.data ?? null, value: grid.valor(col, node), texto: grid.textoCelda(col, node), rowIndex, params: {} };
}

function paramsDeRenderer(def: ColDefAg, ctx: ContextoCelda): Record<string, unknown> {
  const propios = def['cellRendererParams'];
  if (typeof propios === 'function') return ((propios as Funcion)(paramsCelda(ctx)) ?? {}) as Record<string, unknown>;
  return (propios ?? {}) as Record<string, unknown>;
}

function html(r: RendererCelda | RendererMontable): RendererCelda {
  return typeof r === 'function' ? r : r.html;
}

/**
 * Renderer efectivo de la celda: `cellRendererSelector` gana sobre `cellRenderer`
 * y sus `params` se suman a `cellRendererParams`. Devuelve el contexto con esos
 * params ya fusionados, o null si la columna pinta texto plano.
 */
export function resolverRenderer(def: ColDefAg, ctx: ContextoCelda, registro: RegistroRenderers): { renderer: RendererCelda | RendererMontable; ctx: ContextoCelda } | null {
  const selector = def['cellRendererSelector'];
  const elegido: Seleccion = typeof selector === 'function' ? ((selector as Funcion)(paramsCelda(ctx)) as Seleccion) : null;
  const candidato = elegido?.component ?? def['cellRenderer'];
  if (candidato == null) return null;
  const renderer = typeof candidato === 'string' ? registro(candidato) : (candidato as RendererCelda | RendererMontable);
  if (!renderer) return null;
  const params = { ...paramsDeRenderer(def, ctx), ...elegido?.params };
  return { renderer, ctx: { ...ctx, params: { ...ctx.params, ...params } } };
}

/** HTML de la celda, tolerando un renderer de usuario que devuelva null o un Element. */
export function pintarCelda(r: RendererCelda | RendererMontable, ctx: ContextoCelda): string {
  const salida: unknown = html(r)(ctx);
  if (salida == null) return '';
  if (typeof salida === 'string') return salida;
  return (salida as Element).outerHTML ?? String(salida);
}
