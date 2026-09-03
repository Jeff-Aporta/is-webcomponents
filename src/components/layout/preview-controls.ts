/**
 * <is-preview-controls> — panel de controles de demo (playground tipo
 * Storybook), 100% JSON-driven. Recibe por propiedad `spec` el array de
 * controles (ver src/utils/system/controls/controls.schema.json) y emite
 * `is-controls-change` ({def, valor}) para que el sistema los aplique al
 * componente vía JSON -> prop/attr. Dev-only: se usa en la galería.
 *
 * Atributos: label (título del panel). Propiedad: spec.
 * Métodos: getSpec() / setValor(prop, valor).
 */
const CSS = `
:host {
  display: block;
  margin: 0.65rem 0 1.1rem;
  font-family: var(--is-sans, system-ui, sans-serif);
  font-size: 0.82rem;
  line-height: 1.45;
  color: inherit;
  --c-border: color-mix(in srgb, currentColor 16%, transparent);
  --c-border-soft: color-mix(in srgb, currentColor 9%, transparent);
  --c-bg: color-mix(in srgb, currentColor 5%, transparent);
}
.panel {
  border: 1px solid var(--c-border);
  border-radius: 0.7rem;
  background: var(--c-bg);
  padding: 0.5rem 0.7rem;
}
.panel > summary {
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.85;
  padding: 0.2rem 0;
}
.panel > summary::marker { color: color-mix(in srgb, currentColor 45%, transparent); }
.grupo { margin-top: 0.4rem; }
.grupo summary { cursor: pointer; font-weight: 650; font-size: 0.78rem; padding: 0.15rem 0; opacity: 0.9; }
.fila {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(9rem, 1.6fr);
  gap: 0.5rem;
  align-items: center;
  padding: 0.28rem 0;
  border-top: 1px dashed var(--c-border-soft);
}
.fila:first-of-type { border-top: 0; }
.fila label { font-size: 0.78rem; opacity: 0.92; }
.fila input[type="text"],
.fila input[type="number"],
.fila input[type="color"],
.fila select,
.fila textarea {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--c-border);
  border-radius: 0.4rem;
  background: transparent;
  color: inherit;
}
.fila input[type="color"] { height: 1.6rem; padding: 0.1rem; }
.fila textarea { min-height: 4.2rem; resize: vertical; font-family: var(--is-mono, ui-monospace, monospace); font-size: 0.74rem; }
.boolean { display: flex; align-items: center; gap: 0.5rem; }
.boolean input { accent-color: currentColor; }
`;

export type OpcionPanel = { value: unknown; label: string; };

export type ControlPanel = { control: string; prop: string; label: string; group?: string; options?: Array<{ value: unknown; label: string }>; min?: number; max?: number; step?: number; placeholder?: string; default?: unknown; value?: unknown; };

