import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import './check-icon-button.js';
import { clampTo } from '../_shared/misc-utils.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

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
 *   icon, label, color (brand|neutral|success|warning|danger), href, disabled
 *   El clic dispara is-select y, si no está disabled ni tiene href, cierra el dial.
 */
(() => {
  /** Rectangulo libre donde cabe el abanico. */
  type Banda = { left: number; top: number; right: number; bottom: number; w: number; h: number };

  const OBSERVED = [
    'icon', 'open-icon', 'label', 'direction', 'open', 'distance',
    'start-angle', 'sweep', 'arc', 'radius', 'boundary',
    'data-layout', 'data-wrapper', 'data-start-angle', 'data-sweep',
    'data-arc', 'data-radius',
  ];

  const DIRECTIONS = ['up', 'down', 'left', 'right', 'radial'];

  const DEG = Math.PI / 180;

  /** Personalización por atributo (ver `core/attrs.ts`). */
  const STYLE_ATTRS = {
    radius: '--is-speed-dial-radius',
  };

  class IsSpeedDial extends withStyleAttrs(HTMLElement) {
    static styleAttrs = STYLE_ATTRS;

    static get observedAttributes(): string[] { return [...OBSERVED, ...Object.keys(STYLE_ATTRS)]; }

    #mo: MutationObserver | null = null;
    #ro: ResizeObserver | null = null;
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
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
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#trigger = this.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      // is-check-icon-button ya gestiona el estado visual y emite is-change.
      this.#trigger?.addEventListener('is-change', (e: Event) => {
        const { checked } = (e as CustomEvent<{ checked: boolean }>).detail;
        if (checked === this.isOpen) return; // ya sincronizado
        checked ? this.open() : this.close();
      });
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      this.#syncDirection();
      this.#syncIcon();
      this.#mountActions();
      if (this.hasAttribute('open')) this.open();
      this.#onWinResize = () => { if (this.#isRadial && this.isOpen) this.#layoutRadial(); };
      // El primer layout corre antes de que iconos y fuentes fijen el tamano
      // real de las acciones, asi que el abanico salia descolocado hasta que
      // algo (un scroll) lo recalculaba. Se re-mide cuando el tamano cambia.
      if ('ResizeObserver' in window) {
        this.#ro = new ResizeObserver(() => this.#onWinResize());
        this.#ro!.observe(this);
        for (const a of this.children) this.#ro!.observe(a);
      }
      document.fonts?.ready?.then(() => this.#onWinResize()).catch(() => {});
      window.addEventListener('load', this.#onWinResize);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#mo?.disconnect();
      this.#dismiss.detach();
      window.removeEventListener('load', this.#onWinResize);
      this.#ro?.disconnect();
      this.#ro = null;
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
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
      if (!this.#trigger || !this.shadowRoot!) return;
      this.#trigger.checked = true;
      this.#trigger.setAttribute('aria-expanded', 'true');
      const root = this.shadowRoot!.querySelector<HTMLElement>('.root')!;
      if (root) root.hidden = false;
      this.setAttribute('open', '');
      this.#mountActions();
      if (this.#isRadial) {
        // Tras el reflow: los items ya tienen tamano medible.
        requestAnimationFrame(() => this.#layoutRadial());
      }
      this.#dismiss.attach();
      emit(this, 'is-toggle', { open: true });
    }

    close() {
      if (!this.#trigger || !this.shadowRoot!) return;
      this.#trigger.checked = false;
      this.#trigger.setAttribute('aria-expanded', 'false');
      const root = this.shadowRoot!.querySelector<HTMLElement>('.root')!;
      if (root) root.hidden = true;
      this.removeAttribute('open');
      this.#dismiss.detach();
      emit(this, 'is-toggle', { open: false });
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    #syncDirection() {
      const root = this.shadowRoot?.querySelector<HTMLElement>('.root');
      if (!root) return;
      const d = this.getAttribute('direction') || 'up';
      const dir = DIRECTIONS.includes(d) ? d : 'up';
      root.dataset.direction = dir;
    }

    #syncIcon() {
      if (!this.#trigger) return;
      const icon = this.#prop('icon');
      const openIcon = this.#prop('open-icon');
      if (icon) this.#trigger.setAttribute('icon', icon);
      if (openIcon) this.#trigger.setAttribute('checked-icon', openIcon);
      const label = this.#prop('label');
      if (label) this.#trigger.setAttribute('label', label);
    }

    #mountActions() {
      if (!this.shadowRoot!) return;
      const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot')!;
      const actions = slot?.assignedElements?.() ?? [];
      const observer = new MutationObserver(() => this.#toggleActionBindings());
      this.#mo?.disconnect();
      this.#mo = observer;
      observer.observe(this, { childList: true });
      this.#toggleActionBindings();
      // stagger delay por índice
      actions.forEach((a: Element, i: number) => {
        (a as HTMLElement).style.setProperty('--i', String(i));
      });
    }

    #toggleActionBindings() {
      if (!this.shadowRoot!) return;
      const actions = [...(this.shadowRoot!.querySelector<HTMLSlotElement>('slot')?.assignedElements?.() ?? [])];
      for (const bruto of actions) {
        const el = bruto as HTMLElement;
        // Marca en el propio nodo para no volver a enganchar el listener al
        // reasignarse el slot; no hay sitio mejor que el elemento.
        const a = el as HTMLElement & { __bound?: boolean };
        if (a.__bound) continue;
        a.__bound = true;
        a.addEventListener('click', (e: Event) => {
          if (a.hasAttribute('disabled')) { e.preventDefault(); return; }
          emit(this, 'is-select', { action: a });
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
    #prop(name: string): string | null {
      const data = this.getAttribute(`data-${name}`);
      if (data != null && data !== '') return data;
      const plain = this.getAttribute(name);
      return plain != null && plain !== '' ? plain : null;
    }

    #numProp(name: string): number | null {
      const raw = this.#prop(name);
      // OJO: Number(null) es 0 y Number.isFinite(0) es true. Sin este guard,
      // un data prop AUSENTE devolvia 0, que para `start-angle` es un angulo
      // valido (derecha): el abanico nunca se orientaba al espacio libre y en
      // una esquina se estrechaba hasta cabar un item por anillo.
      if (raw == null || raw === '') return null;
      const v = Number(raw);
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
        const el = this.closest(sel) || document.querySelector<HTMLElement>(sel);
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
    #autoStartAngle(cx: number, cy: number, bounds: DOMRect): number {
      const vx = (bounds.right - cx) - (cx - bounds.left);
      const vy = (bounds.bottom - cy) - (cy - bounds.top);
      if (vx === 0 && vy === 0) return -90;
      return Math.atan2(vy, vx) / DEG;
    }

    /**
     * Amplitud util del abanico: si el trigger esta pegado a un borde no
     * tiene sentido barrer 360deg. Se estima con el espacio libre a cada lado.
     */
    #autoArc(cx: number, cy: number, bounds: DOMRect, radius: number): number {
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
    #maxRadiusFor(cx: number, cy: number, bounds: DOMRect, startDeg: number, arcDeg: number, itemHalf: number): number {
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
    #packArea(bounds: DOMRect, triggerRect: DOMRect, gap: number): Banda | null {
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
      if (!this.shadowRoot || !this.#trigger) return;
      const actions = [...(this.shadowRoot!.querySelector<HTMLSlotElement>('slot')?.assignedElements?.() ?? [])];
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

      // Marcar ANTES de medir: en radial las acciones son circulares (36x36)
      // y sin data-radial se miden como pildora (55x39). Con ese tamano
      // inflado el arco calculado no cabia y el abanico caia al reparto
      // empaquetado; ademas era la causa de que "se arreglara" al hacer
      // scroll, porque la segunda pasada ya medía el circulo.
      for (const bruto of actions) {
        const a = bruto as HTMLElement;
        a.setAttribute('data-radial', '');
        const label = a.getAttribute('label') || (a.textContent ?? '').trim();
        if (label) {
          if (!a.title) a.title = label;
          if (!a.hasAttribute('aria-label')) a.setAttribute('aria-label', label);
        }
      }

      let itemSize = 0;
      for (const bruto of actions) {
        const a = bruto as HTMLElement;
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
      const attrRadius = this.#numProp('radius');
      const center = attrStart != null ? attrStart : this.#autoStartAngle(cx, cy, bounds);
      const dir = this.#prop('sweep') === 'counter-clockwise' ? -1 : 1;
      const wanted = attrRadius && attrRadius > 0 ? attrRadius : minRadius;
      const baseRadius = Math.max(minRadius, wanted);

      /**
       * Arco que cabe A ESE RADIO. Cada anillo resuelve el suyo: un arco
       * estrecho valido cerca del trigger puede no servir mas lejos, y un
       * arco amplio imposible al principio si cabe al reorientarlo. Antes se
       * calculaba UNO solo para todos los anillos y, en una esquina, el
       * segundo anillo se descartaba y todo caia al reparto empaquetado.
       */
      const arcFor = (radius: number): { arc: number; start: number; fits: boolean } => {
        let a = attrArc && attrArc > 0
          ? clampTo(attrArc, 10, 360)
          : this.#autoArc(cx, cy, bounds, radius);
        let st = a >= 360 ? center : center - a / 2;
        let guard = 0;
        while (this.#maxRadiusFor(cx, cy, bounds, st, a, itemHalf) < radius
               && a > 20 && guard < 16) {
          a = Math.max(20, a * 0.8);
          st = a >= 360 ? center : center - a / 2;
          guard += 1;
        }
        const fits = this.#maxRadiusFor(cx, cy, bounds, st, a, itemHalf) >= radius;
        return { arc: a, start: st, fits };
      };

      const capacityAt = (radius: number, arc: number): number => {
        const minStep = 2 * Math.asin(clampTo((itemHalf + gap / 2) / radius, 0, 1)) / DEG;
        if (!Number.isFinite(minStep) || minStep <= 0) return actions.length;
        return arc >= 360
          ? Math.max(1, Math.floor(360 / minStep))
          : Math.max(1, Math.floor(arc / minStep) + 1);
      };

      // Anillos concentricos, cada uno con su propio arco y acotado al wrapper.
      const rings = [];
      let remaining = actions.length;
      let attempt = 0;
      const step = itemSize + gap;
      while (remaining > 0 && attempt < 24) {
        const radius = baseRadius + attempt * step;
        attempt += 1;
        const { arc: ringArc, start: ringStart, fits } = arcFor(radius);
        // Si ese radio no cabe se prueba el SIGUIENTE, no se abandona: un
        // radio algo mayor puede admitir un arco mas ancho (mas espacio en la
        // direccion libre). Antes se cortaba al primer fallo y los items
        // sobrantes se apretaban en el ultimo anillo hasta solaparse.
        if (!fits) continue;
        const count = Math.min(remaining, capacityAt(radius, ringArc));
        if (count <= 0) continue;
        rings.push({ radius, count, arc: ringArc, start: ringStart });
        remaining -= count;
      }

      // Si el area no da para mas anillos, los que sobran se reparten en el
      // ULTIMO anillo valido apretando el paso angular. Antes se caia a un
      // grid centrado en el wrapper, que alejaba las acciones del trigger y
      // las sacaba de la forma de anillo: el abanico debe seguir siendo un
      // abanico pegado al trigger aunque vaya justo de sitio.
      // Tras recorrer todos los radios candidatos: si aun sobran, el wrapper
      // es demasiado pequeno para un abanico y se reparte por layout.
      if (remaining > 0) {
        this.#pack(actions, 'grid');
        return;
      }
      delete this.dataset.packed;
      this.style.removeProperty('--sd-pack-left');

      // Diagnostico del reparto: "radio x nº de items (arco)" por anillo.
      // Sirve para depurar el abanico sin instrumentar el componente.
      this.dataset.rings = rings
        .map((r) => `${Math.round(r.radius)}x${r.count}@${Math.round(r.arc)}`)
        .join(',');

      let index = 0;
      rings.forEach((ring, i: number) => {
        const slots = ring.arc >= 360 ? ring.count : Math.max(ring.count - 1, 1);
        const step = ring.arc >= 360 ? 360 / ring.count : ring.arc / slots;
        // Anillos alternos desfasados medio paso: distribucion en panal.
        const offset = i % 2 ? step / 2 : 0;
        for (let k = 0; k < ring.count; k += 1) {
          const angle = (ring.start + offset + dir * step * k) * DEG;
          const x = Math.cos(angle) * ring.radius;
          const y = Math.sin(angle) * ring.radius;
          const el = actions[index++] as HTMLElement | undefined;
          if (!el) return;
          el.setAttribute('data-radial', '');
          const label = el.getAttribute('label') || (el.textContent ?? '').trim();
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
    #pack(actions: readonly Element[], mode: string): void {
      this.#clearPolar(actions);
      this.dataset.packed = mode;

      const rootEl = this.shadowRoot?.querySelector<HTMLElement>('.root');
      if (!rootEl || !this.#trigger) return;

      const bounds = this.#boundaryRect();
      const triggerRect = this.#trigger.getBoundingClientRect();
      // Origen ESTABLE: .root, que no se mueve. Medir contra .actions daba un
      // delta de 0 en la segunda pasada (es el elemento que este mismo
      // calculo reposiciona) y la caja se quedaba pegada al trigger.
      const box = rootEl.getBoundingClientRect();
      const area = this.#packArea(bounds, triggerRect, 12);
      if (!area) { this.style.removeProperty('--sd-pack-left'); return; }

      this.style.setProperty('--sd-pack-left', `${Math.round(area.left - box.left)}px`);
      this.style.setProperty('--sd-pack-top', `${Math.round(area.top - box.top)}px`);
      this.style.setProperty('--sd-pack-w', `${Math.round(area.w)}px`);
      this.style.setProperty('--sd-pack-h', `${Math.round(area.h)}px`);
    }

    /** Quita coordenadas polares (al pasar a un layout nativo). */
    #clearPolar(actions: readonly Element[]): void {
      actions.forEach((bruto: Element, i: number) => {
        const a = bruto as HTMLElement;
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
      if (!this.shadowRoot!) return;
      for (const bruto of this.shadowRoot!.querySelector<HTMLSlotElement>('slot')?.assignedElements?.() ?? []) {
        const a = bruto as HTMLElement;
        a.style.removeProperty('--sd-x');
        a.style.removeProperty('--sd-y');
        a.removeAttribute('data-radial');
      }
      delete this.dataset.packed;
    }

    #trigger!: HTMLElement;
    #onWinResize!: () => void;

    /**
     * Ciclo "abierto" compartido con is-dropdown / is-context-menu
     * (_shared/popup-dismiss.js): pointerdown fuera, Escape y recolocado
     * del abanico radial en scroll/resize, todo solo mientras esta abierto.
     */
    #dismiss = createPopupDismiss(this, {
      onEscape: () => this.close(),
      onOutside: () => this.close(),
      onReposition: () => { if (this.#isRadial) this.#layoutRadial(); },
    });
  }

  defineElement('is-speed-dial', IsSpeedDial);

  // Acción individual — patrón primario: <button> extendido.
  class IsSpeedDialAction extends HTMLElement {
    static get observedAttributes(): string[] { return ['icon', 'label', 'color', 'href', 'disabled']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <a part="action" class="action" role="menuitem" tabindex="-1">
          <span class="label"><slot></slot></span>
          <span class="ico"><slot name="icon"><is-icon icon="mdi:star-outline"></is-icon></slot></span>
        </a>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
    }
    connectedCallback(): void {
      const link = this.shadowRoot?.querySelector<HTMLAnchorElement>('a');
      if (!link) return;
      const href = this.getAttribute('href');
      if (href) link.setAttribute('href', href);
      const label = this.getAttribute('label');
      if (label) link.setAttribute('aria-label', label);
      const variant = this.getAttribute('color') || 'brand';
      link.dataset.color = variant;
      link.tabIndex = this.hasAttribute('disabled') ? -1 : 0;
      // Por defecto se cierra el dial al elegir; si tiene href, no intercepta.
      if (href) link.addEventListener('click', (e: Event) => e.stopPropagation());
      if (this.hasAttribute('disabled')) link.classList.add('is-disabled');
    }
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (oldVal === newVal) return;
      const link = this.shadowRoot?.querySelector<HTMLAnchorElement>('a');
      if (!link) return;
      if (name === 'href') link.setAttribute('href', newVal || '#');
      if (name === 'label') link.setAttribute('aria-label', newVal || '');
      if (name === 'color') link.dataset.color = newVal || 'brand';
      if (name === 'disabled') {
        link.classList.toggle('is-disabled', !!newVal);
        link.tabIndex = newVal ? -1 : 0;
      }
    }
  }
  defineElement('is-speed-dial-action', IsSpeedDialAction);
})();
