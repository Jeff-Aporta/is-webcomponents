// @contexto INDICE.md · src/core/README.md
/**
 * dom-utils.js — Utilidades de DOM compartidas.
 *
 * Sustituye copias dispersas en iswc-checkbox, iswc-switch, iswc-input,
 * iswc-textarea, iswc-slider, iswc-rating, iswc-split-panel, iswc-popover, etc.
 */
import type { HijoNodo } from './schemas/dom.schemas.js';

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

// ── misc-utils ──
/**
 * misc-utils.js — Utilidades numéricas y de texto compartidas.
 *
 * Sustituye copias dispersas en iswc-slider, iswc-rating, iswc-split-panel,
 * iswc-format, etc.
 */
/**
 * Redondea `n` a los decimales que tenga `step`.
 *
 * OJO: no es lo mismo que `tidy(n, unit)` de arriba, aunque el nombre se le
 * parezca. `tidy` redondea SIEMPRE a 3 decimales y concatena una unidad de
 * texto (`'12.5px'`); esto mira cuántos decimales trae el step y redondea a
 * esos, devolviendo un número. `<iswc-slider step="0.01">` necesita 2
 * decimales, no 3, y necesita el valor como número para seguir sumando.
 *
 * Existía duplicado —con el nombre `tidy`, que es justo el de la otra
 * función— en `iswc-slider` e `iswc-rating`.
 *
 * @param {number} n
 * @param {number|string} step
 * @returns {number}
 */
export function tidyToStep(n: number, step: number|string) {
  const decimals = (String(step).split('.')[1] || '').length;
  if (!decimals) return n;
  return Number(n.toFixed(Math.min(20, decimals)));
}

/**
 * Clamp numérico inclusivo: devuelve n limitado al rango [min, max].
 *
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampTo(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

// ── theme-scope ──
/**
 * Contenedor de tema del kit — misma cascada que iswc-theme-toggle.
 * Atraviesa Shadow DOM (Element.closest se corta en el shadow root).
 *
 * W51: SCOPE solo con [data-theme]. Las clases .theme-dark/.theme-light se
 * erradicaron del CSS en W48.
 */

const THEME_SCOPE =
  '[container-theme], .container-theme, [data-theme]';

/**
 * Sube desde `from` atravesando hosts de shadow hasta hallar un ancestro
 * que matchee THEME_SCOPE. Nunca devuelve `from` (aunque tenga data-theme).
 * @param {Element | null | undefined} from
 * @returns {Element}
 */
export function findThemeContainer(from: Element | null | undefined) {
  let node = from && from.nodeType === 1 ? from : null;
  while (node) {
    const parent = node.parentElement;
    if (parent) {
      const hit = parent.closest(THEME_SCOPE);
      if (hit) return hit;
    }
    const root = node.getRootNode?.();
    if (root instanceof ShadowRoot && root.host) {
      if (root.host.matches(THEME_SCOPE)) return root.host;
      node = root.host;
      continue;
    }
    break;
  }
  return document.documentElement;
}

/** @param {Element | null | undefined} el */
export function readTheme(el: Element | null | undefined) {
  if (!el) return 'dark';
  const dt = el.getAttribute?.('data-theme') || (el as HTMLElement).dataset?.theme;
  return dt === 'light' ? 'light' : 'dark';
}

/**
 * Observa data-theme del contenedor + `iswc-theme-change` (composed).
 * @param {Element} container
 * @param {() => void} onChange
 * @returns {() => void}
 */
export function watchThemeContainer(container: Element, onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(container, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('iswc-theme-change', onChange);
  return () => {
    obs.disconnect();
    document.removeEventListener('iswc-theme-change', onChange);
  };
}
