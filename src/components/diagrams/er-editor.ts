// er-editor.ts: editor visual COMPLETO para <is-er-diagram>. Versión FULL del
// componente: state, undo/redo, multi-select, drag, click-to-connect, panel
// de estilos, exportación JSON/SVG.
//
// Comparte TODO el rendering con <is-er-diagram> (lite) por COMPOSICIÓN: el
// editor monta un <is-er-diagram> en su shadow DOM y le pasa el payload.
// Cualquier cambio en el componente (lite) se refleja aquí gratis.
//
// API pública:
//   <is-er-editor payload={...}></is-er-editor>
// Atributos: animation="trace"
// Eventos: is-state-change (detail: { entities, relations }), is-export-svg,
//          is-export-json
//
// Tests exhaustivos:
//   Playwright: smoke + funcional (drag, click-to-connect, undo/redo,
//     export JSON/SVG) + determinismo (round-trip idéntico).
//   Stagehand: validación visual (cajas no se solapan, aristas legibles).
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { serializeErPayload, renderErSvg as renderErSvgString } from './er-archify.js';
import type { ErEditorState, ErSpec, ErSpecAttribute, ErSpecEntity, ErSpecRelation, EdgeStyleOverride, ErRouteKind, ErDashStyle, EdgeVariant } from './diagram-types.js';

const SNAP = 8;
const HISTORY_LIMIT = 200;

const HISTORY_OP = {
  ADD_ENTITY: 'add_entity',
  ADD_RELATION: 'add_relation',
  UPDATE_ENTITY: 'update_entity',
  REPLACE_ALL: 'replace_all',
};

const EDITOR_CSS = `
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  font-family: var(--is-ui, ui-sans-serif, system-ui, sans-serif);
  color: var(--is-text, #e2e8f0);
}
.stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 12px;
  padding: 12px;
  height: 100%;
  box-sizing: border-box;
}
.canvas {
  position: relative;
  background: var(--is-bg, #0c1118);
  border: 1px solid var(--is-border, rgba(255,255,255,0.12));
  border-radius: 8px;
  overflow: hidden;
  min-height: 400px;
}
.canvas-inner { position: absolute; inset: 0; }
.canvas-inner > is-er-diagram { width: 100%; height: 100%; display: block; }
.toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 5;
  background: var(--is-bg-elev, #131a24);
  border: 1px solid var(--is-border, rgba(255,255,255,0.12));
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.35);
}
.toolbar button {
  appearance: none;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--is-text, #e2e8f0);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font: 12px var(--is-ui, ui-sans-serif, system-ui, sans-serif);
}
.toolbar button:hover { background: rgba(255,255,255,0.06); }
.toolbar button[aria-pressed="true"] {
  background: var(--is-accent, #2563eb);
  border-color: transparent;
}
.panel {
  background: var(--is-bg-elev, #131a24);
  border: 1px solid var(--is-border, rgba(255,255,255,0.12));
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}
.panel h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
  color: var(--is-text-soft, #94a3b8);
  font-weight: 700;
}
.panel fieldset {
  border: 1px solid var(--is-border, rgba(255,255,255,0.08));
  border-radius: 6px;
  padding: 8px 10px;
}
.panel fieldset legend {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--is-text-soft, #94a3b8);
  padding: 0 4px;
}
.panel label {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  margin-bottom: 4px;
}

/* Editor de atributos (CRUD de rows) */
.panel fieldset[data-attrs] .attr-row {
  display: grid;
  grid-template-columns: 1fr 1fr 70px 22px;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}
.panel fieldset[data-attrs] .attr-row input,
.panel fieldset[data-attrs] .attr-row select {
  width: 100%;
  background: transparent;
  color: var(--is-text, #e2e8f0);
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  border-radius: 3px;
  padding: 3px 5px;
  font: 11px ui-monospace, Menlo, Consolas, monospace;
  box-sizing: border-box;
  min-width: 0;
}
.panel fieldset[data-attrs] .attr-row input:focus,
.panel fieldset[data-attrs] .attr-row select:focus {
  outline: 1px solid var(--is-accent, #2563eb);
  outline-offset: 0;
  border-color: var(--is-accent, #2563eb);
}
.panel fieldset[data-attrs] .attr-row .key-pk {
  border-color: var(--is-accent, #2563eb);
  background: rgba(37, 99, 235, 0.12);
}
.panel fieldset[data-attrs] .attr-row .key-fk {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}
.panel fieldset[data-attrs] .attr-row .attr-del {
  appearance: none;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--is-danger, #f87171);
  border-radius: 3px;
  cursor: pointer;
  font: 12px ui-monospace, Menlo, Consolas, monospace;
  padding: 0;
  line-height: 1;
}
.panel fieldset[data-attrs] .attr-row .attr-del:hover {
  background: rgba(248, 113, 113, 0.16);
  border-color: var(--is-danger, #f87171);
}
.panel fieldset[data-attrs] button[data-action="add-attr"] {
  width: 100%;
  margin-top: 6px;
}
.panel input[type="text"],
.panel input[type="number"],
.panel select {
  width: 100%;
  background: transparent;
  color: var(--is-text, #e2e8f0);
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  border-radius: 4px;
  padding: 4px 6px;
  font: 12px var(--is-ui, ui-sans-serif, system-ui, sans-serif);
  box-sizing: border-box;
}
.panel input[type="color"] {
  width: 100%;
  height: 28px;
  padding: 0;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.panel .row { display: flex; gap: 6px; }
.panel button {
  appearance: none;
  border: 1px solid var(--is-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--is-text, #e2e8f0);
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font: 12px var(--is-ui, ui-sans-serif, system-ui, sans-serif);
}
.panel button:hover { background: rgba(255,255,255,0.06); }
.panel button.primary {
  background: var(--is-accent, #2563eb);
  border-color: transparent;
  color: #fff;
}
.panel button.danger { color: var(--is-danger, #f87171); }
.selection-info {
  font-size: 11px;
  color: var(--is-text-soft, #94a3b8);
}
textarea[data-json-readout] {
  width: 100%;
  height: 160px;
  background: transparent;
  color: var(--is-text-soft, #94a3b8);
  border: 1px solid var(--is-border, rgba(255,255,255,0.08));
  border-radius: 4px;
  font: 11px ui-monospace, Menlo, Consolas, monospace;
  padding: 6px;
  box-sizing: border-box;
  resize: vertical;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--is-text-soft, #94a3b8);
  font-size: 14px;
  pointer-events: none;
}
`;

