import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { resolveLocale } from '../_shared/resolve-locale.js';

/**
 * <is-format-date> — Web Component (vanilla).
 *
 * Formatea fechas con Intl.DateTimeFormat.
 *
 * Atributos: date, weekday, era, year, month, day, hour, minute, second,
 *            time-zone, time-zone-name, hour-format (auto|12|24),
 *            locale (BCP 47; default = html lang → sistema → es)
 */

/**
 * Parseo laxo de fecha compartido por los helpers de formato
 * (is-format-date, is-relative-time, is-format).
 * Acepta timestamp numérico, `YYYY-MM-DD` (interpretado en hora local) o
 * cualquier cosa que `new Date()` entienda. Devuelve null si no es válida.
 * @param {string|number|null|undefined} raw
 * @returns {Date|null}
 */
export function parseLooseDate(raw: string|number|null|undefined) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const d = new Date(Number(s));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const only = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (only) {
    const d = new Date(+only[1], +only[2] - 1, +only[3]);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<time part="date" class="date"></time>`;

  const OBSERVED = [
    'date', 'weekday', 'era', 'year', 'month', 'day',
    'hour', 'minute', 'second', 'time-zone', 'time-zone-name',
    'hour-format', 'locale', 'label', 'live'
  ];

  const OPT_ATTRS = {
    weekday: 'weekday',
    era: 'era',
    year: 'year',
    month: 'month',
    day: 'day',
    hour: 'hour',
    minute: 'minute',
    second: 'second',
    'time-zone': 'timeZone',
    'time-zone-name': 'timeZoneName'
  };

  class IsFormatDate extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #el!: HTMLElement;
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector<HTMLElement>('.date')!;
    }

    onConnected() {
      this.#syncLive();
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'live') this.#syncLive();
      this.#render();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { setStringAttr(this, 'date', v); }

    get locale() {
      return resolveLocale(this.getAttribute('locale'));
    }
    set locale(v) {
      if (v == null || v === '') this.removeAttribute('locale');
      else this.setAttribute('locale', String(v));
    }

    /**
     * Etiqueta explícita (proposals g09 #5/#6 — a11y). Si está, se usa como
     * `aria-label` del host; si no, se construye un resumen automático
     * combinando el formato legible + locale. Se actualiza en cada `#render()`
     * para mantenerlo sincronizado con el texto visible.
     */
    get label(): string {
      return this.getAttribute('label') ?? '';
    }
    set label(v: string) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    /**
     * Modo live (proposal g09 #6). Con `live="polite"` el host lleva
     * `aria-live="polite"` y `aria-atomic="true"` para que los lectores de
     * pantalla anuncien los cambios de fecha sin interrumpir al usuario.
     * Valores: '' | 'off' | 'polite' | 'assertive'.
     */
    get live(): '' | 'off' | 'polite' | 'assertive' {
      const v = (this.getAttribute('live') || '').toLowerCase();
      return ['off', 'polite', 'assertive'].includes(v) ? (v as 'off' | 'polite' | 'assertive') : '';
    }
    set live(v: '' | 'off' | 'polite' | 'assertive') {
      if (!v) this.removeAttribute('live');
      else this.setAttribute('live', v);
    }

    #syncLive(): void {
      const v = this.live;
      if (v) {
        this.setAttribute('aria-live', v);
        this.setAttribute('aria-atomic', 'true');
      } else {
        this.removeAttribute('aria-live');
        this.removeAttribute('aria-atomic');
      }
    }

    #buildOptions(): Intl.DateTimeFormatOptions {
      const opts: Record<string, string | boolean> = {};
      for (const [attr, key] of Object.entries(OPT_ATTRS)) {
        const v = this.getAttribute(attr);
        if (v) opts[key] = v;
      }
      const hf = this.getAttribute('hour-format');
      if (hf === '12') opts.hour12 = true;
      else if (hf === '24') opts.hour12 = false;
      if (Object.keys(opts).length === 0) {
        opts.dateStyle = 'medium';
        opts.timeStyle = 'short';
      }
      return opts as unknown as Intl.DateTimeFormatOptions;
    }

    /**
     * Construye una descripción natural de la fecha formateada para
     * `aria-label` cuando el consumidor no provee `label` explícito.
     * Combina el texto visible + el locale + el instante ISO entre paréntesis
     * para que el lector de pantalla comunique la fecha con precisión sin
     * depender solo del texto visible (que puede ser corto, p. ej. "15/1/25").
     */
    #describeForAria(visible: string, d: Date | null): string {
      const explicit = this.label.trim();
      if (explicit) return explicit;
      if (!d) return visible;
      const loc = this.locale;
      // ISO 8601 sin ms (más compacto) → más natural para TTS.
      const iso = d.toISOString().replace(/\.\d{3}Z$/, 'Z');
      return `${visible} (${loc}, ${iso})`;
    }

    #render() {
      const d = parseLooseDate(this.date);
      if (!d) {
        this.#el.textContent = '';
        this.#el.removeAttribute('datetime');
        // Limpiamos aria-label para que no describa un instante obsoleto.
        this.removeAttribute('aria-label');
        return;
      }
      let visible: string;
      try {
        const fmt = new Intl.DateTimeFormat(this.locale, this.#buildOptions());
        visible = fmt.format(d);
      } catch {
        visible = d.toLocaleString(this.locale);
      }
      this.#el.textContent = visible;
      const el = this.#el as HTMLTimeElement;
      el.dateTime = d.toISOString();
      this.setAttribute('aria-label', this.#describeForAria(visible, d));
    }
  }

  defineElement('is-format-date', IsFormatDate, 'IsFormatDate');
})();
