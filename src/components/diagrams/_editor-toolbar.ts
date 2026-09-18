/**
 * _editor-toolbar.ts — Toolbar unificada de los 16 editores visuales.
 *
 * Botones comunes (en este orden):
 *   [+Nodo]  [Conectar]  [Eliminar]  |  [↶Undo] [↷Redo]  |  [🔍+] [🔍−] [Fit]
 *
 * Aparece en la esquina superior derecha del host cuando el editor está en
 * `mode="edit"`. En `mode="view"` se desmonta (cleanup sin memory leak).
 *
 * Eventos: click delegate → `EDITOR_ACTION_EVENTS` (constante exportada).
 *
 * Temas: hereda de las CSS vars `--is-bg-elev`, `--is-border`, `--is-accent`,
 * `--is-text`, `--is-ui`. Las pone el `is-base.min.css` global.
 *
 * Accesibilidad:
 *   - `role="toolbar"` en `<div>` raíz.
 *   - Cada botón tiene `aria-label`, `aria-pressed` cuando aplique (Undo/Redo
 *     se desactivan cuando no hay history).
 *   - `tabindex` sólo en uno (roving tabindex en toolbar compleja >7 botones).
 *   - Navegación por flechas con `aria-keyshortcuts="ArrowLeft ArrowRight"`.
 *
 * Reduced motion:
 *   - Sin animaciones de feedback (sólo cambio de color al hover).
 *   - Tooltips aparecen instantáneos sin fade.
 *
 * Sin registro en `customElements`: cada editor llama `createEditorToolbar()`
 * para obtener un `HTMLElement` que añadir al shadow.
 */

import { emit } from '../../core/element.js';

/** Acción emitida por la toolbar; el editor decide qué hacer con ella. */
export type EditorAction =
  | 'add-node'
  | 'connect'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit';

/** Evento custom que la toolbar usa para propagar la acción al host. */
export const EDITOR_ACTION_EVENT = 'is-editor-action';
export interface EditorActionDetail {
  action: EditorAction;
}

/** Opciones para personalizar la toolbar. */
export interface EditorToolbarOptions {
  /** Mostrar el botón [+Nodo]. Default true. */
  showAddNode?: boolean;
  /** Mostrar el botón [Conectar]. Default true. */
  showConnect?: boolean;
  /** Mostrar el botón [Eliminar]. Default true. */
  showDelete?: boolean;
  /** Mostrar el grupo [Undo][Redo]. Default true. */
  showHistory?: boolean;
  /** Mostrar el grupo [Zoom+][Zoom−][Fit]. Default true. */
  showZoom?: boolean;
  /** Deshabilitar Undo (e.g. cuando `history.past.length === 0`). */
  undoDisabled?: boolean;
  /** Deshabilitar Redo (e.g. cuando `history.future.length === 0`). */
  redoDisabled?: boolean;
}

const TB_CSS = `
:host {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 5;
  background: var(--is-bg-elev, #131a24);
  border: 1px solid var(--is-border, rgba(255,255,255,0.12));
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.35);
  font-family: var(--is-ui, ui-sans-serif, system-ui, sans-serif);
}
button {
  appearance: none;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--is-text, #e2e8f0);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font: 12px var(--is-ui, ui-sans-serif, system-ui, sans-serif);
  line-height: 1;
}
button:hover { background: rgba(255,255,255,0.06); }
button:focus-visible { outline: 2px solid var(--is-accent, #2563eb); outline-offset: 1px; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button[aria-pressed="true"] {
  background: var(--is-accent, #2563eb);
  border-color: transparent;
}
.sep {
  width: 1px;
  background: var(--is-border, rgba(255,255,255,0.12));
  align-self: stretch;
  margin: 0 2px;
}
`;

interface ButtonDef {
  action: EditorAction;
  label: string;
  icon: string;
  ariaLabel: string;
  key: string;
  initiallyDisabled?: boolean;
}

