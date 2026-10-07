// er-editor.ts: editor visual COMPLETO para <iswc-er-diagram>. Versión FULL del
// componente: state, undo/redo, multi-select, drag, click-to-connect, panel
// de estilos, exportación JSON/SVG.
//
// Comparte TODO el rendering con <iswc-er-diagram> (lite) por COMPOSICIÓN: el
// editor monta un <iswc-er-diagram> en su shadow DOM y le pasa el payload.
// Cualquier cambio en el componente (lite) se refleja aquí gratis.
//
// API pública:
//   <iswc-er-editor payload={...}></iswc-er-editor>
// Atributos: animation="trace"
// Eventos: iswc-state-change (detail: { entities, relations }), iswc-export-svg,
//          iswc-export-json
//
// Tests exhaustivos:
//   Playwright: smoke + funcional (drag, click-to-connect, undo/redo,
//     export JSON/SVG) + determinismo (round-trip idéntico).
//   Stagehand: validación visual (cajas no se solapan, aristas legibles).
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { serializeErPayload, renderErSvg as renderErSvgString } from './er-archify.js';
import type { ErEditorState, ErSpec, ErSpecAttribute, ErSpecEntity, ErSpecRelation, EdgeStyleOverride, ErRouteKind, ErDashStyle, EdgeVariant } from "./diagram-types.schemas.js";
import '../media/icon.js';
import '../actions/context-menu.js';
import '../layout/split-panel.js';
import { createPanZoom, type PanZoomController } from '../_shared/pan-zoom.js';

const SNAP = 8;
const HISTORY_LIMIT = 200;

const HISTORY_OP = {
  ADD_ENTITY: 'add_entity',
  ADD_RELATION: 'add_relation',
  UPDATE_ENTITY: 'update_entity',
  REPLACE_ALL: 'replace_all',
};

