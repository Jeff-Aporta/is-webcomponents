import { adoptCss } from '../_shared/adopt-css.js';
import './check-icon-button.js';

/**
 * <is-speed-dial> — FAB que despliega un abanico de acciones.
 *
 * Cada acción es un <is-speed-dial-action> hijo con icon + label. El dial
 * hereda del FAB de la marca (radius, shadow, accent) pero evita tener que
 * registrar otro elemento raíz solo para eso.
 *
 * Atributos
 *   icon          icono con el dial CERRADO (default mdi:plus)
 *   open-icon     icono con el dial ABIERTO (default mdi:close). El trigger
 *                 reusa <is-check-icon-button>, que hace el switch entre los
 *                 dos iconos en vez de rotar uno solo.
 *   label         aria-label del trigger
 *   direction     up (default) | down | left | right | radial
 *   open          boolean — controlado, refleja estado
 *   distance      espacio entre trigger y acciones (default .25rem)
 *
 * Data props (mismo espiritu que data-theme / data-palette: configuracion
 * declarativa y dinamica, sin API imperativa):
 *
 *   data-layout    radial (default con direction="radial") | grid | flex
 *                  Como se distribuyen las acciones. `grid` y `flex` reparten
 *                  dentro del wrapper con layout nativo, sin coordenadas.
 *   data-wrapper   selector CSS del area que ACOTA las acciones. Ninguna
 *                  accion puede salirse de esta caja. Si no se da, se usa el
 *                  ancestro que crea containing block y, si no, el viewport.
 *   data-start-angle  grados del primer item; 0 = derecha, -90 = arriba.
 *                  Default: se elige segun el espacio libre alrededor.
 *   data-sweep     clockwise (default) | counter-clockwise
 *   data-arc       amplitud del abanico en grados (default 360; se recorta
 *                  solo si el trigger esta pegado a un borde)
 *   data-radius    radio en px del primer anillo
 *
 * Los nombres sin prefijo (arc, sweep, boundary...) se siguen aceptando.
 *
 * Reparto: mientras quepan, las acciones se reparten en ANILLOS concentricos
 * (panal) con los anillos alternos desfasados medio paso. Los anillos se
 * recortan al wrapper: si un anillo no cabe entero, no se usa. Cuando ya no
 * queda area radial para todas, el componente marca data-packed y las
 * acciones pasan a un GRID dentro del wrapper, que por construccion no puede
 * desbordarlo.
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
    'icon', 'open-icon', 'label', 'direction', 'open', 'distance',
    'start-angle', 'sweep', 'arc', 'radius', 'boundary',
    'data-layout', 'data-wrapper', 'data-start-angle', 'data-sweep',
    'data-arc', 'data-radius',
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
          <is-check-icon-button part="trigger" class="trigger"
                                icon="mdi:plus" checked-icon="mdi:close"
                                label="Abrir acciones" checked-label="Cerrar acciones">
          </is-check-icon-button>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#trigger = this.shadowRoot.querySelector('.trigger');
      // is-check-icon-button ya gestiona el estado visual y emite is-change.
      this.#trigger.addEventListener('is-change', (e) => {
        if (e.detail.checked === this.isOpen) return; // ya sincronizado
        e.detail.checked ? this.open() : this.close();
      });
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
      if (name === 'icon' || name === 'open-icon' || name === 'label') this.#syncIcon();
      if (this.#isRadial && this.isOpen) this.#layoutRadial();
      if (name === 'open') {
        if (this.hasAttribute('open')) this.open();
        else this.close();
      }
    }

    get isOpen() { return this.hasAttribute('open'); }

    open() {
      this.#trigger.checked = true;
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
      this.#trigger.checked = false;
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
      const icon = this.#prop('icon');
      const openIcon = this.#prop('open-icon');
      if (icon) this.#trigger.setAttribute('icon', icon);
      if (openIcon) this.#trigger.setAttribute('checked-icon', openIcon);
      const label = this.#prop('label');
      if (label) this.#trigger.setAttribute('label', label);
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

    /** Lee `data-<name>` y cae al atributo suelto por compatibilidad. */
    #prop(name) {
      const data = this.getAttribute(`data-${name}`);
      if (data != null && data !== '') return data;
      const plain = this.getAttribute(name);
      return plain != null && plain !== '' ? plain : null;
    }

    #numProp(name) {
      const v = Number(this.#prop(name));
      return Number.isFinite(v) ? v : null;
    }

    get #isRadial() {
      return this.#prop('layout') === 'radial' || this.getAttribute('direction') === 'radial';
    }

    /** Caja que acota el abanico: [boundary] > ancestro contenedor > viewport. */
    #boundaryRect() {
      const sel = this.#prop('wrapper');
      if (sel) {
        // closest() primero: con varios wrappers iguales en la pagina,
        // document.querySelector devolvia SIEMPRE el primero y el dial se
        // acotaba contra un area ajena.
        const el = this.closest(sel) || document.querySelector(sel);
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

    /**
     * Banda libre mas grande del wrapper una vez descontada la huella del
     * trigger. El grid del modo empaquetado se coloca AHI, para no solapar
     * el trigger y no salirse del area.
     */
    #packArea(bounds, triggerRect, gap) {
      const t = {
        left: triggerRect.left - gap,
        right: triggerRect.right + gap,
        top: triggerRect.top - gap,
        bottom: triggerRect.bottom + gap,
      };
      const bands = [
        { left: t.right, top: bounds.top, right: bounds.right, bottom: bounds.bottom },   // derecha
        { left: bounds.left, top: bounds.top, right: t.left, bottom: bounds.bottom },     // izquierda
        { left: bounds.left, top: t.bottom, right: bounds.right, bottom: bounds.bottom }, // abajo
        { left: bounds.left, top: bounds.top, right: bounds.right, bottom: t.top },       // arriba
      ].map((b) => ({ ...b, w: b.right - b.left, h: b.bottom - b.top }));
      bands.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      const best = bands[0];
      return (best && best.w > 0 && best.h > 0) ? best : null;
    }

    #layoutRadial() {
      const actions = [...(this.shadowRoot.querySelector('slot')?.assignedElements?.() ?? [])];
      if (!actions.length) return;

      // Modos de layout nativo: el reparto lo hace CSS dentro del wrapper.
      const mode = this.#prop('layout');
      if (mode === 'grid' || mode === 'flex') {
        this.#pack(actions, mode);
        return;
      }

      const triggerRect = this.#trigger.getBoundingClientRect();
      const cx = triggerRect.left + triggerRect.width / 2;
      const cy = triggerRect.top + triggerRect.height / 2;
      const bounds = this.#boundaryRect();

      let itemSize = 0;
      for (const a of actions) {
        const r = a.getBoundingClientRect();
        itemSize = Math.max(itemSize, r.width, r.height);
      }
      if (!itemSize) itemSize = 44;
      const itemHalf = itemSize / 2;
      const triggerHalf = Math.max(triggerRect.width, triggerRect.height) / 2;
      const gap = 12;

      const minRadius = triggerHalf + itemHalf + gap;

      const attrArc = this.#numProp('arc');
      const attrStart = this.#numProp('start-angle');
      let arc = attrArc && attrArc > 0 ? clamp(attrArc, 10, 360) : this.#autoArc(cx, cy, bounds, minRadius);
      const center = attrStart != null ? attrStart : this.#autoStartAngle(cx, cy, bounds);

      let start = arc >= 360 ? center : center - arc / 2;
      let maxR = this.#maxRadiusFor(cx, cy, bounds, start, arc, itemHalf);
      let guard = 0;
      while (maxR < minRadius && arc > 30 && guard < 12) {
        arc = Math.max(30, arc * 0.75);
        start = arc >= 360 ? center : center - arc / 2;
        maxR = this.#maxRadiusFor(cx, cy, bounds, start, arc, itemHalf);
        guard += 1;
      }

      const attrRadius = this.#numProp('radius');
      const wanted = attrRadius && attrRadius > 0 ? attrRadius : minRadius;
      const baseRadius = Math.max(minRadius, Math.min(wanted, Math.max(maxR, minRadius)));

      const dir = this.#prop('sweep') === 'counter-clockwise' ? -1 : 1;

      const capacityAt = (radius) => {
        const minStep = 2 * Math.asin(clamp((itemHalf + gap / 2) / radius, 0, 1)) / DEG;
        if (!Number.isFinite(minStep) || minStep <= 0) return actions.length;
        return arc >= 360
          ? Math.max(1, Math.floor(360 / minStep))
          : Math.max(1, Math.floor(arc / minStep) + 1);
      };

      // Anillos ACOTADOS: un anillo solo se usa si cabe ENTERO en el wrapper.
      // Antes solo se limitaba el radio base y los anillos siguientes
      // (base + n*(item+gap)) se salian del area.
      const rings = [];
      let remaining = actions.length;
      let ringIndex = 0;
      while (remaining > 0 && ringIndex < 8) {
        const radius = baseRadius + ringIndex * (itemSize + gap);
        if (radius > maxR && ringIndex > 0) break;      // no cabe: se corta
        const count = Math.min(remaining, capacityAt(radius));
        rings.push({ radius, count });
        remaining -= count;
        ringIndex += 1;
      }

      // Si el area radial no da para todas, se abandona el abanico y se
      // reparten con GRID dentro del wrapper: contenido por construccion.
      if (remaining > 0) {
        this.#pack(actions, 'grid');
        return;
      }
      delete this.dataset.packed;
      this.style.removeProperty('--sd-pack-left');

      let index = 0;
      rings.forEach((ring, i) => {
        const slots = arc >= 360 ? ring.count : Math.max(ring.count - 1, 1);
        const step = arc >= 360 ? 360 / ring.count : arc / slots;
        const offset = i % 2 ? step / 2 : 0;
        for (let k = 0; k < ring.count; k += 1) {
          const angle = (start + offset + dir * step * k) * DEG;
          const x = Math.cos(angle) * ring.radius;
          const y = Math.sin(angle) * ring.radius;
          const el = actions[index++];
          if (!el) return;
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

    /**
     * Reparto por layout nativo dentro del wrapper. Se calcula la caja libre
     * (banda del wrapper sin la huella del trigger) y se le pasa a CSS; el
     * grid/flex distribuye dentro, asi que ninguna accion puede desbordar.
     */
    #pack(actions, mode) {
      this.#clearPolar(actions);
      this.dataset.packed = mode;

      const bounds = this.#boundaryRect();
      const triggerRect = this.#trigger.getBoundingClientRect();
      // Origen ESTABLE: .root, que no se mueve. Medir contra .actions daba un
      // delta de 0 en la segunda pasada (es el elemento que este mismo
      // calculo reposiciona) y la caja se quedaba pegada al trigger.
      const box = this.shadowRoot.querySelector('.root').getBoundingClientRect();
      const area = this.#packArea(bounds, triggerRect, 12);
      if (!area) { this.style.removeProperty('--sd-pack-left'); return; }

      this.style.setProperty('--sd-pack-left', `${Math.round(area.left - box.left)}px`);
      this.style.setProperty('--sd-pack-top', `${Math.round(area.top - box.top)}px`);
      this.style.setProperty('--sd-pack-w', `${Math.round(area.w)}px`);
      this.style.setProperty('--sd-pack-h', `${Math.round(area.h)}px`);
    }

    /** Quita coordenadas polares (al pasar a un layout nativo). */
    #clearPolar(actions) {
      actions.forEach((a, i) => {
        a.style.removeProperty('--sd-x');
        a.style.removeProperty('--sd-y');
        a.style.setProperty('--i', String(i));
        a.setAttribute('data-radial', '');
        const label = a.getAttribute('label') || a.textContent.trim();
        if (label) {
          if (!a.title) a.title = label;
          if (!a.hasAttribute('aria-label')) a.setAttribute('aria-label', label);
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
      delete this.dataset.packed;
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
