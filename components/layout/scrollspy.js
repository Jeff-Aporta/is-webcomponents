import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-scrollspy> — Web Component (vanilla, zero dependencies).
 *
 * Observa la intersección de un conjunto de "triggers" dentro de un contenedor
 * scrollable y va marcando el enlace correspondiente del nav con
 *   aria-current="location"   y la clase CSS  is-scrollspy-active
 * a medida que el usuario hace scroll.
 *
 * Pensado para la navegación lateral de los previews de docs:
 *
 *   <is-main slot="start">
 *     <section id="intro">…</section>
 *     <section id="examples">…</section>
 *     <section id="reference">…</section>
 *   </is-main>
 *
 *   <aside class="sidebar" slot="end">
 *     <is-scrollspy target="is-main">
 *       <a href="#intro">Introducción</a>
 *       <a href="#examples">Ejemplos</a>
 *       <a href="#reference">Referencia</a>
 *     </is-scrollspy>
 *   </aside>
 *
 * Atributos
 *   target        CSS selector — contenedor scrollable que se observa.
 *                 Si no se da, se resuelve al ancestro: <is-main>, <main>,
 *                 [role="main"] o el propio <is-split-panel>.
 *   trigger       CSS selector — qué hijos del target actuan como secciones.
 *                 Por defecto: section[id], article[id].
 *   root-margin   string pasado a IntersectionObserver. Default "-30% 0px -55% 0px"
 *                 (en el centro del viewport, igual que el IO inline de los previews).
 *   threshold     number 0..1. Default 0.
 *
 * Slots
 *   default   enlaces <a href="#id"> que el componente va marcando.
 *             Cada <a> cuyo hash coincida con el id de un trigger activo
 *             recibe aria-current="location" e `is-scrollspy-active`.
 *
 * API
 *   spy.activate(id)   fuerza la marca del enlace con ese id (sin scroll)
 *   spy.refresh()       re-registra los triggers (si el target cambió)
 *   spy.triggers        array con los triggers observados
 *   spy.active          id del trigger activo (o null)
 *
 * Eventos
 *   is-activated  detail: { id, link }  — cada vez que un enlace se marca
 *   is-deactivated detail: { id, link } — al perder la marca
 *
 * CSS hooks
 *   El nav marcado: `is-scrollspy-nav.is-scrollspy-active` y el enlace
 *   `a.is-scrollspy-active` (mismo estilo que `.sidebar nav a.active`).
 */

