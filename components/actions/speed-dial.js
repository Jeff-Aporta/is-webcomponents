import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-speed-dial> — FAB que despliega un abanico de acciones.
 *
 * Cada acción es un <is-speed-dial-action> hijo con icon + label. El dial
 * hereda del FAB de la marca (radius, shadow, accent) pero evita tener que
 * registrar otro elemento raíz solo para eso.
 *
 * Atributos
 *   icon          nombre iconify del FAB (default mdi:plus)
 *   label         aria-label del trigger
 *   direction     up (default) | down | left | right | radial
 *   open          boolean — controlado, refleja estado
 *   distance      espacio entre trigger y acciones (default .25rem)
 *
 * Solo con direction="radial" (abanico alrededor del trigger):
 *   start-angle   grados del primer item; 0 = derecha, -90 = arriba
 *                 (default: se elige segun el espacio libre alrededor)
 *   sweep         clockwise (default) | counter-clockwise
 *   arc           amplitud del abanico en grados (default 360; se recorta
 *                 automaticamente si el trigger esta pegado a un borde)
 *   radius        radio en px del primer anillo (default: calculado del
 *                 tamano del item)
 *   boundary      selector CSS del contenedor que acota el abanico. Si no
 *                 se da, se usa el ancestro con overflow/containing block y,
 *                 en ultimo caso, el viewport.
 *
 * Cuando el arco disponible no alcanza para todos los items con separacion
 * suficiente, se reparten en ANILLOS concentricos (distribucion en panal):
 * cada anillo aumenta el radio y cabe mas items, y los anillos alternos van
 * desfasados medio paso para que no se alineen radialmente.
 *
 * Slots
 *   default    <is-speed-dial-action>…
 *
 * Eventos
 *   is-toggle  detail: { open }
 *   is-select  detail: { action }   — cuando se elige una acción
 *
 * Cada <is-speed-dial-action> acepta:
 *   icon, label, variant (brand|neutral|success|warning|danger), href, disabled
 *   El clic dispara is-select y, si no está disabled ni tiene href, cierra el dial.
 */
