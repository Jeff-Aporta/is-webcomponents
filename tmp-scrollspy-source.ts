import { adoptCss, defineElement, emit } from '../../core/element.js';
import {
  getComponentPrefs,
  removeComponentPrefs,
  setComponentPrefs,
} from '../_shared/prefs.js';

/**
 * <iswc-scrollspy> — Web Component (vanilla, zero dependencies).
 *
 * Observa la intersección de un conjunto de "triggers" dentro de un contenedor
 * scrollable y va marcando el enlace correspondiente del nav con
 *   aria-current="location"   y la clase CSS  iswc-scrollspy-active
 * a medida que el usuario hace scroll.
 *
 * Pensado para la navegación lateral de los previews de docs:
 *
 *   <iswc-main slot="start">
 *     <section id="intro">…</section>
 *     <section id="examples">…</section>
 *     <section id="reference">…</section>
 *   </iswc-main>
 *
 *   <aside class="sidebar" slot="end">
 *     <iswc-scrollspy target="iswc-main">
 *       <a href="#intro">Introducción</a>
 *       <a href="#examples">Ejemplos</a>
 *       <a href="#reference">Referencia</a>
 *     </iswc-scrollspy>
 *   </aside>
 *
 * Atributos
 *   target        CSS selector — contenedor scrollable que se observa.
 *                 Si no se da, se resuelve al ancestro: <iswc-main>, <main>,
 *                 [role="main"] o el propio <iswc-split-panel>.
 *   trigger       CSS selector — qué hijos del target actuan como secciones.
 *                 Por defecto: section[id], article[id].
 *   root-margin   string pasado a IntersectionObserver. Default "-30% 0px -55% 0px"
 *                 (en el centro del viewport, igual que el IO inline de los previews).
 *   threshold     number 0..1. Default 0.
 *   storage-key   opcional (Phase W10) — clave bajo `iswc-scrollspy` para
 *                 persistir el anchor activo. Si no se da, se intenta heredar
 *                 del `storage-key` del target (típicamente `<iswc-main>`).
 *
 * Slots
 *   default   enlaces <a href="#id"> que el componente va marcando.
 *             Cada <a> cuyo hash coincida con el id de un trigger activo
 *             recibe aria-current="location" e `iswc-scrollspy-active`.
 *
 * API
 *   spy.activate(id)       fuerza la marca del enlace con ese id (sin scroll)
 *   spy.refresh()          re-registra los triggers (si el target cambió)
 *   spy.triggers           array con los triggers observados
 *   spy.active             id del trigger activo (o null)
 *   spy.activeStorageKey   string con la storage-key resuelta (o null)
 *
 * Eventos
 *   iswc-activated  detail: { id, link }  — cada vez que un enlace se marca
 *   iswc-deactivated detail: { id, link } — al perder la marca
 *
 * Phase W10 — Persistencia del anchor activo
 * ------------------------------------------
 * El scroll-spy de los previews persiste el id de la sección actualmente
 * activa (marcada con `aria-current="location"`) en `localStorage` con TTL
 * de 1h, y al hacer F5 hace `scrollTo` sobre la sección guardada para que
 * el usuario vuelva a donde estaba. Sólo aplica a previews de componente
 * (target = `<iswc-main>` con `storage-key`); un uso suelto del componente
 * (sin storage-key, o target suelto sin contexto de preview) es no-op.
 *
 *   * Persiste: en cada `#setActive`, debounced ~200 ms, bajo
 *     `iswc-root['iswc-scrollspy'][storageKey] = { activeId, savedAt }`.
 *   * Restaura: tras el mount, en `requestAnimationFrame × 2`, hace scroll al
 *     elemento `#${activeId}` dentro del target. Usa `behavior: 'auto'` para
 *     respetar `prefers-reduced-motion` (sin animación).
 *   * Limpia: cuando el target emite `scroll` con `scrollTop <= 4 px` (usuario
 *     volvió al top). Cancela el save pendiente para no rescribir la pref
 *     recién borrada. Se ignora durante los primeros 500 ms tras `connect` (la
 *     ventana de boot donde todavía no se ha llamado al primer `pickActive`).
 *
 * CSS hooks
 *   El nav marcado: `iswc-scrollspy-nav.iswc-scrollspy-active` y el enlace
 *   `a.iswc-scrollspy-active` (mismo estilo que `.sidebar nav a.active`).
 */

