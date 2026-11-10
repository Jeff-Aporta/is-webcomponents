// @contexto INDICE.md · src/components/data/README.md
/**
 * ui/barra-lateral — Side Bar: pestanas, panel abierto, posicion, ancho y su api.
 */
import { normalizarSideBar } from './filtros-resumen.js';
import { TEXTOS } from './filtros-textos.js';
import { crear, icono } from './filtros-ui-controles.js';
import { PanelColumnas } from './filtros-ui-panel-columnas.js';
import { PanelFiltros } from './filtros-ui-panel-filtros.js';
import type { InstanciaPanel, PanelLateralDef, PanelMontado, SideBarDef } from './filtros.schemas.js';
import type { MotorFiltros } from './filtros-motor.js';
import type { GridHost, PanelLateral } from './contrato.schemas.js';

const ANCHO_DEFECTO = 200;
const ANCHO_MINIMO = 100;

export class BarraLateral {
  #motor: MotorFiltros;
  #grid: GridHost;
  #raiz = crear('aside', 'iswc-ag-lateral');
  #contenido = crear('div', 'iswc-ag-lateral__contenido');
  #pestanas = crear('div', 'iswc-ag-lateral__pestanas');
  #asa = crear('div', 'iswc-ag-lateral__asa');
  #def: SideBarDef | null = null;
  #montados = new Map<string, PanelMontado>();
  #abierto: string | null = null;
  #visible = false;
  #ancho = ANCHO_DEFECTO;
  #propios = new Map<string, PanelLateral>();

  constructor(motor: MotorFiltros) {
    this.#motor = motor;
    this.#grid = motor.grid;
    this.#pestanas.setAttribute('role', 'tablist');
    this.#pestanas.setAttribute('aria-orientation', 'vertical');
    this.#asa.setAttribute('role', 'separator');
    this.#asa.setAttribute('aria-orientation', 'vertical');
    this.#asa.addEventListener('pointerdown', (e) => this.#redimensionar(e));
    this.#raiz.append(this.#asa, this.#contenido, this.#pestanas);
  }

  /** Panel aportado por otra parcela o por la app; aparece si sideBar lo nombra. */
  registrar(p: PanelLateral): void {
    this.#propios.set(p.id, p);
  }

