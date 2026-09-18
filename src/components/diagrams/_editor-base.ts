/**
 * _editor-base.ts — Base abstracta para los 16 editores visuales de diagramas.
 *
 * Contrato canónico (ver handoff `editors-handoff-summary.md` §5):
 *   - `<is-X-editor>` extiende `<is-X-diagram>` (lite) y esta base.
 *   - Atributos observados: mode, allow-self-loop, max-depth (default 5).
 *   - Atributo `mode="view" | "edit"` (default "edit").
 *   - Emite `is-state-change` con payload `{ spec: Spec }` cuando el usuario
 *     modifica el spec. NO autosave.
 *   - Doble-click en nodo → `onNodeDoubleClick(nodeId)` (la subclase decide si
 *     abrir nesting modal o no, según `allowNesting`).
 *   - Cleanup de listeners/observers/timers en `disconnectedCallback`.
 *
 * La base SOLO define el contrato + slot para la toolbar + lifecycle.
 * Cada subclase implementa las acciones concretas (add/delete/connect/undo/
 * redo/zoom-in/zoom-out/fit) en base a su spec.
 *
 * Las 12 subclases con nesting (er, class, state, mindmap, org-chart, journey,
 * sankey, venn, gantt, quadrant, use-case, component) extienden esta base
 * directamente. Las 4 posicionales (flowchart, sequence, swimlane, timeline)
 * extienden esta base pero con `allowNesting = false`.
 *
 * UI shell (toolbar, panel, modal de nesting) se decide por convención:
 *   - Toolbar (canvas): se renderiza por `renderToolbarImpl()` cuando
 *     `mode === "edit"`.
 *   - Panel lateral: se renderiza por `renderPanelImpl()` cuando
 *     `mode === "edit"`.
 *   - Modal de nesting: se monta dinámicamente al hacer doble-click, hasta
 *     `max-depth` niveles. Respeta `prefers-reduced-motion`.
 *
 * Esta base NO depende de ningún componente concreto. Las imports de
 * `er-archify.ts`, `flowchart-spec.ts` etc. se hacen en cada editor.
 *
 * Notas de implementación:
 *   - No usa decorators (TypeScript legacy). Usar `static get observedAttributes()`.
 *   - El atributo `mode` es observado vía `attributeChangedCallback`.
 *   - El `state` event se dispara DESPUÉS de mutar `this.spec`/`this.layout`
 *     (los lightboxes están suscritos). NO usar before-undo/redo, ya que
 *     cambiarán el orden.
 *   - `cleanup()` debe llamarse al desmontar; las subclases con observers/
 *     timers DEBEN overridearlo.
 */

import { DiagramElementBase } from '../_shared/diagram-element-base.js';
import { emit } from '../../core/element.js';

/** Modo de operación del editor. 'edit' muestra toolbar + panel; 'view' los oculta. */
export type EditorMode = 'view' | 'edit';

/** Spec genérico de cualquier diagrama (placeholder). Las subclases lo estrechan. */
export interface EditorSpecLike {
  readonly nodes: readonly unknown[];
  readonly edges?: readonly unknown[];
}

/** Detalle del evento `is-state-change` emitido por todos los editores. */
export interface IsStateChangeDetail<Spec extends EditorSpecLike> {
  spec: Spec;
  /** Tag del editor que emitió (e.g. 'is-er-editor'). Útil para multi-edit. */
  tag?: string;
}

/** Constructor mínimo de un editor concreto. */
export interface IsEditorConstructor<Spec extends EditorSpecLike> {
  readonly observedAttributes: string[];
  new (...args: ConstructorParameters<typeof HTMLElement>): HTMLElement & {
    setAttribute(name: string, value: string): void;
    spec: Spec;
    /** Acción: añadir un nodo (la subclase decide el shape). */
    addNode(): void;
    /** Acción: borrar el nodo/arista seleccionado. */
    deleteSelected(): void;
    /** Acción: conectar dos nodos seleccionados. */
    connectSelected(): void;
    /** Acción: deshacer. La subclase mantiene su pila. */
    undo(): void;
    /** Acción: rehacer. La subclase mantiene su pila. */
    redo(): void;
    /** Acción: zoom in sobre el viewBox del SVG. */
    zoomIn(): void;
    /** Acción: zoom out. */
    zoomOut(): void;
    /** Acción: ajustar el viewBox al contenido. */
    fit(): void;
    /** Hook: doble-click en un nodo. */
    onNodeDoubleClick(nodeId: string): void;
  };
}

/** Helper opcional que se aplica a subclases para estrechar `spec`. */
export interface EditorSpecGet<Spec extends EditorSpecLike> {
  readonly spec: Spec;
}

const BASE_OBSERVED: readonly string[] = ['mode', 'allow-self-loop', 'max-depth'];

/**
 * IsEditorBase — base abstracta para `<is-X-editor>`.
 *
 * Las 16 subclases implementan acciones concretas (add/delete/connect/undo/
 * redo/zoom-in-out/fit/onNodeDoubleClick) y strechan el tipo de `spec`.
 *
 * Esta clase no se registra en `customElements` por sí sola; cada subclase
 * llama a `defineElement(tag, SubClass)` en su IIFE de registro.
 */