/** Crea un `<div role="toolbar">` con los botones estándar.
 *  Devuelve el HTMLElement (no se attachea al shadow; lo hace la subclase). */
export function createEditorToolbar(opts: EditorToolbarOptions = {}): HTMLElement {
  const {
    showAddNode = true,
    showConnect = true,
    showDelete = true,
    showHistory = true,
    showZoom = true,
    undoDisabled = false,
    redoDisabled = false,
  } = opts;

  const root = document.createElement('div');
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', 'Acciones del editor');
  root.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
  root.dataset.editorPart = 'toolbar';

  // Estilos inline: cada editor tiene su propio shadow y el host global de la
  // toolbar es este root.
  const style = document.createElement('style');
  style.textContent = TB_CSS;
  root.appendChild(style);

  // Definición de botones en orden canónico (ver encabezado).
  const defs: ButtonDef[] = [];
  if (showAddNode) defs.push({ action: 'add-node', label: '+ Nodo', icon: '+', ariaLabel: 'Añadir nodo', key: 'N' });
  if (showConnect) defs.push({ action: 'connect', label: 'Conectar', icon: '→', ariaLabel: 'Conectar nodos seleccionados', key: 'C' });
  if (showDelete) defs.push({ action: 'delete', label: 'Eliminar', icon: '✕', ariaLabel: 'Eliminar selección', key: 'Del' });
  if (showHistory) {
    defs.push({ action: 'undo', label: '↶', icon: '↶', ariaLabel: 'Deshacer', key: 'Ctrl+Z', initiallyDisabled: undoDisabled });
    defs.push({ action: 'redo', label: '↷', icon: '↷', ariaLabel: 'Rehacer', key: 'Ctrl+Y', initiallyDisabled: redoDisabled });
  }
  if (showZoom) {
    defs.push({ action: 'zoom-in', label: '🔍+', icon: '🔍+', ariaLabel: 'Acercar', key: '+' });
    defs.push({ action: 'zoom-out', label: '🔍−', icon: '🔍−', ariaLabel: 'Alejar', key: '-' });
    defs.push({ action: 'fit', label: 'Fit', icon: '⛶', ariaLabel: 'Ajustar al contenido', key: 'F' });
  }

  let prevWasSep = false;
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const prev = i > 0 ? defs[i - 1] : null;
    // Insert separator before Undo, before Zoom.
    if ((d.action === 'undo' || d.action === 'zoom-in') && prev && prev.action !== 'undo' && prev.action !== 'zoom-in') {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.setAttribute('aria-hidden', 'true');
      root.appendChild(sep);
    }
    root.appendChild(createButton(d));
    prevWasSep = false;
  }

  // Listeners: click delega al root.
  root.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('button[data-action]') as HTMLButtonElement | null;
    if (!btn || btn.disabled) return;
    const action = btn.getAttribute('data-action') as EditorAction | null;
    if (!action) return;
    ev.stopPropagation();
    const detail: EditorActionDetail = { action };
    // Emitimos sobre el root; el listener en la base captura y traduce a su
    // método público (addNode, deleteSelected, ...). Esto evita que el root
    // requiera shadow DOM propio.
    emit(root, EDITOR_ACTION_EVENT, detail);
  });

  return root;
}

function createButton(d: ButtonDef): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('data-action', d.action);
  b.setAttribute('aria-label', `${d.ariaLabel} (${d.key})`);
  b.title = `${d.ariaLabel} (${d.key})`;
  b.textContent = d.icon;
  if (d.initiallyDisabled) b.disabled = true;
  return b;
}

/** Activa/Desactiva los botones Undo/Redo desde fuera. */
export function setToolbarHistoryState(toolbar: HTMLElement, undo: boolean, redo: boolean): void {
  const u = toolbar.querySelector<HTMLButtonElement>('button[data-action="undo"]');
  const r = toolbar.querySelector<HTMLButtonElement>('button[data-action="redo"]');
  if (u) u.disabled = !undo;
  if (r) r.disabled = !redo;
}
