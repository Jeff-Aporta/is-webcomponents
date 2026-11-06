/**
 * ag-grid/celdas/flash — Destello de celda: enableCellChangeFlash y api.flashCells.
 *
 * El host repinta con strings, asi que una transicion CSS moriria con el nodo.
 * El destello son dos animaciones CSS (sostener y apagar): `presentarCelda` da la
 * clase y el tiempo ya transcurrido como retardo negativo, y una celda repintada a mitad de camino
 * sigue en el mismo punto. Solo hay un temporizador por lote y ninguno por celda.
 */
import type { Reloj, Programar, Cancelar, Alcance, Vencimiento, OpcionesDestello } from './celdas-flash.schemas.js';
import { unirClases } from './celdas-html.js';
import type { CambioCelda } from './celdas.schemas.js';

const FLASH_MS = 500;
const FADE_MS = 1000;
const CAMBIO_MS = 3000;

function claveCelda(filaId: string, colId: string): string {
  return `${filaId}\u0000${colId}`;
}

export class Destello {
  #activos: Alcance[] = [];
  #cambios = new Map<string, CambioCelda>();
  #temporizador: unknown = null;
  #reloj: Reloj;
  #programar: Programar;
  #cancelar: Cancelar;
  #alVencer: Vencimiento;

  constructor(o: OpcionesDestello = {}) {
    this.#reloj = o.reloj ?? Date.now;
    this.#programar = o.programar ?? ((fn, ms) => setTimeout(fn, ms));
    this.#cancelar = o.cancelar ?? ((id) => clearTimeout(id as number));
    this.#alVencer = o.alVencer ?? (() => {});
  }

  /** `filas` o `columnas` null abarcan todas, como omitir rowNodes o columns en flashCells. */
  destellar(filas: string[] | null, columnas: string[] | null, flash = FLASH_MS, fade = FADE_MS, direccion?: 'up' | 'down'): void {
    const alcance: Alcance = { filas: filas ? new Set(filas) : null, columnas: columnas ? new Set(columnas) : null, flash, fade, desde: this.#reloj() };
    if (direccion) alcance.direccion = direccion;
    this.#quitarSolapados(alcance);
    this.#activos.push(alcance);
    this.#agendar();
  }

  /** Una celda que vuelve a cambiar reinicia su destello en vez de sumar otro. */
  #quitarSolapados(nuevo: Alcance): void {
    if (nuevo.filas?.size !== 1 || nuevo.columnas?.size !== 1) return;
    const [fila] = nuevo.filas;
    const [columna] = nuevo.columnas;
    this.#activos = this.#activos.filter((a) => !(a.filas?.size === 1 && a.columnas?.size === 1 && a.filas.has(fila as string) && a.columnas.has(columna as string)));
  }

  #buscar(filaId: string, colId: string, ahora: number): Alcance | null {
    for (let i = this.#activos.length - 1; i >= 0; i--) {
      const a = this.#activos[i] as Alcance;
      if (ahora - a.desde >= a.flash + a.fade) continue;
      if (a.filas && !a.filas.has(filaId)) continue;
      if (a.columnas && !a.columnas.has(colId)) continue;
      return a;
    }
    return null;
  }

  clases(filaId: string, colId: string): string {
    if (!this.#activos.length) return '';
    const a = this.#buscar(filaId, colId, this.#reloj());
    if (!a) return '';
    return unirClases('iswc-ag-flash', a.direccion && `iswc-ag-flash-${a.direccion}`);
  }

  estilo(filaId: string, colId: string): string {
    if (!this.#activos.length) return '';
    const ahora = this.#reloj();
    const a = this.#buscar(filaId, colId, ahora);
    if (!a) return '';
    return `--iswc-ag-flash-ms:${a.flash}ms;--iswc-ag-fade-ms:${a.fade}ms;--iswc-ag-flash-t:${ahora - a.desde}ms;`;
  }

  registrarCambio(filaId: string, colId: string, anterior: unknown, nuevo: unknown): void {
    this.#cambios.set(claveCelda(filaId, colId), { anterior, nuevo, desde: this.#reloj() });
    this.#agendar();
  }

  /** Cambio reciente de la celda, o undefined si ya paso la ventana del renderer animado. */
  cambioDe(filaId: string, colId: string): CambioCelda | undefined {
    if (!this.#cambios.size) return undefined;
    const cambio = this.#cambios.get(claveCelda(filaId, colId));
    if (!cambio || this.#reloj() - cambio.desde >= CAMBIO_MS) return undefined;
    return cambio;
  }

  #proximoVencimiento(): number {
    let proximo = Infinity;
    for (const a of this.#activos) proximo = Math.min(proximo, a.desde + a.flash + a.fade);
    for (const c of this.#cambios.values()) proximo = Math.min(proximo, c.desde + CAMBIO_MS);
    return proximo;
  }

  #agendar(): void {
    if (this.#temporizador != null) this.#cancelar(this.#temporizador);
    this.#temporizador = null;
    const proximo = this.#proximoVencimiento();
    if (proximo === Infinity) return;
    this.#temporizador = this.#programar(() => this.#vencer(), Math.max(0, proximo - this.#reloj()));
  }

  #vencer(): void {
    this.#temporizador = null;
    const ahora = this.#reloj();
    const vencidos = this.#activos.filter((a) => ahora - a.desde >= a.flash + a.fade);
    this.#activos = this.#activos.filter((a) => ahora - a.desde < a.flash + a.fade);
    const filas = new Set<string>();
    const columnas = new Set<string>();
    let todas = false;
    for (const a of vencidos) {
      if (!a.filas || !a.columnas) todas = true;
      for (const f of a.filas ?? []) filas.add(f);
      for (const c of a.columnas ?? []) columnas.add(c);
    }
    for (const [clave, c] of this.#cambios) {
      if (ahora - c.desde < CAMBIO_MS) continue;
      this.#cambios.delete(clave);
      const [fila, columna] = clave.split('\u0000');
      filas.add(fila as string);
      columnas.add(columna as string);
    }
    if (todas) this.#alVencer({ filas: null, columnas: null });
    else if (filas.size) this.#alVencer({ filas: [...filas], columnas: [...columnas] });
    this.#agendar();
  }

  destruir(): void {
    if (this.#temporizador != null) this.#cancelar(this.#temporizador);
    this.#temporizador = null;
    this.#activos = [];
    this.#cambios.clear();
  }
}