const EDITOR_TEMPLATE = `
<div class="stage">
  <iswc-split-panel orientation="horizontal" position="74" storage-key="iswc-er-editor-split">
    <div slot="start" class="pane-canvas">
      <div class="canvas" data-canvas>
        <div class="canvas-inner" data-canvas-inner></div>
        <div class="empty" aria-hidden="true">
          <div class="empty__card">
            <iswc-icon icon="mdi:table-plus"></iswc-icon>
            <strong>Lienzo vacío</strong>
            <span>Agrega una entidad o pega un JSON para empezar</span>
          </div>
        </div>
        <div class="toolbar" data-toolbar role="toolbar" aria-label="Herramientas del canvas">
          <div class="toolbar__group" role="group" aria-label="Modo">
            <button type="button" data-mode="edit" aria-pressed="true" title="Seleccionar y mover" aria-label="Modo editar">
              <iswc-icon icon="mdi:cursor-default-outline" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-mode="connect" title="Conectar entidades" aria-label="Modo conectar">
              <iswc-icon icon="mdi:vector-polyline" aria-hidden="true"></iswc-icon>
            </button>
          </div>
          <div class="toolbar__group" role="group" aria-label="Edición">
            <button type="button" data-action="add-entity" title="Agregar entidad" aria-label="Agregar entidad">
              <iswc-icon icon="mdi:table-plus" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="add-relation" title="Agregar relación" aria-label="Agregar relación">
              <iswc-icon icon="mdi:vector-link" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="duplicate" title="Duplicar selección" aria-label="Duplicar">
              <iswc-icon icon="mdi:content-copy" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="delete" title="Borrar selección (Supr)" aria-label="Borrar selección" class="danger">
              <iswc-icon icon="mdi:trash-can-outline" aria-hidden="true"></iswc-icon>
            </button>
          </div>
          <div class="toolbar__group" role="group" aria-label="Historial">
            <button type="button" data-action="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
              <iswc-icon icon="mdi:undo" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
              <iswc-icon icon="mdi:redo" aria-hidden="true"></iswc-icon>
            </button>
          </div>
          <div class="toolbar__group" role="group" aria-label="Zoom">
            <button type="button" data-action="zoom-out" title="Alejar" aria-label="Reducir zoom">
              <iswc-icon icon="mdi:magnify-minus-outline" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="zoom-reset" title="Restablecer zoom" aria-label="Restablecer zoom">
              <iswc-icon icon="mdi:fit-to-screen-outline" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="zoom-in" title="Acercar" aria-label="Aumentar zoom">
              <iswc-icon icon="mdi:magnify-plus-outline" aria-hidden="true"></iswc-icon>
            </button>
          </div>
          <div class="toolbar__group toolbar__group--end" role="group" aria-label="Exportar">
            <button type="button" data-action="copy-json" title="Copiar JSON" aria-label="Copiar JSON">
              <iswc-icon icon="mdi:code-json" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="download-json" title="Descargar JSON" aria-label="Descargar JSON">
              <iswc-icon icon="mdi:download" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="copy-svg" title="Copiar SVG" aria-label="Copiar SVG">
              <iswc-icon icon="mdi:svg" aria-hidden="true"></iswc-icon>
            </button>
            <button type="button" data-action="download-svg" title="Descargar SVG" aria-label="Descargar SVG">
              <iswc-icon icon="mdi:file-download-outline" aria-hidden="true"></iswc-icon>
            </button>
          </div>
        </div>
        <p class="hint">Rueda: desplazar · <kbd>Ctrl</kbd>+rueda: zoom · Arrastre: mover</p>
      </div>
    </div>
    <div slot="end" class="pane-side">
      <aside class="panel" data-panel aria-label="Panel de propiedades del diagrama ER">
        <h3 class="panel__head"><iswc-icon icon="mdi:tune-variant" aria-hidden="true"></iswc-icon>Propiedades</h3>
        <div class="selection-info" data-selection-info>Vacía</div>
        <fieldset data-attrs hidden>
          <legend><iswc-icon icon="mdi:format-list-bulleted" aria-hidden="true"></iswc-icon>Atributos</legend>
          <div data-attr-list></div>
          <button type="button" data-action="add-attr" title="Agregar atributo" aria-label="Agregar atributo" class="icon-wide">
            <iswc-icon icon="mdi:plus" aria-hidden="true"></iswc-icon>Agregar atributo
          </button>
        </fieldset>
        <fieldset data-styles>
          <legend><iswc-icon icon="mdi:palette-outline" aria-hidden="true"></iswc-icon>Estilo</legend>
          <label><span>Relleno</span><input type="color" data-style="fill" title="Relleno"></label>
          <label><span>Borde</span><input type="color" data-style="stroke" title="Borde"></label>
          <label><span>Grosor del borde</span><input type="number" step="0.1" min="0" max="10" placeholder="auto" data-style="strokeWidth"></label>
          <label><span>Radio</span><input type="number" step="1" min="0" max="32" placeholder="auto" data-style="radius"></label>
          <label><span>Opacidad</span><input type="number" step="0.05" min="0" max="1" placeholder="1" data-style="opacity"></label>
        </fieldset>
        <fieldset data-edge-styles>
          <legend><iswc-icon icon="mdi:vector-line" aria-hidden="true"></iswc-icon>Aristas</legend>
          <label><span>Ruta</span>
            <select data-style="route">
              <option value="orthogonal">Ortogonal</option>
              <option value="straight">Recta</option>
              <option value="orthogonal-h">Ortogonal horizontal</option>
              <option value="orthogonal-v">Ortogonal vertical</option>
            </select>
          </label>
          <label><span>Trazo</span>
            <select data-style="dashStyle">
              <option value="solid">Continuo</option>
              <option value="dashed">Discontinuo</option>
              <option value="dotted">Punteado</option>
            </select>
          </label>
          <label><span>Variante</span>
            <select data-style="variant">
              <option value="default">Normal</option>
              <option value="emphasis">Énfasis</option>
              <option value="security">Seguridad</option>
              <option value="dashed">Discontinua</option>
            </select>
          </label>
          <label><span>Ancho</span><input type="number" step="0.1" min="0.2" max="8" placeholder="auto" data-style="width"></label>
        </fieldset>
      </aside>
    </div>
  </iswc-split-panel>
  <iswc-context-menu data-entity-menu scroll-lock>
    <button type="button" class="item" data-value="rename">Renombrar…</button>
    <button type="button" class="item" data-value="duplicate">Duplicar</button>
    <button type="button" class="item" data-value="connect">Conectar desde aquí</button>
    <hr />
    <button type="button" class="item" data-value="delete">Eliminar</button>
  </iswc-context-menu>
</div>
`;

