/**
 * ag-grid/edicion/editores — Editores provistos, sobre controles iswc-*, y el
 * adaptador de editores propios con la interfaz de AG Grid (init, getGui, ...).
 */
import type { Editor, EntornoEditor, CrearEditor, ConValor, ConChecked, EstadoRico, EditorPropio } from './editores.schemas.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/textarea.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';
import '@jeff-aporta/iswc-base/components/forms/checkbox.js';
import '@jeff-aporta/iswc-base/components/forms/date-picker.js';
import { textosValidacion } from './apoyo.js';
import { erroresInternos } from './validacion.js';
import { resolverErrores } from './validacion.js';
import { fechaAIso } from './valores.js';
import { filtrarOpciones } from './valores.js';
import { isoAFecha } from './valores.js';
import { normalizarOpciones } from './valores.js';
import { pasoNumero } from './valores.js';
import { redondear } from './valores.js';
import { textoANumero } from './valores.js';
import type { ColDefAg } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { Parametros } from './apoyo.schemas.js';
import type { BusquedaLista } from './schemas/edicion.schemas.js';
import type { OpcionLista } from './schemas/edicion.schemas.js';
import type { ReglasValidacion } from './schemas/edicion.schemas.js';
import type { TipoValidacion } from './schemas/edicion.schemas.js';

const FILAS_LARGO = 10;
const COLS_LARGO = 60;
const ALTO_OPCION_EM = 2;
const MAX_OPCIONES_DOM = 40;
const PAUSA_BUSQUEDA_MS = 300;

/** Los valores iniciales van por atributo: iswc-input lee el atributo al conectarse y pisa la propiedad. */
function crear<T extends HTMLElement>(tag: string, atributos: Record<string, unknown> = {}): T {
  const el = document.createElement(tag) as T;
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor == null || valor === false) continue;
    el.setAttribute(nombre, valor === true ? '' : String(valor));
  }
  return el;
}

function parsear(entorno: EntornoEditor, texto: unknown): unknown {
  const parser = entorno.def['valueParser'];
  if (typeof parser !== 'function') return texto;
  return parser({ ...entorno.params, oldValue: entorno.params['value'], newValue: texto });
}

function formatear(entorno: EntornoEditor, valor: unknown): string {
  const fn = entorno.def['valueFormatter'];
  const usarFormato = entorno.extra['useFormatter'] === true;
  if (usarFormato && typeof fn === 'function') return String(fn({ ...entorno.params, value: valor }) ?? '');
  return valor == null ? '' : String(valor);
}

function validador(entorno: EntornoEditor, tipo: TipoValidacion, valor: () => unknown): () => string[] {
  const { extra, grid } = entorno;
  const reglas = { maxLength: extra['maxLength'], min: extra['min'], max: extra['max'] } as ReglasValidacion;
  return () => {
    const actual = valor();
    const internos = erroresInternos(tipo, actual, reglas, textosValidacion(grid));
    return resolverErrores(internos, extra['getValidationErrors'], { ...entorno.params, value: actual });
  };
}

function textoInicial(entorno: EntornoEditor, base: string): string {
  if (entorno.borrar) return '';
  return entorno.caracter ?? base;
}

function enfocarCampo(campo: ConValor, seleccionar: boolean): void {
  campo.focus();
  if (seleccionar) campo.select?.();
}

/* ── Texto ─────────────────────────────────────────────────────────────── */

export const editorTexto: CrearEditor = (entorno) => {
  const { extra } = entorno;
  const campo = crear<ConValor>('iswc-input', { type: 'text', variant: 'underlined', 'full-width': true, maxlength: extra['maxLength'], value: textoInicial(entorno, formatear(entorno, entorno.inicial)) });
  const valor = (): unknown => parsear(entorno, campo.value);
  return { el: campo, popup: false, valor, enfocar: (s) => enfocarCampo(campo, s && !entorno.caracter), errores: validador(entorno, 'texto', valor) };
};

