/**
 * ag-grid/edicion/sesion — Ciclo de vida de la edicion de celda y de fila
 * completa: arranque, montaje en la capa, teclas del editor, validacion y cierre.
 */
import type { Montado, Sesion, Arranque, AlCerrar } from './sesion.schemas.js';
export type * from './sesion.schemas.js';
import { apiPublica } from './apoyo.js';
import { enfocarGrilla } from './apoyo.js';
import { colsVisibles } from './apoyo.js';
import { esEditable } from './apoyo.js';
import { mapaNavegacion } from './apoyo.js';
import { nodoDeFila } from './apoyo.js';
import { paramsCelda } from './apoyo.js';
import { posDeRef } from './apoyo.js';
import { refDePos } from './apoyo.js';
import { resolver } from './apoyo.js';
import { EDITORES } from './editores.js';
import { adaptarPropio } from './editores.js';
import { editorTexto } from './editores.js';
import { moverFlecha } from './navegacion.js';
import { tabular } from './navegacion.js';
import { editorPorTipo } from './valores.js';
import type { ColumnState } from '../contrato.js';
import type { Flotante } from '../contrato.js';
import type { GridHost } from '../contrato.js';
import type { RefCelda } from '../contrato.js';
import type { RowNode } from '../contrato.js';
import type { Parametros } from './apoyo.js';
import type { Editor } from './editores.js';
import type { EntornoEditor } from './editores.js';
import type { Escritor } from './escritor.js';


const ETIQUETA_ERROR = 'iswc-ag-editor--error';

export class SesionEdicion {
  #grid: GridHost;
  #escritor: Escritor;
  #apoyo: AlCerrar;
  #sesion: Sesion | null = null;
  #cerrando = false;

  constructor(grid: GridHost, escritor: Escritor, apoyo: AlCerrar) {
    this.#grid = grid;
    this.#escritor = escritor;
    this.#apoyo = apoyo;
  }

  get activa(): boolean {
    return this.#sesion !== null;
  }

  celdas(): RefCelda[] {
    const sesion = this.#sesion;
    if (!sesion) return [];
    return [...sesion.montados.keys()].map((colId) => ({ indice: sesion.indice, colId }));
  }

  /** Valores de los editores abiertos de la fila, para `getEditRowValues`. */
  valoresFila(node: RowNode): Record<string, unknown> {
    const sesion = this.#sesion;
    if (!sesion || sesion.node.id !== node.id) return {};
    return Object.fromEntries([...sesion.montados].map(([colId, m]) => [colId, m.editor.valor()]));
  }

  valorAbierto(nodoId: string, colId: string): { valor: unknown } | undefined {
    const sesion = this.#sesion;
    if (!sesion || sesion.node.id !== nodoId) return undefined;
    const montado = sesion.montados.get(colId);
    return montado ? { valor: montado.editor.valor() } : undefined;
  }

  incluye(el: EventTarget | null): boolean {
    const sesion = this.#sesion;
    if (!sesion || !(el instanceof Node)) return false;
    for (const m of sesion.montados.values()) {
      if (m.caja.contains(el)) return true;
    }
    return false;
  }

  /* ── Arranque ──────────────────────────────────────────────────────── */

