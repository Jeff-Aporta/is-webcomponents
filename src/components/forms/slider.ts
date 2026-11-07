import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import type { Validez } from '@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js';
import { hasSlotted, clampTo, tidyToStep } from '@jeff-aporta/iswc-base/core/dom.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
/**
 * <iswc-slider> — Control de rango form-associated (vanilla + Shadow DOM).
 *
 * Atributos
 *   name, label, hint, color (brand|neutral|text|success|warning|danger)
 *   value          number | "20,37" (rango con dos o más thumbs)
 *   min (0), max (100), step (1)  — step="null" restringe a los marks
 *   shift-step     salto con Shift+flechas y PageUp/PageDown (default step × 10)
 *   marks          boolean (uno por step) | "0:0°C, 20:20°C" | "0,20,37"
 *   orientation    horizontal (default) | vertical
 *   track          normal (default) | none | inverted
 *   value-label    off (default) | auto | on
 *   min-distance   separación mínima entre thumbs de un rango
 *   format         plantilla de la burbuja, ej. "{v}°C"
 *   range, disable-swap, disabled, readonly, required   (boolean)
 *
 * Propiedades
 *   value              number | number[]
 *   values             number[]
 *   marks              boolean | Array<{ value, label? }>
 *   scale              (v) => any — valor mostrado (escala no lineal)
 *   valueLabelFormat   (v, index) => string
 *   getAriaValueText   (v, index) => string
 *
 * Slots: label, hint
 * Parts: form-control, label, base, rail, track, mark, mark-label, thumb,
 *        value-label, hint
 * Custom states: disabled, readonly, dragging, focused
 * Eventos: iswc-input (arrastre/tecla), iswc-change (al confirmar)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" id="label" hidden><slot name="label"></slot></label>
      <div part="base" class="base" id="base">
        <div part="rail" class="rail"></div>
        <div part="track" class="track" id="track"></div>
        <div part="track" class="track track-alt" id="trackAlt" hidden></div>
        <div class="marks" id="marks"></div>
      </div>
      <div part="hint" class="hint" id="hint" hidden><slot name="hint"></slot></div>
    </div>
  `;

  const THUMB_TEMPLATE = document.createElement('template');
  THUMB_TEMPLATE.innerHTML = /* html */ `
    <div part="thumb" class="thumb" role="slider" tabindex="0">
      <div part="value-label" class="value-label" aria-hidden="true"></div>
    </div>
  `;

  // Los demás atributos los declara cada `@prop` (y name, disabled, readonly y required, `IswcFormControl`).
  const OBSERVED = [
    'value', 'min', 'max', 'step', 'shift-step', 'marks',
    'orientation', 'track', 'value-label', 'with-tooltip',
    'min-distance', 'range',
  ];

  const EXTRA_UPGRADE_PROPS = ['values', 'scale', 'valueLabelFormat', 'getAriaValueText'];

  const TRACKS = ['normal', 'none', 'inverted'];
  const VALUE_LABELS = ['off', 'auto', 'on'];

  /** Quita el ruido float que dejan las sumas de steps decimales. */

  /**
   * "0:0°C, 20:20°C" → [{ value: 0, label: '0°C' }, …]
   * "0,20,37"        → marks sin etiqueta
   */
  function parseMarks(raw: string): { value: number; label: string }[] {
    return String(raw)
      .split(',')
      .map((chunk: string) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const i = chunk.indexOf(':');
        const value = Number(i === -1 ? chunk : chunk.slice(0, i));
        const label = i === -1 ? '' : chunk.slice(i + 1).trim();
        return Number.isFinite(value) ? { value, label } : null;
      })
      .filter((m): m is { value: number; label: string } => m !== null);
  }

  class IswcSlider extends IswcFormControl {
    static tag = 'iswc-slider';
    static css = css;
    static shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };

    static observed = [...OBSERVED, 'track-size', 'thumb-size', 'length', 'rail-color', 'fill-color', 'thumb-color', 'focus-color'];

    #base!: HTMLElement;
    #trackEl!: HTMLElement;
    #trackAlt!: HTMLElement;
    #marksEl!: HTMLElement;
    #labelEl!: HTMLElement;
    #hintEl!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintSlot!: HTMLSlotElement;
    #thumbs: HTMLElement[] = [];
    #values: number[] = [0];
    #marks: boolean | { value: number; label: string }[] | null = null;          // override por propiedad
    #scale: ((v: number) => number) | null = null;
    #valueLabelFormat: ((v: number, index: number) => string) | null = null;
    #ariaValueText: ((v: number, index: number) => string) | null = null;
    #dragging = false;
    #activeIndex = 0;
    #valuesAtStart: number[] = [0];
    #marksKey = '';

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.getElementById('base')!;
      this.#trackEl = shadow.getElementById('track')!;
      this.#trackAlt = shadow.getElementById('trackAlt')!;
      this.#marksEl = shadow.getElementById('marks')!;
      this.#labelEl = shadow.getElementById('label')!;
      this.#hintEl = shadow.getElementById('hint')!;
      this.#labelSlot = this.#labelEl.querySelector<HTMLSlotElement>('slot')!;
      this.#hintSlot = this.#hintEl.querySelector<HTMLSlotElement>('slot')!;

      this.#base.addEventListener('pointerdown', this.#onPointerDown);
      this.#base.addEventListener('keydown', this.#onKeyDown);
      this.#base.addEventListener('focusin', this.#onFocusIn);
      this.#base.addEventListener('focusout', this.#onFocusOut);
      this.#labelSlot.addEventListener('slotchange', this.#syncSlots);
      this.#hintSlot.addEventListener('slotchange', this.#syncSlots);
    }

    onConnected(): void {
      const self = this as unknown as Record<string, unknown>;
      for (const p of EXTRA_UPGRADE_PROPS) {
        if (Object.prototype.hasOwnProperty.call(this, p)) {
          const v = self[p];
          delete self[p];
          if (v != null) self[p] = v;
        }
      }
      this.#values = this.#normalize(this.#readAttrValues());
      this.#syncSlots();
      this.#syncDisabled();
      this.#render();
    }

    onDisconnected(): void {
      this.#endDrag();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'value') {
        this.#values = this.#normalize(this.#readAttrValues());
      } else if (name === 'disabled' || name === 'readonly') {
        this.#syncDisabled();
      } else if (name === 'label' || name === 'hint') {
        this.#syncSlots();
        return;
      } else {
        this.#values = this.#normalize(this.#values);
      }
      this.#render();
    }

    // ---- propiedades ------------------------------------------------------

    get value() {
      return this.#isRange() ? this.#values.slice() : this.#values[0];
    }
    set value(v) {
      const next = this.#normalize(Array.isArray(v) ? v.map(Number) : [Number(v)]);
      this.#values = next;
      this.#render();
    }

    get values() { return this.#values.slice(); }
    set values(v) { this.value = Array.isArray(v) ? v : [v]; }

    get min() {
      const n = Number(this.getAttribute('min') ?? 0);
      return Number.isFinite(n) ? n : 0;
    }
    set min(v) { this.setAttribute('min', String(v)); }

    get max() {
      const raw = this.getAttribute('max');
      const n = raw == null ? 100 : Number(raw);
      return Number.isFinite(n) ? n : 100;
    }
    set max(v) { this.setAttribute('max', String(v)); }

    /** null → los valores se restringen a los marks. */
    get step() {
      const raw = this.getAttribute('step');
      if (raw === 'null' || raw === 'none') return null;
      const n = Number(raw ?? 1);
      return Number.isFinite(n) && n > 0 ? n : 1;
    }
    set step(v) {
      if (v == null) this.setAttribute('step', 'null');
      else this.setAttribute('step', String(v));
    }

    get shiftStep() {
      const n = Number(this.getAttribute('shift-step'));
      if (Number.isFinite(n) && n > 0) return n;
      const step = this.step;
      return step ? step * 10 : (this.max - this.min) / 10;
    }
    set shiftStep(v) { this.setAttribute('shift-step', String(v)); }

    /** true | Array<{ value, label? }> | false */
    get marks() {
      if (this.#marks !== null) return this.#marks;
      const raw = this.getAttribute('marks');
      if (raw == null) return false;
      if (raw === '' || raw === 'true') return true;
      if (raw === 'false') return false;
      return parseMarks(raw);
    }
    set marks(v: boolean | { value: number; label?: string }[] | null) {
      this.#marks = v == null ? null : (v as boolean | { value: number; label: string }[]);
      if (v === null) this.removeAttribute('marks');
      this.#render();
    }

    get orientation(): 'horizontal' | 'vertical' {
      return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal';
    }
    set orientation(v: 'horizontal' | 'vertical') { this.setAttribute('orientation', v === 'vertical' ? 'vertical' : 'horizontal'); }

    get track(): string {
      const v = this.getAttribute('track');
      return v != null && TRACKS.includes(v) ? v : 'normal';
    }
    set track(v: string) { this.setAttribute('track', TRACKS.includes(v) ? v : 'normal'); }

    get valueLabel(): string {
      const v = this.getAttribute('value-label');
      if (v != null && VALUE_LABELS.includes(v)) return v;
      return this.hasAttribute('with-tooltip') ? 'auto' : 'off';
    }
    set valueLabel(v: string) { this.setAttribute('value-label', VALUE_LABELS.includes(v) ? v : 'off'); }

    get minDistance(): number {
      const n = Number(this.getAttribute('min-distance'));
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
    set minDistance(v: number) { this.setAttribute('min-distance', String(v)); }

    @prop({ type: 'bool' }) accessor disableSwap: boolean = false;

    @prop({ vacio: true }) accessor format: string = '';

    /** Escala no lineal: el valor mostrado es scale(value). */
    get scale(): ((v: number) => number) | null { return this.#scale; }
    set scale(fn: ((v: number) => number) | null) { this.#scale = typeof fn === 'function' ? fn : null; this.#render(); }

    get valueLabelFormat(): ((v: number, index: number) => string) | null { return this.#valueLabelFormat; }
    set valueLabelFormat(fn: ((v: number, index: number) => string) | null) { this.#valueLabelFormat = typeof fn === 'function' ? fn : null; this.#render(); }

    get getAriaValueText(): ((v: number, index: number) => string) | null { return this.#ariaValueText; }
    set getAriaValueText(fn: ((v: number, index: number) => string) | null) { this.#ariaValueText = typeof fn === 'function' ? fn : null; this.#render(); }

    get withTooltip(): boolean { return this.valueLabel !== 'off'; }
    set withTooltip(v: boolean) { this.valueLabel = v ? 'auto' : 'off'; }

    @prop({ vacio: true }) accessor label: string = '';

    @prop({ vacio: true }) accessor hint: string = '';

    // ---- API pública -----------------------------------------------------

    focus(options?: FocusOptions): void { this.#thumbs[0]?.focus(options); }
    blur(): void { this.#thumbs.forEach((t) => t.blur()); }

    stepUp(index: number = 0): void { this.#nudge(index, this.#stepAmount() ?? 1, true); }
    stepDown(index: number = 0): void { this.#nudge(index, -(this.#stepAmount() ?? 1), true); }

    // ---- formulario (IswcFormControl) -----------------------------------

    /** Rango con `name`: un FormData con una entrada por thumb; si no, el primer valor. */
    override valorFormulario(): string | FormData {
      const name = this.name;
      if (this.#values.length > 1 && name) {
        const fd = new FormData();
        for (const v of this.#values) fd.append(name, String(v));
        return fd;
      }
      return String(this.#values[0]);
    }

    /** Siempre hay un valor; `required` solo exige que el `value` venga declarado. */
    override estaVacio(): boolean { return !this.hasAttribute('value'); }

    override validar(): Validez {
      const [flags, mensaje] = super.validar();
      return flags.valueMissing ? [flags, 'Seleccione un valor'] : [flags, mensaje];
    }

    /** Como la base, pero con el estado `a,b` que lee `formStateRestoreCallback`. */
    override sincronizarFormulario(): void {
      super.sincronizarFormulario();
      try {
        this.internals?.setFormValue(this.valorFormulario(), this.#values.join(','));
      } catch {
        // Motor sin form-associated.
      }
    }

    override restablecer(): void {
      this.#values = this.#normalize(this.#readAttrValues());
      this.#render();
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#syncDisabled();
      this.#render();
    }

    override formStateRestoreCallback(state: string | File | FormData | null): void {
      if (state == null) return;
      const parts = String(state).split(',').map(Number).filter(Number.isFinite);
      if (parts.length) this.value = parts.length > 1 ? parts : parts[0];
    }

    // ---- valores ---------------------------------------------------------

    #isRange() {
      if (this.hasAttribute('range')) return true;
      return this.#values.length > 1;
    }

    #readAttrValues(): number[] {
      const raw = this.getAttribute('value');
      if (raw == null) {
        return this.hasAttribute('range') ? [this.min, this.max] : [this.min];
      }
      const parts = String(raw).split(',').map((s: string) => Number(s.trim())).filter(Number.isFinite);
      if (!parts.length) return [this.min];
      return parts;
    }

    /** Lista efectiva de marks (auto por step, parseados o por propiedad). */
    #markList(): { value: number; label: string }[] {
      const cfg = this.marks;
      if (!cfg) return [];
      if (Array.isArray(cfg)) {
        return cfg
          .map((m) => (typeof m === 'number' ? { value: m, label: '' } : m))
          .filter((m) => m && Number.isFinite(Number(m.value)))
          .map((m) => ({ value: Number(m.value), label: m.label ?? '' }));
      }
      // marks === true → uno por step
      const step = this.step;
      const min = this.min;
      const max = this.max;
      if (!step || !(max > min)) return [];
      const count = Math.floor((max - min) / step);
      if (count > 200) return [];
      const out: { value: number; label: string }[] = [];
      for (let i = 0; i <= count; i++) out.push({ value: tidyToStep(min + i * step, step), label: '' });
      return out;
    }

    #snap(n: number): number {
      const min = this.min;
      const max = Math.max(min, this.max);
      if (!Number.isFinite(n)) return min;
      const step = this.step;

      if (step === null) {
        const marks = this.#markList();
        if (!marks.length) return clampTo(n, min, max);
        let best = marks[0].value;
        for (const m of marks) {
          if (Math.abs(m.value - n) < Math.abs(best - n)) best = m.value;
        }
        return clampTo(best, min, max);
      }

      const steps = Math.round((n - min) / step);
      return clampTo(tidyToStep(min + steps * step, step), min, max);
    }

    #normalize(list: number | number[]): number[] {
      const arr = (Array.isArray(list) ? list : [list])
        .map((n) => this.#snap(Number(n)));
      if (!arr.length) return [this.min];
      return arr.length > 1 ? arr.slice().sort((a, b) => a - b) : arr;
    }

    #stepAmount(shift?: boolean): number | null {
      if (shift) return this.shiftStep;
      const step = this.step;
      if (step !== null) return step;
      return null; // navegación por marks
    }

    #pct(value: number): number {
      const min = this.min;
      const max = Math.max(min, this.max);
      if (max === min) return 0;
      return ((value - min) / (max - min)) * 100;
    }

    // ---- render ----------------------------------------------------------

    #syncSlots = (): void => {
      const labelAttr = this.label.trim();
      const hintAttr = this.hint.trim();
      const hasLabelSlot = hasSlotted(this.#labelSlot);
      const hasHintSlot = hasSlotted(this.#hintSlot);
      if (!hasLabelSlot) this.#labelSlot.textContent = labelAttr;
      if (!hasHintSlot) this.#hintSlot.textContent = hintAttr;
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
      this.#hintEl.hidden = !hintAttr && !hasHintSlot;
    };

    #syncDisabled(): void {
      const disabled = this.inhabilitado;
      this.estado('disabled', disabled);
      this.estado('readonly', this.readonly);
      if (disabled) this.#endDrag();
    }

    #inert() {
      return this.disabled || this.readonly;
    }

    #syncThumbs(): void {
      const want = this.#values.length;
      while (this.#thumbs.length > want) {
        this.#thumbs.pop()?.remove();
      }
      while (this.#thumbs.length < want) {
        const fragment = THUMB_TEMPLATE.content.cloneNode(true) as DocumentFragment;
        const node = fragment.firstElementChild;
        if (!(node instanceof HTMLElement)) return;
        this.#base.appendChild(node);
        this.#thumbs.push(node);
      }
    }

    #renderMarks(): { value: number; label: string }[] {
      const marks = this.#markList();
      const key = JSON.stringify([marks, this.orientation, this.min, this.max]);
      if (key === this.#marksKey) return marks;
      this.#marksKey = key;
      this.#marksEl.replaceChildren();

      for (const m of marks) {
        const pct = this.#pct(m.value);
        if (pct < 0 || pct > 100) continue;
        const dot = document.createElement('span');
        dot.className = 'mark';
        dot.setAttribute('part', 'mark');
        dot.dataset.value = String(m.value);
        dot.style.setProperty('--pos', `${pct}%`);
        this.#marksEl.appendChild(dot);

        if (m.label) {
          const text = document.createElement('span');
          text.className = 'mark-label';
          text.setAttribute('part', 'mark-label');
          text.style.setProperty('--pos', `${pct}%`);
          text.textContent = m.label;
          this.#marksEl.appendChild(text);
        }
      }
      this.#marksEl.toggleAttribute('data-has-labels', marks.some((m) => m.label));
      return marks;
    }

    #displayValue(v: number): number {
      return this.#scale ? this.#scale(v) : v;
    }

    #labelText(v: number, index: number): string {
      if (this.#valueLabelFormat) return String(this.#valueLabelFormat(this.#displayValue(v), index));
      const shown = this.#displayValue(v);
      const tpl = this.format;
      if (tpl) return tpl.replace(/\{v\}/g, String(shown));
      return String(shown);
    }

    #render() {
      this.#renderMarks();
      this.#syncThumbs();

      const disabled = this.disabled;
      const vertical = this.orientation === 'vertical';
      const posProp = vertical ? 'bottom' : 'left';
      const sizeProp = vertical ? 'height' : 'width';
      const min = this.min;
      const max = Math.max(min, this.max);
      const track = this.track;
      const pcts = this.#values.map((v) => this.#pct(v));

      // Limpia posiciones del eje contrario al cambiar de orientación
      for (const el of [this.#trackEl, this.#trackAlt, ...this.#thumbs]) {
        el.style.left = '';
        el.style.bottom = '';
        el.style.width = '';
        el.style.height = '';
      }

      // rail / track (relleno)
      let a = 0;
      let b = pcts[0];
      if (this.#values.length > 1) {
        a = pcts[0];
        b = pcts[pcts.length - 1];
      }

      this.#trackAlt.hidden = true;
      if (track === 'none') {
        this.#trackEl.hidden = true;
      } else if (track === 'inverted') {
        this.#trackEl.hidden = false;
        if (this.#values.length > 1) {
          this.#trackEl.style[posProp] = '0%';
          this.#trackEl.style[sizeProp] = `${a}%`;
          this.#trackAlt.hidden = false;
          this.#trackAlt.style[posProp] = `${b}%`;
          this.#trackAlt.style[sizeProp] = `${100 - b}%`;
        } else {
          this.#trackEl.style[posProp] = `${b}%`;
          this.#trackEl.style[sizeProp] = `${100 - b}%`;
        }
      } else {
        this.#trackEl.hidden = false;
        this.#trackEl.style[posProp] = `${a}%`;
        this.#trackEl.style[sizeProp] = `${Math.max(0, b - a)}%`;
      }

      // marks activos (dentro del tramo relleno)
      for (const dot of this.#marksEl.querySelectorAll<HTMLElement>('.mark')) {
        const v = Number(dot.dataset.value);
        const inside = this.#values.length > 1
          ? v >= this.#values[0] && v <= this.#values[this.#values.length - 1]
          : v <= this.#values[0];
        const active = track === 'inverted' ? !inside : inside;
        dot.toggleAttribute('data-active', track !== 'none' && active);
      }

      // thumbs
      this.#thumbs.forEach((thumb: HTMLElement, i) => {
        const v = this.#values[i];
        thumb.style[posProp] = `${pcts[i]}%`;
        thumb.dataset.index = String(i);
        thumb.tabIndex = disabled ? -1 : 0;
        thumb.setAttribute('aria-disabled', String(disabled));
        thumb.setAttribute('aria-readonly', String(this.readonly));
        thumb.setAttribute('aria-orientation', this.orientation);
        thumb.setAttribute('aria-valuemin', String(this.#values.length > 1 && i > 0 ? this.#values[i - 1] : min));
        thumb.setAttribute('aria-valuemax', String(
          this.#values.length > 1 && i < this.#values.length - 1 ? this.#values[i + 1] : max
        ));
        thumb.setAttribute('aria-valuenow', String(v));
        thumb.setAttribute('aria-valuetext', this.#ariaValueText
          ? String(this.#ariaValueText(this.#displayValue(v), i))
          : this.#labelText(v, i));
        if (this.label) thumb.setAttribute('aria-label', `${this.label}${this.#values.length > 1 ? ` ${i + 1}` : ''}`);
        const bubble = thumb.querySelector<HTMLElement>('.value-label');
        if (bubble) bubble.textContent = this.#labelText(v, i);
      });

      this.sincronizarFormulario();
    }

    #emit(name: string): void {
      if (name === 'iswc-change') this.interactuado = true;
      emit(this, name, { value: this.value, values: this.values });
    }

    /** Aplica `raw` al thumb `index` respetando swap / min-distance. */
    #apply(index: number, raw: number, commitChange: boolean): number {
      const next = this.#snap(raw);
      const values = this.#values.slice();
      const gap = this.minDistance;

      if (values.length > 1 && (this.disableSwap || gap > 0)) {
        const lower = index > 0 ? values[index - 1] + gap : this.min;
        const upper = index < values.length - 1 ? values[index + 1] - gap : this.max;
        values[index] = clampTo(next, Math.min(lower, upper), Math.max(lower, upper));
      } else {
        values[index] = next;
      }

      let sorted = values;
      let activeIndex = index;
      if (values.length > 1 && !this.disableSwap) {
        const target = values[index];
        sorted = values.slice().sort((a, b) => a - b);
        activeIndex = sorted.indexOf(target);
        if (activeIndex === -1) activeIndex = index;
      }

      const changed = sorted.some((v, i) => v !== this.#values[i]) || sorted.length !== this.#values.length;
      this.#values = sorted;
      this.#activeIndex = activeIndex;
      this.setAttribute('value', sorted.join(','));
      this.#render();

      if (changed) this.#emit('iswc-input');
      if (commitChange) {
        const differs = sorted.some((v, i) => v !== this.#valuesAtStart[i]);
        if (differs) this.#emit('iswc-change');
      }
      return activeIndex;
    }

    /** Suma `delta` (o navega marks si step es null). */
    #nudge(index: number, delta: number, commitChange: boolean): number {
      const current = this.#values[index] ?? this.min;
      if (this.step === null && Math.abs(delta) > 0) {
        const marks = this.#markList().map((m) => m.value).sort((x, y) => x - y);
        if (marks.length) {
          const pos = marks.findIndex((v) => v === current);
          const dir = delta > 0 ? 1 : -1;
          const nextPos = clampTo((pos === -1 ? 0 : pos) + dir, 0, marks.length - 1);
          this.#valuesAtStart = this.#values.slice();
          return this.#apply(index, marks[nextPos], commitChange);
        }
      }
      this.#valuesAtStart = this.#values.slice();
      return this.#apply(index, current + delta, commitChange);
    }

    #valueFromPointer(e: PointerEvent): number {
      const rect = this.#base.getBoundingClientRect();
      const min = this.min;
      const max = Math.max(min, this.max);
      let ratio: number;
      if (this.orientation === 'vertical') {
        if (!rect.height) return this.#values[this.#activeIndex];
        ratio = 1 - (e.clientY - rect.top) / rect.height;
      } else {
        if (!rect.width) return this.#values[this.#activeIndex];
        ratio = (e.clientX - rect.left) / rect.width;
        if (getComputedStyle(this).direction === 'rtl') ratio = 1 - ratio;
      }
      ratio = clampTo(ratio, 0, 1);
      return min + ratio * (max - min);
    }

    #closestIndex(value: number): number {
      let best = 0;
      let bestDist = Infinity;
      this.#values.forEach((v: number, i) => {
        const d = Math.abs(v - value);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    #onPointerDown = (e: PointerEvent): void => {
      if (this.#inert() || e.button !== 0) return;
      e.preventDefault();

      const raw = this.#valueFromPointer(e);
      const target = e.target as Element | null;
      const thumb = target?.closest('.thumb');
      this.#activeIndex = thumb ? Number((thumb as HTMLElement).dataset.index) : this.#closestIndex(raw);
      this.#valuesAtStart = this.#values.slice();
      this.#dragging = true;
      this.estado('dragging', true);

      this.#base.setPointerCapture?.(e.pointerId);
      this.#base.addEventListener('pointermove', this.#onPointerMove);
      this.#base.addEventListener('pointerup', this.#onPointerUp);
      this.#base.addEventListener('pointercancel', this.#onPointerUp);

      const index = this.#apply(this.#activeIndex, raw, false);
      this.#thumbs[index]?.focus({ preventScroll: true });
    };

    #onPointerMove = (e: PointerEvent): void => {
      if (!this.#dragging) return;
      e.preventDefault();
      this.#activeIndex = this.#apply(this.#activeIndex, this.#valueFromPointer(e), false);
    };

    #onPointerUp = (e: PointerEvent): void => {
      if (!this.#dragging) return;
      this.#apply(this.#activeIndex, this.#valueFromPointer(e), false);
      const differs = this.#values.some((v, i) => v !== this.#valuesAtStart[i]);
      this.#endDrag();
      if (differs) this.#emit('iswc-change');
    };

    #endDrag(): void {
      if (!this.#dragging) return;
      this.#dragging = false;
      this.estado('dragging', false);
      this.#base.removeEventListener('pointermove', this.#onPointerMove);
      this.#base.removeEventListener('pointerup', this.#onPointerUp);
      this.#base.removeEventListener('pointercancel', this.#onPointerUp);
    }

    #onKeyDown = (e: KeyboardEvent): void => {
      if (this.#inert()) return;
      const target = e.target as Element | null;
      const thumb = target?.closest('.thumb');
      if (!thumb) return;
      const index = Number((thumb as HTMLElement).dataset.index) || 0;
      const min = this.min;
      const max = Math.max(min, this.max);
      const unit = e.shiftKey ? this.shiftStep : (this.#stepAmount() ?? 1);
      const big = this.shiftStep;
      let delta: number | null = null;
      let absolute: number | null = null;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown': delta = -unit; break;
        case 'ArrowRight':
        case 'ArrowUp': delta = unit; break;
        case 'PageDown': delta = -big; break;
        case 'PageUp': delta = big; break;
        case 'Home': absolute = min; break;
        case 'End': absolute = max; break;
        default: return;
      }

      e.preventDefault();
      let nextIndex: number;
      if (absolute !== null) {
        this.#valuesAtStart = this.#values.slice();
        nextIndex = this.#apply(index, absolute, true);
      } else {
        nextIndex = this.#nudge(index, delta ?? 0, true);
      }
      if (nextIndex !== index) this.#thumbs[nextIndex]?.focus({ preventScroll: true });
    };

    #onFocusIn = (): void => { this.estado('focused', true); };
    #onFocusOut = (): void => { this.estado('focused', false); };
  }

  define(IswcSlider, 'IswcSlider');
})();