const editorTextoLargo: CrearEditor = (entorno) => {
  const { extra } = entorno;
  const campo = crear<ConValor>('iswc-textarea', { rows: extra['rows'] ?? FILAS_LARGO, cols: extra['cols'] ?? COLS_LARGO, maxlength: extra['maxLength'], value: textoInicial(entorno, formatear(entorno, entorno.inicial)) });
  const valor = (): unknown => parsear(entorno, campo.value);
  return { el: campo, popup: true, valor, enfocar: (s) => enfocarCampo(campo, s && !entorno.caracter), errores: validador(entorno, 'texto', valor), retieneEnter: (e) => e.shiftKey };
};

/* ── Numero ────────────────────────────────────────────────────────────── */

const editorNumero: CrearEditor = (entorno) => {
  const { extra } = entorno;
  const min = extra['min'] as number | undefined;
  const max = extra['max'] as number | undefined;
  const step = (extra['step'] as number | undefined) ?? 1;
  const precision = extra['precision'] as number | undefined;
  const base = entorno.inicial == null ? '' : String(entorno.inicial);
  const campo = crear<ConValor>('iswc-input', { type: 'number', variant: 'underlined', 'full-width': true, min, max, step, value: textoInicial(entorno, base) });
  const leer = (): number | null => textoANumero(campo.value);
  const valor = (): unknown => {
    const n = leer();
    const redondeado = n == null ? null : redondear(n, precision);
    return parsear(entorno, redondeado);
  };
  const pasar = (sentido: 1 | -1): void => {
    campo.value = String(pasoNumero(leer(), sentido, step, precision, min, max));
    campo.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  };
  const caja = crear<HTMLElement>('div', { class: 'iswc-ag-editor-numero' });
  caja.append(campo);
  if (extra['showStepperButtons'] === true) {
    for (const [sentido, signo] of [[1, '+'], [-1, '-']] as const) {
      const boton = crear<HTMLButtonElement>('button', { type: 'button', class: 'iswc-ag-editor-paso', tabindex: -1, 'aria-label': signo });
      boton.textContent = signo;
      boton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pasar(sentido);
      });
      caja.append(boton);
    }
  }
  if (extra['preventStepping'] !== true) {
    caja.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      pasar(e.key === 'ArrowUp' ? 1 : -1);
    });
  }
  return { el: caja, popup: false, valor, enfocar: (s) => enfocarCampo(campo, s && !entorno.caracter), errores: validador(entorno, 'numero', valor) };
};

/* ── Fecha ─────────────────────────────────────────────────────────────── */

function crearEditorFecha(entorno: EntornoEditor, comoTexto: boolean): Editor {
  const { extra, grid } = entorno;
  const min = fechaAIso(extra['min']);
  const max = fechaAIso(extra['max']);
  const iso = entorno.borrar ? '' : fechaAIso(entorno.inicial);
  const campo = crear<ConValor>('iswc-input', { type: 'date', variant: 'underlined', 'full-width': true, min: min || null, max: max || null, value: iso });
  const flotante = grid.flotante('editor-fecha');
  const calendario = crear<ConValor>('iswc-date-picker', { min: min || null, max: max || null, value: iso || null });
  calendario.addEventListener('iswc-change', () => {
    campo.value = calendario.value;
    entorno.terminar(false);
  });
  flotante.el.replaceChildren(calendario);
  const valor = (): unknown => {
    if (!campo.value) return null;
    return parsear(entorno, comoTexto ? campo.value : isoAFecha(campo.value));
  };
  const enfocar = (s: boolean): void => {
    enfocarCampo(campo, s);
    flotante.abrir(campo);
  };
  return { el: campo, popup: false, valor, enfocar, errores: validador(entorno, 'fecha', valor), destruir: () => flotante.cerrar() };
}

const editorFecha: CrearEditor = (entorno) => crearEditorFecha(entorno, false);
const editorFechaTexto: CrearEditor = (entorno) => crearEditorFecha(entorno, true);

/* ── Checkbox ──────────────────────────────────────────────────────────── */

const editorCheckbox: CrearEditor = (entorno) => {
  const campo = crear<ConChecked>('iswc-checkbox');
  campo.checked = entorno.inicial === true;
  campo.setAttribute('aria-label', String(entorno.params['colDef'] && (entorno.params['colDef'] as ColDefAg).headerName || ''));
  const valor = (): unknown => campo.checked;
  return { el: campo, popup: false, valor, enfocar: () => campo.focus(), errores: () => [] };
};

/* ── Listas ────────────────────────────────────────────────────────────── */