const EDITOR_TEMPLATE = `
<div class="stage">
  <div class="canvas" data-canvas>
    <div class="canvas-inner" data-canvas-inner></div>
    <div class="toolbar" data-toolbar>
      <button data-mode="edit" aria-pressed="true">Editar</button>
      <button data-mode="connect">Conectar</button>
    </div>
  </div>
  <aside class="panel" data-panel aria-label="Panel de edición del diagrama ER">
    <h3>Selección</h3>
    <div class="selection-info" data-selection-info>Vacía</div>
    <fieldset>
      <legend>Acciones</legend>
      <div class="row" style="margin-bottom:6px;">
        <button data-action="add-entity">+ Entidad</button>
        <button data-action="add-relation">+ Relación</button>
      </div>
      <div class="row">
        <button data-action="delete">Borrar</button>
        <button data-action="duplicate">Duplicar</button>
      </div>
      <div class="row" style="margin-top:6px;">
        <button data-action="undo">↶ Deshacer</button>
        <button data-action="redo">↷ Rehacer</button>
      </div>
    </fieldset>
    <fieldset data-attrs hidden>
      <legend>Atributos</legend>
      <div data-attr-list></div>
      <button data-action="add-attr">+ Atributo</button>
    </fieldset>
    <fieldset data-styles>
      <legend>Estilo</legend>
      <label>fill <input type="color" data-style="fill"></label>
      <label>stroke <input type="color" data-style="stroke"></label>
      <label>stroke-width <input type="number" step="0.1" min="0" max="10" data-style="strokeWidth"></label>
      <label>radius <input type="number" step="1" min="0" max="32" data-style="radius"></label>
      <label>opacity <input type="number" step="0.05" min="0" max="1" data-style="opacity"></label>
    </fieldset>
    <fieldset data-edge-styles>
      <legend>Aristas</legend>
      <label>route
        <select data-style="route">
          <option value="orthogonal">orthogonal</option>
          <option value="straight">straight</option>
          <option value="orthogonal-h">orthogonal-h</option>
          <option value="orthogonal-v">orthogonal-v</option>
        </select>
      </label>
      <label>dashStyle
        <select data-style="dashStyle">
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
          <option value="dotted">dotted</option>
        </select>
      </label>
      <label>variant
        <select data-style="variant">
          <option value="default">default</option>
          <option value="emphasis">emphasis</option>
          <option value="security">security</option>
          <option value="dashed">dashed</option>
        </select>
      </label>
      <label>width <input type="number" step="0.1" min="0.2" max="8" data-style="width"></label>
    </fieldset>
    <fieldset>
      <legend>Exportar</legend>
      <div class="row" style="margin-bottom:6px;">
        <button data-action="copy-json">Copiar JSON</button>
        <button data-action="download-json">Descargar .json</button>
      </div>
      <div class="row">
        <button data-action="copy-svg">Copiar SVG</button>
        <button data-action="download-svg">Descargar .svg</button>
      </div>
    </fieldset>
    <fieldset>
      <legend>JSON en vivo</legend>
      <textarea data-json-readout readonly></textarea>
    </fieldset>
  </aside>
</div>
`;

