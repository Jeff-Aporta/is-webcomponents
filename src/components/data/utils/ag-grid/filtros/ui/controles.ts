/**
 * ui/controles — Fabricas de controles del kit para los paneles. Todo control visible es
 * un iswc-*; aqui se concentra como se construye y que evento escucha cada uno.
 */
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';
import '@jeff-aporta/iswc-base/components/forms/checkbox.js';
import '@jeff-aporta/iswc-base/components/actions/button.js';
import '@jeff-aporta/iswc-base/components/media/icon.js';
import type { ConValor } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/filtros/filtros.schemas.js';

export function crear(tag: string, clase = '', texto?: string): HTMLElement {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function icono(nombre: string): HTMLElement {
  const el = crear('iswc-icon');
  el.setAttribute('icon', nombre);
  return el;
}

/** Quita lo pendiente en cuanto se desmonte: un temporizador no cancelable por control. */
export function retardo(ms: number): (fn: () => void) => void {
  let id = 0;
  return (fn) => {
    window.clearTimeout(id);
    if (ms <= 0) {
      fn();
      return;
    }
    id = window.setTimeout(fn, ms);
  };
}

export function selectDe(opciones: Array<[string, string]>, valor: string, aria: string, alCambiar: (v: string) => void): ConValor {
  const el = crear('iswc-select', 'iswc-ag-control') as ConValor;
  el.setAttribute('aria-label', aria);
  for (const [v, texto] of opciones) {
    const op = crear('iswc-option', '', texto) as ConValor;
    op.setAttribute('value', v);
    el.append(op);
  }
  el.value = valor;
  el.addEventListener('iswc-change', (e) => {
    e.stopPropagation();
    alCambiar(el.value);
  });
  return el;
}

export function inputDe(p: { tipo?: string; valor?: string; placeholder?: string; aria: string; soloLectura?: boolean; limpiable?: boolean }, alEscribir: (v: string) => void): ConValor {
  const el = crear('iswc-input', 'iswc-ag-control') as ConValor;
  el.setAttribute('type', p.tipo ?? 'text');
  el.setAttribute('aria-label', p.aria);
  if (p.placeholder) el.setAttribute('placeholder', p.placeholder);
  if (p.soloLectura) el.setAttribute('readonly', '');
  if (p.limpiable) el.setAttribute('clearable', '');
  el.value = p.valor ?? '';
  el.addEventListener('input', (e) => {
    e.stopPropagation();
    alEscribir(el.value);
  });
  return el;
}

export function casilla(texto: string, marca: boolean | 'mixta', alCambiar: (marcada: boolean) => void): HTMLElement {
  const el = crear('iswc-checkbox', 'iswc-ag-casilla', texto);
  fijarCasilla(el, marca);
  el.addEventListener('iswc-change', (e) => {
    e.stopPropagation();
    alCambiar((e as CustomEvent<{ checked: boolean }>).detail.checked);
  });
  return el;
}

export function fijarCasilla(el: HTMLElement, marca: boolean | 'mixta'): void {
  el.toggleAttribute('checked', marca === true);
  el.toggleAttribute('indeterminate', marca === 'mixta');
}

export function boton(texto: string, alClic: () => void, variante = 'text', nombreIcono?: string): HTMLElement {
  const el = crear('iswc-button', 'iswc-ag-boton');
  el.setAttribute('variant', variante);
  if (nombreIcono) el.append(icono(nombreIcono));
  if (texto) el.append(texto);
  el.addEventListener('click', alClic);
  return el;
}

export function botonIcono(nombreIcono: string, aria: string, alClic: () => void): HTMLElement {
  const el = crear('iswc-button', 'iswc-ag-boton-icono');
  el.setAttribute('variant', 'plain');
  el.setAttribute('color', 'text');
  el.setAttribute('aria-label', aria);
  el.setAttribute('title', aria);
  el.append(icono(nombreIcono));
  el.addEventListener('click', alClic);
  return el;
}