async function valoresDeLista(extra: Parametros, params: Parametros): Promise<unknown> {
  const fuente = extra['values'];
  return typeof fuente === 'function' ? await fuente(params) : await fuente;
}

function textoOpcion(extra: Parametros, entorno: EntornoEditor, valor: unknown): string {
  const fn = extra['formatValue'];
  if (typeof fn === 'function') return String(fn(valor) ?? '');
  return formatear({ ...entorno, extra: { ...extra, useFormatter: true } }, valor);
}

const editorSelect: CrearEditor = (entorno) => {
  const { extra } = entorno;
  const campo = crear<ConValor>('iswc-select', { 'full-width': true });
  let opciones: OpcionLista[] = [];
  void valoresDeLista(extra, entorno.params).then((valores) => {
    opciones = normalizarOpciones(valores, (v) => textoOpcion(extra, entorno, v));
    campo.replaceChildren(...opciones.map(({ texto }, i) => {
      const opcion = crear<HTMLElement>('iswc-option', { value: i });
      opcion.textContent = texto;
      return opcion;
    }));
    const actual = opciones.findIndex((o) => o.valor === entorno.inicial);
    if (actual >= 0) campo.value = String(actual);
  });
  const valor = (): unknown => {
    const opcion = opciones[Number(campo.value)];
    return campo.value !== '' && opcion ? opcion.valor : entorno.inicial;
  };
  campo.addEventListener('iswc-change', () => entorno.terminar(false));
  return { el: campo, popup: false, valor, enfocar: () => campo.focus(), errores: () => [] };
};

const editorSelectRico: CrearEditor = (entorno) => {
  const { extra } = entorno;
  const multi = extra['multiSelect'] === true;
  const filtrar = extra['filterList'] === true;
  const escribir = extra['allowTyping'] === true;
  const busqueda = (extra['searchType'] as BusquedaLista | undefined) ?? 'fuzzyMatch';
  const espera = (extra['searchDebounceDelay'] as number | undefined) ?? PAUSA_BUSQUEDA_MS;
  const inicial = Array.isArray(entorno.inicial) ? entorno.inicial : [entorno.inicial];
  const estado: EstadoRico = { opciones: [], visibles: [], activo: 0, marcadas: multi ? [...inicial] : [] };
  const caja = crear<HTMLElement>('div', { class: 'iswc-ag-rico' });
  const campo = crear<ConValor>('iswc-input', { type: 'text', variant: 'underlined', 'full-width': true, readonly: !escribir && !filtrar });
  const lista = crear<HTMLElement>('div', { class: 'iswc-ag-rico-lista', role: 'listbox', 'aria-multiselectable': multi ? 'true' : null });
  const alto = extra['valueListMaxHeight'];
  if (alto != null) lista.style.maxHeight = typeof alto === 'number' ? entorno.grid.em(alto) : String(alto);
  caja.append(campo, lista);

  const elegir = (opcion: OpcionLista): void => {
    if (!multi) {
      estado.marcadas = [opcion.valor];
      entorno.terminar(false);
      return;
    }
    const i = estado.marcadas.indexOf(opcion.valor);
    if (i >= 0) estado.marcadas.splice(i, 1);
    else estado.marcadas.push(opcion.valor);
    pintar();
  };

  /* Ventana sobre la lista: las listas enormes solo montan lo que cabe. */
  const pintar = (): void => {
    const total = estado.visibles.length;
    const desde = Math.max(0, Math.min(estado.activo - MAX_OPCIONES_DOM / 2, total - MAX_OPCIONES_DOM));
    const tramo = estado.visibles.slice(desde, desde + MAX_OPCIONES_DOM);
    const hojas = tramo.map((opcion, i) => {
      const fila = crear<HTMLElement>('div', { class: 'iswc-ag-rico-opcion', role: 'option', 'aria-selected': estado.marcadas.includes(opcion.valor) ? 'true' : 'false' });
      fila.textContent = opcion.texto;
      fila.toggleAttribute('data-activa', desde + i === estado.activo);
      fila.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        elegir(opcion);
      });
      return fila;
    });
    lista.style.setProperty('--iswc-ag-rico-antes', `${desde * ALTO_OPCION_EM}em`);
    lista.style.setProperty('--iswc-ag-rico-despues', `${Math.max(0, total - desde - tramo.length) * ALTO_OPCION_EM}em`);
    lista.replaceChildren(...hojas);
    lista.querySelector('[data-activa]')?.scrollIntoView({ block: 'nearest' });
  };

  const filtrarAhora = (): void => {
    estado.visibles = filtrar ? filtrarOpciones(estado.opciones, campo.value, busqueda) : estado.opciones;
    estado.activo = 0;
    if (!filtrar && campo.value) {
      const hallada = estado.visibles.indexOf(filtrarOpciones(estado.opciones, campo.value, busqueda)[0] as OpcionLista);
      if (hallada >= 0) estado.activo = hallada;
    }
    pintar();
  };

  let pausa: ReturnType<typeof setTimeout> | undefined;
  campo.addEventListener('iswc-input', () => {
    clearTimeout(pausa);
    pausa = setTimeout(filtrarAhora, espera);
  });
  caja.addEventListener('keydown', (e) => {
    const total = estado.visibles.length;
    if (!total) return;
    if (e.key === 'ArrowDown') estado.activo = Math.min(total - 1, estado.activo + 1);
    else if (e.key === 'ArrowUp') estado.activo = Math.max(0, estado.activo - 1);
    else if (e.key === ' ' && multi) elegir(estado.visibles[estado.activo] as OpcionLista);
    else return;
    e.preventDefault();
    pintar();
  });

  void valoresDeLista(extra, entorno.params).then((valores) => {
    estado.opciones = normalizarOpciones(valores, (v) => textoOpcion(extra, entorno, v));
    estado.visibles = estado.opciones;
    const actual = estado.opciones.findIndex((o) => o.valor === entorno.inicial);
    estado.activo = Math.max(0, actual);
    if (entorno.caracter) {
      campo.value = entorno.caracter;
      filtrarAhora();
    } else {
      pintar();
    }
  });

  const valor = (): unknown => {
    if (multi) return estado.marcadas;
    if (estado.marcadas.length) return estado.marcadas[0];
    const parseValue = extra['parseValue'];
    if (escribir && campo.value && !estado.visibles.length && typeof parseValue === 'function') return parseValue(campo.value);
    return estado.visibles[estado.activo]?.valor ?? entorno.inicial;
  };
  return { el: caja, popup: true, valor, enfocar: () => campo.focus(), errores: () => [], destruir: () => clearTimeout(pausa) };
};