(() => {
  const DEFAULTS = {
    rootMargin: '-30% 0px -55% 0px',
    threshold: 0,
  };

  // Phase W10: persistencia del anchor activo.
  const ACTIVE_ANCHOR_TTL_MS = 3_600_000;       // 1h (alineado con scroll-memory)
  const ACTIVE_SAVE_DEBOUNCE_MS = 200;          // evita escribir 60×/s con el IO
  const TOP_CLEAR_THRESHOLD_PX = 4;             // tolerancia para "scrollTop=0"
  const BOOT_GRACE_MS = 500;                    // ventana donde no se limpia pref

  const DEFAULT_TARGET_SELECTORS: readonly string[] = [
    'iswc-main',
    'main',
    '[role="main"]',
  ];

  const DEFAULT_TRIGGER_SELECTORS: readonly string[] = [
    'section[id]',
    'article[id]',
    '[data-scrollspy-trigger]',
  ];

  interface TriggerEntry {
    el: HTMLElement;
    ratio: number;
    active: boolean;
  }

  class IswcScrollspy extends HTMLElement {
    static get observedAttributes(): string[] {
      return ['target', 'trigger', 'root-margin', 'threshold', 'storage-key'];
    }

    #target: HTMLElement | null = null;
    #targetSelector: string | null = null;
    #triggerSelector: string | null = null;
    #observer: IntersectionObserver | null = null;
    #links: HTMLElement[] = [];
    #triggerEntries: Map<string, TriggerEntry> = new Map(); // id -> { el, ratio, active }
    #activeId: string | null = null;
    #mounted = false;
    #mutation: MutationObserver | null = null;
    // Phase W10: persistencia del anchor activo (localStorage con TTL 1h).
    #activeIdSaveTimer: number = 0;
    #bootRestored = false;
    #onTargetScroll: ((e: Event) => void) | null = null;
    #connectedAt = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      adoptCss(shadow, import.meta.url);

      shadow.querySelector<HTMLSlotElement>('slot')?.addEventListener('slotchange', () => {
        if (this.#mounted) this.#refreshLinks();
      });

      this.addEventListener('click', this.#onClick);
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#connectedAt = Date.now();
      this.#refreshLinks();
      this.#setup();
      this.#bootRestoreActiveAnchor();
      this.#bindTopClearListener();
    }

    disconnectedCallback(): void {
      this.#teardown();
      this.#mutation?.disconnect();
      this.#unbindTopClearListener();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'target') this.#targetSelector = newVal || null;
      if (name === 'trigger') this.#triggerSelector = newVal || null;
      this.#setup();
    }

    // ---- público ----------------------------------------------------------

    /** Resuelve manualmente el target (sin esperar al siguiente setup). */
    refresh(): void {
      this.#setup();
      this.#refreshLinks();
    }

    /** Fuerza la marca del enlace de un id (no hace scroll). */
    activate(id: string | null): void {
      this.#setActive(id);
    }

    /** Phase W10: clave bajo la que se persiste el anchor activo. Null si no aplica. */
    get activeStorageKey(): string | null {
      return this.#resolveStorageKey();
    }

    get triggers(): HTMLElement[] {
      if (!this.#target) return [];
      const sel = this.#triggerSelector || DEFAULT_TRIGGER_SELECTORS.join(',');
      try {
        return [...this.#target.querySelectorAll<HTMLElement>(sel)];
      } catch {
        return [];
      }
    }

    get active(): string | null { return this.#activeId; }

    // ---- privados --------------------------------------------------------

    #findTarget(): HTMLElement | null {
      if (this.#targetSelector) {
        const found = document.querySelector<HTMLElement>(this.#targetSelector);
        if (found) return found;
      }
      for (const sel of DEFAULT_TARGET_SELECTORS) {
        const found = this.closest(sel);
        if (found) return found as HTMLElement;
      }
      // Fallback: split-panel → main split sibling.
      const sp = this.closest('iswc-split-panel');
      if (sp) {
        const m = sp.querySelector<HTMLElement>('iswc-main, main, [role="main"]');
        if (m) return m;
      }
      return null;
    }

    #setup(): void {
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
      triggers.forEach((t) => { if (this.#observer) this.#observer.observe(t); });
      // Marca inicial sin esperar al primer scroll ni al primer callback del
      // observer (que puede tardar un frame o llegar con el layout a medias).
      requestAnimationFrame(() => { if (this.#mounted) this.#pickActive(); });

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
            this.#observer?.observe(el);
          }
        }
        this.#refreshLinks();
      });
      this.#mutation.observe(this.#target, { childList: true, subtree: true });
    }

    #teardown(): void {
      // Flush: si había un save debounced pendiente, escribe el último id
      // antes de desconectar (no perder el último scroll del usuario).
      if (this.#activeIdSaveTimer) {
        clearTimeout(this.#activeIdSaveTimer);
        this.#activeIdSaveTimer = 0;
        if (this.#activeId && this.#isPreviewContext()) {
          this.#persistActiveAnchor(this.#activeId);
        }
      }
      this.#observer?.disconnect();
      this.#observer = null;
      this.#triggerEntries.clear();
    }

    #readThreshold(): number {
      const raw = Number(this.getAttribute('threshold'));
      return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : DEFAULTS.threshold;
    }

    #onIntersect = (entries: IntersectionObserverEntry[]): void => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        const t = this.#triggerEntries.get(id);
        if (!t) continue;
        t.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
      }
      this.#pickActive();
    };

    #pickActive(): void {
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

      let best: TriggerEntry | null = null;
      let first: TriggerEntry | null = null;
      for (const t of this.#triggerEntries.values()) {
        const top = t.el.getBoundingClientRect().top;
        if (!first || top < first.el.getBoundingClientRect().top) first = t;
        if (top <= cutoff) {
          if (!best || top > best.el.getBoundingClientRect().top) best = t;
        }
      }
      // Al cargar (scroll arriba) puede que ningún trigger haya cruzado el
      // umbral todavía: marca el primero para que siempre haya un activo.
      let chosen = best ?? first;
      // Phase W1: si el id elegido no tiene enlace (p.ej. `intro`, `anatomy`,
      // `ejemplos` — excluidos del TOC), cae al siguiente trigger CON enlace.
      // Sin esto, `#setActive` setea `#activeId` pero `#paintActive` no puede
      // pintar nada y el panel lateral queda sin highlight.
      if (chosen && !this.#linkFor(chosen.el.id)) {
        const sorted = Array.from(this.#triggerEntries.values())
          .sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top);
        chosen = sorted.find((t) => this.#linkFor(t.el.id)) ?? null;
      }
      this.#setActive(chosen ? chosen.el.id : null);
    }

    #setActive(id: string | null): void {
      if (id === this.#activeId) { this.#paintActive(); return; }
      const prev = this.#activeId;
      const prevLink = prev ? this.#linkFor(prev) : null;
      if (prevLink) {
        prevLink.classList.remove('iswc-scrollspy-active');
        prevLink.removeAttribute('aria-current');
        emit(this, 'iswc-deactivated', { id: prev, link: prevLink });
      }
      this.#activeId = id;
      if (id) {
        const link = this.#linkFor(id);
        if (link) {
          link.classList.add('iswc-scrollspy-active');
          link.setAttribute('aria-current', 'location');
          emit(this, 'iswc-activated', { id, link });
        }
      }
      // Phase W10: persistir (debounced) el id activo, sólo en contexto de preview.
      this.#schedulePersistActive(id);
    }

    #linkFor(id: string | null): HTMLElement | null {
      if (!id) return null;
      const hash = `#${id}`;
      return this.#links.find((a) => a.getAttribute('href') === hash) ?? null;
    }

    #refreshLinks = (): void => {
      const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot');
      if (!slot) return;
      this.#links = slot
        .assignedElements({ flatten: true })
        .filter((el): el is HTMLElement => el.tagName === 'A');
      this.#links.forEach((a) => {
        if (!a.hasAttribute('href')) return;
        a.classList.remove('iswc-scrollspy-active');
        a.removeAttribute('aria-current');
      });
      // Repintar el activo: este metodo corre tambien en `slotchange`, que
      // llega DESPUES del primer callback del observer. Sin esto se borraba
      // la marca inicial y `#setActive` no la reponia (sale temprano porque
      // el id ya es el activo), asi que al cargar no habia item resaltado
      // hasta que el usuario hacia scroll.
      this.#paintActive();
    };

    /** Aplica la marca al enlace del id activo (idempotente). */
    #paintActive(): void {
      if (!this.#activeId) return;
      const link = this.#linkFor(this.#activeId);
      if (!link) return;
      link.classList.add('iswc-scrollspy-active');
      link.setAttribute('aria-current', 'location');
    }

    #onClick = (e: PointerEvent): void => {
      const a = (e.target as Element | null)?.closest('a[href^="#"]') as HTMLElement | null;
      if (!a) return;
      const href = a.getAttribute('href');
      const id = href ? href.slice(1) : null;
      if (!id) return;
      // Optimista: refleja el click inmediatamente. El IO lo confirmará.
      this.#setActive(id);
    };

    // ---- Phase W10: persistencia del anchor activo ------------------------

    /**
     * Sólo los previews de componente tienen target = `<iswc-main>` con
     * `storage-key`. En ese contexto persistimos; en cualquier otro uso
     * (galería home, demos, marketing) somos no-op.
     */
    #isPreviewContext(): boolean {
      const t = this.#target;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      if (tag !== 'iswc-main') return false;
      const key = (t.getAttribute('storage-key') || '').trim();
      return !!key;
    }

    #resolveStorageKey(): string | null {
      // 1) Atributo propio del scrollspy.
      const own = (this.getAttribute('storage-key') || '').trim();
      if (own) return own;
      // 2) Heredada del target (típicamente `<iswc-main storage-key="…">`).
      if (this.#target) {
        const tKey = (this.#target.getAttribute('storage-key') || '').trim();
        if (tKey) return tKey;
      }
      return null;
    }

    #persistActiveAnchor(activeId: string | null): void {
      const key = this.#resolveStorageKey();
      if (!key) return;
      if (!activeId) {
        removeComponentPrefs('iswc-scrollspy', key);
        return;
      }
      setComponentPrefs('iswc-scrollspy', key, {
        activeId,
        savedAt: Date.now(),
      });
    }

    #schedulePersistActive(id: string | null): void {
      if (!this.#isPreviewContext()) return;
      if (this.#activeIdSaveTimer) {
        clearTimeout(this.#activeIdSaveTimer);
        this.#activeIdSaveTimer = 0;
      }
      this.#activeIdSaveTimer = setTimeout(() => {
        this.#activeIdSaveTimer = 0;
        if (!this.#mounted) return;
        if (!this.#isPreviewContext()) return;
        // Defensa: si el usuario llegó al top justo antes de que se dispare
        // el debounce, no rescribir la pref recién borrada.
        if (this.#target && this.#target.scrollTop <= TOP_CLEAR_THRESHOLD_PX) return;
        this.#persistActiveAnchor(this.#activeId);
      }, ACTIVE_SAVE_DEBOUNCE_MS) as unknown as number;
    }

    #readSavedActiveAnchor(): string | null {
      const key = this.#resolveStorageKey();
      if (!key) return null;
      const saved = getComponentPrefs('iswc-scrollspy', key);
      if (!saved) return null;
      const activeId = (saved as { activeId?: unknown }).activeId;
      const savedAt = Number((saved as { savedAt?: unknown }).savedAt);
      if (typeof activeId !== 'string' || !activeId) return null;
      if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
      if (Date.now() - savedAt > ACTIVE_ANCHOR_TTL_MS) return null;
      return activeId;
    }

    /**
     * Fase 1: si hay anchor guardado, hacer scroll al id dentro del target.
     * Fase 2: si no hay guard, scrollTop=0 (no-op si ya está arriba).
     *
     * Esperar 2 rAFs para que el layout del target esté estable: las demos
     * que monta `<iswc-preview-component>` miden altura en el primer frame.
     * `prefers-reduced-motion` se respeta usando `behavior: 'auto'` siempre.
     */
    #bootRestoreActiveAnchor(): void {
      if (this.#bootRestored) return;
      if (!this.#isPreviewContext()) {
        this.#bootRestored = true; // no-op estable, no reentrar.
        return;
      }
      this.#bootRestored = true;
      if (!this.#target) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!this.#mounted || !this.#target) return;
          const activeId = this.#readSavedActiveAnchor();
          if (!activeId) {
            // Sin guard: scrollTop=0 explícito (puede que el `<iswc-main>`
            // restauró un scrollTop anterior; limpiamos para arrancar arriba).
            try { this.#target.scrollTop = 0; } catch { /* noop */ }
            return;
          }
          const sectionEl = this.#target.querySelector(`#${CSS.escape(activeId)}`);
          if (!sectionEl) {
            // El id guardado no existe ya (contenido cambió): limpiamos.
            const key = this.#resolveStorageKey();
            if (key) removeComponentPrefs('iswc-scrollspy', key);
            return;
          }
          // Posición dentro del target: el main es scrollable por sí mismo,
          // así que calculamos el offset relativo a su `getBoundingClientRect`.
          const targetRect = this.#target.getBoundingClientRect();
          const sectionRect = sectionEl.getBoundingClientRect();
          const top = Math.max(0, this.#target.scrollTop + (sectionRect.top - targetRect.top));
          try {
            this.#target.scrollTo({ top, behavior: 'auto' });
          } catch {
            // Fallback para navegadores sin `scrollTo` opts.
            this.#target.scrollTop = top;
          }
          // Re-pintar el id activo tras el scroll: el IO lo confirmará, pero
          // marcamos optimistamente para que el TOC muestre el item al cargar.
          this.#setActive(activeId);
        });
      });
    }

    #bindTopClearListener(): void {
      if (this.#onTargetScroll) return;
      if (!this.#isPreviewContext() || !this.#target) return;
      this.#onTargetScroll = () => {
        if (!this.#target) return;
        if (this.#target.scrollTop > TOP_CLEAR_THRESHOLD_PX) return;
        // Boot-grace: durante los primeros 500 ms tras conectar todavía no
        // se ha llamado al primer `pickActive`; no limpiar para no perder
        // el anchor que el propio boot acaba de restaurar.
        if (Date.now() - this.#connectedAt < BOOT_GRACE_MS) return;
        // Cancela el save pendiente: si llega después del clear, no rescribe.
        if (this.#activeIdSaveTimer) {
          clearTimeout(this.#activeIdSaveTimer);
          this.#activeIdSaveTimer = 0;
        }
        const key = this.#resolveStorageKey();
        if (key) removeComponentPrefs('iswc-scrollspy', key);
      };
      this.#target.addEventListener('scroll', this.#onTargetScroll, { passive: true });
    }

    #unbindTopClearListener(): void {
      if (this.#onTargetScroll && this.#target) {
        try { this.#target.removeEventListener('scroll', this.#onTargetScroll); } catch { /* noop */ }
      }
      this.#onTargetScroll = null;
    }
  }

  defineElement('iswc-scrollspy', IswcScrollspy, 'IswcScrollspy');
})();
