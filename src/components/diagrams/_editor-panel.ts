/**
 * _editor-panel.ts — Panel lateral compartido entre los 16 editores.
 *
 * Layout: 320px fijo. Tres secciones:
 *   - Lista de nodos: <ul> con cada nodo del spec (click → selecciona).
 *   - Props del nodo seleccionado: subclase implementa renderNodeProps(node).
 *   - Export JSON: textarea readonly + botón "Copiar".
 *
 * Eventos que el panel EMITE:
 *   - `is-editor-select-node` (detail: { nodeId: string })
 *   - `is-editor-export` (detail: { kind: 'json' | 'svg' })
 *
 * Eventos que el panel ESCUCHA (en el host):
 *   - `is-editor-selection-changed` (detail: { nodeId: string | null })
 *
 * Temas: hereda de las CSS vars `--is-bg-elev`, `--is-border`, `--is-text`,
 * `--is-text-soft`, `--is-accent`.
 *
 * Sin registro en `customElements`: cada editor llama `createEditorPanel()`
 * para obtener un HTMLElement y attachearlo al shadow.
 *
 * Accessibility:
 *   - `<aside>` semántico.
 *   - Lista de nodos es `<ul role="listbox">` con `<li role="option">`.
 *   - Roving tabindex entre items (tabindex=0 sólo el activo).
 *   - aria-activedescendant en el listbox.
 *
 * Reduced motion: sin animaciones (sólo cambio de color al hover).
 */

import { emit } from '../../core/element.js';

/** Tipos compartidos por cualquier editor. La subclase los strecha. */
export interface EditorPanelNodeLite {
  id: string;
  label?: string;
}

export interface EditorPanelOptions {
  /** Sección de props custom. Si se omite, sólo aparece "Sin props custom". */
  renderNodeProps?: (host: HTMLElement, nodeId: string | null, panelHost: HTMLElement) => void;
  /** Mostrar la sección "Export JSON". Default true. */
  showExportJson?: boolean;
}

export const EDITOR_SELECT_NODE_EVENT = 'is-editor-select-node';
export const EDITOR_EXPORT_EVENT = 'is-editor-export';
export const EDITOR_SELECTION_CHANGED_EVENT = 'is-editor-selection-changed';

const PANEL_CSS = `
:host {
  display: block;
  background: var(--is-bg-elev, #131a24);
  border: 1px solid var(--is-border, rgba(255,255,255,0.12));
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  font-family: var(--is-ui, ui-sans-serif, system-ui, sans-serif);
  color: var(--is-text, #e2e8f0);
}
h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
  color: var(--is-text-soft, #94a3b8);
  font-weight: 700;
}
fieldset {
  border: 1px solid var(--is-border, rgba(255,255,255,0.08));
  border-radius: 6px;
  padding: 8px 10px;
}
fieldset legend {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--is-text-soft, #94a3b8);
  padding: 0 4px;
}
.node-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 240px;
  overflow: auto;
}
.node-list li {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}
.node-list li:hover { background: rgba(255,255,255,0.04); }
.node-list li[aria-selected="true"] {
  background: rgba(37,99,235,0.12);
  border-color: var(--is-accent, #2563eb);
}
.node-list li:focus-visible { outline: 2px solid var(--is-accent, #2563eb); outline-offset: 1px; }
.empty { font-size: 11px; color: var(--is-text-soft, #94a3b8); font-style: italic; }
.export-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.export-row button {
  appearance: none;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--is-text, #e2e8f0);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font: 11px var(--is-ui, ui-sans-serif, system-ui, sans-serif);
}
.export-row button:hover { background: rgba(255,255,255,0.06); }
.export-row button:focus-visible { outline: 2px solid var(--is-accent, #2563eb); outline-offset: 1px; }
textarea[data-json-readout] {
  width: 100%;
  box-sizing: border-box;
  font: 11px ui-monospace, Menlo, Consolas, monospace;
  background: rgba(0,0,0,0.2);
  color: var(--is-text, #e2e8f0);
  border: 1px solid var(--is-border, rgba(255,255,255,0.08));
  border-radius: 4px;
  padding: 6px;
  resize: vertical;
  min-height: 80px;
  margin-top: 4px;
}
`;

