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
import type { OpcionPanel, PanelInfo, ControlPanel } from "./preview-controls.schemas.js";
const CSS = `
:host {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0.75em 0 1.25em;
  font-family: var(--iswc-sans, system-ui, sans-serif);
  /* Contexto: todo el panel (y --iswc-control-height) escala con este em. */
  font-size: 0.875em;
  line-height: 1.45;
  color: inherit;
}
.panel {
  width: 100%;
  box-sizing: border-box;
  padding: 0.85em 1em;
  border: 0.0625em solid var(--iswc-border, color-mix(in srgb, currentColor 16%, transparent));
  border-radius: var(--iswc-radius, 0.5em);
  background: var(--iswc-bg-elev, color-mix(in srgb, currentColor 5%, transparent));
}
.titulo {
  margin: 0 0 0.75em;
  font-weight: 700;
  font-size: 0.8em;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.85;
}
.grupos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18.75em), 1fr));
  gap: 0.85em 1.1em;
  align-items: start;
}
.grupo-titulo {
  grid-column: 1 / -1;
  margin: 0.35em 0 0;
  font-weight: 650;
  font-size: 0.9em;
  opacity: 0.9;
}
.grupo-titulo:first-child { margin-top: 0; }
/* Extras: disclosure full-width al final del grid de knobs */
.grupo-extra {
  grid-column: 1 / -1;
  display: block;
  min-width: 0;
}
.grupo-extra__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18.75em), 1fr));
  gap: 0.85em 1.1em;
  align-items: start;
  margin-block-start: 0.55em;
}
.fila {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35em;
  min-width: 0;
  position: relative;
}
.fila > .etiqueta {
  font-size: 0.9em;
  color: var(--iswc-text-dim, inherit);
}
/* Phase W36: cabecera del .fila con label + botón info (JSDoc popover) */
.fila__head {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  min-inline-size: 0;
  max-inline-size: 100%;
}
.fila__head > .etiqueta {
  /* override: en cabecera, la fuente > cabecera controla la alineación;
     aquí dejamos el tamaño del label heredado. */
  font-size: 0.9em;
  color: var(--iswc-text-dim, inherit);
  min-inline-size: 0;
  flex: 0 1 auto;
}
.info-btn {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 0;
  padding: 0.1em 0.2em;
  margin: 0;
  font: inherit;
  color: var(--iswc-text-dim, inherit);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.1em;
  block-size: 1.1em;
  border-radius: 50%;
  opacity: 0.6;
  transition: opacity 120ms ease, background 120ms ease, color 120ms ease;
  flex: 0 0 auto;
}
.info-btn:hover,
.info-btn:focus-visible {
  opacity: 1;
  background: color-mix(in srgb, currentColor 12%, transparent);
  outline: none;
}
.info-btn[aria-expanded="true"] {
  opacity: 1;
  background: color-mix(in srgb, currentColor 14%, transparent);
  color: var(--iswc-color-brand-500, currentColor);
}
.info-btn iswc-icon,
.info-btn .info-btn__icon {
  inline-size: 1em;
  block-size: 1em;
  pointer-events: none;
}
/* Phase W36: popover JSDoc-style con la descripción, tipo, default, valores,
   ejemplo del atributo. Se monta en el light DOM del fila (no en shadow) para
   poder escapar visualmente del card del panel sin clipping de overflow. */
.fila__popover {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: calc(100% + 0.25em);
  z-index: 20;
  min-inline-size: 16em;
  max-inline-size: min(28em, calc(100vw - 2em));
  padding: 0.7em 0.85em;
  margin: 0;
  border: 0.0625em solid var(--iswc-border, color-mix(in srgb, currentColor 18%, transparent));
  border-radius: var(--iswc-radius, 0.5em);
  background: var(--iswc-bg-elev, color-mix(in srgb, currentColor 5%, transparent));
  box-shadow: 0 0.5em 1.5em -0.4em color-mix(in srgb, currentColor 28%, transparent);
  font-family: var(--iswc-sans, system-ui, sans-serif);
  font-size: 0.92em;
  line-height: 1.45;
  color: var(--iswc-text, inherit);
}
.fila__popover[hidden] {
  display: none;
}
.fila__popover .popover__title {
  margin: 0 0 0.4em;
  font-size: 0.95em;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4em;
  flex-wrap: wrap;
}
.fila__popover .popover__title code {
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.95em;
  background: color-mix(in srgb, currentColor 8%, transparent);
  padding: 0.05em 0.4em;
  border-radius: 0.25em;
}
.fila__popover .popover__type {
  font-size: 0.78em;
  font-weight: 500;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.fila__popover dl {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(4.5em, max-content) 1fr;
  gap: 0.25em 0.6em;
}
.fila__popover dt {
  font-weight: 600;
  font-size: 0.85em;
  opacity: 0.85;
}
.fila__popover dd {
  margin: 0;
  font-size: 0.88em;
  min-inline-size: 0;
}
.fila__popover dd code {
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.95em;
  background: color-mix(in srgb, currentColor 8%, transparent);
  padding: 0.05em 0.35em;
  border-radius: 0.25em;
  word-break: break-word;
}
.fila__popover .popover__values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
}
.fila__popover .popover__values code {
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.85em;
  background: color-mix(in srgb, currentColor 8%, transparent);
  padding: 0.05em 0.4em;
  border-radius: 0.25em;
}
.fila__popover .popover__example {
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.85em;
  background: color-mix(in srgb, currentColor 6%, transparent);
  padding: 0.35em 0.5em;
  border-radius: 0.3em;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.fila__popover .popover__close {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 0;
  padding: 0.15em 0.25em;
  margin-inline-start: auto;
  font: inherit;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  border-radius: 0.25em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.4em;
  block-size: 1.4em;
}
.fila__popover .popover__close:hover,
.fila__popover .popover__close:focus-visible {
  opacity: 1;
  background: color-mix(in srgb, currentColor 12%, transparent);
  outline: none;
}
.fila__popover .popover__close iswc-icon,
.fila__popover .popover__close .popover__close-icon {
  inline-size: 1em;
  block-size: 1em;
  pointer-events: none;
}
/* Inline by default: cada control toma su ancho natural.
   El consumer decide block/full-width con [full] o width:100%.
   Mismo font-size → mismo alto (--iswc-control-height) en todos los widgets. */
.fila iswc-input,
.fila iswc-select,
.fila iswc-switch,
.fila iswc-button,
.fila iswc-checkbox {
  font-size: 1em;
  max-inline-size: 100%;
}
/* Inputs y selects: full-width en la celda del grid (Phase W9). */
.fila iswc-input,
.fila iswc-select {
  width: 100%;
}
.fila iswc-checkbox {
  --iswc-control-height: 2.5em;
}
/* Wrap del switch: misma altura que input/select, ancho fit-content,
   switch centrado vertical y horizontalmente. */
.fila .control-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: var(--iswc-control-height, 2.5em);
  inline-size: fit-content;
}
/* Opción placeholder (Phase W30): gris neutral, indica que el componente
   no quema default. Aplica tanto dentro del iswc-select como en chips
   auxiliares que dibujemos en el shadow. */
.opt-placeholder { color: #888; font-style: italic; opacity: 0.85; }
.fila .control-wrap iswc-switch {
  --iswc-switch-height: 0.9em;
  --iswc-switch-width: calc(0.9em * 1.75);
  min-inline-size: 14px;
  min-block-size: 14px;
}
/* Alto en el part(base); el host no clippea el borde inferior. */
.fila iswc-input,
.fila iswc-select {
  overflow: visible;
  block-size: auto;
  min-block-size: var(--iswc-control-height, 2.5em);
}
.fila iswc-input::part(base),
.fila iswc-select::part(base) {
  box-sizing: border-box;
  block-size: var(--iswc-control-height, 2.5em);
  min-block-size: var(--iswc-control-height, 2.5em);
  max-block-size: none;
  padding-block: 0;
}
.fila iswc-select::part(trigger) {
  padding-block: 0;
}
.fila input[type="color"],
.fila input[type="range"],
.fila textarea {
  box-sizing: border-box;
  font: inherit;
  font-size: 1em;
  padding: 0 0.5em;
  border: 0.0625em solid var(--iswc-border, color-mix(in srgb, currentColor 16%, transparent));
  border-radius: 0.4em;
  background: transparent;
  color: inherit;
  max-inline-size: 100%;
}
.fila input[type="color"] {
  block-size: var(--iswc-control-height, 2.5em);
  min-block-size: var(--iswc-control-height, 2.5em);
  padding: 0.2em;
}
.fila input[type="range"] {
  block-size: var(--iswc-control-height, 2.5em);
}
.fila textarea {
  min-block-size: 4.2em;
  resize: vertical;
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.9em;
  padding: 0.5em;
}
`;

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
TPL.innerHTML = `<style>${CSS}</style><div class="panel">
  <div class="titulo"></div>
  <div class="grupos" part="grupos"></div>
</div>`;