  iniciar(ref: RefCelda, arranque: Arranque = {}): boolean {
    const grid = this.#grid;
    if (this.#sesion && !this.detener(false)) return false;
    const node = nodoDeFila(grid.filaEn(ref.indice));
    const col = grid.columna(ref.colId);
    if (!node || !col) return false;
    const completa = grid.opcion('editType') === 'fullRow';
    if (!esEditable(grid, col, node, ref.indice) && !completa) return false;
    const objetivos = completa ? colsVisibles(grid).filter((c) => esEditable(grid, c, node, ref.indice)) : [col];
    if (!objetivos.length) return false;
    grid.asegurarVisible(ref);
    const sesion: Sesion = { node, indice: ref.indice, completa, montados: new Map(), activa: ref.colId };
    for (const objetivo of objetivos) {
      const propia = objetivo.colId === ref.colId ? arranque : {};
      const montado = this.#montar(sesion, objetivo, propia);
      if (montado) sesion.montados.set(objetivo.colId, montado);
    }
    if (!sesion.montados.size) return false;
    if (!sesion.montados.has(sesion.activa)) sesion.activa = sesion.montados.keys().next().value as string;
    this.#sesion = sesion;
    if (completa) grid.emitir('rowEditingStarted', { node, data: node.data, rowIndex: ref.indice });
    for (const m of sesion.montados.values()) grid.emitir('cellEditingStarted', paramsCelda(grid, m.col, node, ref.indice));
    const principal = sesion.montados.get(sesion.activa);
    const conservar = Boolean(arranque.caracter);
    principal?.editor.enfocar(!conservar);
    if (principal && !this.incluye(grid.shadow.activeElement)) principal.caja.focus();
    return true;
  }

  #crearEditor(col: ColumnState, entorno: EntornoEditor): Editor {
    const grid = this.#grid;
    const def = entorno.def;
    const selector = def['cellEditorSelector'];
    const elegido = typeof selector === 'function' ? selector(entorno.params) : null;
    const fuente = elegido?.component ?? def['cellEditor'] ?? editorPorTipo(col.type);
    if (elegido?.params) entorno.extra = { ...entorno.extra, ...elegido.params };
    const registrados = grid.opcion<Record<string, unknown>>('components', {});
    const propio = typeof fuente === 'string' ? registrados[fuente] : fuente;
    if (propio) return adaptarPropio(propio, entorno);
    const provisto = EDITORES[fuente as string] ?? editorTexto;
    return provisto(entorno);
  }