/** Devuelve un `<aside>` con lista de nodos + props + export. */
export function createEditorPanel(opts: EditorPanelOptions = {}): HTMLElement {
  const {
    renderNodeProps,
    showExportJson = true,
  } = opts;

  const root = document.createElement('aside');
  root.dataset.editorPart = 'panel';

  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  root.appendChild(style);

  // Sección 1 — Lista de nodos.
  const secNodes = document.createElement('fieldset');
  const legendNodes = document.createElement('legend');
  legendNodes.textContent = 'Nodos';
  secNodes.appendChild(legendNodes);

  const list = document.createElement('ul');
  list.className = 'node-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Lista de nodos del spec');
  secNodes.appendChild(list);

  // Placeholder vacío.
  const empty = document.createElement('li');
  empty.className = 'empty';
  empty.setAttribute('role', 'presentation');
  empty.textContent = 'Aún no hay nodos. Usa +Nodo o el demo JSON inicial.';
  list.appendChild(empty);

  root.appendChild(secNodes);

  // Sección 2 — Props del nodo seleccionado (subclase proporciona renderer).
  const secProps = document.createElement('fieldset');
  const legendProps = document.createElement('legend');
  legendProps.textContent = 'Propiedades';
  secProps.appendChild(legendProps);
  const propsHost = document.createElement('div');
  propsHost.dataset.editorPropsHost = '';
  secProps.appendChild(propsHost);
  root.appendChild(secProps);

  // Sección 3 — Export JSON.
  if (showExportJson) {
    const secExport = document.createElement('fieldset');
    const legendExport = document.createElement('legend');
    legendExport.textContent = 'Export JSON';
    secExport.appendChild(legendExport);
    const ta = document.createElement('textarea');
    ta.setAttribute('data-json-readout', '');
    ta.readOnly = true;
    ta.value = '';
    secExport.appendChild(ta);
    const row = document.createElement('div');
    row.className = 'export-row';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copiar';
    copyBtn.setAttribute('aria-label', 'Copiar JSON al portapapeles');
    copyBtn.addEventListener('click', () => {
      if (ta.value) {
        navigator.clipboard?.writeText(ta.value).catch(() => {/* ignore */});
      }
    });
    row.appendChild(copyBtn);
    secExport.appendChild(row);
    root.appendChild(secExport);
  }

  // ── API pública sobre el HTMLElement ──
  const api = root as HTMLElement & {
    setNodes: (nodes: readonly EditorPanelNodeLite[]) => void;
    setSelected: (id: string | null) => void;
    setJsonReadout: (text: string) => void;
    setNodeProps: (id: string | null) => void;
  };

  api.setNodes = (nodes) => {
    list.innerHTML = '';
    if (nodes.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.setAttribute('role', 'presentation');
      li.textContent = 'Aún no hay nodos.';
      list.appendChild(li);
      return;
    }
    for (const n of nodes) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('data-node-id', n.id);
      li.tabIndex = -1;
      li.textContent = n.label ?? n.id;
      li.addEventListener('click', () => {
        emit(root, EDITOR_SELECT_NODE_EVENT, { nodeId: n.id });
      });
      list.appendChild(li);
    }
  };

  api.setSelected = (id) => {
    const items = list.querySelectorAll<HTMLLIElement>('li[role="option"]');
    items.forEach((li) => {
      const sel = li.getAttribute('data-node-id') === id;
      li.setAttribute('aria-selected', sel ? 'true' : 'false');
      li.tabIndex = sel ? 0 : -1;
    });
    api.setNodeProps(id);
  };

  api.setJsonReadout = (text) => {
    const ta = root.querySelector<HTMLTextAreaElement>('textarea[data-json-readout]');
    if (ta) ta.value = text;
  };

  api.setNodeProps = (id) => {
    propsHost.innerHTML = '';
    if (renderNodeProps) {
      renderNodeProps(propsHost, id, root);
    } else {
      const small = document.createElement('div');
      small.className = 'empty';
      small.textContent = id
        ? `Nodo seleccionado: ${id}`
        : 'Selecciona un nodo de la lista para ver sus props.';
      propsHost.appendChild(small);
    }
  };

  return api;
}