(() => {
  const OBSERVED = [
    'icon', 'label', 'direction', 'open', 'distance',
    'start-angle', 'sweep', 'arc', 'radius', 'boundary',
  ];

  const DIRECTIONS = ['up', 'down', 'left', 'right', 'radial'];

  const DEG = Math.PI / 180;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  class IsSpeedDial extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mo;
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root" data-direction="up" hidden>
          <div part="actions" class="actions">
            <slot></slot>
          </div>
          <button part="trigger" class="trigger" type="button" aria-expanded="false" aria-label="Abrir acciones">
            <span class="icon-wrap"><slot name="icon"><is-icon icon="mdi:plus"></is-icon></slot></span>
          </button>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#trigger = this.shadowRoot.querySelector('.trigger');
      this.#trigger.addEventListener('click', () => this.toggle());
      this.#onDocPointerDown = (e) => {
        if (!this.isOpen) return;
        if (e.composedPath().includes(this)) return;
        this.close();
      };
    }

    connectedCallback() {
      this.#mounted = true;
      this.#syncDirection();
      this.#syncIcon();
      this.#mountActions();
      if (this.hasAttribute('open')) this.open();
      document.addEventListener('pointerdown', this.#onDocPointerDown, true);
      this.#onWinResize = () => { if (this.#isRadial && this.isOpen) this.#layoutRadial(); };
      window.addEventListener('resize', this.#onWinResize);
      window.addEventListener('scroll', this.#onWinResize, true);
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#mo?.disconnect();
      document.removeEventListener('pointerdown', this.#onDocPointerDown, true);
      window.removeEventListener('resize', this.#onWinResize);
      window.removeEventListener('scroll', this.#onWinResize, true);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || !this.#mounted) return;
      if (name === 'direction') {
        this.#syncDirection();
        if (!this.#isRadial) this.#clearRadial();
      }
      if (name === 'icon') this.#syncIcon();
      if (this.#isRadial && this.isOpen) this.#layoutRadial();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.open();
        else this.close();
      }
    }

    get isOpen() { return this.#trigger.getAttribute('aria-expanded') === 'true'; }

    open() {
      this.#trigger.setAttribute('aria-expanded', 'true');
      this.shadowRoot.querySelector('.root').hidden = false;
      this.setAttribute('open', '');
      this.#mountActions();
      if (this.#isRadial) {
        // Tras el reflow: los items ya tienen tamano medible.
        requestAnimationFrame(() => this.#layoutRadial());
      }
      this.dispatchEvent(new CustomEvent('is-toggle', { bubbles: true, composed: true, detail: { open: true } }));
    }

    close() {
      this.#trigger.setAttribute('aria-expanded', 'false');
      this.shadowRoot.querySelector('.root').hidden = true;
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('is-toggle', { bubbles: true, composed: true, detail: { open: false } }));
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    #syncDirection() {
      const d = this.getAttribute('direction') || 'up';
      const dir = DIRECTIONS.includes(d) ? d : 'up';
      this.shadowRoot.querySelector('.root').dataset.direction = dir;
    }

    #syncIcon() {
      const icon = this.getAttribute('icon');
      const slot = this.shadowRoot.querySelector('slot[name="icon"]');
      if (slot && icon) {
        // reescribir el default del slot con un is-icon nuevo
        slot.innerHTML = `<is-icon icon="${icon}"></is-icon>`;
      }
    }

    #mountActions() {
      const slot = this.shadowRoot.querySelector('slot');
      const actions = slot?.assignedElements?.() ?? [];
      const observer = new MutationObserver(() => this.#toggleActionBindings());
      this.#mo?.disconnect();
      this.#mo = observer;
      observer.observe(this, { childList: true });
      this.#toggleActionBindings();
      // stagger delay por índice
      actions.forEach((a, i) => {
        a.style.setProperty('--i', String(i));
      });
    }

    #toggleActionBindings() {
      const actions = [...(this.shadowRoot.querySelector('slot')?.assignedElements?.() ?? [])];
      for (const a of actions) {
        if (a.__bound) continue;
        a.__bound = true;
        a.addEventListener('click', (e) => {
          if (a.hasAttribute('disabled')) { e.preventDefault(); return; }
          this.dispatchEvent(new CustomEvent('is-select', { bubbles: true, composed: true, detail: { action: a } }));
          if (!a.hasAttribute('href')) this.close();
        });
      }
    }

    /* -- layout radial ------------------------------------------------
       Coloca cada accion en coordenadas polares alrededor del trigger.
       El abanico se recorta y se rota segun el espacio libre dentro del
       boundary, y si no caben todas en un anillo se abren anillos
       concentricos (panal). */

    get #isRadial() { return this.getAttribute('direction') === 'radial'; }

    /** Caja que acota el abanico: [boundary] > ancestro contenedor > viewport. */
    #boundaryRect() {
      const sel = this.getAttribute('boundary');
      if (sel) {
        const el = document.querySelector(sel);
        if (el) return el.getBoundingClientRect();
      }
      for (let el = this.parentElement; el; el = el.parentElement) {
        const cs = getComputedStyle(el);
        const contains = cs.transform !== 'none' || cs.filter !== 'none'
          || cs.contain.includes('layout') || cs.contain.includes('paint')
          || cs.overflow !== 'visible';
        if (contains) return el.getBoundingClientRect();
      }
      return new DOMRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
    }

    /**
     * Angulo inicial por defecto: apunta al cuadrante con mas espacio libre
     * dentro del boundary, para que el abanico no nazca contra un borde.
     */
    #autoStartAngle(cx, cy, bounds) {
      const vx = (bounds.right - cx) - (cx - bounds.left);
      const vy = (bounds.bottom - cy) - (cy - bounds.top);
      if (vx === 0 && vy === 0) return -90;
      return Math.atan2(vy, vx) / DEG;
    }

    /**
     * Amplitud util del abanico: si el trigger esta pegado a un borde no
     * tiene sentido barrer 360deg. Se estima con el espacio libre a cada lado.
     */
    #autoArc(cx, cy, bounds, radius) {
      const free = [
        bounds.right - cx >= radius,
        cx - bounds.left >= radius,
        bounds.bottom - cy >= radius,
        cy - bounds.top >= radius,
      ].filter(Boolean).length;
      if (free >= 4) return 360;
      if (free === 3) return 270;
      if (free === 2) return 180;
      return 90;
    }

    /**
     * Radio maximo que cabe dentro del boundary para un arco dado.
     * Se evalua el punto mas lejano del arco en cada eje.
     */
    #maxRadiusFor(cx, cy, bounds, startDeg, arcDeg, itemHalf) {
      let limit = Infinity;
      // Muestreo del arco: para cada angulo, cuanto se puede avanzar sin salir.
      const steps = 24;
      for (let i = 0; i <= steps; i += 1) {
        const a = (startDeg + (arcDeg * i) / steps) * DEG;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        // Distancia hasta el borde en la direccion (ux, uy), menos el radio del item.
        const dx = ux > 0 ? (bounds.right - cx) : (ux < 0 ? (cx - bounds.left) : Infinity);
        const dy = uy > 0 ? (bounds.bottom - cy) : (uy < 0 ? (cy - bounds.top) : Infinity);
        const rx = ux === 0 ? Infinity : (dx - itemHalf) / Math.abs(ux);
        const ry = uy === 0 ? Infinity : (dy - itemHalf) / Math.abs(uy);
        limit = Math.min(limit, Math.max(0, Math.min(rx, ry)));
      }
      return limit;
    }

    #layoutRadial() {
      const actions = [...(this.shadowRoot.querySelector('slot')?.assignedElements?.() ?? [])];
      if (!actions.length) return;

      const triggerRect = this.#trigger.getBoundingClientRect();
      const cx = triggerRect.left + triggerRect.width / 2;
      const cy = triggerRect.top + triggerRect.height / 2;
      const bounds = this.#boundaryRect();

      // En radial los items son circulares (ver CSS): basta el lado mayor.
      let itemSize = 0;
      for (const a of actions) {
        const r = a.getBoundingClientRect();
        itemSize = Math.max(itemSize, r.width, r.height);
      }
      if (!itemSize) itemSize = 44;
      const itemHalf = itemSize / 2;
      const triggerHalf = Math.max(triggerRect.width, triggerRect.height) / 2;
      const gap = 12;

      // Radio minimo para NO tocar el trigger. Es un piso duro: por debajo de
      // esto siempre hay colision, asi que nunca se baja de aqui.
      const minRadius = triggerHalf + itemHalf + gap;

      const attrArc = Number(this.getAttribute('arc'));
      const attrStart = Number(this.getAttribute('start-angle'));
      const hasArc = Number.isFinite(attrArc) && attrArc > 0;
      const hasStart = Number.isFinite(attrStart);

      let arc = hasArc ? clamp(attrArc, 10, 360) : this.#autoArc(cx, cy, bounds, minRadius);
      let center = hasStart ? attrStart : this.#autoStartAngle(cx, cy, bounds);

      // El arco debe caber: si el radio minimo no entra en la direccion
      // elegida, se estrecha el arco (y se reintenta) en vez de deformar las
      // posiciones. Nunca se recolocan items sueltos contra el borde.
      let start = arc >= 360 ? center : center - arc / 2;
      let maxR = this.#maxRadiusFor(cx, cy, bounds, start, arc, itemHalf);
      let guard = 0;
      while (maxR < minRadius && arc > 30 && guard < 12) {
        arc = Math.max(30, arc * 0.75);
        start = arc >= 360 ? center : center - arc / 2;
        maxR = this.#maxRadiusFor(cx, cy, bounds, start, arc, itemHalf);
        guard += 1;
      }

      const attrRadius = Number(this.getAttribute('radius'));
      const wanted = Number.isFinite(attrRadius) && attrRadius > 0 ? attrRadius : minRadius;
      // El radio nunca baja de minRadius aunque el boundary sea diminuto:
      // preferimos desbordar un poco antes que solapar el trigger.
      const baseRadius = Math.max(minRadius, Math.min(wanted, Math.max(maxR, minRadius)));

      const dir = this.getAttribute('sweep') === 'counter-clockwise' ? -1 : 1;

      // Capacidad de un anillo: cuantos items caben sin tocarse a ese radio.
      const capacityAt = (radius) => {
        const minStep = 2 * Math.asin(clamp((itemHalf + gap / 2) / radius, 0, 1)) / DEG;
        if (!Number.isFinite(minStep) || minStep <= 0) return actions.length;
        return arc >= 360
          ? Math.max(1, Math.floor(360 / minStep))
          : Math.max(1, Math.floor(arc / minStep) + 1);
      };

      // Reparto en anillos concentricos (panal) hasta colocarlos todos.
      const rings = [];
      let remaining = actions.length;
      let ringIndex = 0;
      while (remaining > 0 && ringIndex < 8) {
        const radius = baseRadius + ringIndex * (itemSize + gap);
        const count = Math.min(remaining, capacityAt(radius));
        rings.push({ radius, count });
        remaining -= count;
        ringIndex += 1;
      }
      // Si aun sobran (boundary imposible), el ultimo anillo los absorbe.
      if (remaining > 0) rings[rings.length - 1].count += remaining;

      let index = 0;
      rings.forEach((ring, i) => {
        const slots = arc >= 360 ? ring.count : Math.max(ring.count - 1, 1);
        const step = arc >= 360 ? 360 / ring.count : arc / slots;
        // Anillos alternos desfasados medio paso: distribucion en panal.
        const offset = i % 2 ? step / 2 : 0;
        for (let k = 0; k < ring.count; k += 1) {
          const angle = (start + offset + dir * step * k) * DEG;
          const x = Math.cos(angle) * ring.radius;
          const y = Math.sin(angle) * ring.radius;
          const el = actions[index++];
          if (!el) return;
          // Modo radial: circular + etiqueta como tooltip (no cabe al lado).
          el.setAttribute('data-radial', '');
          const label = el.getAttribute('label') || el.textContent.trim();
          if (label) {
            if (!el.title) el.title = label;
            if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
          }
          el.style.setProperty('--sd-x', `${Math.round(x)}px`);
          el.style.setProperty('--sd-y', `${Math.round(y)}px`);
          el.style.setProperty('--i', String(index - 1));
        }
      });
    }

    /** Limpia las coordenadas polares al salir de radial. */
    #clearRadial() {
      for (const a of this.shadowRoot.querySelector('slot')?.assignedElements?.() ?? []) {
        a.style.removeProperty('--sd-x');
        a.style.removeProperty('--sd-y');
        a.removeAttribute('data-radial');
      }
    }

    #trigger;
    #onDocPointerDown;
    #onWinResize;
  }

  if (!customElements.get('is-speed-dial')) customElements.define('is-speed-dial', IsSpeedDial);

  // Acción individual — patrón primario: <button> extendido.
  class IsSpeedDialAction extends HTMLElement {
    static get observedAttributes() { return ['icon', 'label', 'variant', 'href', 'disabled']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <a part="action" class="action" role="menuitem" tabindex="-1">
          <span class="label"><slot></slot></span>
          <span class="ico"><slot name="icon"><is-icon icon="mdi:star-outline"></is-icon></slot></span>
        </a>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
    }
    connectedCallback() {
      const link = this.shadowRoot.querySelector('a');
      const href = this.getAttribute('href');
      if (href) link.setAttribute('href', href);
      const label = this.getAttribute('label');
      if (label) link.setAttribute('aria-label', label);
      const variant = this.getAttribute('variant') || 'brand';
      link.dataset.variant = variant;
      link.tabIndex = this.hasAttribute('disabled') ? -1 : 0;
      // Por defecto se cierra el dial al elegir; si tiene href, no intercepta.
      if (href) link.addEventListener('click', (e) => e.stopPropagation());
      if (this.hasAttribute('disabled')) link.classList.add('is-disabled');
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      const link = this.shadowRoot.querySelector('a');
      if (!link) return;
      if (name === 'href') link.setAttribute('href', newVal || '#');
      if (name === 'label') link.setAttribute('aria-label', newVal || '');
      if (name === 'variant') link.dataset.variant = newVal || 'brand';
      if (name === 'disabled') {
        link.classList.toggle('is-disabled', !!newVal);
        link.tabIndex = newVal ? -1 : 0;
      }
    }
  }
  if (!customElements.get('is-speed-dial-action')) customElements.define('is-speed-dial-action', IsSpeedDialAction);
})();