function escProp(prop: string): string {
  return String(prop).replace(/[\\"]/g, '\\$&');
}

const TPL = document.createElement('template');
TPL.innerHTML = `<style>${CSS}</style><details class="panel"><summary></summary><div class="grupos"></div></details>`;

class IsPreviewControls extends HTMLElement {
  #spec: ControlPanel[] = [];
  #grupos = new Map<string, HTMLElement>();

  static get observedAttributes(): string[] {
    return ['label'];
  }

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.appendChild(TPL.content.cloneNode(true));
      this.#pintar();
    }
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot) this.#pintar();
  }

  /** Spec actual del panel (con valores). */
  getSpec(): ControlPanel[] {
    return this.#spec.map((s) => ({ ...s }));
  }

  /** Actualiza el valor de un control y dispara is-controls-change. */
  setValor(prop: string, valor: unknown): void {
    const row = this.shadowRoot!.querySelector<HTMLElement>(`[data-control-prop="${escProp(prop)}"]`);
    if (!row) return;
    const entrada = row.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    if (!entrada) return;
    this.#aplicarEntrada(entrada, String(valor ?? ''), true);
  }

  set spec(lista: ControlPanel[]) {
    this.#spec = Array.isArray(lista) ? lista.map((s) => ({ ...s })) : [];
    if (this.shadowRoot) this.#pintar();
  }

  get spec(): ControlPanel[] {
    return this.#spec;
  }

  #titulo(): string {
    return this.getAttribute('label') || 'Controles';
  }

  #pintar(): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    sr.querySelector('summary')!.textContent = this.#titulo();
    const grupos = sr.querySelector<HTMLElement>('.grupos')!;
    grupos.textContent = '';
    this.#grupos.clear();
    const porGrupo = new Map<string, ControlPanel[]>();
    for (const c of this.#spec) {
      const g = c.group || 'General';
      if (!porGrupo.has(g)) porGrupo.set(g, []);
      porGrupo.get(g)!.push(c);
    }
    for (const [nombre, lista] of porGrupo) {
      const det = document.createElement('details');
      det.className = 'grupo';
      det.open = true;
      const resumen = document.createElement('summary');
      resumen.textContent = nombre;
      det.appendChild(resumen);
      for (const control of lista) det.appendChild(this.#fila(control));
      grupos.appendChild(det);
    }
  }

  #fila(c: ControlPanel): HTMLElement {
    const fila = document.createElement('div');
    fila.className = 'fila';
    fila.dataset.controlProp = c.prop;
    const label = document.createElement('label');
    label.textContent = c.label;
    label.setAttribute('for', `ctl-${c.prop}`);
    fila.appendChild(label);
    fila.appendChild(this.#entrada(c));
    return fila;
  }

  #entrada(c: ControlPanel): HTMLElement {
    const v = c.value !== undefined && c.value !== null ? c.value : c.default;
    switch (c.control) {
      case 'boolean': {
        const env = document.createElement('label');
        env.className = 'boolean';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(v);
        cb.addEventListener('change', () => this.#emitir(c, cb.checked));
        env.appendChild(cb);
        return env;
      }
      case 'color': {
        const env = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'color';
        input.value = typeof v === 'string' && /^#/.test(v) ? v : '#7c4dff';
        input.addEventListener('input', () => this.#emitir(c, input.value));
        env.appendChild(input);
        return env;
      }
      case 'select': {
        const sel = document.createElement('select');
        sel.id = `ctl-${c.prop}`;
        for (const op of c.options ?? []) {
          const opEl = document.createElement('option');
          opEl.value = String(op.value);
          opEl.textContent = op.label;
          if (String(op.value) === String(v ?? '')) opEl.selected = true;
          sel.appendChild(opEl);
        }
        sel.addEventListener('change', () => this.#emitir(c, sel.value));
        return sel;
      }
      case 'json': {
        const ta = document.createElement('textarea');
        ta.placeholder = c.placeholder ?? '{ ... }';
        ta.value = typeof v === 'string' ? v : JSON.stringify(v ?? '', null, 2);
        ta.addEventListener('input', () => {
          const txt = ta.value;
          let val: unknown = txt;
          try {
            val = JSON.parse(txt);
          } catch {
            /* valor libre mientras se edita */
          }
          this.#emitir(c, val);
        });
        return ta;
      }
      case 'range': {
        const env = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(c.min ?? 0);
        input.max = String(c.max ?? 100);
        input.step = String(c.step ?? 1);
        input.value = String(v ?? c.min ?? 0);
        input.addEventListener('input', () => this.#emitir(c, Number(input.value)));
        env.appendChild(input);
        return env;
      }
      case 'number': {
        const input = document.createElement('input');
        input.type = 'number';
        if (c.min !== undefined) input.min = String(c.min);
        if (c.max !== undefined) input.max = String(c.max);
        if (c.step !== undefined) input.step = String(c.step);
        input.value = String(v ?? '');
        input.addEventListener('input', () => this.#emitir(c, input.value === '' ? '' : Number(input.value)));
        return input;
      }
      default: {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = c.placeholder ?? '';
        input.value = String(v ?? '');
        input.addEventListener('input', () => this.#emitir(c, input.value));
        return input;
      }
    }
  }

  #emitir(c: ControlPanel, valor: unknown): void {
    const def = { control: c.control, prop: c.prop, label: c.label, group: c.group };
    c.value = valor;
    this.dispatchEvent(new CustomEvent('is-controls-change', {
      detail: { def, valor },
      bubbles: true,
      composed: true,
    }));
  }

  #aplicarEntrada(entrada: HTMLElement, valorTexto: string, disparar: boolean): void {
    const fila = entrada.closest<HTMLElement>('.fila');
    const prop = fila?.dataset.controlProp ?? '';
    const c = this.#spec.find((s) => s.prop === prop);
    if (!c) return;
    const esCheck = entrada instanceof HTMLInputElement && entrada.type === 'checkbox';
    const valor = esCheck ? (entrada as HTMLInputElement).checked : valorTexto;
    c.value = valor;
    if (disparar) this.#emitir(c, valor);
  }
}

let definido = false;
/** Define <is-preview-controls> una sola vez (idempotente). */
export function definePreviewControls(): void {
  if (definido || customElements.get('is-preview-controls')) {
    definido = true;
    return;
  }
  customElements.define('is-preview-controls', IsPreviewControls);
  definido = true;
}

if (typeof customElements !== 'undefined') definePreviewControls();

export { IsPreviewControls };
export default IsPreviewControls;
