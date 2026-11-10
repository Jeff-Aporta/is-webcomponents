// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/edicion/portapapeles-ctl — Copiar, cortar y pegar. Se engancha a los
 * eventos nativos copy/cut/paste, que no piden permiso; la API usa navigator.clipboard.
 */
import type { Procesador, ParametrosCopia } from './edicion-portapapeles-ctl.schemas.js';
import { colsVisibles, esEditable, nodoDeFila, paramsCelda, posDeRef, resolver } from './edicion-apoyo.js';
import { aTexto, ajustarAlRango, desdeTexto } from './edicion-portapapeles.js';
import { celda as rangoCelda, cuantasCeldas } from './edicion-rangos.js';
import { textoAValor } from './edicion-valores.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar, GridHost } from './contrato.schemas.js';
import type { Escritor } from './edicion-escritor.js';
import type { Rango } from './edicion.schemas.js';
import type { SeleccionRangos } from './edicion-seleccion-rangos.js';
import type { SeleccionFilas } from './edicion-seleccion-filas-ctl.js';
import type { SesionEdicion } from './edicion-sesion.js';

export class PortapapelesCtl {
  #grid: GridHost;
  #escritor: Escritor;
  #rangos: SeleccionRangos;
  #filas: SeleccionFilas;
  #sesion: SesionEdicion;

  constructor(grid: GridHost, escritor: Escritor, rangos: SeleccionRangos, filas: SeleccionFilas, sesion: SesionEdicion) {
    this.#grid = grid;
    this.#escritor = escritor;
    this.#rangos = rangos;
    this.#filas = filas;
    this.#sesion = sesion;
  }

  instalar(): Desinstalar {
    const shadow = this.#grid.shadow;
    const copiar = (e: Event): void => this.#alCopiar(e as ClipboardEvent, false);
    const cortar = (e: Event): void => this.#alCopiar(e as ClipboardEvent, true);
    const pegar = (e: Event): void => this.#alPegar(e as ClipboardEvent);
    shadow.addEventListener('copy', copiar);
    shadow.addEventListener('cut', cortar);
    shadow.addEventListener('paste', pegar);
    return () => {
      shadow.removeEventListener('copy', copiar);
      shadow.removeEventListener('cut', cortar);
      shadow.removeEventListener('paste', pegar);
    };
  }

