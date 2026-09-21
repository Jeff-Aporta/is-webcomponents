import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import { resolveLocale } from '../_shared/resolve-locale.js';
import { parseLooseDate } from './format-date.js';

/**
 * <is-relative-time> — Web Component (vanilla).
 *
 * Formatea fechas relativas con Intl.RelativeTimeFormat (nativo, multi-locale).
 *
 * Atributos
 *   date      string | number — ISO o timestamp
 *   format    long | short | narrow (default long)
 *   numeric   always | auto (default auto)
 *   locale    BCP 47 — default: lang del documento → sistema → es
 *   sync      boolean — actualiza periódicamente (~30s)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `<time part="time" class="time"></time>`;

  const OBSERVED = ['date', 'format', 'numeric', 'locale', 'sync', 'label'];
  const VALID_FORMAT = ['long', 'short', 'narrow'] as const;
  type FormatStyle = (typeof VALID_FORMAT)[number];
  const VALID_NUMERIC = ['always', 'auto'] as const;
  type NumericStyle = (typeof VALID_NUMERIC)[number];
  const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  class IsRelativeTime extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #el!: HTMLTimeElement;
    #timer: ReturnType<typeof setInterval> | null = null;
    #lastTickRendered = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#el = shadow.querySelector<HTMLTimeElement>('.time')!;
    }

    onConnected() {
      this.#render();
      this.#setupSync();
    }

    onDisconnected() {
      this.#clearSync();
    }

    onAttributeChanged(name: string) {
      this.#render();
      if (name === 'sync') this.#setupSync();
    }

    get date() { return this.getAttribute('date') ?? ''; }
    set date(v) { setStringAttr(this, 'date', v); }

    get format(): FormatStyle {
      const v = this.getAttribute('format');
      return (VALID_FORMAT as readonly string[]).includes(v ?? '') ? (v as FormatStyle) : 'long';
    }
    set format(v: string) { setStringAttr(this, 'format', v); }

    get numeric(): NumericStyle {
      const v = this.getAttribute('numeric');
      return (VALID_NUMERIC as readonly string[]).includes(v ?? '') ? (v as NumericStyle) : 'auto';
    }
    set numeric(v: string) { setStringAttr(this, 'numeric', v); }

    get locale() {
      return resolveLocale(this.getAttribute('locale'));
    }
    set locale(v: string) { setStringAttr(this, 'locale', v); }

    get sync() { return this.hasAttribute('sync'); }
    set sync(v: boolean) { this.toggleAttribute('sync', !!v); }

    /**
     * Etiqueta explícita (proposal g09 #11 — `aria-label` semánticamente
     * rico). Si está, se usa como `aria-label` del host; si no, se construye
     * un resumen con la versión relativa + el instante ISO para que el lector
     * de pantalla pueda situar el momento con precisión sin necesidad de
     * mirar el reloj del sistema.
     */
    get label(): string {
      return this.getAttribute('label') ?? '';
    }
    set label(v: string) {
      if (v == null || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    #formatRelative(d: Date): string {
      const now = Date.now();
      const diffSec = Math.round((d.getTime() - now) / 1000);
      const abs = Math.abs(diffSec);
      const locale = this.locale;
      const numeric: NumericStyle = this.numeric;
      const style: FormatStyle = this.format;
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        for (const [unit, secs] of UNITS) {
          if (abs >= secs || unit === 'second') {
            return rtf.format(Math.round(diffSec / secs), unit);
          }
        }
      } catch {
        // Locale raro o motor sin RelativeTimeFormat completo → reintento es/en.
        try {
          const fallback = locale.toLowerCase().startsWith('en') ? 'en' : 'es';
          const rtf = new Intl.RelativeTimeFormat(fallback, { numeric, style });
          for (const [unit, secs] of UNITS) {
            if (abs >= secs || unit === 'second') {
              return rtf.format(Math.round(diffSec / secs), unit);
            }
          }
        } catch {
          return d.toLocaleString(locale);
        }
      }
      return '';
    }

    /**
     * Construye la versión para `aria-label` (proposal g09 #11). Combina el
     * texto relativo visible con el timestamp ISO exacto entre paréntesis,
     * para que el lector de pantalla comunique "hace 5 minutos (14:23:07Z)"
     * aunque el texto visible siga siendo "hace 5 minutos". Si hay `label`
     * explícito, ese gana.
     */
    #describeForAria(visible: string, d: Date | null): string {
      const explicit = this.label.trim();
      if (explicit) return explicit;
      if (!d) return visible;
      const iso = d.toISOString().replace(/\.\d{3}Z$/, 'Z');
      return `${visible} (${iso})`;
    }

    #render() {
      const d = parseLooseDate(this.date);
      const visible = d ? this.#formatRelative(d) : '';
      this.#el.textContent = visible;
      if (d) this.#el.dateTime = d.toISOString();
      else this.#el.removeAttribute('datetime');

      this.setAttribute('aria-label', this.#describeForAria(visible, d));

      // Proposal g09 #6 — `aria-live="polite"` cuando autoUpdate (sync).
      // Solo cambiamos el aria-live si estamos conectados: durante el render
      // inicial (atributo parser) ya quedó en su valor final.
      if (this.sync && this.mounted) {
        this.setAttribute('aria-live', 'polite');
        this.setAttribute('aria-atomic', 'true');
      } else if (!this.sync) {
        this.removeAttribute('aria-live');
        this.removeAttribute('aria-atomic');
      }
    }

    #clearSync() {
      if (this.#timer != null) {
        clearInterval(this.#timer);
        this.#timer = null;
      }
    }

    #setupSync() {
      this.#clearSync();
      if (this.sync) {
        // 30s es razonable; el texto "hace N segundos" no necesita refresco
        // sub-segundo. Si el consumidor quiere más fino, puede sobrescribir
        // el interval manualmente y volver a llamar setupSync.
        this.#timer = setInterval(() => this.#render(), 30000);
      }
    }
  }

  defineElement('is-relative-time', IsRelativeTime, 'IsRelativeTime');
})();
