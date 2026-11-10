// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/filas/cache-bloques — Cache por bloques de los modelos infinite y SSRM.
 *
 * Sin DOM ni datasource propio: `pedir` es inyectado. Una `version` invalida las
 * respuestas tardias de antes de un purge. El conteo sigue la regla de AG Grid:
 * mientras no se conoce el ultimo indice crece con `desborde` filas de margen.
 */
import type { BloqueCache, EstadoBloque, OpcionesCache } from './filas.schemas.js';
import type { RowData } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';

export class CacheBloques {
  #op: OpcionesCache;
  #bloques = new Map<number, BloqueCache>();
  #cola: number[] = [];
  #activas = 0;
  #version = 0;
  #reloj = 0;
  #total: number;
  #ultimaConocida = false;

  constructor(op: OpcionesCache) {
    this.#op = op;
    this.#total = op.inicial;
  }

  total(): number {
    return this.#total;
  }

  ultimaConocida(): boolean {
    return this.#ultimaConocida;
  }

  fijarTotal(total: number, conocida = true): void {
    this.#total = total;
    this.#ultimaConocida = conocida;
    this.#op.alCambiar();
  }

  fila(indice: number): RowData | null {
    const id = Math.floor(indice / this.#op.tamBloque);
    const b = this.#bloques.get(id);
    if (!b || b.estado === 'needsLoading' || b.estado === 'failed') return null;
    b.toque = ++this.#reloj;
    return b.filas[indice - b.desde] ?? null;
  }

  estadoFila(indice: number): EstadoBloque | null {
    return this.#bloques.get(Math.floor(indice / this.#op.tamBloque))?.estado ?? null;
  }

  estados(): Record<number, { blockNumber: number; startRow: number; endRow: number; pageStatus: EstadoBloque }> {
    const out: Record<number, { blockNumber: number; startRow: number; endRow: number; pageStatus: EstadoBloque }> = {};
    for (const b of this.#bloques.values()) out[b.id] = { blockNumber: b.id, startRow: b.desde, endRow: b.desde + this.#op.tamBloque, pageStatus: b.estado };
    return out;
  }

  /** Marca para carga los bloques del rango, con proteccion LRU para los visibles. */
  asegurar(desde: number, hasta: number): void {
    const tam = this.#op.tamBloque;
    const primero = Math.max(0, Math.floor(desde / tam));
    const ultimo = Math.floor(Math.max(desde, hasta) / tam);
    for (let id = primero; id <= ultimo; id++) {
      if (id * tam >= this.#total && this.#ultimaConocida) break;
      const b = this.#bloques.get(id);
      if (b) {
        b.toque = ++this.#reloj;
        continue;
      }
      this.#bloques.set(id, { id, estado: 'needsLoading', filas: [], desde: id * tam, toque: ++this.#reloj, version: this.#version });
      this.#cola.push(id);
    }
    this.#desalojar(primero, ultimo);
    this.#bombear();
  }

  #desalojar(primero: number, ultimo: number): void {
    const max = this.#op.maxBloques;
    if (max == null || max < 1 || this.#bloques.size <= max) return;
    const candidatos = [...this.#bloques.values()].filter((b) => b.estado === 'loaded' && (b.id < primero || b.id > ultimo));
    candidatos.sort((a, b) => a.toque - b.toque);
    let sobran = this.#bloques.size - max;
    for (const b of candidatos) {
      if (sobran <= 0) return;
      this.#bloques.delete(b.id);
      sobran--;
    }
  }

  #bombear(): void {
    const tope = this.#op.maxConcurrentes ?? Infinity;
    while (this.#cola.length && this.#activas < tope) {
      const id = this.#cola.shift() as number;
      const b = this.#bloques.get(id);
      if (!b || b.estado !== 'needsLoading') continue;
      this.#lanzar(b);
    }
  }

  #lanzar(b: BloqueCache): void {
    b.estado = 'loading';
    b.version = this.#version;
    this.#activas++;
    let hecho = false;
    const version = this.#version;
    const cerrar = (): boolean => {
      if (hecho) return false;
      hecho = true;
      if (version === this.#version) this.#activas--;
      return version === this.#version && this.#bloques.get(b.id) === b;
    };
    const exito = (filas: RowData[], ultima?: number | null): void => {
      if (!cerrar()) return;
      b.estado = 'loaded';
      b.filas = filas;
      this.#ajustarTotal(b, filas.length, ultima);
      this.#op.alCambiar();
      this.#bombear();
    };
    const fallo = (): void => {
      if (!cerrar()) return;
      b.estado = 'failed';
      this.#op.alCambiar();
      this.#bombear();
    };
    this.#op.pedir({ startRow: b.desde, endRow: b.desde + this.#op.tamBloque, exito, fallo });
  }

  #ajustarTotal(b: BloqueCache, recibidas: number, ultima?: number | null): void {
    if (ultima != null && ultima >= 0) {
      this.#total = ultima;
      this.#ultimaConocida = true;
      return;
    }
    if (this.#ultimaConocida) return;
    if (recibidas < this.#op.tamBloque) {
      this.#total = b.desde + recibidas;
      this.#ultimaConocida = true;
      return;
    }
    this.#total = Math.max(this.#total, b.desde + recibidas + this.#op.desborde);
  }

  /** purge: olvida todo. Sin purge conserva lo cargado a la vista y lo vuelve a pedir. */
  refrescar(purgar = true): void {
    this.#version++;
    this.#activas = 0;
    this.#cola = [];
    if (purgar) {
      this.#bloques.clear();
      this.#total = this.#op.inicial;
      this.#ultimaConocida = false;
      this.#op.alCambiar();
      return;
    }
    for (const b of this.#bloques.values()) {
      b.estado = 'needsLoading';
      this.#cola.push(b.id);
    }
    this.#bombear();
  }

  reintentar(): void {
    for (const b of this.#bloques.values()) {
      if (b.estado !== 'failed') continue;
      b.estado = 'needsLoading';
      this.#cola.push(b.id);
    }
    this.#bombear();
  }

  /** Reemplaza el contenido de filas ya cargadas por indice logico (applyServerSideRowData y transacciones). */
  escribir(inicio: number, filas: readonly RowData[]): void {
    const tam = this.#op.tamBloque;
    for (let i = 0; i < filas.length; i++) {
      const pos = inicio + i;
      const id = Math.floor(pos / tam);
      let b = this.#bloques.get(id);
      if (!b) {
        b = { id, estado: 'loaded', filas: [], desde: id * tam, toque: ++this.#reloj, version: this.#version };
        this.#bloques.set(id, b);
      }
      b.estado = 'loaded';
      b.filas[pos - b.desde] = filas[i] as RowData;
    }
    if (inicio + filas.length > this.#total) this.#total = inicio + filas.length;
    this.#op.alCambiar();
  }

  /** Filas cargadas en orden, para transacciones contra la tienda. */
  cargadas(): RowData[] {
    const ids = [...this.#bloques.keys()].sort((a, b) => a - b);
    const out: RowData[] = [];
    for (const id of ids) for (const d of (this.#bloques.get(id) as BloqueCache).filas) out.push(d);
    return out;
  }

  /** Reemplaza todo lo cargado por `filas` contiguas desde 0. */
  reemplazarCargadas(filas: readonly RowData[]): void {
    this.#bloques.clear();
    this.#total = 0;
    this.#ultimaConocida = true;
    this.escribir(0, filas);
  }

  ocupado(): boolean {
    return this.#activas > 0 || this.#cola.length > 0;
  }

  vacio(): boolean {
    return this.#bloques.size === 0;
  }

  destruir(): void {
    this.#version++;
    this.#bloques.clear();
    this.#cola = [];
  }
}