  #montar(sesion: Sesion, col: ColumnState, arranque: Arranque): Montado | null {
    const grid = this.#grid;
    const { node, indice } = sesion;
    const def = grid.defDe(col);
    const params = paramsCelda(grid, col, node, indice);
    const antes = this.#escritor.valorVisible(col, node);
    const tecla = arranque.tecla ?? null;
    const borrar = tecla === 'Backspace' || tecla === 'Delete';
    const extra = resolver<Parametros>(def['cellEditorParams'], params) ?? {};
    const entorno: EntornoEditor = { grid, def, params: { ...params, value: antes }, extra, inicial: antes, caracter: arranque.caracter ?? null, borrar, terminar: (cancelar) => this.#terminarDesdeEditor(cancelar) };
    const editor = this.#crearEditor(col, entorno);
    if (editor.cancelarAntes?.()) {
      editor.destruir?.();
      return null;
    }
    const caja = document.createElement('div');
    caja.className = 'iswc-ag-editor';
    caja.dataset['colId'] = col.colId;
    caja.tabIndex = -1;
    caja.append(editor.el);
    caja.addEventListener('keydown', (e) => this.#teclaEditor(e, col.colId, editor));
    caja.addEventListener('input', () => this.#validarVivo(col.colId));
    caja.addEventListener('iswc-input', () => this.#validarVivo(col.colId));
    caja.addEventListener('focusout', (e) => this.#perdioFoco(e));
    const popup = (editor.popup || def['cellEditorPopup'] === true) && !sesion.completa;
    const flotante = popup ? grid.flotante('editor') : null;
    const montado: Montado = { col, editor, caja, flotante, antes };
    if (flotante) {
      caja.classList.add('iswc-ag-editor--popup');
      flotante.el.replaceChildren(caja);
      const ref = { indice, colId: col.colId };
      flotante.abrir(grid.celdaDe(ref) ?? grid.rectCelda(ref) ?? grid.el);
    } else {
      grid.capa('edicion').append(caja);
      this.#ubicar(montado, indice);
    }
    return montado;
  }

  #ubicar(m: Montado, indice: number): void {
    const grid = this.#grid;
    const rect = grid.rectCelda({ indice, colId: m.col.colId });
    if (!rect) return;
    m.caja.style.top = grid.em(rect.arriba);
    m.caja.style.left = grid.em(rect.izquierda);
    m.caja.style.width = grid.em(rect.ancho);
    m.caja.style.height = grid.em(rect.alto);
  }

  /** El render pudo mover la fila (orden, columnas redimensionadas). */
  reubicar(): void {
    const sesion = this.#sesion;
    if (!sesion) return;
    const total = this.#grid.totalFilas();
    for (let i = 0; i < total; i++) {
      if (nodoDeFila(this.#grid.filaEn(i))?.id !== sesion.node.id) continue;
      sesion.indice = i;
      break;
    }
    for (const m of sesion.montados.values()) {
      if (!m.flotante) this.#ubicar(m, sesion.indice);
    }
  }

  /* ── Teclas y foco ─────────────────────────────────────────────────── */

  #terminarDesdeEditor(cancelar: boolean): void {
    queueMicrotask(() => {
      this.detener(cancelar);
      this.#devolverFoco();
    });
  }

  #devolverFoco(): void {
    const foco = this.#grid.foco();
    if (foco) this.#grid.enfocar(foco);
    enfocarGrilla(this.#grid);
  }

  /** Tecla que llego al viewport con una sesion abierta: el foco se salio del editor. */
  tecla(e: KeyboardEvent): void {
    const sesion = this.#sesion;
    const montado = sesion?.montados.get(sesion.activa);
    if (sesion && montado) this.#teclaEditor(e, sesion.activa, montado.editor);
  }

  #teclaEditor(e: KeyboardEvent, colId: string, editor: Editor): void {
    e.stopPropagation();
    const grid = this.#grid;
    const sesion = this.#sesion;
    if (!sesion) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      const ref = { indice: sesion.indice, colId };
      this.detener(true);
      grid.enfocar(ref);
      enfocarGrilla(grid);
    } else if (e.key === 'Enter') {
      if (editor.retieneEnter?.(e)) return;
      e.preventDefault();
      this.#enter(e, colId);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.#tab(e.shiftKey, colId);
    }
  }

  #enter(e: KeyboardEvent, colId: string): void {
    const grid = this.#grid;
    const sesion = this.#sesion;
    if (!sesion) return;
    const { indice, node } = sesion;
    const valor = e.ctrlKey || e.metaKey ? sesion.montados.get(colId)?.editor.valor() : undefined;
    if (!this.detener(false)) return;
    if (e.ctrlKey || e.metaKey) this.#apoyo.rango(valor, node, colId);
    const ref = { indice, colId };
    enfocarGrilla(grid);
    if (!grid.opcion('enterNavigatesVerticallyAfterEdit', false)) {
      grid.enfocar(ref);
      return;
    }
    const pos = posDeRef(grid, ref);
    const siguiente = pos ? moverFlecha(pos, e.shiftKey ? 'arriba' : 'abajo', mapaNavegacion(grid)) : null;
    const destino = siguiente ? refDePos(grid, siguiente) : ref;
    if (destino) grid.enfocar(destino);
  }

  /** Mueve entre los editores de la fila, o cierra y abre la siguiente celda editable. */
  #tab(atras: boolean, colId: string): void {
    const grid = this.#grid;
    const sesion = this.#sesion;
    if (!sesion) return;
    const mapa = mapaNavegacion(grid);
    let pos = posDeRef(grid, { indice: sesion.indice, colId });
    while (pos) {
      pos = tabular(pos, atras, mapa);
      const ref = pos ? refDePos(grid, pos) : null;
      if (!ref) break;
      const node = nodoDeFila(grid.filaEn(ref.indice));
      const col = grid.columna(ref.colId);
      if (sesion.completa && ref.indice === sesion.indice) {
        const montado = sesion.montados.get(ref.colId);
        if (!montado) continue;
        sesion.montados.get(sesion.activa)?.editor.alSalir?.();
        sesion.activa = ref.colId;
        grid.enfocar(ref);
        montado.editor.enfocar(true);
        montado.editor.alEntrar?.();
        return;
      }
      if (!col || !esEditable(grid, col, node, ref.indice)) continue;
      if (!this.detener(false)) return;
      grid.enfocar(ref);
      this.iniciar(ref);
      return;
    }
    if (this.detener(false)) this.#devolverFoco();
  }