class IsErEditor extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['animation'];
  }

  #diagram: HTMLElement & { payload: unknown; svg: SVGElement } | null = null;
  #state: ErEditorState | null = null;
  // Cada entrada de history lleva un `sig` opcional para coalescer cambios
  // rápidos en name/type de un atributo en una sola entrada de undo.
  #past: Array<{ op: string; sig?: string; payload: unknown; inverse: () => void; redo?: () => void }> = [];
  #future: Array<{ op: string; sig?: string; payload: unknown; inverse: () => void; redo?: () => void }> = [];
  #selection: Set<string> = new Set();
  #mode: 'edit' | 'connect' = 'edit';
  #pendingConnection: { fromId: string } | null = null;
  #undoHotkey: ((e: KeyboardEvent) => void) | null = null;
  #attrEditDebounce: number | null = null;

  constructor() {
    super();
    const sr = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = EDITOR_CSS;
    sr.appendChild(style);
    const tmpl = document.createElement('div');
    tmpl.innerHTML = EDITOR_TEMPLATE;
    while (tmpl.firstChild) sr.appendChild(tmpl.firstChild);
    this.#installListeners();
  }

  connectedCallback() {
    this.#ensureDiagram();
    this.#installHotkeys();
    if (!this.#state) this.#state = cloneState({ entities: [], relations: [] });
    this.#render();
  }
  disconnectedCallback() {
    this.#uninstallHotkeys();
    if (this.#attrEditDebounce !== null) clearTimeout(this.#attrEditDebounce);
    this.#attrEditDebounce = null;
  }
  attributeChangedCallback(name: string): void {
    if (name === 'animation' && this.#diagram) {
      this.#diagram.setAttribute('animation', this.getAttribute('animation') ?? '');
      this.#render();
    }
  }

  /* ───── API pública ───── */

  get payload(): ErEditorState | null { return this.#state; }
  set payload(v: unknown) {
    this.#state = cloneState(v);
    this.#past = [];
    this.#future = [];
    this.#selection = new Set();
    this.#render();
    this.#emitStateChange();
  }

  exportJson(): string {
    if (!this.#state) return '';
    return serializeErPayload(this.#state as unknown as ErSpec, { indent: 2 });
  }

  exportSvg(): string {
    if (!this.#diagram) return '';
    const traceEnabled = this.getAttribute('animation') === 'trace'
      || (this.#state as { meta?: { animation?: string } } | null)?.meta?.animation === 'trace';
    return renderErSvgString(this.#diagram.svg, { animation: traceEnabled ? 'trace' : 'none' });
  }

  /* ───── Estado / undo ───── */

  #commit(op: string, payload: unknown, inverse: () => void): void {
    this.#past.push({ op, payload, inverse });
    if (this.#past.length > HISTORY_LIMIT) this.#past.shift();
    this.#future = [];
  }
  #undo(): void {
    const entry = this.#past.pop();
    if (!entry) return;
    entry.inverse();
    this.#future.push(entry);
    this.#render();
    this.#emitStateChange();
  }
  #redo(): void {
    const entry = this.#future.pop();
    if (!entry) return;
    // Si la entry tiene un `redo` explícito (p.ej. attribute edits que cambian
    // el mismo campo varias veces), lo usamos. Si no, fallback a `inverse()`
    // que es lo correcto para entries simétricas (add/delete/replace).
    const apply = entry.redo ?? entry.inverse;
    apply.call(entry);
    this.#past.push(entry);
    this.#render();
    this.#emitStateChange();
  }

  /* ───── Diagram (lite) wrapper ───── */

  #ensureDiagram(): void {
    if (this.#diagram) return;
    const host = this.shadowRoot!.querySelector('[data-canvas-inner]')!;
    const diagram = document.createElement('is-er-diagram') as unknown as HTMLElement & { payload: unknown; svg: SVGElement };
    diagram.setAttribute('animation', this.getAttribute('animation') ?? '');
    diagram.addEventListener('is-render', this.#onDiagramRender as EventListener);
    host.appendChild(diagram);
    this.#diagram = diagram;
  }

  #onDiagramRender = (): void => {
    queueMicrotask(() => this.#installInteractionHandlers());
    this.#syncJsonReadout();
  };

  /* ───── Render ───── */

  #render(): void {
    if (!this.#state) {
      if (this.#diagram) this.#diagram.payload = null;
      return;
    }
    if (this.#diagram) this.#diagram.payload = this.#state;
    this.#updatePanel();
    this.#syncJsonReadout();
  }

  #updatePanel(): void {
    const info = this.shadowRoot!.querySelector('[data-selection-info]');
    const attrsFieldset = this.shadowRoot!.querySelector('[data-attrs]') as HTMLElement | null;
    if (!info) return;
    if (!this.#selection.size || !this.#state) {
      info.textContent = 'Vacía — click sobre una entidad o arista para seleccionarla.';
      attrsFieldset?.setAttribute('hidden', '');
      return;
    }
    const entitySel = [...this.#selection].filter((id) => this.#state!.entities.find((e) => e.id === id));
    const relSel = [...this.#selection].filter((id) => this.#state!.relations.find((r) => r.id === id));
    info.textContent = [
      entitySel.length ? `${entitySel.length} entidad(es)` : null,
      relSel.length ? `${relSel.length} relación(es)` : null,
    ].filter(Boolean).join(' · ');

    // Editor de atributos: solo visible cuando hay EXACTAMENTE 1 entidad
    // seleccionada (no multi-select, no relaciones). Si no, ocultar.
    if (attrsFieldset) {
      if (entitySel.length === 1 && relSel.length === 0) {
        attrsFieldset.removeAttribute('hidden');
        this.#renderAttributeRows(entitySel[0]!);
      } else {
        attrsFieldset.setAttribute('hidden', '');
      }
    }
  }

  /** Renderiza las filas de atributos para la entidad seleccionada. */
  #renderAttributeRows(entityId: string): void {
    const list = this.shadowRoot!.querySelector('[data-attr-list]') as HTMLElement | null;
    if (!list || !this.#state) return;
    const entity = this.#state.entities.find((e) => e.id === entityId);
    if (!entity) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = '';
    for (let i = 0; i < entity.attributes.length; i++) {
      const a = entity.attributes[i]!;
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.dataset.attrIndex = String(i);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = a.name ?? '';
      nameInput.placeholder = 'nombre';
      nameInput.dataset.attrField = 'name';
      nameInput.dataset.attrIndex = String(i);

      const typeInput = document.createElement('input');
      typeInput.type = 'text';
      typeInput.value = a.type ?? '';
      typeInput.placeholder = 'tipo';
      typeInput.dataset.attrField = 'type';
      typeInput.dataset.attrIndex = String(i);

      const keySelect = document.createElement('select');
      keySelect.dataset.attrField = 'key';
      keySelect.dataset.attrIndex = String(i);
      for (const opt of ['', 'PK', 'FK']) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt || '—';
        if ((a.key ?? '') === opt) o.selected = true;
        keySelect.appendChild(o);
      }
      keySelect.className = a.key === 'PK' ? 'key-pk' : a.key === 'FK' ? 'key-fk' : '';

      const delBtn = document.createElement('button');
      delBtn.className = 'attr-del';
      delBtn.title = 'Eliminar atributo';
      delBtn.textContent = '×';
      delBtn.dataset.attrAction = 'delete';
      delBtn.dataset.attrIndex = String(i);

      row.appendChild(nameInput);
      row.appendChild(typeInput);
      row.appendChild(keySelect);
      row.appendChild(delBtn);
      list.appendChild(row);
    }
  }

  #syncJsonReadout(): void {
    const ta = this.shadowRoot!.querySelector('[data-json-readout]') as HTMLTextAreaElement | null;
    if (!ta) return;
    try {
      ta.value = this.exportJson();
    } catch (err: unknown) {
      const msg = (err as { message?: string } | null)?.message ?? String(err);
      ta.value = `// error serializando: ${msg}`;
    }
  }

  #emitStateChange(): void {
    emit(this, 'is-state-change', { entities: this.#state?.entities, relations: this.#state?.relations });
    this.#syncJsonReadout();
  }

  /* ───── Listeners del panel ───── */

  #installListeners(): void {
    this.shadowRoot!.addEventListener('click', (e: Event) => {
      const path = e.composedPath();
      const btn = path.find((x) => (x as HTMLElement | undefined)?.dataset?.action);
      if (btn) { this.#handleAction((btn as HTMLElement).dataset.action!, e); return; }
      const attrDel = path.find((x) => (x as HTMLElement | undefined)?.dataset?.attrAction === 'delete') as HTMLElement | undefined;
      if (attrDel) {
        const idx = Number(attrDel.dataset.attrIndex);
        this.#deleteAttribute(idx);
        return;
      }
      const modeBtn = path.find((x) => (x as HTMLElement | undefined)?.dataset?.mode);
      if (modeBtn) this.#setMode((modeBtn as HTMLElement).dataset.mode!);
    });
    this.shadowRoot!.addEventListener('input', (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t) return;
      if (t.dataset.style) {
        this.#applyStyleToSelection(t.dataset.style, t.value, t.type);
        return;
      }
      // Atributo (name/type) — debounce 200ms para coalescer tecleo rápido
      // en una sola entrada de history (un undo por fila de escritura).
      if (t.dataset.attrField && (t.dataset.attrField === 'name' || t.dataset.attrField === 'type')) {
        this.#updateAttributeDebounced(Number(t.dataset.attrIndex), t.dataset.attrField as 'name' | 'type', t.value);
        return;
      }
    });
    this.shadowRoot!.addEventListener('change', (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t) return;
      if (t.dataset.style) {
        this.#applyStyleToSelection(t.dataset.style, t.value, t.type);
        return;
      }
      if (t.dataset.attrField === 'key') {
        this.#updateAttributeImmediate(Number(t.dataset.attrIndex), 'key', t.value as 'PK' | 'FK' | '');
        return;
      }
    });
  }

  #handleAction(action: string, ev?: Event): void {
    switch (action) {
      case 'add-entity': this.#addEntity(); break;
      case 'add-relation': this.#addRelation(); break;
      case 'add-attr': this.#addAttribute(); break;
      case 'delete': this.#deleteSelection(); break;
      case 'duplicate': this.#duplicateSelection(); break;
      case 'undo': this.#undo(); break;
      case 'redo': this.#redo(); break;
      case 'copy-json': this.#copyToClipboard(this.exportJson(), 'application/json'); break;
      case 'download-json': this.#downloadFile(this.exportJson(), 'application/json', 'er-diagram.json'); break;
      case 'copy-svg': this.#copyToClipboard(this.exportSvg(), 'image/svg+xml'); break;
      case 'download-svg': this.#downloadFile(this.exportSvg(), 'image/svg+xml', 'er-diagram.svg'); break;
    }
    // Los atributos se manejan via dataset.attrAction (delete), no via action.
    void ev;
  }

  #setMode(mode: string): void {
    this.#mode = (mode === 'connect' ? 'connect' : 'edit');
    this.shadowRoot!.querySelectorAll('[data-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.mode === mode));
    });
  }

  #installHotkeys(): void {
    this.#undoHotkey = (e: KeyboardEvent) => {
      const inField = e.composedPath().some((n) => {
        const el = n as HTMLElement | undefined;
        return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;
      });
      if (inField) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = (e.key ?? '').toLowerCase();
      if (ctrl && !e.shiftKey && key === 'z') {
        e.preventDefault(); this.#undo();
      } else if (ctrl && e.shiftKey && key === 'z') {
        e.preventDefault(); this.#redo();
      } else if (ctrl && key === 'y') {
        e.preventDefault(); this.#redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.#selection.size) { e.preventDefault(); this.#deleteSelection(); }
      } else if (e.key === 'Escape') {
        this.#selection.clear(); this.#pendingConnection = null; this.#render();
      }
    };
    window.addEventListener('keydown', this.#undoHotkey, { capture: true });
  }
  #uninstallHotkeys(): void {
    if (this.#undoHotkey) window.removeEventListener('keydown', this.#undoHotkey, { capture: true });
  }

  /* ───── Drag, multi-select, click-to-connect ───── */

  #installInteractionHandlers(): void {
    const svg = this.#diagram?.svg;
    if (!svg) return;
    const entities = svg.querySelectorAll('.er-entity');
    const relations = svg.querySelectorAll('.er-rel');
    entities.forEach((g) => this.#bindEntity(g as SVGGElement));
    relations.forEach((g) => this.#bindRelation(g as SVGGElement));
  }

  #bindEntity(g: SVGGElement): void {
    const id = g.dataset.entityId;
    if (!id || g.dataset.editorBound) return;
    g.dataset.editorBound = '1';
    g.style.cursor = 'grab';

    g.addEventListener('pointerdown', (ev: PointerEvent) => {
      if (this.#mode === 'connect') return;
      ev.stopPropagation();
      const additive = ev.shiftKey;
      if (!additive && !this.#selection.has(id)) {
        this.#selection = new Set([id]);
        this.#updatePanel();
      } else if (additive) {
        const ns = new Set(this.#selection);
        if (ns.has(id)) ns.delete(id); else ns.add(id);
        this.#selection = ns;
        this.#updatePanel();
      }
      if (!this.#selection.has(id) || !this.#state) return;

      const startX = ev.clientX;
      const startY = ev.clientY;
      const startPositions = new Map<string, [number, number] | null>();
      for (const sid of this.#selection) {
        const e = this.#state.entities.find((x) => x.id === sid);
        if (e && Array.isArray(e.pos)) startPositions.set(sid, [e.pos[0], e.pos[1]]);
        else if (e) startPositions.set(sid, null);
      }
      // Capturamos el estado ANTES de cualquier mutación para que el inverse
      // del undo pueda restaurar la posición original.
      const beforeEntities = cloneEntities(this.#state.entities);
      let moved = false;

      const onMove = (mv: PointerEvent) => {
        if (!this.#state) return;
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        for (const [sid, start] of startPositions) {
          if (!start) continue;
          const e = this.#state.entities.find((x) => x.id === sid);
          if (e) e.pos = [snap8(start[0] + dx), snap8(start[1] + dy)];
        }
        this.#render();
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        g.style.cursor = 'grab';
        if (moved && this.#state) {
          this.#commit(HISTORY_OP.UPDATE_ENTITY, { positions: startPositions }, () => {
            if (this.#state) this.#state.entities = beforeEntities;
          });
        }
      };
      g.style.cursor = 'grabbing';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    g.addEventListener('click', (ev: Event) => {
      if (this.#mode !== 'connect') return;
      ev.stopPropagation();
      if (!this.#state) return;
      if (!this.#pendingConnection) {
        this.#pendingConnection = { fromId: id };
      } else if (this.#pendingConnection.fromId !== id) {
        const newRel: ErSpecRelation = {
          id: this.#uniqueRelationId(),
          from: this.#pendingConnection.fromId,
          to: id,
          fromCard: 'one',
          toCard: 'many',
          identifying: true,
        };
        const before = [...this.#state.relations];
        this.#state.relations.push(newRel);
        this.#commit(HISTORY_OP.ADD_RELATION, { rel: newRel }, () => {
          if (this.#state) this.#state.relations = this.#state.relations.filter((r) => r.id !== newRel.id);
        });
        this.#pendingConnection = null;
        this.#setMode('edit');
        this.#render();
      }
    });

    g.addEventListener('dblclick', (ev: Event) => {
      const texts = g.querySelectorAll('text');
      if (!texts.length) return;
      const target = texts[0] as SVGTextElement;
      ev.stopPropagation();
      this.#inlineEditText(target, (newName: string) => {
        if (!this.#state) return;
        const e = this.#state.entities.find((x) => x.id === id);
        if (e) {
          const before = e.name;
          e.name = newName;
          this.#commit(HISTORY_OP.UPDATE_ENTITY, { id, before }, () => {
            if (!this.#state) return;
            const ee = this.#state.entities.find((x) => x.id === id);
            if (ee) ee.name = before;
          });
        }
      });
    });
  }

  #bindRelation(g: SVGGElement): void {
    const id = g.dataset.relId;
    if (!id || g.dataset.editorBound) return;
    g.dataset.editorBound = '1';
    g.style.cursor = 'pointer';
    g.addEventListener('click', (ev: Event) => {
      ev.stopPropagation();
      const additive = (ev as MouseEvent).shiftKey;
      const ns = new Set(this.#selection);
      if (additive) {
        if (ns.has(id)) ns.delete(id); else ns.add(id);
      } else if (!ns.has(id)) {
        ns.clear(); ns.add(id);
      }
      this.#selection = ns;
      this.#updatePanel();
    });
  }

  #inlineEditText(textNode: SVGTextElement, onSave: (newName: string) => void): void {
    const r = textNode.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = textNode.textContent ?? '';
    const rectCss = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;font:inherit;color:inherit;background:#000a;border:1px solid var(--is-accent,#2563eb);border-radius:2px;z-index:9999;padding:0 4px;`;
    input.style.cssText = rectCss;
    document.body.appendChild(input);
    input.focus();
    input.select();
    let done = false;
    const commit = (): void => {
      if (done) return; done = true;
      onSave(input.value.trim());
      input.remove();
      this.#render();
    };
    const cancel = (): void => {
      if (done) return; done = true;
      input.remove();
    };
    input.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
  }

  /* ───── Acciones ───── */

  #addEntity(): void {
    if (!this.#state) this.#state = cloneState({ entities: [], relations: [] });
    if (!this.#state) return;
    const id = this.#uniqueEntityId();
    const e: ErSpecEntity = {
      id,
      name: `Entidad ${this.#state.entities.length + 1}`,
      attributes: [],
      pos: [120 + (this.#state.entities.length % 4) * 200, 80 + Math.floor(this.#state.entities.length / 4) * 120],
    };
    const beforeEntities = cloneEntities(this.#state.entities);
    this.#state.entities.push(e);
    this.#commit(HISTORY_OP.ADD_ENTITY, { e }, () => {
      if (!this.#state) return;
      this.#state.entities = this.#state.entities.filter((x) => x.id !== e.id);
    });
    this.#selection = new Set([id]);
    this.#render();
    this.#emitStateChange();
  }
  #addRelation(): void {
    if (!this.#state || this.#state.entities.length < 2) return;
    const from = this.#state.entities[0];
    const to = this.#state.entities[1];
    if (!from || !to) return;
    const r: ErSpecRelation = {
      id: this.#uniqueRelationId(),
      from: from.id,
      to: to.id,
      fromCard: 'one',
      toCard: 'many',
      identifying: true,
    };
    const before = cloneRelations(this.#state.relations);
    this.#state.relations.push(r);
    this.#commit(HISTORY_OP.ADD_RELATION, { rel: r }, () => {
      if (!this.#state) return;
      this.#state.relations = this.#state.relations.filter((x) => x.id !== r.id);
    });
    this.#selection = new Set([r.id]);
    this.#render();
    this.#emitStateChange();
  }

  /* ───── Atributos (CRUD de rows) ───── */

  /** Entidad única actualmente seleccionada (la única compatible con el editor de attrs). */
  #selectedEntityId(): string | null {
    if (!this.#state || this.#selection.size !== 1) return null;
    const id = [...this.#selection][0]!;
    return this.#state.entities.some((e) => e.id === id) ? id : null;
  }

  #addAttribute(): void {
    if (!this.#state) return;
    const eid = this.#selectedEntityId();
    if (!eid) return;
    const e = this.#state.entities.find((x) => x.id === eid)!;
    const idx = e.attributes.length;
    const beforeAttrs = e.attributes.map((a) => ({ ...a }));
    e.attributes.push({ name: `atributo${idx + 1}`, type: 'string', key: undefined });
    this.#commit('add_attr', { eid, idx, before: beforeAttrs }, () => {
      if (!this.#state) return;
      const en = this.#state.entities.find((x) => x.id === eid);
      if (!en) return;
      en.attributes = beforeAttrs.map((a) => ({ ...a }));
    });
    this.#render();
    this.#emitStateChange();
  }

  #deleteAttribute(idx: number): void {
    if (!this.#state) return;
    const eid = this.#selectedEntityId();
    if (!eid) return;
    const e = this.#state.entities.find((x) => x.id === eid);
    if (!e || idx < 0 || idx >= e.attributes.length) return;
    const beforeAttrs = e.attributes.map((a) => ({ ...a }));
    const removed = e.attributes.splice(idx, 1)[0]!;
    this.#commit('delete_attr', { eid, idx, removed: { ...removed } }, () => {
      if (!this.#state) return;
      const en = this.#state.entities.find((x) => x.id === eid);
      if (!en) return;
      en.attributes.splice(idx, 0, { ...removed });
    });
    this.#render();
    this.#emitStateChange();
  }

  /** Update inmediato (sin debounce): usado para cambios discretos como `key`. */
  #updateAttributeImmediate(idx: number, field: 'key', value: 'PK' | 'FK' | ''): void {
    if (!this.#state) return;
    const eid = this.#selectedEntityId();
    if (!eid) return;
    const e = this.#state.entities.find((x) => x.id === eid);
    if (!e || idx < 0 || idx >= e.attributes.length) return;
    const before = { ...e.attributes[idx]! };
    const next = { ...before, key: value === '' ? undefined : value };
    e.attributes[idx] = next;
    this.#commit('update_attr', { eid, idx, before, field, value }, () => {
      if (!this.#state) return;
      const en = this.#state.entities.find((x) => x.id === eid);
      if (!en || idx < 0 || idx >= en.attributes.length) return;
      en.attributes[idx] = { ...before };
    });
    // Re-render del panel para que el estilo PK/FK se aplique (border color).
    this.#updatePanel();
    this.#emitStateChange();
  }

  /** Update con debounce: coalesce tecleo en name/type en una sola entrada de history. */
  #updateAttributeDebounced(idx: number, field: 'name' | 'type', value: string): void {
    if (!this.#state) return;
    const eid = this.#selectedEntityId();
    if (!eid) return;
    const e = this.#state.entities.find((x) => x.id === eid);
    if (!e || idx < 0 || idx >= e.attributes.length) return;
    // Aplicar inmediatamente para que el state refleje lo que ve el usuario.
    const before = { ...e.attributes[idx]! };
    e.attributes[idx] = { ...before, [field]: value };
    this.#commitAttributeEdit(eid, idx, field, value, before, { ...e.attributes[idx]! });
    // Sin re-render del diagrama: los textos del atributo los regenera el render
    // siguiente (#render() ya se llama tras los debounce). Para feedback inmediato
    // al usuario re-pintamos el atributo seleccionado en el SVG via updateComplete.
    this.#scheduleDebouncedRender();
  }

  /** Limpia timers anteriores y agenda uno nuevo. */
  #scheduleDebouncedRender(): void {
    if (this.#attrEditDebounce !== null) clearTimeout(this.#attrEditDebounce);
    this.#attrEditDebounce = window.setTimeout(() => {
      this.#render();
      this.#emitStateChange();
    }, 220);
  }

  /** Commit coalesced: si ya hay un commit pendiente para el mismo (eid,idx,field),
   *  acumula el cambio actualizando el `value` del entry sin tocar el inverse;
   *  si no, crea uno nuevo. */
  #commitAttributeEdit(
    eid: string,
    idx: number,
    field: 'name' | 'type',
    value: string,
    before: ErSpecAttribute,
    after: ErSpecAttribute,
  ): void {
    // Buscar el último commit pendiente para esta misma celda.
    const last = this.#past[this.#past.length - 1];
    const sig = `attr:${eid}:${idx}:${field}`;
    if (last && last.op === 'update_attr' && last.sig === sig) {
      // Actualizar el value del entry SIN perder el `before` original (eso es
      // lo que undo usa). Para redo, queremos que al pulsar redo después del
      // undo se aplique el ÚLTIMO valor escrito (no el primero).
      (last as { payload: { value: string } }).payload.value = value;
      return;
    }
    this.#past.push({
      op: 'update_attr',
      sig,
      payload: { eid, idx, field, value },
      inverse: () => {
        if (!this.#state) return;
        const en = this.#state.entities.find((x) => x.id === eid);
        if (!en || idx < 0 || idx >= en.attributes.length) return;
        en.attributes[idx] = { ...before };
      },
      redo: () => {
        if (!this.#state) return;
        const en = this.#state.entities.find((x) => x.id === eid);
        if (!en || idx < 0 || idx >= en.attributes.length) return;
        en.attributes[idx] = { ...after };
      },
    } as { op: string; sig?: string; payload: unknown; inverse: () => void; redo?: () => void });
    if (this.#past.length > HISTORY_LIMIT) this.#past.shift();
    this.#future = [];
  }
  #deleteSelection(): void {
    if (!this.#selection.size || !this.#state) return;
    const beforeEntities = cloneEntities(this.#state.entities);
    const beforeRelations = cloneRelations(this.#state.relations);
    const removedE: Array<{ e: ErSpecEntity; index: number }> = [];
    const removedR: Array<{ r: ErSpecRelation; index: number }> = [];
    for (const id of this.#selection) {
      const ei = this.#state.entities.findIndex((e) => e.id === id);
      if (ei >= 0) {
        const removedEntity = this.#state.entities[ei];
        if (removedEntity) removedE.push({ e: removedEntity, index: ei });
        this.#state.entities.splice(ei, 1);
        continue;
      }
      const ri = this.#state.relations.findIndex((r) => r.id === id);
      if (ri >= 0) {
        const removedRel = this.#state.relations[ri];
        if (removedRel) removedR.push({ r: removedRel, index: ri });
        this.#state.relations.splice(ri, 1);
      }
    }
    this.#selection = new Set();
    this.#commit(HISTORY_OP.REPLACE_ALL, { removedE, removedR }, () => {
      if (!this.#state) return;
      this.#state.entities = beforeEntities;
      this.#state.relations = beforeRelations;
    });
    this.#render();
    this.#emitStateChange();
  }
  #duplicateSelection(): void {
    if (!this.#state) return;
    const beforeEntities = cloneEntities(this.#state.entities);
    const beforeRelations = cloneRelations(this.#state.relations);
    const idMap = new Map<string, string>();
    for (const id of this.#selection) {
      const e = this.#state.entities.find((x) => x.id === id);
      if (e) {
        const newId = this.#uniqueEntityId();
        idMap.set(id, newId);
        const copy: ErSpecEntity = {
          ...e,
          id: newId,
          attributes: [...(e.attributes ?? [])] as ErSpecAttribute[],
        };
        if (Array.isArray(e.pos)) copy.pos = [e.pos[0] + 24, e.pos[1] + 24];
        this.#state.entities.push(copy);
      }
    }
    for (const id of this.#selection) {
      const r = this.#state.relations.find((x) => x.id === id);
      if (r) {
        const copy: ErSpecRelation = {
          ...r,
          id: this.#uniqueRelationId(),
          from: idMap.get(r.from) || r.from,
          to: idMap.get(r.to) || r.to,
        };
        this.#state.relations.push(copy);
      }
    }
    this.#commit(HISTORY_OP.REPLACE_ALL, {}, () => {
      if (!this.#state) return;
      this.#state.entities = beforeEntities;
      this.#state.relations = beforeRelations;
    });
    this.#render();
    this.#emitStateChange();
  }

  /* ───── Estilos ───── */

  #applyStyleToSelection(key: string, raw: string, type: string): void {
    if (!this.#state) return;
    const beforeEntities = cloneEntities(this.#state.entities);
    const beforeRelations = cloneRelations(this.#state.relations);

    let value: string | number | undefined = raw;
    if (type === 'number' || key === 'strokeWidth' || key === 'radius' || key === 'opacity' || key === 'width') {
      const n = Number(raw);
      value = Number.isFinite(n) ? n : undefined;
    }

    const apply = (obj: { style?: EdgeStyleOverride | Record<string, unknown> }): void => {
      const s = (obj.style ?? {}) as Record<string, unknown>;
      if (value == null || value === '') delete s[key];
      else s[key] = value;
      obj.style = s as EdgeStyleOverride;
    };

    for (const id of this.#selection) {
      const e = this.#state.entities.find((x) => x.id === id);
      if (e) apply(e);
      const r = this.#state.relations.find((x) => x.id === id);
      if (r) {
        if (key === 'route' || key === 'dashStyle' || key === 'variant' || key === 'width') {
          if (value == null || value === '') delete r[key as 'route'];
          else (r as unknown as Record<string, unknown>)[key] = value;
        } else apply(r);
      }
    }
    for (const e of this.#state.entities) {
      if (e.style && !Object.keys(e.style).length) delete e.style;
    }
    for (const r of this.#state.relations) {
      if (r.style && !Object.keys(r.style).length) delete r.style;
    }
    this.#commit(HISTORY_OP.REPLACE_ALL, {}, () => {
      if (!this.#state) return;
      this.#state.entities = beforeEntities;
      this.#state.relations = beforeRelations;
    });
    this.#render();
    this.#emitStateChange();
  }

  /* ───── Utils ───── */

  #uniqueEntityId(): string {
    if (!this.#state) return 'e1';
    let n = 1;
    const ids = new Set(this.#state.entities.map((e) => e.id));
    while (ids.has(`e${n}`)) n++;
    return `e${n}`;
  }
  #uniqueRelationId(): string {
    if (!this.#state) return 'r1';
    let n = 1;
    const ids = new Set(this.#state.relations.map((r) => r.id));
    while (ids.has(`r${n}`)) n++;
    return `r${n}`;
  }

  #copyToClipboard(text: string, mime: string): void {
    if (!text) return;
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      const blob = new Blob([text], { type: mime });
      navigator.clipboard.write([new ClipboardItem({ [mime]: blob })])
        .catch(() => navigator.clipboard.writeText(text));
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  }
  #downloadFile(text: string, mime: string, filename: string): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }
}

function snap8(v: number): number { return Math.round(v / 8) * 8; }
function cloneState(s: unknown): ErEditorState | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Partial<ErEditorState> & {
    entities?: unknown[];
    relations?: unknown[];
    meta?: Record<string, unknown>;
    groups?: unknown[];
    title?: string;
    subtitle?: string;
    direction?: ErEditorState['direction'];
    ratio?: number;
  };
  return {
    entities: cloneEntities((o.entities ?? []) as ErSpecEntity[]),
    relations: cloneRelations((o.relations ?? []) as ErSpecRelation[]),
    meta: { ...(o.meta ?? {}) },
    groups: (o.groups ?? []).map((g) => ({ ...(g as { id: string; name: string; hue?: number }) })),
    title: o.title,
    subtitle: o.subtitle,
    direction: o.direction,
    ratio: o.ratio,
  };
}
function cloneEntities(arr: ErSpecEntity[]): ErSpecEntity[] {
  return arr.map((e) => ({
    ...e,
    attributes: (e.attributes ?? []).map((a) => ({ ...a })),
    pos: Array.isArray(e.pos) ? [...e.pos] : undefined,
  }));
}
function cloneRelations(arr: ErSpecRelation[]): ErSpecRelation[] { return arr.map((r) => ({ ...r })); }

defineElement('is-er-editor', IsErEditor, 'IsErEditor');

export { IsErEditor };