class IswcErEditor extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['animation', 'theme'];
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
  #ctxEntityId: string | null = null;
  #pz: PanZoomController | null = null;

  constructor() {
    super();
    const sr = this.attachShadow({ mode: 'open' });
    const tmpl = document.createElement('div');
    tmpl.innerHTML = EDITOR_TEMPLATE;
    while (tmpl.firstChild) sr.appendChild(tmpl.firstChild);
    adoptCss(sr, import.meta.url);
    this.#installListeners();
  }

  connectedCallback() {
    this.#ensureDiagram();
    this.#ensurePanZoom();
    this.#installHotkeys();
    if (!this.#state) this.#state = this.#readJsonSlot() ?? cloneState({ entities: [], relations: [] });
    this.#render();
  }

  /** JSON declarativo del light DOM, el mismo contrato que el visor. */
  #readJsonSlot(): ErEditorState | null {
    const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLScriptElement).type || ''));
    if (!script?.textContent?.trim()) return null;
    try { return cloneState(JSON.parse(script.textContent)); } catch { return null; }
  }
  disconnectedCallback() {
    this.#uninstallHotkeys();
    this.#pz?.destroy();
    this.#pz = null;
    if (this.#attrEditDebounce !== null) clearTimeout(this.#attrEditDebounce);
    this.#attrEditDebounce = null;
  }
  attributeChangedCallback(name: string): void {
    if (!this.#diagram) return;
    if (name === 'animation') {
      this.#diagram.setAttribute('animation', this.getAttribute('animation') ?? '');
      this.#render();
    }
    if (name === 'theme') {
      const t = this.getAttribute('theme');
      if (t == null || t === '') this.#diagram.removeAttribute('theme');
      else this.#diagram.setAttribute('theme', t);
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
    const diagram = document.createElement('iswc-er-diagram') as unknown as HTMLElement & { payload: unknown; svg: SVGElement };
    diagram.setAttribute('animation', this.getAttribute('animation') ?? '');
    const theme = this.getAttribute('theme');
    if (theme) diagram.setAttribute('theme', theme);
    diagram.addEventListener('iswc-render', this.#onDiagramRender as EventListener);
    host.appendChild(diagram);
    this.#diagram = diagram;
  }

  #ensurePanZoom(): void {
    if (this.#pz || !this.shadowRoot) return;
    const canvas = this.shadowRoot.querySelector<HTMLElement>('[data-canvas]');
    const inner = this.shadowRoot.querySelector<HTMLElement>('[data-canvas-inner]');
    if (!canvas || !inner) return;
    this.#pz = createPanZoom(canvas, inner);
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
    if (this.#diagram) {
      const theme = this.getAttribute('theme') || this.#state.theme;
      if (theme) this.#diagram.setAttribute('theme', theme);
      else this.#diagram.removeAttribute('theme');
      this.#diagram.payload = this.#state;
    }
    this.shadowRoot!.querySelector('[data-canvas]')?.toggleAttribute('data-empty', this.#state.entities.length === 0);
    this.#updatePanel();
    this.#syncJsonReadout();
  }

  #updatePanel(): void {
    const info = this.shadowRoot!.querySelector('[data-selection-info]');
    const attrsFieldset = this.shadowRoot!.querySelector('[data-attrs]') as HTMLElement | null;
    if (!info) return;
    if (!this.#selection.size || !this.#state) {
      info.textContent = 'Vacía · haz clic en una entidad o una arista.';
      info.removeAttribute('data-has-selection');
      attrsFieldset?.setAttribute('hidden', '');
      this.#syncStyleInputs();
      return;
    }
    info.setAttribute('data-has-selection', '');
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
    this.#syncStyleInputs();
  }

  /**
   * Los controles de estilo muestran el valor del primer seleccionado (o
   * quedan en «auto» si no hay override) y se deshabilitan cuando no hay
   * nada a lo que aplicarse: «Aristas» solo con relaciones seleccionadas.
   */
  #syncStyleInputs(): void {
    const sr = this.shadowRoot!;
    const estilos = sr.querySelector<HTMLFieldSetElement>('[data-styles]');
    const aristas = sr.querySelector<HTMLFieldSetElement>('[data-edge-styles]');
    if (!estilos || !aristas) return;
    const ids = [...this.#selection];
    const ents = ids.map((id) => this.#state?.entities.find((e) => e.id === id)).filter((e): e is ErSpecEntity => Boolean(e));
    const rels = ids.map((id) => this.#state?.relations.find((r) => r.id === id)).filter((r): r is ErSpecRelation => Boolean(r));
    estilos.disabled = ents.length + rels.length === 0;
    aristas.disabled = rels.length === 0;

    const set = (key: string, v: unknown, fallback = ''): void => {
      const el = sr.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-style="${key}"]`);
      if (!el) return;
      const label = el.closest('label');
      const vacio = v == null || v === '';
      label?.toggleAttribute('data-unset', vacio);
      if (el instanceof HTMLInputElement && el.type === 'color') {
        el.value = typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
        return;
      }
      el.value = vacio ? fallback : String(v);
    };
    const nodo = ents[0]?.style;
    const rel = rels[0];
    const base = nodo ?? rel?.style;
    set('fill', nodo?.fill, '#1e3a5f');
    set('stroke', nodo?.stroke, '#60a5fa');
    set('strokeWidth', nodo?.strokeWidth);
    set('radius', nodo?.radius);
    set('opacity', nodo?.opacity);
    set('route', rel?.route, 'orthogonal');
    set('dashStyle', rel?.dashStyle, 'solid');
    set('variant', rel?.variant, 'default');
    set('width', rel?.width ?? base?.width);
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
    emit(this, 'iswc-state-change', { entities: this.#state?.entities, relations: this.#state?.relations });
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
    this.shadowRoot!.addEventListener('iswc-select', (e: Event) => {
      const ce = e as CustomEvent<{ value?: string }>;
      const value = ce.detail?.value;
      const entityId = this.#ctxEntityId;
      if (!value || !entityId || !this.#state) return;
      this.#selection = new Set([entityId]);
      if (value === 'delete') this.#handleAction('delete', e);
      else if (value === 'duplicate') this.#handleAction('duplicate', e);
      else if (value === 'connect') {
        this.#setMode('connect');
        this.#pendingConnection = { fromId: entityId };
      } else if (value === 'rename') {
        const ent = this.#state.entities.find((x) => x.id === entityId);
        if (!ent) return;
        const next = window.prompt('Nombre de la entidad', ent.name);
        if (next == null || !next.trim() || next === ent.name) return;
        const before = ent.name;
        ent.name = next.trim();
        this.#commit(HISTORY_OP.UPDATE_ENTITY, { id: entityId, before }, () => {
          const ee = this.#state?.entities.find((x) => x.id === entityId);
          if (ee) ee.name = before;
        });
        this.#render();
        this.#emitStateChange();
      }
      this.#ctxEntityId = null;
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
      case 'zoom-in': this.#pz?.zoomBy(1.2); break;
      case 'zoom-out': this.#pz?.zoomBy(1 / 1.2); break;
      case 'zoom-reset': this.#pz?.reset(); break;
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

  #entityMenu(): (HTMLElement & { openAt(x: number, y: number): void }) | null {
    return this.shadowRoot!.querySelector('[data-entity-menu]') as
      (HTMLElement & { openAt(x: number, y: number): void }) | null;
  }

  #bindEntity(g: SVGGElement): void {
    const id = g.dataset.entityId;
    if (!id || g.dataset.editorBound) return;
    g.dataset.editorBound = '1';
    g.style.cursor = 'grab';

    g.addEventListener('contextmenu', (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.#selection = new Set([id]);
      this.#ctxEntityId = id;
      this.#updatePanel();
      this.#entityMenu()?.openAt(ev.clientX, ev.clientY);
    });

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
        const scale = this.#pz?.view.scale || 1;
        const dx = (mv.clientX - startX) / scale;
        const dy = (mv.clientY - startY) / scale;
        if (Math.abs(dx) + Math.abs(dy) > 2 / scale) moved = true;
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

    g.addEventListener('dblclick', (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.#state) return;
      const path = ev.composedPath() as Element[];
      const textEl = path.find((n) => n instanceof SVGTextElement) as SVGTextElement | undefined;
      if (!textEl) return;

      // Atributo (nombre / tipo)
      const attrField = textEl.dataset.attrField as 'name' | 'type' | undefined;
      if (attrField != null && textEl.dataset.attrIndex != null) {
        const idx = Number(textEl.dataset.attrIndex);
        const entity = this.#state.entities.find((x) => x.id === id);
        const attr = entity?.attributes?.[idx];
        if (!entity || !attr) return;
        this.#inlineEditText(textEl, (next) => {
          if (!this.#state) return;
          const e = this.#state.entities.find((x) => x.id === id);
          const a = e?.attributes?.[idx];
          if (!a) return;
          const before = { ...a };
          if (attrField === 'name') a.name = next || a.name;
          else a.type = next;
          this.#commit(HISTORY_OP.UPDATE_ENTITY, { id, attrIndex: idx, before }, () => {
            const ee = this.#state?.entities.find((x) => x.id === id);
            const aa = ee?.attributes?.[idx];
            if (aa) {
              aa.name = before.name;
              aa.type = before.type;
            }
          });
        });
        return;
      }

      // Nombre de entidad (clase er-entity__name o primer text del grupo)
      const isName = textEl.classList.contains('er-entity__name')
        || textEl.closest?.('.er-entity__name')
        || path.some((n) => (n as Element).classList?.contains('er-entity__name'));
      if (!isName && textEl.dataset.attrField) return;

      this.#inlineEditText(textEl, (newName: string) => {
        if (!this.#state || !newName) return;
        const e = this.#state.entities.find((x) => x.id === id);
        if (!e || e.name === newName) return;
        const before = e.name;
        e.name = newName;
        this.#commit(HISTORY_OP.UPDATE_ENTITY, { id, before }, () => {
          if (!this.#state) return;
          const ee = this.#state.entities.find((x) => x.id === id);
          if (ee) ee.name = before;
        });
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
    g.addEventListener('dblclick', (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.#state) return;
      const path = ev.composedPath() as Element[];
      const textEl = path.find((n) => n instanceof SVGTextElement) as SVGTextElement | undefined;
      if (!textEl) return;
      const rel = this.#state.relations.find((r) => r.id === id);
      if (!rel) return;
      this.#inlineEditText(textEl, (next) => {
        if (!this.#state) return;
        const r = this.#state.relations.find((x) => x.id === id);
        if (!r) return;
        const before = r.label;
        r.label = next || undefined;
        this.#commit(HISTORY_OP.UPDATE_ENTITY, { id, before }, () => {
          const rr = this.#state?.relations.find((x) => x.id === id);
          if (rr) rr.label = before;
        });
      });
    });
  }

  #inlineEditText(textNode: SVGTextElement, onSave: (newName: string) => void): void {
    const r = textNode.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = (textNode.textContent ?? '').trim();
    const w = Math.max(48, r.width + 12);
    const h = Math.max(18, r.height + 4);
    input.style.cssText = [
      'position:fixed',
      `left:${r.left}px`,
      `top:${r.top - 2}px`,
      `width:${w}px`,
      `height:${h}px`,
      'font:12px var(--iswc-ui, ui-sans-serif, system-ui, sans-serif)',
      'color:var(--iswc-text, #e2e8f0)',
      'background:var(--iswc-bg-elev, #131a24)',
      'border:1px solid var(--iswc-accent, #2563eb)',
      'border-radius:4px',
      'z-index:10000',
      'padding:0 6px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
    ].join(';');
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

/** Acepta payload plano o envuelto `{ erDiagram | er: {...} }`. */
function unwrapErSource(s: unknown): Record<string, unknown> | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Record<string, unknown>;
  const inner = o.erDiagram ?? o.er;
  if (inner && typeof inner === 'object') {
    const nest = inner as Record<string, unknown>;
    return {
      ...nest,
      theme: nest.theme ?? o.theme,
    };
  }
  return o;
}

function cloneState(s: unknown): ErEditorState | null {
  const o = unwrapErSource(s);
  if (!o) return null;
  return {
    entities: cloneEntities((o.entities ?? []) as ErSpecEntity[]),
    relations: cloneRelations((o.relations ?? []) as ErSpecRelation[]),
    meta: { ...((o.meta as Record<string, unknown>) ?? {}) },
    groups: ((o.groups ?? []) as Array<{ id: string; name: string; hue?: number }>).map((g) => ({ ...g })),
    title: typeof o.title === 'string' ? o.title : undefined,
    subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
    direction: o.direction as ErEditorState['direction'],
    ratio: typeof o.ratio === 'number' ? o.ratio : undefined,
    theme: typeof o.theme === 'string' ? o.theme : undefined,
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

defineElement('iswc-er-editor', IswcErEditor, 'IswcErEditor');

export { IswcErEditor };