  #perdioFoco(e: FocusEvent): void {
    if (this.#cerrando) return;
    if (!this.#grid.opcion('stopEditingWhenCellsLoseFocus', false)) return;
    if (this.incluye(e.relatedTarget)) return;
    queueMicrotask(() => {
      if (this.incluye(this.#grid.shadow.activeElement)) return;
      this.detener(false);
    });
  }

  /* ── Validacion y cierre ───────────────────────────────────────────── */

  #validarVivo(colId: string): void {
    const m = this.#sesion?.montados.get(colId);
    if (!m) return;
    this.#marcarError(m, m.editor.errores());
  }

  #marcarError(m: Montado, errores: string[]): void {
    m.caja.classList.toggle(ETIQUETA_ERROR, errores.length > 0);
    m.caja.title = errores.join('\n');
    m.caja.setAttribute('aria-invalid', errores.length ? 'true' : 'false');
  }

  #erroresFila(sesion: Sesion): string[] {
    const fn = this.#grid.opcion<unknown>('getFullRowEditValidationErrors');
    if (typeof fn !== 'function') return [];
    const editorsState = [...sesion.montados].map(([colId, m]) => ({ colId, oldValue: m.antes, newValue: m.editor.valor() }));
    const salida = fn({ api: apiPublica(this.#grid), data: sesion.node.data, rowIndex: sesion.indice, editorsState });
    return Array.isArray(salida) ? salida.map(String) : [];
  }

  /** False si `invalidEditValueMode: 'block'` retiene la sesion. */
  detener(cancelar: boolean): boolean {
    const sesion = this.#sesion;
    if (!sesion) return true;
    const grid = this.#grid;
    const modo = grid.opcion<string>('invalidEditValueMode', 'revert');
    const conError = new Set<string>();
    if (!cancelar) {
      for (const [colId, m] of sesion.montados) {
        const errores = m.editor.errores();
        this.#marcarError(m, errores);
        if (errores.length) {
          conError.add(colId);
          this.#apoyo.anunciar(errores.join('. '));
        }
      }
      const deFila = sesion.completa ? this.#erroresFila(sesion) : [];
      if (deFila.length) {
        const texto = grid.texto('ariaFullRowEditValidationFailed', 'La fila tiene errores de validacion');
        this.#apoyo.anunciar(`${texto}: ${deFila.join('. ')}`);
      }
      if ((conError.size || deFila.length) && modo === 'block') return false;
      if (deFila.length) for (const colId of sesion.montados.keys()) conError.add(colId);
    }
    this.#cerrar(sesion, cancelar, conError);
    return true;
  }

  #cerrar(sesion: Sesion, cancelar: boolean, conError: Set<string>): void {
    const grid = this.#grid;
    const { node, indice, completa } = sesion;
    this.#cerrando = true;
    this.#sesion = null;
    let huboCambio = false;
    const resultados: Array<{ m: Montado; nuevo: unknown; cambio: boolean }> = [];
    this.#escritor.agrupar(() => {
      for (const [colId, m] of sesion.montados) {
        const descartar = cancelar || conError.has(colId) || m.editor.cancelarDespues?.() === true;
        const nuevo = descartar ? m.antes : m.editor.valor();
        const cambio = !descartar && this.#escritor.escribir(node, colId, nuevo, 'edit');
        huboCambio ||= cambio;
        resultados.push({ m, nuevo, cambio });
      }
    });
    for (const { m } of resultados) {
      m.editor.destruir?.();
      m.caja.remove();
      m.flotante?.cerrar();
    }
    for (const { m, nuevo, cambio } of resultados) {
      grid.emitir('cellEditingStopped', { ...paramsCelda(grid, m.col, node, indice), oldValue: m.antes, newValue: nuevo, valueChanged: cambio });
    }
    if (completa) {
      if (huboCambio && !this.#escritor.enLote) grid.emitir('rowValueChanged', { node, data: node.data, rowIndex: indice });
      grid.emitir('rowEditingStopped', { node, data: node.data, rowIndex: indice });
    }
    this.#cerrando = false;
    grid.refrescarCeldas([node.id]);
  }
}