  get #delimitador(): string {
    return this.#grid.opcion('clipboardDelimiter', '\t');
  }

  #ignorar(): boolean {
    if (this.#sesion.activa) return true;
    return this.#grid.opcion<boolean>('enableCellTextSelection', false) === true;
  }

  #alCopiar(e: ClipboardEvent, cortar: boolean): void {
    if (this.#ignorar()) return;
    const texto = this.#textoSeleccion({});
    if (texto == null) return;
    e.preventDefault();
    if (!this.#enviar(texto)) e.clipboardData?.setData('text/plain', texto);
    if (cortar) this.#cortar();
  }

  #alPegar(e: ClipboardEvent): void {
    if (this.#ignorar()) return;
    const texto = e.clipboardData?.getData('text/plain');
    if (texto == null) return;
    e.preventDefault();
    this.pegarTexto(texto);
  }

  /** True si `sendToClipboard` se encargo de la entrega. */
  #enviar(texto: string): boolean {
    const propio = this.#grid.opcion<unknown>('sendToClipboard');
    if (typeof propio !== 'function') return false;
    propio({ data: texto });
    return true;
  }

  /* ── Copia ─────────────────────────────────────────────────────────── */

  #textoCelda(col: ColumnState, node: RowNode, indice: number): string {
    const grid = this.#grid;
    const valor = this.#escritor.valorVisible(col, node);
    const proceso = grid.opcion<Procesador | undefined>('processCellForClipboard');
    if (proceso) return String(proceso({ ...paramsCelda(grid, col, node, indice), value: valor, type: 'clipboard' }) ?? '');
    return grid.textoCelda(col, node);
  }

  #encabezados(cols: ColumnState[]): string[] {
    const grid = this.#grid;
    const proceso = grid.opcion<Procesador | undefined>('processHeaderForClipboard');
    return cols.map((column) => (proceso ? String(proceso({ column, api: grid.el }) ?? '') : column.headerName));
  }

  #matrizRango(r: Rango): string[][] {
    const grid = this.#grid;
    const cols = colsVisibles(grid).slice(r.colDesde, r.colHasta + 1);
    const matriz: string[][] = [];
    for (let i = r.filaDesde; i <= r.filaHasta; i++) {
      const node = nodoDeFila(grid.filaEn(i));
      matriz.push(cols.map((col) => (node ? this.#textoCelda(col, node, i) : '')));
    }
    return matriz;
  }

  #rangoFoco(): Rango | null {
    const foco = this.#grid.foco();
    const pos = foco ? posDeRef(this.#grid, foco) : null;
    return pos ? rangoCelda(pos) : null;
  }

  #textoFilas(cabecera: boolean): string | null {
    const grid = this.#grid;
    const cols = colsVisibles(grid);
    const filas = this.#filas.nodosSeleccionados().map((node) => cols.map((col) => this.#textoCelda(col, node, node.index)));
    if (!filas.length) return null;
    return aTexto(cabecera ? [this.#encabezados(cols), ...filas] : filas, this.#delimitador);
  }

  /** Rangos, si no filas seleccionadas con `copySelectedRows`, si no la celda enfocada. */
  #textoSeleccion(params: ParametrosCopia): string | null {
    const grid = this.#grid;
    const cabecera = params.includeHeaders ?? grid.opcion('copyHeadersToClipboard', false);
    const rangos = this.#rangos.rangos;
    if (!rangos.length && this.#filas.copiaFilas) {
      const texto = this.#textoFilas(cabecera);
      if (texto != null) return texto;
    }
    const objetivos = rangos.length ? rangos : [this.#rangoFoco()].flatMap((r) => r ?? []);
    if (!objetivos.length) return null;
    const bloques = objetivos.map((r) => {
      const cols = colsVisibles(grid).slice(r.colDesde, r.colHasta + 1);
      return cabecera ? [this.#encabezados(cols), ...this.#matrizRango(r)] : this.#matrizRango(r);
    });
    return bloques.map((b) => aTexto(b, this.#delimitador)).join('\n');
  }

  #cortar(): void {
    const grid = this.#grid;
    if (grid.opcion('suppressCutToClipboard', false)) return;
    const objetivos = this.#rangos.rangos.length ? this.#rangos.rangos : [this.#rangoFoco()].flatMap((r) => r ?? []);
    grid.emitir('cutStart', {});
    this.#rangos.borrar(objetivos, 'clipboardSvc');
    grid.emitir('cutEnd', {});
  }

  async copiarRango(params: ParametrosCopia = {}): Promise<void> {
    const texto = this.#textoSeleccion(params);
    if (texto == null || this.#enviar(texto)) return;
    await navigator.clipboard?.writeText(texto);
  }

  async copiarFilas(params: ParametrosCopia = {}): Promise<void> {
    const texto = this.#textoFilas(params.includeHeaders ?? false);
    if (texto == null || this.#enviar(texto)) return;
    await navigator.clipboard?.writeText(texto);
  }

  async cortarRango(): Promise<void> {
    await this.copiarRango();
    this.#cortar();
  }

  async pegarDesdeNavegador(): Promise<void> {
    const texto = await navigator.clipboard?.readText();
    if (texto != null) this.pegarTexto(texto);
  }

  /* ── Pegado ────────────────────────────────────────────────────────── */

  #permitePegar(col: ColumnState, node: RowNode, indice: number): boolean {
    const grid = this.#grid;
    if (!esEditable(grid, col, node, indice)) return false;
    return resolver<boolean>(grid.defDe(col)['suppressPaste'], paramsCelda(grid, col, node, indice)) !== true;
  }

  #parsear(texto: string, col: ColumnState, node: RowNode, indice: number): unknown {
    const grid = this.#grid;
    const params = paramsCelda(grid, col, node, indice);
    const proceso = grid.opcion<Procesador | undefined>('processCellFromClipboard');
    const crudo = proceso ? proceso({ ...params, value: texto, type: 'clipboard' }) : texto;
    const parser = grid.defDe(col)['valueParser'];
    if (typeof parser === 'function') return parser({ ...params, oldValue: params['value'], newValue: crudo });
    return typeof crudo === 'string' ? textoAValor(crudo, col.type) : crudo;
  }

  pegarTexto(texto: string): void {
    const grid = this.#grid;
    if (grid.opcion('suppressClipboardPaste', false)) return;
    const conservar = !grid.opcion('suppressLastEmptyLineOnPaste', true);
    const leida = desdeTexto(texto, this.#delimitador, conservar);
    const proceso = grid.opcion<((p: Record<string, unknown>) => string[][] | null) | undefined>('processDataFromClipboard');
    const matriz = proceso ? proceso({ data: leida, api: grid.el }) : leida;
    if (!matriz) return;
    const destino = this.#rangos.rangos[0] ?? this.#rangoFoco();
    if (!destino) return;
    const usable = this.#rangos.rangos.length === 1 && cuantasCeldas(destino) > 1 ? ajustarAlRango(matriz, destino) : matriz;
    const cols = colsVisibles(grid);
    grid.emitir('pasteStart', { source: 'clipboard' });
    this.#escritor.agrupar(() => {
      usable.forEach((fila, df) => {
        const indice = destino.filaDesde + df;
        const node = nodoDeFila(grid.filaEn(indice));
        if (!node) return;
        fila.forEach((valor, dc) => {
          const col = cols[destino.colDesde + dc];
          if (!col || !this.#permitePegar(col, node, indice)) return;
          this.#escritor.escribir(node, col.colId, this.#parsear(valor, col, node, indice), 'paste');
        });
      });
    });
    grid.emitir('pasteEnd', { source: 'clipboard' });
  }
}
