/**
 * <iswc-preview-controls> — panel de knobs del playground (galería).
 * Card + grid responsive (auto-fit ≥18.75em), label encima, widgets iswc-*.
 * Alturas en em vía font-size del :host → --iswc-control-height del kit.
 *
 * Spec JSON → `spec`. Emite `iswc-controls-change` ({ def, valor }).
 */
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
.fila {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35em;
  min-width: 0;
}
.fila > .etiqueta {
  font-size: 0.9em;
  color: var(--iswc-text-dim, inherit);
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
.fila .control-wrap iswc-switch {
  --iswc-switch-height: 0.7em;
  --iswc-switch-width: calc(0.7em * 1.75);
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

export type OpcionPanel = {
  value: unknown;
  label: string;
  icon?: string;
  html?: string;
  description?: string;
};

export type ControlPanel = {
  control: string;
  prop: string;
  label: string;
  group?: string;
  options?: OpcionPanel[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  default?: unknown;
  value?: unknown;
};

function escProp(prop: string): string {
  return String(prop).replace(/[\\"]/g, '\\$&');
}

function attrDeProp(prop: string): string {
  if (prop.startsWith('attr:')) return prop.slice(5);
  if (prop.startsWith('prop:')) return prop.slice(5);
  return prop;
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
  rect: 'mdi:rectangle-outline', pill: 'mdi:capsule', hexagon: 'mdi:hexagon-outline',
  'arrow-left': 'mdi:arrow-left-bold-outline', 'arrow-right': 'mdi:arrow-right-bold-outline',
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

function iconForOption(_attr: string, value: unknown): string | undefined {
  return SELECT_ICONS[String(value ?? '')] || undefined;
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

/** Completa iconos + default de opciones select si el JSON no los trae. */
function enriquecerControl(c: ControlPanel): ControlPanel {
  const copy: ControlPanel = { ...c };
  if (c.control !== 'select' || !Array.isArray(c.options)) return copy;
  const attr = attrDeProp(c.prop);
  copy.options = c.options.map((op) => {
    if (op.icon) return { ...op };
    const icon = iconForOption(attr, op.value);
    return icon ? { ...op, icon } : { ...op };
  });
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

const TPL = document.createElement('template');
TPL.innerHTML = `<style>${CSS}</style><div class="panel"><div class="titulo"></div><div class="grupos"></div></div>`;

/** Carga switch/select/input del kit si el loader está en la página. */
async function asegurarWidgets(): Promise<void> {
  const L = (globalThis as {
    ISWebComponentsLoader?: { ensure?: (tag: string) => Promise<boolean> };
  }).ISWebComponentsLoader;
  if (!L?.ensure) return;
  await Promise.all(
    ['iswc-switch', 'iswc-select', 'iswc-option', 'iswc-input', 'iswc-icon'].map((t) =>
      L.ensure!(t).catch(() => false),
    ),
  );
}

class IswcPreviewControls extends HTMLElement {
  #spec: ControlPanel[] = [];
  #listo = false;

  static get observedAttributes(): string[] {
    return ['label'];
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.appendChild(TPL.content.cloneNode(true));
    }
    void this.#arrancar();
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot && this.#listo) this.#pintar();
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
    if (this.shadowRoot && this.#listo) this.#pintar();
    else if (this.shadowRoot) void this.#arrancar();
  }

  get spec(): ControlPanel[] {
    return this.#spec;
  }

  async #arrancar(): Promise<void> {
    await asegurarWidgets();
    this.#listo = true;
    this.#pintar();
  }

  #titulo(): string {
    return this.getAttribute('label') || 'Controles';
  }

  #pintar(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    sr.querySelector('.titulo')!.textContent = this.#titulo();
    const grupos = sr.querySelector<HTMLElement>('.grupos')!;
    grupos.textContent = '';
    const porGrupo = new Map<string, ControlPanel[]>();
    for (const c of this.#spec) {
      const g = c.group || 'General';
      if (!porGrupo.has(g)) porGrupo.set(g, []);
      porGrupo.get(g)!.push(c);
    }
    const multi = porGrupo.size > 1;
    for (const [nombre, lista] of porGrupo) {
      if (multi) {
        const h = document.createElement('div');
        h.className = 'grupo-titulo';
        h.textContent = nombre;
        grupos.appendChild(h);
      }
      for (const control of lista) grupos.appendChild(this.#fila(control));
    }
  }

  #fila(c: ControlPanel): HTMLElement {
    const fila = document.createElement('div');
    fila.className = 'fila';
    fila.dataset.controlProp = c.prop;
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = c.label;
    fila.appendChild(etiqueta);
    fila.appendChild(this.#entrada(c));
    return fila;
  }

  #entrada(c: ControlPanel): HTMLElement {
    const v = c.value !== undefined && c.value !== null ? c.value : c.default;
    switch (c.control) {
      case 'boolean': {
        const wrap = document.createElement('div');
        wrap.className = 'control-wrap';
        const sw = document.createElement('iswc-switch');
        sw.setAttribute('color', 'brand');
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
        input.addEventListener('input', () => this.#emitir(c, input.value));
        return input;
      }
      case 'select': {
        const sel = document.createElement('iswc-select');
        const inicial = v ?? c.default ?? '';
        sel.setAttribute('value', String(inicial));
        for (const op of c.options ?? []) {
          const o = document.createElement('iswc-option');
          o.setAttribute('value', String(op.value));
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
          } else {
            o.appendChild(document.createTextNode(op.label));
          }
          const isDefault = c.default !== undefined && c.default !== null
            && String(op.value) === String(c.default);
          // (default) vive en el item, no en el label del control.
          if (isDefault) {
            const mark = document.createElement('span');
            mark.className = 'opt-default';
            mark.textContent = ' (default)';
            o.appendChild(mark);
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