/* ── Editores propios ──────────────────────────────────────────────────── */

/** Clase o fabrica con la interfaz de componente de AG Grid. */
export function adaptarPropio(fuente: unknown, entorno: EntornoEditor): Editor {
  const Clase = fuente as new () => EditorPropio;
  const fabrica = fuente as () => EditorPropio;
  const propio = (fuente as { prototype?: { getGui?: unknown } }).prototype?.getGui ? new Clase() : fabrica();
  propio.init?.({ ...entorno.params, ...entorno.extra, value: entorno.inicial, eventKey: entorno.caracter, stopEditing: (cancelar?: boolean) => entorno.terminar(cancelar === true) });
  const el = propio.getGui?.() ?? crear<HTMLElement>('div');
  return {
    el,
    popup: propio.isPopup?.() === true,
    valor: () => propio.getValue?.() ?? entorno.inicial,
    enfocar: () => propio.afterGuiAttached?.(),
    errores: () => propio.getValidationErrors?.() ?? [],
    destruir: () => propio.destroy?.(),
    cancelarAntes: () => propio.isCancelBeforeStart?.() === true,
    cancelarDespues: () => propio.isCancelAfterEnd?.() === true,
    alEntrar: () => propio.focusIn?.(),
    alSalir: () => propio.focusOut?.(),
  };
}

export const EDITORES: Record<string, CrearEditor> = {
  agTextCellEditor: editorTexto,
  agLargeTextCellEditor: editorTextoLargo,
  agSelectCellEditor: editorSelect,
  agRichSelectCellEditor: editorSelectRico,
  agNumberCellEditor: editorNumero,
  agDateCellEditor: editorFecha,
  agDateStringCellEditor: editorFechaTexto,
  agCheckboxCellEditor: editorCheckbox,
};