(() => {
  const DEFAULTS = {
    rootMargin: '-30% 0px -55% 0px',
    threshold: 0,
  };

  const DEFAULT_TARGET_SELECTORS = [
    'is-main',
    'main',
    '[role="main"]',
  ];

  const DEFAULT_TRIGGER_SELECTORS = [
    'section[id]',
    'article[id]',
    '[data-scrollspy-trigger]',
  ];

  class IsScrollspy extends HTMLElement {
    static get observedAttributes() {
      return ['target', 'trigger', 'root-margin', 'threshold'];
    }

    #target = null;
    #targetSelector = null;
    #triggerSelector = null;
    #observer = null;
    #links = [];
    #triggerEntries = new Map(); // id -> { el, ratio, active }
    #activeId = null;
    #mounted = false;
    #mutation = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      adoptCss(shadow, import.meta.url);

      shadow.querySelector('slot').addEventListener('slotchange', () => {
        if (this.#mounted) this.#refreshLinks();
      });

      this.addEventListener('click', this.#onClick);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#refreshLinks();
      this.#setup();
    }

    disconnectedCallback() {
      this.#teardown();
      this.#mutation?.disconnect();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'target') this.#targetSelector = newVal || null;
      if (name === 'trigger') this.#triggerSelector = newVal || null;
      this.#setup();
    }

    // ---- público ----------------------------------------------------------

    /** Resuelve manualmente el target (sin esperar al siguiente setup). */
    refresh() {
      this.#setup();
      this.#refreshLinks();
    }

    /** Fuerza la marca del enlace de un id (no hace scroll). */
    activate(id) {
      this.#setActive(id);
    }

    get triggers() {
      if (!this.#target) return [];
      const sel = this.#triggerSelector || DEFAULT_TRIGGER_SELECTORS.join(',');
      try {
        return [...this.#target.querySelectorAll(sel)];
      } catch {
        return [];
      }
    }

    get active() { return this.#activeId; }

    // ---- privados --------------------------------------------------------

    #findTarget() {
      if (this.#targetSelector) {
        const found = document.querySelector(this.#targetSelector);
        if (found) return found;
      }
      for (const sel of DEFAULT_TARGET_SELECTORS) {
        const found = this.closest(sel);
        if (found) return found;
      }
      // Fallback: split-panel → main split sibling.
      const sp = this.closest('is-split-panel');
      if (sp) {
        const m = sp.querySelector('is-main, main, [role="main"]');
        if (m) return m;
      }
      return null;
    }

    #setup() {
      this.#teardown();
      const target = this.#findTarget();
      if (!target) return;
      this.#target = target;

      // Re-pintar triggers y links por si el target cambió.
      this.#refreshLinks();
      const triggers = this.triggers;
      triggers.forEach((el) => {
        this.#triggerEntries.set(el.id, { el, ratio: 0, active: false });
      });

      if (!('IntersectionObserver' in window) || triggers.length === 0) {
        // Fallback: sin IO, marca el primer link que tenga match.
        const fallback = triggers.find((t) => this.#linkFor(t.id));
        if (fallback) this.#setActive(fallback.id);
        return;
      }

      this.#observer = new IntersectionObserver(this.#onIntersect, {
        root: target,
        rootMargin: this.getAttribute('root-margin') || DEFAULTS.rootMargin,
        threshold: this.#readThreshold(),
      });
      triggers.forEach((t) => this.#observer.observe(t));

      // Si el target gana/pierde triggers dinámicamente, refresca.
      this.#mutation = new MutationObserver(() => {
        if (!this.#target) return;
        const fresh = this.triggers;
        const freshIds = new Set(fresh.map((el) => el.id));
        for (const id of [...this.#triggerEntries.keys()]) {
          if (!freshIds.has(id)) this.#triggerEntries.delete(id);
        }
        for (const el of fresh) {
          if (!this.#triggerEntries.has(el.id)) {
            this.#triggerEntries.set(el.id, { el, ratio: 0, active: false });
            this.#observer.observe(el);
          }
        }
        this.#refreshLinks();
      });
      this.#mutation.observe(this.#target, { childList: true, subtree: true });
    }

    #teardown() {
      this.#observer?.disconnect();
      this.#observer = null;
      this.#triggerEntries.clear();
    }

    #readThreshold() {
      const raw = Number(this.getAttribute('threshold'));
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : DEFAULTS.threshold;
    }

    #onIntersect = (entries) => {
      for (const entry of entries) {
        const t = this.#triggerEntries.get(entry.target.id);
        if (!t) continue;
        t.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
      }
      this.#pickActive();
    };

    #pickActive() {
      // El trigger activo es el ÚLTIMO cuya parte superior ya pasó por
      // el umbral superior del rootMargin (en píxeles: el -30% interno).
      // Así "intro" se marca cuando su título entra en la zona caliente,
      // y "examples" cuando el título de intro ya salió por arriba.
      //
      // Si ninguno intersecta (zona muerta), se mantiene el anterior.
      const root = this.#target;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      const m = (this.getAttribute('root-margin') || DEFAULTS.rootMargin).match(/-?\d+(\.\d+)?/);
      const topPct = m ? Math.abs(parseFloat(m[0])) / 100 : 0.3;
      const cutoff = rootRect.top + rootRect.height * topPct;

      let best = null;
      for (const t of this.#triggerEntries.values()) {
        const top = t.el.getBoundingClientRect().top;
        if (top <= cutoff) {
          if (!best || top > best.el.getBoundingClientRect().top) best = t;
        }
      }
      this.#setActive(best ? best.el.id : null);
    }

    #setActive(id) {
      if (id === this.#activeId) return;
      const prev = this.#activeId;
      const prevLink = prev ? this.#linkFor(prev) : null;
      if (prevLink) {
        prevLink.classList.remove('is-scrollspy-active');
        prevLink.removeAttribute('aria-current');
        this.dispatchEvent(new CustomEvent('is-deactivated', {
          detail: { id: prev, link: prevLink },
          bubbles: true,
          composed: true,
        }));
      }
      this.#activeId = id;
      if (id) {
        const link = this.#linkFor(id);
        if (link) {
          link.classList.add('is-scrollspy-active');
          link.setAttribute('aria-current', 'location');
          this.dispatchEvent(new CustomEvent('is-activated', {
            detail: { id, link },
            bubbles: true,
            composed: true,
          }));
        }
      }
    }

    #linkFor(id) {
      if (!id) return null;
      const hash = `#${id}`;
      return this.#links.find((a) => a.getAttribute('href') === hash) || null;
    }

    #refreshLinks = () => {
      const slot = this.shadowRoot?.querySelector('slot');
      if (!slot) return;
      this.#links = slot
        .assignedElements({ flatten: true })
        .filter((el) => el.tagName === 'A');
      this.#links.forEach((a) => {
        if (!a.hasAttribute('href')) return;
        a.classList.remove('is-scrollspy-active');
        a.removeAttribute('aria-current');
      });
    };

    #onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      // Optimista: refleja el click inmediatamente. El IO lo confirmará.
      this.#setActive(id);
    };
  }

  if (!customElements.get('is-scrollspy')) {
    customElements.define('is-scrollspy', IsScrollspy);
  }
  if (typeof window !== 'undefined') {
    window.IsScrollspy = IsScrollspy;
  }
})();
