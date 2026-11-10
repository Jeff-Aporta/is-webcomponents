// @contexto INDICE.md · src/components/layout/preview-controls.md
/**
 * <iswc-preview-controls> — panel de knobs del playground (galería).
 * Card + grid responsive (auto-fit ≥18.75em), label encima, widgets iswc-*.
 * Alturas en em vía font-size del :host → --iswc-control-height del kit.
 *
 * Spec JSON → `spec`. Emite `iswc-controls-change` ({ def, valor }).
 * Solo knobs (attrs). Sin tabs ni anatomía Code (descartado).
 *
 * Phase W36: cada `.fila` lleva botón info (ⓘ) con popover JSDoc del attr.
 * Phase W39: auto-orden text → number → select → otros → switch al final.
 *
 * Atributos:
 *   label   string — header del panel (default: "Atributos").
 */
import type { OpcionPanel, PanelInfo, ControlPanel } from "./schemas/preview-controls.schemas.js";
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * Información JSDoc-style del atributo, mostrada en el popover del botón
 * info (Phase W36). Todos los campos son opcionales: cuando faltan, el
 * popover deriva lo que puede del propio control (tipo, default, options).
 */

function escProp(prop: string): string {
  return String(prop).replace(/[\\"]/g, '\\$&');
}

function attrDeProp(prop: string): string {
  if (prop.startsWith('attr:')) return prop.slice(5);
  if (prop.startsWith('prop:')) return prop.slice(5);
  return prop;
}

/** Resuelve el .fila ancestro del botón info (Phase W36). */
function filaDeBtn(btn: HTMLElement): HTMLElement | null {
  return btn.closest<HTMLElement>('[data-control-prop]');
}

/** Devuelve un <dt> con texto plano para los <dl> del popover info. */
function dt(texto: string): HTMLElement {
  const t = document.createElement('dt');
  t.textContent = texto;
  return t;
}

/**
 * Mapea el `control` del panel a un tipo lógico legible en el popover info
 * (Phase W36). Si el JSON trae `info.type`, tiene prioridad.
 */
function inferControlType(c: ControlPanel): string {
  switch (c.control) {
    case 'boolean': return 'boolean';
    case 'number':
    case 'range':  return 'number';
    case 'color':  return 'color';
    case 'select': return 'enum';
    case 'json':   return 'object';
    case 'text':
    default:       return 'string';
  }
}

/** Iconos por valor (mapa local: el espejo Paty no tiene utils/ del kit). */
const SELECT_ICONS: Record<string, string> = {
  brand: 'mdi:palette', neutral: 'mdi:circle-outline',
  success: 'mdi:check-circle-outline', warning: 'mdi:alert-outline',
  danger: 'mdi:alert-circle-outline', info: 'mdi:information-outline',
  error: 'mdi:close-circle-outline',
  filled: 'mdi:square', outlined: 'mdi:square-outline', plain: 'mdi:format-text',
  ghost: 'mdi:ghost-outline', soft: 'mdi:blur', text: 'mdi:format-letter-case',
  accent: 'mdi:flare', 'filled-outlined': 'mdi:checkbox-blank-badge-outline',
  none: 'mdi:cancel', round: 'mdi:rounded-corner', square: 'mdi:square-outline',
  rect: 'mdi:rectangle-outline', pill: 'mdi:capsule',
  circle: 'mdi:circle-outline', rounded: 'mdi:rounded-corner',
  top: 'mdi:arrow-collapse-up', bottom: 'mdi:arrow-collapse-down',
  start: 'mdi:arrow-collapse-left', end: 'mdi:arrow-collapse-right',
  left: 'mdi:arrow-left', right: 'mdi:arrow-right',
  'top-start': 'mdi:arrow-top-left', 'top-end': 'mdi:arrow-top-right',
  'bottom-start': 'mdi:arrow-bottom-left', 'bottom-end': 'mdi:arrow-bottom-right',
  center: 'mdi:image-filter-center-focus',
  horizontal: 'mdi:arrow-left-right', vertical: 'mdi:arrow-up-down',
  button: 'mdi:button-cursor', submit: 'mdi:send', reset: 'mdi:backup-restore',
  auto: 'mdi:auto-fix', manual: 'mdi:hand-back-right-outline',
  single: 'mdi:numeric-1-circle-outline', multiple: 'mdi:checkbox-multiple-marked-outline',
  lazy: 'mdi:timer-sand', eager: 'mdi:lightning-bolt',
  contain: 'mdi:fit-to-page-outline', cover: 'mdi:overscan',
  dark: 'mdi:weather-night', light: 'mdi:white-balance-sunny',
  underlined: 'mdi:format-underline', tags: 'mdi:tag-multiple-outline', count: 'mdi:counter',
  line: 'mdi:chart-line', bar: 'mdi:chart-bar', pie: 'mdi:chart-pie',
  doughnut: 'mdi:chart-donut', area: 'mdi:chart-areaspline', scatter: 'mdi:chart-scatter-plot',
  radar: 'mdi:radar', small: 'mdi:size-s', medium: 'mdi:size-m', large: 'mdi:size-l',
  pulse: 'mdi:pulse', wave: 'mdi:wave',
  number: 'mdi:numeric', date: 'mdi:calendar', time: 'mdi:clock-outline',
  datetime: 'mdi:calendar-clock', email: 'mdi:email-outline', password: 'mdi:lock-outline',
  search: 'mdi:magnify', tel: 'mdi:phone-outline', url: 'mdi:link-variant', file: 'mdi:file-outline',
  inline: 'mdi:format-horizontal-align-center', fixed: 'mdi:pin',
  'top-left': 'mdi:arrow-top-left', 'top-right': 'mdi:arrow-top-right',
  'bottom-left': 'mdi:arrow-bottom-left', 'bottom-right': 'mdi:arrow-bottom-right',
};

function iconForOption(attr: string, value: unknown): string | undefined {
  const key = String(value ?? '');
  if (attr === 'color' && key === 'text') return 'mdi:format-color-text';
  return SELECT_ICONS[key] || undefined;
}

/** Defaults kit cuando el JSON/CE no traen `default` (espejo del mapa de controles). */
const DEFAULT_BY_ATTR: Record<string, string> = {
  color: 'brand',
  variant: 'filled',
  shape: 'round',
  type: 'button',
  placement: 'top',
  orientation: 'horizontal',
  position: 'bottom-right',
  loading: 'eager',
  fit: 'contain',
};

/** Completa iconos + default de opciones select si el JSON no los trae.
 *  Acepta options como string[] (JSON de demos) u objetos {value,label,icon}.
 *  Customs (hex/rgb/hsl) siempre al final. */
function enriquecerControl(c: ControlPanel): ControlPanel {
  const copy: ControlPanel = { ...c };
  if (c.control !== 'select' || !Array.isArray(c.options)) return copy;
  const attr = attrDeProp(c.prop);
  const mapped = c.options.map((op): OpcionPanel => {
    const base: OpcionPanel = typeof op === 'string'
      ? { value: op, label: op }
      : {
        value: op.value,
        label: op.label ?? String(op.value ?? ''),
        icon: op.icon,
        html: op.html,
        description: op.description,
        placeholder: op.placeholder,
      };
    if (base.icon) return base;
    const icon = iconForOption(attr, base.value);
    return icon ? { ...base, icon } : base;
  });
  // Semánticos primero; custom CSS (hex/rgb/…) al final.
  copy.options = [
    ...mapped.filter((o) => !esColorCustom(o.value)),
    ...mapped.filter((o) => esColorCustom(o.value)),
  ];
  if (copy.default === undefined || copy.default === null || copy.default === '') {
    const vals = copy.options.map((o) => String(o.value));
    // Avatar/media: circle; botón: round (si está en la lista).
    if (attr === 'shape') {
      if (vals.includes('circle')) copy.default = 'circle';
      else if (vals.includes('round')) copy.default = 'round';
    } else {
      const known = DEFAULT_BY_ATTR[attr];
      if (known && vals.includes(known)) copy.default = known;
    }
  }
  return copy;
}

/** Valor CSS literal (no intent semántico del kit). */
function esColorCustom(value: unknown): boolean {
  const s = String(value ?? '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)
    || /^(rgb|rgba|hsl|hsla)\(/i.test(s);
}

/** Título / aria de un knob (label del control). */
function tituloKnob(c: ControlPanel): string {
  return String(c.label || attrDeProp(c.prop) || 'control').trim();
}

/** Aplica title + aria-label a un accionable del panel. */
function conTitulo(el: HTMLElement, titulo: string): HTMLElement {
  el.title = titulo;
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', titulo);
  return el;
}

/**
 * Phase W39 (2026-10-03-zod-migration): orden canónico de los controles en el
 * render del panel — `text` → `number` (`range` cuenta como number) →
 * `select` → otros (`color`, `json`) → `boolean` (switch, AL FINAL).
 * El sort es estable (Array#sort en motores modernos), así que controles del
 * mismo grupo quedan en el orden original del JSON.
 */
const TIPO_ORDEN: Record<string, number> = {
  text: 0,
  number: 1,
  range: 1,
  select: 2,
  color: 3,
  json: 3,
  boolean: 4,
};

function ordenTipo(c: ControlPanel): number {
  return TIPO_ORDEN[c.control] ?? TIPO_ORDEN.text;
}

/** Devuelve una copia ordenada por `ordenTipo` (estable). */
function ordenarPorTipo(lista: ControlPanel[]): ControlPanel[] {
  return lista.slice().sort((a, b) => ordenTipo(a) - ordenTipo(b));
}

/**
 * Extras → disclosure. Default: grupo ≠ `General`.
 * Override por control: `disclosure: true|false` (gana el primero del grupo).
 */
function grupoEsDisclosure(nombre: string, lista: ControlPanel[]): boolean {
  const explicit = lista.find((c) => typeof c.disclosure === 'boolean');
  if (explicit) return !!explicit.disclosure;
  return nombre !== 'General';
}

const TPL = document.createElement('template');
TPL.innerHTML = `<div class="panel">
  <div class="titulo"></div>
  <div class="grupos" part="grupos"></div>
</div>`;

/** Carga switch/select/input del kit si el loader está en la página.
 *  Nunca cuelga el panel: timeout 2.5s por widget. */
async function asegurarWidgets(): Promise<void> {
  const L = (globalThis as {
    iswcLoader?: { ensure?: (tag: string) => Promise<boolean> };
  }).iswcLoader;
  if (!L?.ensure) return;
  const conTope = (tag: string) => Promise.race([
    L.ensure!(tag).catch(() => false),
    new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
  ]);
  await Promise.all(
    ['iswc-switch', 'iswc-select', 'iswc-option', 'iswc-input', 'iswc-icon', 'iswc-details'].map(conTope),
  );
}

class IswcPreviewControls extends IswcElement {
  static override tag = 'iswc-preview-controls';
  static override css = css;
  static override shadowInit: ShadowRootInit | null = null;
  #spec: ControlPanel[] = [];
  #listo = false;
  #arrancando = false;
  /** Handler de click fuera (Phase W36) — cierra popovers info. */
  #outsideClickHandler: ((ev: MouseEvent) => void) | null = null;
  /** Handler de Escape (Phase W36) — cierra popovers info. */
  #onPopoverEscape: ((ev: KeyboardEvent) => void) | null = null;

  static override observed = ['label'];

  override connectedCallback(): void {
    if (!this.shadowRoot) {
      this.initShadow({ mode: 'open' });
      this.shadowRoot!.appendChild(TPL.content.cloneNode(true));
    }
    // Si `spec` se asignó antes del upgrade, queda como data-prop propia y
    // tapa el setter → knobs vacíos. Recuperar.
    this.#reclamarSpecProp();
    // Pintar ya: no esperar ensure (si cuelga, knobs vacíos).
    this.#pintar();
    void this.#arrancar();
  }

  /** Own-prop `spec` pre-upgrade → setter real. */
  #reclamarSpecProp(): void {
    if (!Object.prototype.hasOwnProperty.call(this, 'spec')) return;
    const raw = (this as unknown as { spec: unknown }).spec;
    delete (this as unknown as { spec?: unknown }).spec;
    this.spec = Array.isArray(raw) ? raw as ControlPanel[] : [];
  }

  override disconnectedCallback(): void {
    // Phase W36: desinstala los listeners globales (click-fuera / escape).
    this.#removeGlobalDismissHandlers();
  }

  override attributeChangedCallback(name: string): void {
    if (!this.shadowRoot) return;
    if (name === 'label') this.#pintar();
  }

  getSpec(): ControlPanel[] {
    return this.#spec.map((s) => ({ ...s }));
  }

  setValor(prop: string, valor: unknown): void {
    const row = this.shadowRoot?.querySelector<HTMLElement>(`[data-control-prop="${escProp(prop)}"]`);
    if (!row) return;
    const c = this.#spec.find((s) => s.prop === prop);
    if (!c) return;
    if (c.control === 'boolean') {
      const sw = row.querySelector('iswc-switch');
      if (sw) {
        sw.toggleAttribute('checked', Boolean(valor));
        this.#emitir(c, Boolean(valor));
      }
      return;
    }
    if (c.control === 'select') {
      const sel = row.querySelector('iswc-select') as (HTMLElement & { value?: string }) | null;
      if (sel) {
        sel.setAttribute('value', String(valor ?? ''));
        (sel as { value?: string }).value = String(valor ?? '');
        this.#emitir(c, valor);
      }
      return;
    }
    const input = row.querySelector('iswc-input') as (HTMLElement & { value?: string }) | null;
    if (input) {
      const txt = String(valor ?? '');
      input.setAttribute('value', txt);
      input.value = txt;
      this.#emitir(c, valor);
      return;
    }
    const codigo = row.querySelector<HTMLElement & { value: string }>('iswc-code');
    if (codigo) {
      codigo.value = typeof valor === 'string' ? valor : JSON.stringify(valor ?? '', null, 2);
      this.#emitir(c, valor);
      return;
    }
    const native = row.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea',
    );
    if (!native) return;
    if (native instanceof HTMLInputElement && native.type === 'checkbox') {
      native.checked = Boolean(valor);
    } else {
      native.value = c.control === 'json' ? JSON.stringify(valor) : String(valor ?? '');
    }
    this.#emitir(c, valor);
  }

  set spec(lista: ControlPanel[]) {
    this.#spec = Array.isArray(lista) ? lista.map((s) => enriquecerControl(s)) : [];
    if (!this.shadowRoot) return;
    this.#pintar();
    if (!this.#listo) void this.#arrancar();
  }

  get spec(): ControlPanel[] {
    return this.#spec;
  }

  async #arrancar(): Promise<void> {
    if (this.#arrancando) return;
    this.#arrancando = true;
    try {
      await asegurarWidgets();
      this.#listo = true;
      this.#pintar();
    } finally {
      this.#arrancando = false;
    }
  }

  #titulo(): string {
    return this.getAttribute('label') || 'Atributos';
  }

  #pintar(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    sr.querySelector('.titulo')!.textContent = this.#titulo();
    const grupos = sr.querySelector<HTMLElement>('.grupos')!;
    grupos.textContent = '';
    const porGrupo = new Map<string, ControlPanel[]>();
    for (const c of this.#spec) {
      const g = (c.group || 'General').trim() || 'General';
      if (!porGrupo.has(g)) porGrupo.set(g, []);
      porGrupo.get(g)!.push(c);
    }
    // General (plano) primero; extras en disclosure al final.
    const nombres = [...porGrupo.keys()].sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b, 'es');
    });
    for (const nombre of nombres) {
      const lista = porGrupo.get(nombre)!;
      const ordenados = ordenarPorTipo(lista);
      const asDisclosure = grupoEsDisclosure(nombre, lista);
      if (asDisclosure) {
        const det = document.createElement('iswc-details');
        det.className = 'grupo-extra';
        det.setAttribute('summary', nombre);
        det.setAttribute('variant', 'outlined');
        det.setAttribute('icon-placement', 'end');
        const inner = document.createElement('div');
        inner.className = 'grupo-extra__grid';
        for (const control of ordenados) inner.appendChild(this.#fila(control));
        det.appendChild(inner);
        grupos.appendChild(det);
        continue;
      }
      if (nombres.length > 1 && nombre !== 'General') {
        const h = document.createElement('div');
        h.className = 'grupo-titulo';
        h.textContent = nombre;
        grupos.appendChild(h);
      }
      for (const control of ordenados) grupos.appendChild(this.#fila(control));
    }
  }

  #fila(c: ControlPanel): HTMLElement {
    const fila = document.createElement('div');
    fila.className = 'fila';
    // Lo largo se lee y se edita mejor a fila completa.
    if (c.control === 'json') fila.dataset['completa'] = '';
    fila.dataset.controlProp = c.prop;
    // Phase W36: cabecera con label + botón info (popover JSDoc).
    const head = document.createElement('div');
    head.className = 'fila__head';
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = c.label;
    head.appendChild(etiqueta);
    head.appendChild(this.#infoBtn(c));
    fila.appendChild(head);
    fila.appendChild(this.#entrada(c));
    // El popover JSDoc vive en el light DOM del fila (no en shadow) para
    // escapar el `overflow: hidden` de algunos ancestros y poder posicionarse
    // con position:absolute sin ser clippeado por el card del panel.
    fila.appendChild(this.#infoPopover(c));
    return fila;
  }

  /**
   * Phase W36: botón info (ⓘ) que abre el popover JSDoc. Se monta con un
   * <iswc-icon> para que use el mismo pipeline de iconos que el resto del
   * kit (con fallback a <iconify-icon> si el icono local no está disponible).
   */
  #infoBtn(c: ControlPanel): HTMLElement {
    const nombre = tituloKnob(c);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'info-btn';
    btn.setAttribute('data-role', 'info-btn');
    const detalle = `Info del atributo ${nombre}`;
    btn.setAttribute('aria-label', detalle);
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = detalle;
    const icon = document.createElement('iswc-icon');
    icon.setAttribute('icon', 'mdi:information-outline');
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.#toggleInfoPopover(filaDeBtn(btn), btn);
    });
    return btn;
  }

  /**
   * Phase W36: popover JSDoc del atributo, oculto por defecto (`hidden`). El
   * botón info (#infoBtn) lo alterna al hacer click. El popover siempre se
   * renderiza aunque `info` esté vacío: en ese caso deriva valores del
   * propio control (control, default, options).
   */
  #infoPopover(c: ControlPanel): HTMLElement {
    const info = this.#derivePanelInfo(c);
    const pop = document.createElement('div');
    pop.className = 'fila__popover';
    pop.dataset.role = 'info-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', `Documentación de ${attrDeProp(c.prop) || c.label}`);
    pop.hidden = true;
    // Título: nombre del atributo + tipo lógico.
    const title = document.createElement('h4');
    title.className = 'popover__title';
    const attrName = attrDeProp(c.prop) || c.label;
    const attrCode = document.createElement('code');
    attrCode.textContent = attrName;
    title.appendChild(attrCode);
    if (info.type) {
      const t = document.createElement('span');
      t.className = 'popover__type';
      t.textContent = info.type;
      title.appendChild(t);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'popover__close';
    close.setAttribute('aria-label', 'Cerrar');
    close.dataset.role = 'info-close';
    const closeIcon = document.createElement('iswc-icon');
    closeIcon.setAttribute('icon', 'mdi:close');
    closeIcon.setAttribute('aria-hidden', 'true');
    close.appendChild(closeIcon);
    close.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const fila = pop.parentElement;
      const btn = fila?.querySelector<HTMLElement>('[data-role="info-btn"]') ?? null;
      this.#toggleInfoPopover(fila, btn, false);
    });
    title.appendChild(close);
    pop.appendChild(title);
    // Lista (dl) con descripción, default, valores y ejemplo.
    const dl = document.createElement('dl');
    if (info.description) {
      dl.appendChild(dt('Descripción'));
      const dd = document.createElement('dd');
      dd.textContent = info.description;
      dl.appendChild(dd);
    }
    if (info.default !== undefined) {
      dl.appendChild(dt('Default'));
      const dd = document.createElement('dd');
      const code = document.createElement('code');
      code.textContent = info.default;
      dd.appendChild(code);
      dl.appendChild(dd);
    }
    if (info.values && info.values.length > 0) {
      dl.appendChild(dt('Valores'));
      const dd = document.createElement('dd');
      const list = document.createElement('div');
      list.className = 'popover__values';
      for (const v of info.values) {
        const code = document.createElement('code');
        code.textContent = v;
        list.appendChild(code);
      }
      dd.appendChild(list);
      dl.appendChild(dd);
    }
    if (info.example) {
      dl.appendChild(dt('Ejemplo'));
      const dd = document.createElement('dd');
      const pre = document.createElement('pre');
      pre.className = 'popover__example';
      pre.textContent = info.example;
      dd.appendChild(pre);
      dl.appendChild(dd);
    }
    pop.appendChild(dl);
    return pop;
  }

  /**
   * Deriva un PanelInfo coherente del control: si el control trae `info`,
   * se usa como fuente principal y se rellena con lo derivable del control.
   * Si no trae `info`, devuelve uno calculado a partir del control.
   */
  #derivePanelInfo(c: ControlPanel): PanelInfo {
    const base = c.control ? inferControlType(c) : '';
    const tipo: string | undefined = (c.info?.type ?? base) || undefined;
    const defStr = c.default === undefined || c.default === null || c.default === ''
      ? undefined
      : String(c.default);
    const valuesFromOptions = (c.options ?? [])
      .filter((o) => !o.placeholder)
      .map((o) => String(o.value));
    const values = c.info?.values
      ?? (valuesFromOptions.length > 0 ? valuesFromOptions : undefined);
    const def = c.info?.default ?? defStr;
    return {
      description: c.info?.description,
      type: tipo,
      default: def,
      values,
      example: c.info?.example,
    };
  }

  /**
   * Alterna el popover info del .fila (Phase W36). Si se llama con `force`
   * (boolean), fuerza el estado; si no, lo invierte. Cierra cualquier otro
   * popover abierto del mismo panel para que solo haya uno visible.
   */
  #toggleInfoPopover(fila: HTMLElement | null | undefined, btn: HTMLElement | null, force?: boolean): void {
    const sr = this.shadowRoot;
    if (!sr || !fila) return;
    const pop = fila.querySelector<HTMLElement>('[data-role="info-popover"]');
    if (!pop) return;
    const open = typeof force === 'boolean' ? force : pop.hidden;
    // Cierra los otros popovers abiertos del propio shadow.
    sr.querySelectorAll<HTMLElement>('[data-role="info-popover"]:not([hidden])').forEach((other) => {
      if (other === pop) return;
      other.hidden = true;
      const otherFila = other.parentElement;
      const otherBtn = otherFila?.querySelector<HTMLElement>('[data-role="info-btn"]') ?? null;
      if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
    });
    pop.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) {
      // Asegura los handlers globales (escape / click-fuera).
      this.#installGlobalDismissHandlers();
    } else {
      // Si no queda ningún popover abierto, podemos soltar los handlers.
      const anyOpen = !!sr.querySelector('[data-role="info-popover"]:not([hidden])');
      if (!anyOpen) this.#removeGlobalDismissHandlers();
    }
  }

  /**
   * Instala los handlers globales (keydown escape + click-fuera) si no lo
   * estaban ya (Phase W36). Se montan en `document` para detectar tanto
   * clicks fuera del shadow como pulsaciones de escape en cualquier punto.
   */
  #installGlobalDismissHandlers(): void {
    if (this.#outsideClickHandler && this.#onPopoverEscape) return;
    if (!this.#outsideClickHandler) {
      this.#outsideClickHandler = (ev: MouseEvent): void => {
        const sr = this.shadowRoot;
        if (!sr) return;
        const path = ev.composedPath();
        // ¿Cayó dentro de un .fila que tiene popover abierto?
        for (const node of path) {
          if (!(node instanceof HTMLElement)) continue;
          const fila = node.closest?.('[data-control-prop]');
          if (!fila) continue;
          const pop = fila.querySelector?.('[data-role="info-popover"]:not([hidden])');
          // Si el click cayó dentro del mismo fila (sea en el botón o en el
          // popover), no cerramos — deja que el botón / close actúe.
          if (pop && fila.contains(node)) return;
        }
        this.#closeAllInfoPopovers();
      };
      document.addEventListener('click', this.#outsideClickHandler, true);
    }
    if (!this.#onPopoverEscape) {
      this.#onPopoverEscape = (ev: KeyboardEvent): void => {
        if (ev.key !== 'Escape') return;
        const sr = this.shadowRoot;
        if (!sr) return;
        const any = sr.querySelector('[data-role="info-popover"]:not([hidden])');
        if (!any) return;
        this.#closeAllInfoPopovers();
      };
      document.addEventListener('keydown', this.#onPopoverEscape, true);
    }
  }

  /** Suelta los handlers globales si están instalados. */
  #removeGlobalDismissHandlers(): void {
    if (this.#outsideClickHandler) {
      document.removeEventListener('click', this.#outsideClickHandler, true);
      this.#outsideClickHandler = null;
    }
    if (this.#onPopoverEscape) {
      document.removeEventListener('keydown', this.#onPopoverEscape, true);
      this.#onPopoverEscape = null;
    }
  }

  /** Cierra todos los popovers info del shadow. */
  #closeAllInfoPopovers(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    sr.querySelectorAll<HTMLElement>('[data-role="info-popover"]:not([hidden])').forEach((pop) => {
      pop.hidden = true;
      const fila = pop.parentElement;
      const btn = fila?.querySelector<HTMLElement>('[data-role="info-btn"]') ?? null;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    this.#removeGlobalDismissHandlers();
  }

  #entrada(c: ControlPanel): HTMLElement {
    const v = c.value !== undefined && c.value !== null ? c.value : c.default;
    const titulo = tituloKnob(c);
    switch (c.control) {
      case 'boolean': {
        const wrap = document.createElement('div');
        wrap.className = 'control-wrap';
        const sw = document.createElement('iswc-switch');
        sw.setAttribute('color', 'brand');
        conTitulo(sw, titulo);
        if (v) sw.setAttribute('checked', '');
        sw.addEventListener('iswc-change', ((ev: Event) => {
          const checked = Boolean((ev as CustomEvent<{ checked?: boolean }>).detail?.checked);
          this.#emitir(c, checked);
        }) as EventListener);
        wrap.appendChild(sw);
        return wrap;
      }
      case 'color': {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = typeof v === 'string' && /^#/.test(v) ? v : '#7c4dff';
        conTitulo(input, titulo);
        input.addEventListener('input', () => this.#emitir(c, input.value));
        return input;
      }
      case 'select': {
        const sel = document.createElement('iswc-select');
        const inicial = v ?? c.default ?? '';
        sel.setAttribute('value', String(inicial));
        conTitulo(sel, titulo);
        for (const raw of c.options ?? []) {
          const op: OpcionPanel = typeof raw === 'string'
            ? { value: raw, label: raw }
            : raw;
          const o = document.createElement('iswc-option');
          o.setAttribute('value', String(op.value));
          const optTitle = String(op.label || op.value || '');
          o.title = optTitle;
          o.setAttribute('title', optTitle);
          if (op.icon) {
            const icon = document.createElement('iswc-icon');
            icon.setAttribute('slot', 'start');
            icon.setAttribute('icon', op.icon);
            icon.setAttribute('aria-hidden', 'true');
            o.appendChild(icon);
          }
          if (op.html) {
            const wrap = document.createElement('span');
            wrap.innerHTML = op.html;
            while (wrap.firstChild) o.appendChild(wrap.firstChild);
          } else if (op.placeholder) {
            // Marcador visual: gris neutral (#888) e italic. Estilos inline
            // para que sobrevivan al clonarse en el shadow del <iswc-select>.
            const span = document.createElement('span');
            span.className = 'opt-placeholder';
            span.style.color = '#888';
            span.style.fontStyle = 'italic';
            span.style.opacity = '0.85';
            span.textContent = op.label;
            o.appendChild(span);
            o.classList.add('opt-placeholder');
          } else {
            o.appendChild(document.createTextNode(op.label));
          }
          // Una opción placeholder nunca se considera "default" aunque su
          // value coincida con el del componente (es un estado neutro, no
          // un valor por defecto real).
          const isDefault = !op.placeholder
            && c.default !== undefined && c.default !== null
            && String(op.value) === String(c.default);
          // (default) vive en el item, no en el label del control.
          if (isDefault) {
            const mark = document.createElement('span');
            mark.className = 'opt-default';
            mark.textContent = ' (default)';
            o.appendChild(mark);
            o.setAttribute('selected', '');
          } else if (op.placeholder && c.value !== undefined && c.value !== null
            && String(op.value) === String(c.value)) {
            // El placeholder puede estar "seleccionado" visualmente cuando
            // el componente no tiene valor (sin contar como default).
            o.setAttribute('selected', '');
          }
          if (op.description) {
            const desc = document.createElement('span');
            desc.setAttribute('slot', 'description');
            desc.textContent = op.description;
            o.appendChild(desc);
          }
          sel.appendChild(o);
        }
        sel.addEventListener('iswc-change', ((ev: Event) => {
          const valor = (ev as CustomEvent<{ value?: string }>).detail?.value
            ?? (sel as HTMLElement & { value?: string }).value
            ?? '';
          this.#emitir(c, valor);
        }) as EventListener);
        return sel;
      }
      case 'json': {
        // Editable y coloreado con iswc-code; un JSON a medio escribir viaja como texto hasta que vuelva a ser válido.
        const code = document.createElement('iswc-code') as HTMLElement & { value: string };
        code.className = 'code-json';
        code.setAttribute('lang', 'json');
        code.setAttribute('compact', '');
        code.setAttribute('line-numbers', 'false');
        code.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v ?? '', null, 2));
        conTitulo(code, titulo);
        code.addEventListener('iswc-input', () => {
          let val: unknown = code.value;
          try { val = JSON.parse(code.value); } catch { /* edición libre */ }
          this.#emitir(c, val);
        });
        return code;
      }
      case 'range': {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(c.min ?? 0);
        input.max = String(c.max ?? 100);
        input.step = String(c.step ?? 1);
        input.value = String(v ?? c.min ?? 0);
        conTitulo(input, titulo);
        input.addEventListener('input', () => this.#emitir(c, Number(input.value)));
        return input;
      }
      case 'number': {
        const input = document.createElement('iswc-input');
        input.setAttribute('type', 'number');
        if (c.min !== undefined) input.setAttribute('min', String(c.min));
        if (c.max !== undefined) input.setAttribute('max', String(c.max));
        if (c.step !== undefined) input.setAttribute('step', String(c.step));
        input.setAttribute('value', String(v ?? ''));
        conTitulo(input, titulo);
        const leer = () => {
          const raw = (input as HTMLElement & { value?: string }).value ?? '';
          this.#emitir(c, raw === '' ? '' : Number(raw));
        };
        input.addEventListener('iswc-input', leer);
        input.addEventListener('change', leer);
        return input;
      }
      default: {
        const input = document.createElement('iswc-input');
        input.setAttribute('type', 'text');
        if (c.placeholder) input.setAttribute('placeholder', c.placeholder);
        input.setAttribute('value', String(v ?? ''));
        conTitulo(input, titulo);
        const leer = () => {
          this.#emitir(c, (input as HTMLElement & { value?: string }).value ?? '');
        };
        input.addEventListener('iswc-input', leer);
        input.addEventListener('change', leer);
        return input;
      }
    }
  }

  #emitir(c: ControlPanel, valor: unknown): void {
    const def = { control: c.control, prop: c.prop, label: c.label, group: c.group };
    c.value = valor;
    this.dispatchEvent(new CustomEvent('iswc-controls-change', {
      detail: { def, valor },
      bubbles: true,
      composed: true,
    }));
  }
}

let definido = false;
/** Define <iswc-preview-controls> una sola vez (idempotente). */
export function definePreviewControls(): void {
  if (definido) return;
  define(IswcPreviewControls);
  definido = true;
}

if (typeof customElements !== 'undefined') definePreviewControls();

export { IswcPreviewControls };
export default IswcPreviewControls;