export abstract class IsEditorBase<Spec extends EditorSpecLike> extends DiagramElementBase {
  static get observedAttributes(): readonly string[] {
    return [...DiagramElementBase.observedAttributes, ...BASE_OBSERVED];
  }

  #mode: EditorMode = 'edit';
  #allowSelfLoop = false;
  #maxDepth = 5;
  #toolbarEl: HTMLElement | null = null;
  #panelEl: HTMLElement | null = null;

  /** Acceso de solo-lectura al modo. Las subclases pueden sobrescribirlo
   *  durante `attributeChangedCallback`, pero normalmente no hace falta. */
  get mode(): EditorMode { return this.#mode; }
  get allowSelfLoop(): boolean { return this.#allowSelfLoop; }
  get maxDepth(): number { return this.#maxDepth; }
  get toolbarEl(): HTMLElement | null { return this.#toolbarEl; }
  get panelEl(): HTMLElement | null { return this.#panelEl; }

  /** setMode (`view` o `edit`) — invocado por el motor de atributos.
   *  Dispara `renderEditorUI()` para (re)montar toolbar/panel. */
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (oldVal === newVal) return;
    if (name === 'mode') {
      this.#mode = (newVal === 'view' ? 'view' : 'edit') as EditorMode;
      this.renderEditorUI();
    } else if (name === 'allow-self-loop') {
      this.#allowSelfLoop = newVal != null && newVal !== 'false';
    } else if (name === 'max-depth') {
      const n = Number(newVal);
      if (Number.isFinite(n) && n > 0) this.#maxDepth = Math.min(n, 9);
    }
  }

  /** Renderiza (o quita) la toolbar + panel según `mode`.
   *  Las subclases DEBEN overridear y llamar a `super.renderEditorUI()` al inicio. */
  protected renderEditorUI(): void {
    // Limpiar UI previa (si mode cambiaba de edit→edit no hace nada).
    this.#toolbarEl?.remove();
    this.#panelEl?.remove();
    this.#toolbarEl = null;
    this.#panelEl = null;
    if (this.mode !== 'edit') return;
    if (!this.isConnected) return;
    this.#toolbarEl = this.renderToolbarImpl();
    this.#panelEl = this.renderPanelImpl();
    if (this.#toolbarEl) this.shadowRoot!.appendChild(this.#toolbarEl);
    if (this.#panelEl) this.shadowRoot!.appendChild(this.#panelEl);
  }

  /** Stub: la subclase debe devolver el elemento toolbar del editor. */
  protected renderToolbarImpl(): HTMLElement | null {
    throw new Error(`${this.constructor.name} debe implementar renderToolbarImpl()`);
  }

  /** Stub: la subclase debe devolver el elemento panel lateral del editor. */
  protected renderPanelImpl(): HTMLElement | null {
    throw new Error(`${this.constructor.name} debe implementar renderPanelImpl()`);
  }

  /** Stub: doble-click en nodo. La subclase decide si abrir nesting modal. */
  protected onNodeDoubleClick(_nodeId: string): void {
    // default: no-op (las subclases con nesting overridean)
  }

  /** Emite el evento `is-state-change` con el spec actual. La subclase lo llama
   *  tras CADA mutación lógica (add/delete/connect/undo/redo). */
  protected emitStateChange(spec: Spec): void {
    const detail: IsStateChangeDetail<Spec> = {
      spec,
      tag: (this.constructor as unknown as { tag?: string }).tag,
    };
    emit(this, 'is-state-change', detail);
  }

  /** Lifecycle: connectedCallback puede quedar en la subclase; aquí dejamos un
   *  hook `onEditorConnected` que se llama tras `onDiagramConnected`. */
  onDiagramConnected(): void {
    this.renderEditorUI();
    // Listeners de doble-click en la grilla SVG (delegación).
    const svg = this.svg;
    if (svg) svg.addEventListener('dblclick', this.#onSvgDblClick);
  }

  onDiagramDisconnected(): void {
    const svg = this.svg;
    if (svg) svg.removeEventListener('dblclick', this.#onSvgDblClick);
    this.#toolbarEl?.remove();
    this.#panelEl?.remove();
    this.#toolbarEl = null;
    this.#panelEl = null;
  }

  /** Wrapper de `onNodeDoubleClick`: si la subclase no hace nada, evento perdido. */
  #onSvgDblClick = (ev: Event): void => {
    const target = ev.target as Element | null;
    if (!target) return;
    const nodeEl = target.closest('[data-node-id]');
    if (!nodeEl) return;
    const id = nodeEl.getAttribute('data-node-id');
    if (id) this.onNodeDoubleClick(id);
  };

  /** Helper: respeto de `prefers-reduced-motion`. Las subclases lo consultan
   *  al programar animaciones de drill-down. */
  static prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