  #instancia(def: PanelLateralDef): InstanciaPanel | null {
    const params = def.toolPanelParams ?? {};
    const propio = this.#propios.get(def.id);
    if (propio) return { el: propio.crear(this.#grid) };
    if (def.toolPanel === 'agColumnsToolPanel') return new PanelColumnas(this.#grid, params);
    if (def.toolPanel === 'agFiltersToolPanel' || def.toolPanel === 'agNewFiltersToolPanel') return new PanelFiltros(this.#motor, params);
    if (typeof def.toolPanel === 'function') return this.#instanciaPropia(def.toolPanel as (p: Record<string, unknown>) => unknown, params);
    return null;
  }

  /** toolPanel propio: funcion que devuelve un elemento o clase con getGui(). */
  #instanciaPropia(fn: (p: Record<string, unknown>) => unknown, params: Record<string, unknown>): InstanciaPanel {
    const ctx = { ...params, api: (this.#grid.el as HTMLElement & { api?: unknown }).api };
    const esClase = /^class\s/.test(Function.prototype.toString.call(fn));
    const creado = esClase ? new (fn as unknown as new () => { init?: (p: unknown) => void; getGui: () => HTMLElement; refresh?: () => void })() : fn(ctx);
    if (creado instanceof HTMLElement) return { el: creado };
    const inst = creado as { init?: (p: unknown) => void; getGui?: () => HTMLElement; refresh?: () => void };
    inst.init?.(ctx);
    return { el: inst.getGui?.() ?? crear('div'), refrescar: () => inst.refresh?.() };
  }

  /** Aplica la opcion sideBar. Cada cambio de opcion rearma paneles y pestanas. */
  configurar(valor: unknown): void {
    this.#def = normalizarSideBar(valor);
    this.#montados.clear();
    this.#contenido.replaceChildren();
    this.#pestanas.replaceChildren();
    this.#abierto = null;
    if (!this.#def) {
      this.#raiz.remove();
      this.#visible = false;
      return;
    }
    this.#grid.shadow.querySelector<HTMLElement>('.mim-dg__sidebar')?.setAttribute('hidden', '');
    const zona = this.#grid.zona('principal');
    if (this.#raiz.parentElement !== zona) zona.append(this.#raiz);
    for (const def of this.#def.toolPanels) this.#montar(def);
    this.#pestanas.hidden = this.#def.hideButtons;
    this.setSideBarPosition(this.#def.position);
    this.#visible = !this.#def.hiddenByDefault;
    this.#raiz.hidden = !this.#visible;
    if (this.#def.defaultToolPanel && this.#visible) this.openToolPanel(this.#def.defaultToolPanel);
  }

  #montar(def: PanelLateralDef): void {
    const instancia = this.#instancia(def);
    if (!instancia) return;
    instancia.el.hidden = true;
    instancia.el.id = `iswc-ag-panel-${def.id}`;
    instancia.el.setAttribute('role', 'tabpanel');
    this.#contenido.append(instancia.el);
    const pestana = this.#pestana(def);
    this.#pestanas.append(pestana);
    this.#montados.set(def.id, { def, instancia, pestana });
  }

  #pestana(def: PanelLateralDef): HTMLElement {
    const b = crear('button', 'iswc-ag-lateral__pestana');
    const texto = this.#grid.texto(def.labelKey ?? def.id, def.labelDefault ?? TEXTOS[def.labelKey ?? ''] ?? def.id);
    b.setAttribute('type', 'button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', 'false');
    b.setAttribute('aria-controls', `iswc-ag-panel-${def.id}`);
    b.title = texto;
    b.append(icono(def.iconKey ?? 'mdi:tune-variant'), crear('span', '', texto));
    b.addEventListener('click', () => {
      if (this.#abierto === def.id) this.closeToolPanel();
      else this.openToolPanel(def.id);
    });
    return b;
  }

  #emitirVisible(id: string, visible: boolean, origen: string): void {
    this.#grid.emitir('toolPanelVisibleChanged', { source: origen, key: id, visible, switchingToolPanel: false });
  }

  #aplicarAncho(m: PanelMontado): void {
    const def = m.def;
    const ancho = Math.min(def.maxWidth ?? Number.POSITIVE_INFINITY, Math.max(def.minWidth ?? ANCHO_MINIMO, this.#ancho));
    this.#ancho = ancho;
    this.#contenido.style.inlineSize = this.#grid.em(ancho);
  }

  /* ── api ────────────────────────────────────────────────────────────── */

  isSideBarVisible(): boolean { return this.#visible; }

  setSideBarVisible(v: boolean): void {
    this.#visible = v;
    this.#raiz.hidden = !v;
  }

  setSideBarPosition(p: 'left' | 'right'): void {
    this.#raiz.classList.toggle('iswc-ag-lateral--izquierda', p === 'left');
    if (this.#def) this.#def.position = p;
  }

  openToolPanel(id: string, origen = 'api'): void {
    if (!this.#def) this.configurar(true);
    const m = this.#montados.get(id);
    if (!m) return;
    if (this.#abierto) this.closeToolPanel(origen);
    if (!this.#visible) this.setSideBarVisible(true);
    this.#abierto = id;
    if (typeof m.def.width === 'number') this.#ancho = m.def.width;
    this.#aplicarAncho(m);
    m.instancia.el.hidden = false;
    m.pestana?.setAttribute('aria-selected', 'true');
    this.#raiz.classList.add('iswc-ag-lateral--abierta');
    m.instancia.refrescar?.();
    this.#propios.get(id)?.alMostrar?.();
    this.#emitirVisible(id, true, origen);
  }

  closeToolPanel(origen = 'api'): void {
    const id = this.#abierto;
    if (!id) return;
    const m = this.#montados.get(id) as PanelMontado;
    this.#abierto = null;
    m.instancia.el.hidden = true;
    m.pestana?.setAttribute('aria-selected', 'false');
    this.#raiz.classList.remove('iswc-ag-lateral--abierta');
    this.#emitirVisible(id, false, origen);
  }

  getOpenedToolPanel(): string | null { return this.#abierto; }

  isToolPanelShowing(): boolean { return this.#abierto !== null; }

  getSideBar(): SideBarDef | null { return this.#def; }

  getToolPanelInstance(id: string): unknown {
    return this.#montados.get(id)?.instancia ?? null;
  }

  /** Sin colIds refresca solo el panel abierto; con colIds, los filtros que cambiaron. */
  refreshToolPanel(colIds?: string[]): void {
    for (const m of this.#montados.values()) {
      if (colIds || m.def.id === this.#abierto) m.instancia.refrescar?.(colIds);
    }
  }

  /** Arrastrar el borde: el ancho se guarda en unidades logicas. */
  #redimensionar(e: PointerEvent): void {
    const id = this.#abierto;
    if (!id) return;
    e.preventDefault();
    const m = this.#montados.get(id) as PanelMontado;
    const izquierda = this.#def?.position === 'left';
    const x0 = e.clientX;
    const anchoCss = this.#contenido.getBoundingClientRect().width;
    const porUnidad = anchoCss / this.#ancho;
    const mover = (ev: PointerEvent): void => {
      const delta = (ev.clientX - x0) / porUnidad;
      this.#ancho = Math.round((anchoCss / porUnidad) + (izquierda ? delta : -delta));
      this.#aplicarAncho(m);
    };
    const soltar = (): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      this.#grid.emitir('toolPanelSizeChanged', { started: false, ended: true, width: this.#ancho });
    };
    this.#grid.emitir('toolPanelSizeChanged', { started: true, ended: false, width: this.#ancho });
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  destruir(): void {
    this.#raiz.remove();
  }
}
