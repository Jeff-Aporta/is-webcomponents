/**
 * <iswc-preview-controls> — panel de knobs del playground (galería).
 * Card + grid responsive (auto-fit ≥18.75em), label encima, widgets iswc-*.
 * Alturas en em vía font-size del :host → --iswc-control-height del kit.
 *
 * Spec JSON → `spec`. Emite `iswc-controls-change` ({ def, valor }).
 *
 * Phase W20 (2026-10-03-zod-migration): el panel tiene 2 tabs:
 *   - "Attrs" (default): la grilla actual de inputs/selects/switches.
 *   - "Code"           : la anatomía (Shadow DOM template) del componente
 *                        target, read-only, renderizada en <pre class="code">
 *                        para que `scripts/highlight-pre.js` la pinte.
 *                        La detección del shadow es automática:
 *                          1) `ctor.__TEMPLATE` si el CE lo expone (dialog, drawer, …).
 *                          2) si no, instancia un hidden <{tag}> y lee su
 *                             `shadowRoot.innerHTML`.
 *
 * Phase W36 (2026-10-03-zod-migration): cada `.fila` lleva un botón info
 * (icono ⓘ) junto al label que abre un popover JSDoc-style con la info del
 * atributo: descripción, tipo, default, valores válidos y ejemplo. La info
 * llega por:
 *   - el campo opcional `info: { … }` del control en el JSON del playground
 *     (description, type, default, values[], example).
 *   - o, en su defecto, se deriva del propio control (label, control,
 *     default, options).
 *
 * Phase W39 (2026-10-03-zod-migration): los controles se auto-ordenan por
 * tipo al render (text → number → select → otros → switch/boolean AL FINAL).
 * El orden del `controls[]` en el JSON no importa: el componente garantiza
 * la presentación consistente.
 *
 * Atributos:
 *   label   string             — header del panel (default: "Controles").
 *   tag     string             — tag del componente target (ej. "iswc-button").
 *                                Activa la pestaña Code.
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
/* Tabs (Phase W20): nav con 2 pestañas (Attrs/Code) */
.tabs {
  display: flex;
  gap: 0.25em;
  margin: 0 0 0.85em;
  border-bottom: 0.0625em solid var(--iswc-border, color-mix(in srgb, currentColor 16%, transparent));
}
.tab {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 0;
  border-bottom: 0.125em solid transparent;
  font: inherit;
  color: inherit;
  padding: 0.45em 0.85em;
  cursor: pointer;
  opacity: 0.6;
  margin-bottom: calc(-0.0625em - 0.0625em);
  transition: opacity 120ms ease, border-color 120ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
}
.tab:hover { opacity: 0.9; }
.tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: var(--iswc-color-brand-500, currentColor);
  font-weight: 600;
}
.tab__icon { font-size: 1.1em; line-height: 1; }
/* Body panels (mutuamente excluyentes via [hidden]) */
.body { display: block; }
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
/* Code tab */
.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0.5em;
}
.code-head h4 {
  margin: 0;
  font-size: 0.85em;
  font-weight: 650;
  opacity: 0.9;
}
.code-head .code-hint {
  font-size: 0.75em;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.code {
  margin: 0;
  padding: 0.7em 0.85em;
  border: 0.0625em solid var(--iswc-border, color-mix(in srgb, currentColor 16%, transparent));
  border-radius: 0.4em;
  background: var(--iswc-bg, color-mix(in srgb, currentColor 3%, transparent));
  color: var(--iswc-text, inherit);
  font-family: var(--iswc-mono, ui-monospace, monospace);
  font-size: 0.82em;
  line-height: 1.5;
  overflow: auto;
  max-block-size: 28em;
  white-space: pre;
  /* readonly visual: nada de resize ni user-select:all */
  resize: none;
  user-select: text;
}
.code--empty {
  opacity: 0.6;
  font-style: italic;
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

export type OpcionPanel = {
  value: unknown;
  label: string;
  icon?: string;
  html?: string;
  description?: string;
  /**
   * Opción placeholder (no quemada por el componente). Se renderiza en gris
   * neutral (#888) y nunca se marca como default.
   */
  placeholder?: boolean;
};

/**
 * Información JSDoc-style del atributo, mostrada en el popover del botón
 * info (Phase W36). Todos los campos son opcionales: cuando faltan, el
 * popover deriva lo que puede del propio control (tipo, default, options).
 */
export type PanelInfo = {
  /** Descripción en prosa del atributo. */
  description?: string;
  /** Tipo lógico (p. ej. "string", "boolean", "enum", "integer"). */
  type?: string;
  /** Default legible (override sobre `c.default` cuando es más rico). */
  default?: string;
  /** Lista de valores válidos (override sobre `c.options`). */
  values?: string[];
  /** Ejemplo de uso, en formato libre. */
  example?: string;
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
  /**
   * Info JSDoc-style del atributo (Phase W36). Cuando está presente, el
   * botón info junto al label abre un popover con esta info; en su defecto,
   * el popover se sigue renderizando con valores derivados del control.
   */
  info?: PanelInfo;
};

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

const TPL = document.createElement('template');
TPL.innerHTML = `<style>${CSS}</style><div class="panel">
  <div class="titulo"></div>
  <nav class="tabs" part="tabs" role="tablist" aria-label="Pestañas del panel de controles">
    <button type="button" class="tab tab--attrs" part="tab tab--attrs"
            role="tab" data-tab="attrs" aria-selected="true"
            aria-controls="pcAttrsPanel">
      <span class="tab__icon" aria-hidden="true">⚙</span>
      <span class="tab__label">Attrs</span>
    </button>
    <button type="button" class="tab tab--code" part="tab tab--code"
            role="tab" data-tab="code" aria-selected="false"
            aria-controls="pcCodePanel">
      <span class="tab__icon" aria-hidden="true">‹/›</span>
      <span class="tab__label">Code</span>
    </button>
  </nav>
  <div class="body" part="body">
    <section id="pcAttrsPanel" class="panel-attrs" part="panel-attrs"
             role="tabpanel" data-panel="attrs">
      <div class="grupos" part="grupos"></div>
    </section>
    <section id="pcCodePanel" class="panel-code" part="panel-code"
             role="tabpanel" data-panel="code" hidden>
      <header class="code-head" part="code-head">
        <h4 class="code-title" part="code-title">Anatomía (Shadow DOM)</h4>
        <span class="code-hint" part="code-hint">read-only</span>
      </header>
      <pre class="code code--anatomy" part="code" data-role="anatomy" spellcheck="false"
           aria-label="Anatomía del Shadow DOM del componente target"></pre>
    </section>
  </div>
</div>`;

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
  #anatomy = '';
  #anatomyReady = false;
  #anatomyPromise: Promise<string> | null = null;
  /** Handler de click fuera (Phase W36) — cierra popovers info. */
  #outsideClickHandler: ((ev: MouseEvent) => void) | null = null;
  /** Handler de Escape (Phase W36) — cierra popovers info. */
  #onPopoverEscape: ((ev: KeyboardEvent) => void) | null = null;

  static get observedAttributes(): string[] {
    return ['label', 'tag'];
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.appendChild(TPL.content.cloneNode(true));
    }
    this.#wireTabs();
    void this.#arrancar();
  }

  disconnectedCallback(): void {
    // Phase W36: desinstala los listeners globales (click-fuera / escape).
    this.#removeGlobalDismissHandlers();
  }

  attributeChangedCallback(name: string): void {
    if (!this.shadowRoot) return;
    if (name === 'label' && this.#listo) this.#pintar();
    if (name === 'tag') this.#refreshAnatomy();
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

  /**
   * Tag del componente target (p.ej. "iswc-button"). Si está presente, el
   * panel activa la pestaña Code e introspecciona su Shadow DOM.
   */
  get tag(): string {
    return this.getAttribute('tag') ?? '';
  }
  set tag(v: string) {
    if (v == null || v === '') this.removeAttribute('tag');
    else this.setAttribute('tag', String(v));
  }

  /** Anatomía detectada (Shadow DOM serializado). Útil para tests. */
  get anatomy(): string {
    return this.#anatomy;
  }

  async #arrancar(): Promise<void> {
    await asegurarWidgets();
    this.#listo = true;
    this.#pintar();
    this.#refreshAnatomy();
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
      // Phase W39: auto-orden por tipo (text → number → select → otros → switch)
      // dentro de cada grupo, sin importar el orden del consumer.
      const ordenados = ordenarPorTipo(lista);
      for (const control of ordenados) grupos.appendChild(this.#fila(control));
    }
  }

  /** Cablea los listeners de click en las dos pestañas. */
  #wireTabs(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    const tabAttrs = sr.querySelector<HTMLElement>('.tab--attrs');
    const tabCode = sr.querySelector<HTMLElement>('.tab--code');
    if (tabAttrs) tabAttrs.addEventListener('click', () => this.#showTab('attrs'));
    if (tabCode) tabCode.addEventListener('click', () => this.#showTab('code'));
  }

  /** Activa una de las dos pestañas y desactiva la otra. */
  #showTab(which: 'attrs' | 'code'): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    const isAttrs = which === 'attrs';
    const tabAttrs = sr.querySelector<HTMLElement>('.tab--attrs');
    const tabCode = sr.querySelector<HTMLElement>('.tab--code');
    const panelAttrs = sr.querySelector<HTMLElement>('[data-panel="attrs"]');
    const panelCode = sr.querySelector<HTMLElement>('[data-panel="code"]');
    if (tabAttrs) tabAttrs.setAttribute('aria-selected', String(isAttrs));
    if (tabCode) tabCode.setAttribute('aria-selected', String(!isAttrs));
    if (panelAttrs) panelAttrs.toggleAttribute('hidden', !isAttrs);
    if (panelCode) panelCode.toggleAttribute('hidden', isAttrs);
    this.dataset.activeTab = which;
  }

  /**
   * Lanza la detección de anatomía cuando hay `tag`. Re-renderiza el bloque
   * Code tan pronto como resuelve (sync o async). Idempotente: si ya hay
   * una detección en vuelo, no arranca otra.
   */
  #refreshAnatomy(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    const tag = this.tag.trim();
    const pre = sr.querySelector<HTMLElement>('[data-role="anatomy"]');
    if (!pre) return;
    if (!tag) {
      this.#anatomy = '';
      this.#anatomyReady = false;
      this.#anatomyPromise = null;
      pre.textContent = '(sin tag: define `tag="iswc-…"` para ver la anatomía)';
      pre.classList.add('code--empty');
      return;
    }
    pre.classList.remove('code--empty');
    if (this.#anatomyPromise) return;
    this.#anatomyPromise = this.#detectAnatomy(tag).then((html) => {
      this.#anatomy = html;
      this.#anatomyReady = true;
      const live = this.shadowRoot?.querySelector<HTMLElement>('[data-role="anatomy"]');
      if (live) live.textContent = html;
      return html;
    }).catch((err) => {
      const msg = `<!-- no se pudo detectar la anatomía de <${tag}>: ${String(err)} -->`;
      this.#anatomy = msg;
      this.#anatomyReady = true;
      const live = this.shadowRoot?.querySelector<HTMLElement>('[data-role="anatomy"]');
      if (live) {
        live.textContent = msg;
        live.classList.add('code--empty');
      }
      return msg;
    });
  }

  /**
   * Detecta la anatomía del componente target:
   *   1) `ctor.__TEMPLATE` si el CE lo expone (dialog, drawer, …).
   *   2) Si no, instancia un hidden <{tag}> y lee `shadowRoot.innerHTML`.
   * Devuelve siempre un string (vacío si no se pudo).
   */
  async #detectAnatomy(tag: string): Promise<string> {
    if (typeof customElements === 'undefined') return '';
    const ctor = customElements.get(tag);
    if (ctor) {
      const tpl = (ctor as unknown as { __TEMPLATE?: HTMLTemplateElement }).__TEMPLATE;
      if (tpl && tpl.innerHTML) return tpl.innerHTML.trim();
    }
    if (typeof document === 'undefined') return '';
    return this.#introspectInstance(tag);
  }

  /** Crea un hidden instance y devuelve su shadowRoot serializado. */
  async #introspectInstance(tag: string): Promise<string> {
    const probe = document.createElement(tag);
    probe.style.position = 'absolute';
    probe.style.left = '-99999px';
    probe.style.top = '-99999px';
    probe.style.pointerEvents = 'none';
    probe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(probe);
    // Esperar a que el shadow se monte (connectedCallback + initShadow).
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const root = probe.shadowRoot;
    const html = root ? root.innerHTML.trim() : '';
    probe.remove();
    return html;
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'info-btn';
    btn.dataset.role = 'info-btn';
    btn.setAttribute('aria-label', `Info del atributo ${attrDeProp(c.prop) || c.label}`);
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = 'Ver documentación del atributo';
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
    const tipo: string | undefined = c.info?.type ?? base || undefined;
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
