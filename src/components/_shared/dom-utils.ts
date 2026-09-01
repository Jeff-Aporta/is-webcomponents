/**
 * dom-utils.js — Utilidades de DOM compartidas.
 *
 * Sustituye copias dispersas en is-checkbox, is-switch, is-input,
 * is-textarea, is-slider, is-rating, is-split-panel, is-popover, etc.
 */

/**
 * Devuelve true si el slot tiene nodos asignados (no sólo whitespace).
 * Usado por componentes que aceptan tanto atributos como slot para el mismo
 * dato (p.ej. `<is-input label="X">` vs `<is-input><span slot="label">X</span></is-input>`).
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
 * Devuelve los elementos asignados a un slot como array.
 * Atajo sobre `slot.assignedElements({ flatten: true })`.
 *
 * @param {HTMLSlotElement|null} slot
 * @returns {Element[]}
 */
export function assignedElements(slot: HTMLSlotElement|null) {
  if (!slot) return [];
  return slot.assignedElements({ flatten: true });
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
