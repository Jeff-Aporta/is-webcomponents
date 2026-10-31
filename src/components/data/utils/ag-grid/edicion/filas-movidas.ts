/**
 * ag-grid/edicion/filas-movidas — Reglas puras de filas fijadas y de row dragging.
 */
import type { CondicionArrastre } from './schemas/edicion.schemas.js';
import type { LadoFijado } from './schemas/edicion.schemas.js';
import type { PermisoFijado } from './schemas/edicion.schemas.js';

/* ── Fijadas ──────────────────────────────────────────────────────────── */

export function ladoPermitido(permiso: PermisoFijado, lado: LadoFijado): boolean {
  if (permiso === true) return true;
  return permiso === lado;
}

/** Separa en arriba/centro/abajo sin alterar el orden relativo: lo ya ordenado sigue ordenado. */
export function partirFijadas<T>(filas: T[], ladoDe: (fila: T) => LadoFijado | null): { arriba: T[]; centro: T[]; abajo: T[] } {
  const arriba: T[] = [];
  const centro: T[] = [];
  const abajo: T[] = [];
  for (const fila of filas) {
    const lado = ladoDe(fila);
    if (lado === 'top') arriba.push(fila);
    else if (lado === 'bottom') abajo.push(fila);
    else centro.push(fila);
  }
  return { arriba, centro, abajo };
}

/* ── Arrastre ─────────────────────────────────────────────────────────── */

/** El arrastre gestionado no tiene sentido si lo mostrado no es el orden real de los datos. */
export function gestionadoDisponible(c: CondicionArrastre): boolean {
  return !c.ordenado && !c.filtrado && !c.paginado && c.modelo === 'clientSide';
}

/** Si la fila tomada esta seleccionada se mueven todas las seleccionadas; si no, solo ella. */
export function filasAMover(id: string, seleccionadas: string[], multi: boolean, ordenados: string[]): string[] {
  if (!multi || !seleccionadas.includes(id)) return [id];
  return ordenados.filter((o) => seleccionadas.includes(o));
}

/** Nuevo orden al soltar `movidos` antes o despues de `destino`. Soltar sobre uno movido no cambia nada. */
export function reordenar(ordenados: string[], movidos: string[], destino: string, despues: boolean): string[] {
  if (movidos.includes(destino)) return ordenados;
  const resto = ordenados.filter((id) => !movidos.includes(id));
  const posicion = resto.indexOf(destino);
  if (posicion < 0) return ordenados;
  const corte = despues ? posicion + 1 : posicion;
  return [...resto.slice(0, corte), ...movidos, ...resto.slice(corte)];
}
