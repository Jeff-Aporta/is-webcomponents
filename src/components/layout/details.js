import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-details> — Web Component (vanilla, zero dependencies).
 *
 * Disclosure colapsable: muestra un resumen y, al expandir, el contenido.
 * Equivalente a wa-details / <details>.
 *
 * Atributos
 *   open             boolean — si está expandido (reflected)
 *   summary          string  — texto del summary si no se usa el slot
 *   name             string  — grupo accordion: si dos <is-details> comparten
 *                             `name`, abrir uno cierra el resto
 *   disabled         boolean
 *   variant       filled | outlined | filled-outlined | plain
 *                    (default 'outlined', reflected)
 *   icon-placement   start | end
 *                    (default 'end', reflected)
 *
 * Slots
 *   (default)         contenido principal
 *   summary           summary propio (gana sobre el atributo summary)
 *   expand-icon       icono de expandido
 *   collapse-icon     icono de colapsado
 *
 * Métodos
 *   show() / hide() / toggle()
 *
 * Eventos
 *   is-show       detail: {} — antes de abrir (cancelable)
 *   is-after-show detail: {} — tras la animación de apertura
 *   is-hide       detail: {} — antes de cerrar (cancelable)
 *   is-after-hide detail: {} — tras la animación de cierre
 *
 * CSS Parts: ::part(base) ::part(header) ::part(summary) ::part(icon) ::part(content)
 *
 * CSS custom properties
 *   --spacing          espacio del header/contenido
 *   --show-duration    duración de la animación de apertura
 *   --hide-duration    duración de la animación de cierre
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root" part="base">
      <div class="header" part="header">
        <button type="button" class="summary-btn" part="summary"
                aria-expanded="false">
          <span class="summary-text">
            <slot name="summary"></slot>
          </span>
          <span class="summary-icon" part="icon" aria-hidden="true">
            <slot name="expand-icon" class="slot-expand">
              <is-icon class="default-icon" icon="mdi:chevron-down" aria-hidden="true"></is-icon>
            </slot>
          </span>
        </button>
      </div>
      <div class="content" part="content" hidden>
        <slot></slot>
      </div>
    </div>
  `;

  const OBSERVED = ['open', 'summary', 'name', 'disabled', 'variant', 'icon-placement'];

  const VALID_VARIANT = ['filled', 'outlined', 'filled-outlined', 'plain'];
  const VALID_ICON_PLACEMENT = ['start', 'end'];

  class IsDetails extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #button;
    #content;
    #root;
    #defaultIcon;
    #upgradeProps = ['open', 'summary', 'name', 'disabled', 'variant', 'icon-placement'];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.root');
      this.#button = shadow.querySelector('.summary-btn');
      this.#content = shadow.querySelector('.content');
      this.#defaultIcon = shadow.querySelector('.default-icon');

      this.#button.addEventListener('click', this.#onClick.bind(this));
      // Soporte teclado: Enter y Space son nativos en <button>, pero en algunos
      // casos previos (slot asignado a un `<a>` por ejemplo) viene bien un
      // fallback. Dejamos el botón como está y añadimos Space/Enter redundantes.
    }

    connectedCallback() {
      this.#mounted = true;
      this.#upgradeProperties();
      if (!this.hasAttribute('variant')) this.setAttribute('variant', 'outlined');
      if (!this.hasAttribute('icon-placement')) this.setAttribute('icon-placement', 'end');

      // Si no hay slot summary y hay atributo, reflejarlo en un nodo propio
      // para que el usuario pueda leerlo sin tocar el shadow.
      this.#syncSummaryText();

      // Sincronizar icono según open.
      this.#syncIcon();
      // Estado inicial: si tiene [open], pintar expandido sin animación.
      if (this.open) {
        this.#content.hidden = false;
        this.#button.setAttribute('aria-expanded', 'true');
        this.#root.dataset.state = 'open';
      } else {
        this.#root.dataset.state = 'closed';
      }
    }

    disconnectedCallback() {
      // nada que limpiar
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'variant' && newVal && !VALID_VARIANT.includes(newVal)) {
        this.setAttribute('variant', 'outlined');
        return;
      }
      if (name === 'icon-placement' && newVal && !VALID_ICON_PLACEMENT.includes(newVal)) {
        this.setAttribute('icon-placement', 'end');
        return;
      }
      if (name === 'open') this.#onOpenAttrChanged();
      if (name === 'summary') this.#syncSummaryText();
      if (name === 'icon-placement') this.#syncIcon();
      if (name === 'name') this.#onNameChanged();
      if (name === 'disabled') {
        this.#button.disabled = this.disabled;
        this.#button.setAttribute('aria-disabled', String(this.disabled));
      }
    }

    // ---- public properties ----

    get open() { return this.hasAttribute('open'); }
    set open(v) {
      const desired = !!v;
      if (desired === this.open) return;
      if (desired) this.show();
      else this.hide();
    }

    get summary() { return this.getAttribute('summary') || ''; }
    set summary(v) {
      if (v == null || v === '') this.removeAttribute('summary');
      else this.setAttribute('summary', v);
    }

    get name() { return this.getAttribute('name') || ''; }
    set name(v) {
      if (v == null || v === '') this.removeAttribute('name');
      else this.setAttribute('name', v);
    }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get variant() {
      const v = this.getAttribute('variant');
      return VALID_VARIANT.includes(v) ? v : 'outlined';
    }
    set variant(v) {
      if (v == null || v === '') this.removeAttribute('variant');
      else if (VALID_VARIANT.includes(v)) this.setAttribute('variant', v);
    }

    get iconPlacement() {
      const v = this.getAttribute('icon-placement');
      return VALID_ICON_PLACEMENT.includes(v) ? v : 'end';
    }
    set iconPlacement(v) {
      if (v == null || v === '') this.removeAttribute('icon-placement');
      else if (VALID_ICON_PLACEMENT.includes(v)) this.setAttribute('icon-placement', v);
    }

    // ---- public methods ----

    show() { return this.#setOpen(true, /* fromUser */ false); }
    hide() { return this.#setOpen(false, /* fromUser */ false); }
    toggle() { return this.#setOpen(!this.open, /* fromUser */ false); }

    // ---- private ----

    #upgradeProperties() {
      for (const a of this.#upgradeProps) {
        if (Object.prototype.hasOwnProperty.call(this, a)) {
          const v = this[a];
          delete this[a];
          if (v != null && v !== false) {
            if (v === true) this.setAttribute(a, '');
            else this.setAttribute(a, v);
          }
        }
      }
    }

    #onClick(e) {
      if (this.disabled) return;
      e.preventDefault();
      this.#setOpen(!this.open, /* fromUser */ true);
    }

    #onOpenAttrChanged() {
      const desired = this.open;
      this.#button.setAttribute('aria-expanded', String(desired));
      this.#content.hidden = !desired;
      this.#root.dataset.state = desired ? 'open' : 'closed';
      this.#syncIcon();
    }

    #onNameChanged() {
      // Al cambiar `name`, si este <is-details> está abierto, cerramos los
      // demás con el mismo `name`. El responsable de mantener la consistencia
      // es el que cambie el atributo (programáticamente); no forzamos nada
      // automático.
    }

    #syncSummaryText() {
      const slot = this.shadowRoot.querySelector('slot[name="summary"]');
      const assigned = slot?.assignedNodes({ flatten: true });
      if (assigned && assigned.length > 0) return; // el usuario puso su slot
      const text = this.summary;
      const span = this.#button.querySelector('.summary-text');
      // Fallback sin destruir el <slot>: textContent borraría el slot y rompe
      // reasignaciones posteriores.
      let fallback = span.querySelector('[data-summary-fallback]');
      if (!text) {
        fallback?.remove();
        return;
      }
      if (!fallback) {
        fallback = document.createElement('span');
        fallback.dataset.summaryFallback = '';
        span.appendChild(fallback);
      }
      fallback.textContent = text;
    }

    #syncIcon() {
      // El icono de expandido/plegado es el mismo (chevron). En el CSS rotamos
      // 180° según [open]. Aquí solo refrescamos el atributo aria del wrapper.
      const isOpen = this.open;
      const iconWrap = this.#button.querySelector('.summary-icon');
      iconWrap.dataset.state = isOpen ? 'open' : 'closed';
    }

    #setOpen(desired, fromUser) {
      if (desired === this.open) return Promise.resolve();
      if (this.disabled) return Promise.resolve();

      // Emite el evento is-show / is-hide cancelable. Si alguien llama
      // preventDefault(), abortamos.
      const evtName = desired ? 'is-show' : 'is-hide';
      const cancelable = fromUser;
      const evt = new CustomEvent(evtName, { detail: {}, bubbles: true, composed: true, cancelable });
      this.dispatchEvent(evt);
      if (cancelable && evt.defaultPrevented) return Promise.resolve();

      // Accordion: si abrimos y tenemos name, cerrar los otros.
      if (desired && this.name) this.#closeOthers();

      // Cambiar atributo → connectedCallback / attrChangedCallback se ocupa
      // de la accesibilidad y la visibilidad.
      if (desired) this.setAttribute('open', '');
      else this.removeAttribute('open');

      // Animación: si el contenido tiene altura conocida, animar; si no, snap.
      const afterEvtName = desired ? 'is-after-show' : 'is-after-hide';
      return this.#animateContent(desired).then(() => {
        this.dispatchEvent(new CustomEvent(afterEvtName, { detail: {}, bubbles: true, composed: true }));
      });
    }

    #closeOthers() {
      const name = this.name;
      if (!name) return;
      const group = document.querySelectorAll(`is-details[name="${CSS.escape(name)}"]`);
      group.forEach((el) => {
        if (el === this) return;
        if (el.open) el.hide();
      });
    }

    #animateContent(open) {
      if (open) {
        this.#content.hidden = false;
        return this.#animateOpen();
      }
      return this.#animateClose();
    }

    #animateOpen() {
      const el = this.#content;
      const root = this.#root;
      const startHeight = el.getBoundingClientRect().height;
      const cs = getComputedStyle(this);
      const dur = parseFloat(cs.getPropertyValue('--show-duration')) || 180;
      el.style.height = `${startHeight}px`;
      el.hidden = false;
      // Forzar reflow
      void el.offsetHeight;
      const targetHeight = el.scrollHeight;
      const anim = el.animate(
        [
          { height: `${startHeight}px` },
          { height: `${targetHeight}px` },
        ],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
      );
      root.dataset.state = 'opening';
      return anim.finished
        .then(() => {
          el.style.height = '';
          el.hidden = false;
          root.dataset.state = 'open';
        })
        .catch(() => {});
    }

    #animateClose() {
      const el = this.#content;
      const root = this.#root;
      const cs = getComputedStyle(this);
      const dur = parseFloat(cs.getPropertyValue('--hide-duration')) || 160;
      const startHeight = el.scrollHeight;
      el.style.height = `${startHeight}px`;
      void el.offsetHeight;
      const anim = el.animate(
        [
          { height: `${startHeight}px` },
          { height: '0px' },
        ],
        { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
      );
      root.dataset.state = 'closing';
      return anim.finished
        .then(() => {
          el.style.height = '';
          el.hidden = true;
          root.dataset.state = 'closed';
        })
        .catch(() => {});
    }
  }

  if (!customElements.get('is-details')) {
    customElements.define('is-details', IsDetails);
  }
  if (typeof window !== 'undefined') {
    window.IsDetails = IsDetails;
  }
})();