/** Carga switch/select/input del kit si el loader está en la página.
 *  Nunca cuelga el panel: timeout 2.5s por widget. */
async function asegurarWidgets(): Promise<void> {
  const L = (globalThis as {
    ISWebComponentsLoader?: { ensure?: (tag: string) => Promise<boolean> };
  }).ISWebComponentsLoader;
  if (!L?.ensure) return;
  const conTope = (tag: string) => Promise.race([
    L.ensure!(tag).catch(() => false),
    new Promise<boolean>((r) => setTimeout(() => r(false), 2500)),
  ]);
  await Promise.all(
    ['iswc-switch', 'iswc-select', 'iswc-option', 'iswc-input', 'iswc-icon', 'iswc-details'].map(conTope),
  );
}

class IswcPreviewControls extends HTMLElement {
  #spec: ControlPanel[] = [];
  #listo = false;
  #arrancando = false;
  /** Handler de click fuera (Phase W36) — cierra popovers info. */
  #outsideClickHandler: ((ev: MouseEvent) => void) | null = null;
  /** Handler de Escape (Phase W36) — cierra popovers info. */
  #onPopoverEscape: ((ev: KeyboardEvent) => void) | null = null;

  static get observedAttributes(): string[] {
    return ['label'];
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
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

  disconnectedCallback(): void {
    // Phase W36: desinstala los listeners globales (click-fuera / escape).
    this.#removeGlobalDismissHandlers();
  }

  attributeChangedCallback(name: string): void {
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
        det.setAttribute('variant', 'plain');
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
        const ta = document.createElement('textarea');
        ta.placeholder = c.placeholder ?? '{ ... }';
        ta.value = typeof v === 'string' ? v : JSON.stringify(v ?? '', null, 2);
        conTitulo(ta, titulo);
        ta.addEventListener('input', () => {
          const txt = ta.value;
          let val: unknown = txt;
          try { val = JSON.parse(txt); } catch { /* edición libre */ }
          this.#emitir(c, val);
        });
        return ta;
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
  if (definido || customElements.get('iswc-preview-controls')) {
    definido = true;
    return;
  }
  customElements.define('iswc-preview-controls', IswcPreviewControls);
  definido = true;
}

if (typeof customElements !== 'undefined') definePreviewControls();

export { IswcPreviewControls };
export default IswcPreviewControls;
