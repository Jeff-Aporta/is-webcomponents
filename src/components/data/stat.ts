import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-stat> — Stat / KPI Card (vanilla, zero dependencies).
 *
 * Bloque para KPI en dashboards: label, número principal, helper text,
 * cambio/trend opcional e icono.
 *
 *   <iswc-stat label="Ingresos" value="€ 1.249,00" helper="vs mes anterior" trend="+12.5"></iswc-stat>
 *
 * Atributos
 *   label       string
 *   value       string (texto del número principal; admite formato HTML)
 *   helper      string
 *   trend       string (e.g. "+12.5%" o "-3.2%")
 *   trend-direction up | down | flat   (auto-detect si trend empieza con + o -)
 *   icon        string (iconify id)
 *   color     brand | neutral | text | success | warning | danger (default 'brand')
 *
 * Slots
 *   label       override del label
 *   value       override del valor
 *   helper      override del helper
 *   trend       override del trend
 *   icon        override del icono
 *
 * CSS Parts
 *   ::part(base) ::part(label) ::part(value) ::part(helper) ::part(trend) ::part(icon)
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="stat" part="base">
      <div class="head" part="head">
        <div class="label" part="label"><slot name="label">Label</slot></div>
        <span class="icon" part="icon"><slot name="icon"></slot></span>
      </div>
      <div class="value" part="value"><slot name="value">—</slot></div>
      <div class="foot" part="foot">
        <span class="trend" part="trend"><slot name="trend"></slot></span>
        <span class="helper" part="helper"><slot name="helper"></slot></span>
      </div>
    </div>
  `;

  const OBSERVED = ['label', 'value', 'helper', 'trend', 'trend-direction', 'icon', 'color'];

  class IswcStat extends IswcElement {
    static override tag = 'iswc-stat';
    static override css = css;
    static override observed = OBSERVED;
    #root!: HTMLElement;
    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector<HTMLElement>('.stat')!;
    }

    override onConnected() {
      this.#sync();
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    #sync(): void {
      const label = this.getAttribute('label');
      const value = this.getAttribute('value');
      const helper = this.getAttribute('helper');
      const trend = this.getAttribute('trend');
      const variant = this.getAttribute('color') || 'brand';
      this.#root.dataset.color = variant;
      const direction = this.#detectTrendDirection(trend);
      this.#root.dataset.trend = direction;
      // Los atributos llenan el contenido de reserva del slot: siguen vivos en cada cambio y lo proyectado manda.
      const slotDe = (slotName: string): HTMLSlotElement => this.shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${slotName}"]`)!;
      const proyectado = (slotName: string): boolean => slotDe(slotName).assignedNodes().length > 0;
      const setSlot = (slotName: string, attrVal: string | null): void => {
        const slot = slotDe(slotName);
        if (!proyectado(slotName) && attrVal) slot.textContent = attrVal;
      };
      setSlot('label', label);
      setSlot('value', value);
      setSlot('helper', helper);
      setSlot('trend', trend);
      // Sin contenido, su caja no se pinta.
      const hayHelper = !!helper || proyectado('helper');
      const hayTrend = !!trend || proyectado('trend');
      if (!helper) slotDe('helper').textContent = '';
      if (!trend) slotDe('trend').textContent = '';
      this.#root.querySelector<HTMLElement>('.helper')!.hidden = !hayHelper;
      this.#root.querySelector<HTMLElement>('.trend')!.hidden = !hayTrend;
      this.#root.querySelector<HTMLElement>('.foot')!.hidden = !hayHelper && !hayTrend;
      // Icon
      const icon = this.getAttribute('icon');
      const slotIcono = slotDe('icon');
      this.#root.querySelector<HTMLElement>('.icon')!.hidden = !icon && !proyectado('icon');
      if (proyectado('icon')) return;
      if (!icon) {
        slotIcono.replaceChildren();
        return;
      }
      const actual = slotIcono.querySelector('iswc-icon');
      if (actual) {
        actual.setAttribute('icon', icon);
        return;
      }
      const ic = document.createElement('iswc-icon');
      ic.setAttribute('icon', icon);
      ic.setAttribute('aria-hidden', 'true');
      slotIcono.replaceChildren(ic);
    }

    #detectTrendDirection(trend: string | null): 'up' | 'down' | 'flat' {
      const explicit = this.getAttribute('trend-direction');
      if (explicit === 'up' || explicit === 'down' || explicit === 'flat') return explicit;
      if (!trend) return 'flat';
      const trimmed = trend.trim();
      if (trimmed.startsWith('+')) return 'up';
      if (trimmed.startsWith('-')) return 'down';
      return 'flat';
    }
  }

  define(IswcStat, 'IswcStat');
})();
