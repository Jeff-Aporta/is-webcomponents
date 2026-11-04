/**
 * ag-grid/edicion/filas-fijadas — Row pinning. Un transformador `aplanar` deja
 * las fijadas al inicio/final con `pegar`; el host las mantiene sticky, y foco,
 * rangos y navegacion las ven como filas normales de la lista.
 */
import { apiPublica } from './apoyo.js';
import { ladoPermitido } from './filas-movidas.js';
import { partirFijadas } from './filas-movidas.js';
import type { ContextoMenu } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { Desinstalar } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { FilaDisplay } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { ItemMenu } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { RowData } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { LadoFijado } from './schemas/edicion.schemas.js';
import type { PermisoFijado } from './schemas/edicion.schemas.js';

const DEPENDENCIA = 'filasFijadas';
const PEGAR: Record<LadoFijado, 'arriba' | 'abajo'> = { top: 'arriba', bottom: 'abajo' };

export class FilasFijadas {
  #grid: GridHost;
  #lados = new Map<string, LadoFijado | null>();

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  instalar(): Desinstalar {
    const grid = this.#grid;
    const refrescar = (): void => grid.recomputar(DEPENDENCIA);
    const inicial = grid.opcion<{ rowPinning?: { top?: string[]; bottom?: string[] } }>('initialState', {})?.rowPinning;
    for (const id of inicial?.top ?? []) this.#lados.set(id, 'top');
    for (const id of inicial?.bottom ?? []) this.#lados.set(id, 'bottom');
    const quitar = [
      grid.transformador({ etapa: 'aplanar', depende: [DEPENDENCIA], aplicar: (filas) => this.#aplanar(filas as FilaDisplay[]) , activo: () => this.#lados.size > 0 }),
      grid.alCambiarOpcion('pinnedTopRowData', refrescar),
      grid.alCambiarOpcion('pinnedBottomRowData', refrescar),
      grid.alCambiarOpcion('enableRowPinning', refrescar),
      grid.menu((ctx) => this.#menu(ctx)),
    ];
    return () => {
      for (const fn of quitar) fn();
    };
  }

  get #permiso(): PermisoFijado {
    return this.#grid.opcion<PermisoFijado>('enableRowPinning', false);
  }

  #lado(node: RowNode): LadoFijado | null {
    if (this.#lados.has(node.id)) return this.#lados.get(node.id) ?? null;
    const fn = this.#grid.opcion<unknown>('isRowPinned');
    const lado = typeof fn === 'function' ? fn({ node, data: node.data, api: apiPublica(this.#grid) }) ?? null : null;
    this.#lados.set(node.id, lado);
    return lado;
  }

  /** `pinnedTopRowData`: filas que no pasan por orden, filtro ni seleccion. */
  #deDatos(lado: LadoFijado): FilaDisplay[] {
    const nombre = lado === 'top' ? 'pinnedTopRowData' : 'pinnedBottomRowData';
    const datos = this.#grid.opcion<RowData[]>(nombre, []);
    return (datos ?? []).map((data, index) => ({ kind: 'leaf', level: 0, node: { id: `${lado}-${index}`, index, data }, pegar: PEGAR[lado] }) as FilaDisplay);
  }

  #aplanar(filas: FilaDisplay[]): FilaDisplay[] {
    const arriba = this.#deDatos('top');
    const abajo = this.#deDatos('bottom');
    if (!this.#permiso) return arriba.length || abajo.length ? [...arriba, ...filas, ...abajo] : filas;
    const partes = partirFijadas(filas, (fila) => {
      if (fila.kind !== 'leaf' || !('node' in fila) || !fila.node) return null;
      return this.#lado(fila.node);
    });
    const marcar = (lista: FilaDisplay[], lado: LadoFijado): FilaDisplay[] => lista.map((f) => ({ ...f, pegar: PEGAR[lado] }));
    return [...arriba, ...marcar(partes.arriba, 'top'), ...partes.centro, ...marcar(partes.abajo, 'bottom'), ...abajo];
  }

  fijar(node: RowNode, lado: LadoFijado | null): void {
    const grid = this.#grid;
    if (this.#lados.get(node.id) === lado) return;
    this.#lados.set(node.id, lado);
    grid.recomputar(DEPENDENCIA);
    grid.emitir('pinnedRowsChanged', { node, pinned: lado });
  }

  #menu(ctx: ContextoMenu): ItemMenu[] {
    const grid = this.#grid;
    const node = ctx.node;
    if (ctx.tipo !== 'contexto' || !node) return [];
    const permiso = this.#permiso;
    if (!permiso) return [];
    const puede = grid.opcion<unknown>('isRowPinnable');
    if (typeof puede === 'function' && puede({ node, data: node.data }) !== true) return [];
    const actual = this.#lado(node);
    const hijos: ItemMenu[] = [];
    if (ladoPermitido(permiso, 'top')) hijos.push({ id: 'pinTop', texto: grid.texto('pinTop', 'Fijar arriba'), marcado: actual === 'top', accion: () => this.fijar(node, 'top') });
    if (ladoPermitido(permiso, 'bottom')) hijos.push({ id: 'pinBottom', texto: grid.texto('pinBottom', 'Fijar abajo'), marcado: actual === 'bottom', accion: () => this.fijar(node, 'bottom') });
    hijos.push({ id: 'unpin', texto: grid.texto('unpinRow', 'Desfijar'), deshabilitado: actual === null, accion: () => this.fijar(node, null) });
    return [{ id: 'pinRow', texto: grid.texto('pinRow', 'Fijar fila'), icono: 'mdi:pin-outline', hijos }];
  }

  #deLado(lado: LadoFijado): RowNode[] {
    const salida = this.#deDatos(lado).flatMap((f) => ('node' in f && f.node ? [f.node] : []));
    for (const node of (this.#grid.modelo()?.getAllRows() ?? []) as RowNode[]) {
      if (this.#lados.get(node.id) === lado) salida.push(node);
    }
    return salida;
  }

  contar(lado: LadoFijado): number {
    return this.#deLado(lado).length;
  }

  en(lado: LadoFijado, indice: number): RowNode | null {
    return this.#deLado(lado)[indice] ?? null;
  }

  /** Parte `rowPinning` del Grid State. */
  estado(): { top: string[]; bottom: string[] } {
    const ids = (lado: LadoFijado): string[] => [...this.#lados].filter(([, l]) => l === lado).map(([id]) => id);
    return { top: ids('top'), bottom: ids('bottom') };
  }
}
