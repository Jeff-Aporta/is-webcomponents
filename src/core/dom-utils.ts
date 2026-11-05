/**
 * dom-utils.js — Utilidades de DOM compartidas.
 *
 * Sustituye copias dispersas en iswc-checkbox, iswc-switch, iswc-input,
 * iswc-textarea, iswc-slider, iswc-rating, iswc-split-panel, iswc-popover, etc.
 */
import type { HijoNodo } from './schemas/dom-utils.schemas.js';

/**
 * Devuelve true si el slot tiene nodos asignados (no sólo whitespace).
 * Usado por componentes que aceptan tanto atributos como slot para el mismo
 * dato (p.ej. `<iswc-input label="X">` vs `<iswc-input><span slot="label">X</span></iswc-input>`).
 *
 * @param {HTMLSlotElement|null} slot
 * @param {object} [opts]
 * @param {boolean} [opts.flatten=true]  pasar a assignedNodes
 * @returns {boolean}
 */
export function hasSlotted(slot: HTMLSlotElement|null, { flatten = true } = {}) {
  if (!slot) return false;
  const nodes = slot.assignedNodes({ flatten });
  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE) return true;
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true;
  }
  return false;
}

/**
 * Devuelve los nodos asignados a un slot como array.
 * Atajo sobre `slot.assignedNodes({ flatten: true })`.
 *
 * @param {HTMLSlotElement|null} slot
 * @returns {Node[]}
 */
export function assignedNodes(slot: HTMLSlotElement|null) {
  if (!slot) return [];
  return slot.assignedNodes({ flatten: true });
}

/**
 * Escapa texto para interpolarlo en HTML (innerHTML/templates).
 * Sustituye las copias locales que había en ag-grid, data-grid, spreadsheet,
 * org-chart, cdn-snippet, dropzone, full-calendar, inline-edit y
 * command-palette.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Copia texto al portapapeles con fallback a execCommand para contextos
 * sin Clipboard API (http, iframes sin permiso). Devuelve true si copió.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text: string) {
  const value = String(text ?? '');
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch { /* fallback abajo */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Crea un elemento con atributos e hijos. Un atributo `true` se escribe vacío; `false`, `null` o `undefined` se omite.
 * El texto siempre va como nodo de texto: es la forma segura de pintar datos dentro del shadow de un componente.
 */
export function crearNodo(tag: string, attrs: Record<string, string | number | boolean | null | undefined> = {}, ...hijos: HijoNodo[]): HTMLElement {
  const nodo = document.createElement(tag);
  for (const [nombre, valor] of Object.entries(attrs)) {
    if (valor === false || valor == null) continue;
    nodo.setAttribute(nombre, valor === true ? "" : String(valor));
  }
  for (const hijo of hijos) {
    if (hijo !== null && hijo !== undefined && hijo !== false) nodo.append(hijo);
  }
  return nodo;
}

/**
 * Oculta la caja de cada slot mientras no tenga contenido asignado, para que su hueco no cuente en el layout. Hace falta
 * en JS: un elemento con <slot> dentro nunca está `:empty`, y Chromium no resuelve `:host(:has(...))`.
 */
export function ocultarSlotsVacios(raiz: ShadowRoot, selector: string): void {
  for (const slot of raiz.querySelectorAll<HTMLSlotElement>(selector)) {
    const caja = slot.parentElement;
    if (!caja) continue;
    const sincronizar = (): void => {
      caja.hidden = !slot.assignedNodes({ flatten: true }).some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
    };
    slot.addEventListener('slotchange', sincronizar);
    sincronizar();
  }
}
