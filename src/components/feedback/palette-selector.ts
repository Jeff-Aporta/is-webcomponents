// @contexto INDICE.md · src/components/feedback/palette-selector.md
import { computePosition, createPopupDismiss } from '@jeff-aporta/iswc-base/core/position.js';
import { guardarAppCfg, leerAppCfg } from '@jeff-aporta/iswc-base/core/app-init.js';
import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { PALETTES, PALETTE_FAMILIES, paletteSeeds } from '@jeff-aporta/iswc-base/styles/palette-build.js';
import type { Palette, PaletteCruda, PaletteSelectorEventos } from "./schemas/palette-selector.schemas.js";
import css from 'iswc:css';

/**
 * <iswc-palette-selector> — Web Component (vanilla).
 *
 * Selector de las 25 paletas del kit (src/styles/palettes.json) + interruptor
 * Panda. Cada opción muestra la identidad de la paleta (fondo, papel, main,
 * contraste y texto en el tema activo), su nombre y su origen/ánimo; las
 * opciones van agrupadas por familia de tono y se filtran con el buscador.
 *
 * Atributos
 *   palettes      JSON con un catálogo propio: [{ value, label, h, s, b,
 *                 family?, origin?, mood?, contrastH?, contrastS?, contrastL?,
 *                 tint?, fontTint?, accent?, css? }]. Default = palettes.json.
 *   value         paleta activa. La escribe (data-palette) en el target del scope.
 *   panda         booleano: modificador Panda activo (data-panda en el target).
 *   hide-panda    oculta el interruptor Panda.
 *   scope         root | closest. root escribe <html>; closest el primer
 *                 ancestro con data-palette (si no hay, <html>).
 *   aria-label    etiqueta del trigger (default "Elegir paleta").
 *
 * Persistencia: con scope=root la elección queda en la config de la app
 * (`iswc:app-cfg` → `palette` y `panda`, ver core/app-init.ts). closest no persiste.
 *
 * Slots
 *   trigger       sustituye el botón interno por HTML del consumidor.
 *
 * Eventos (bubbles, composed)
 *   iswc-palette-change  detail: { value, palette, container }
 *   iswc-panda-change    detail: { panda, container }
 *
 * API JS
 *   el.palettes = [...]; el.value = 'turquesa'; el.panda = true;
 *   el.open() / close() / toggle()
 */

(() => {
  const FAMILY_LABEL = new Map(PALETTE_FAMILIES.map((f) => [f.value as string, f.label]));
  const FAMILY_ORDER = PALETTE_FAMILIES.map((f) => f.value as string);

  const DEFAULT_PALETTES: Palette[] = PALETTES.map((p) => {
    const s = paletteSeeds(p);
    return {
      value: p.value,
      label: p.label,
      family: p.family,
      origin: p.origin,
      mood: p.mood,
      accent: '',
      css: '',
      h: s.h,
      s: s.s,
      b: s.b,
      contrastH: s.contrastH,
      contrastS: s.contrastS,
      contrastL: s.contrastL,
      tint: s.tint,
      fontTint: s.fontTint,
    };
  });

  const SEARCH_MIN = 8;

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root">
      <slot name="trigger"></slot>
      <button type="button" part="trigger" class="trigger iswc-focus-ring" aria-haspopup="listbox" aria-expanded="false" aria-label="Elegir paleta" title="Elegir paleta">
        <span class="trigger__chip" aria-hidden="true"><span class="chip__main"></span><span class="chip__contrast"></span></span>
        <span part="label" class="trigger__label"></span>
        <iswc-icon class="trigger__caret" icon="mdi:chevron-down" aria-hidden="true"></iswc-icon>
      </button>
      <div part="panel" class="panel" hidden>
        <div class="panel__head">
          <input part="search" class="search iswc-focus-ring" type="search" placeholder="Buscar paleta" aria-label="Buscar paleta" autocomplete="off" />
          <button type="button" part="panda" class="panda iswc-focus-ring" role="switch" aria-checked="false" title="Panda: invierte el fondo de la página">
            <span class="panda__track" aria-hidden="true"><span class="panda__thumb"></span></span>
            <span class="panda__label">Panda</span>
          </button>
        </div>
        <div part="menu" class="menu" role="listbox" aria-label="Paletas disponibles"></div>
        <p class="empty" hidden>Sin coincidencias</p>
      </div>
    </div>
  `;

  const OBSERVED = ['palettes', 'value', 'panda', 'hide-panda', 'aria-label', 'scope'];

  // Primer ancestro con data-palette. No cuenta el host.
  function findPaletteContainer(from: Element | null | undefined): HTMLElement {
    let node: Element | null = from && from.nodeType === 1 ? from : null;
    while (node) {
      const parent = node.parentElement;
      if (parent) {
        const hit = parent.closest('[data-palette]');
        if (hit) return hit as HTMLElement;
      }
      const root = node.getRootNode?.();
      if (root instanceof ShadowRoot && root.host) {
        if (root.host !== from && root.host.hasAttribute('data-palette')) return root.host as HTMLElement;
        node = root.host;
        continue;
      }
      break;
    }
    return document.documentElement;
  }

  const norm = (v: string): string => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  const str = (v: unknown): string => (v == null ? '' : String(v).trim());

  /** Semillas de la paleta como custom properties (las derivadas las calcula el CSS del componente). */
  function paintSeeds(el: HTMLElement, p: Palette): void {
    if (p.h == null || !p.s || !p.b) {
      if (p.accent) el.style.setProperty('--iswc-swatch', p.accent);
      return;
    }
    el.style.setProperty('--sw-h', String(p.h));
    el.style.setProperty('--sw-s', p.s);
    el.style.setProperty('--sw-b', p.b);
    el.style.setProperty('--sw-ch', String(p.contrastH ?? p.h));
    el.style.setProperty('--sw-cs', p.contrastS || '80%');
    el.style.setProperty('--sw-cl', p.contrastL || '50%');
    el.style.setProperty('--sw-tint', String(p.tint ?? 1));
    el.style.setProperty('--sw-font-tint', String(p.fontTint ?? (p.tint === 0 ? 0 : 1)));
  }

  class IswcPaletteSelector extends IswcElement {
    static override tag = 'iswc-palette-selector';
    declare static events: PaletteSelectorEventos;
    static override css = css;
    static override deps = ['iswc-icon'];
    static override observed = OBSERVED;

    #trigger!: HTMLButtonElement;
    #panel!: HTMLElement;
    #menu!: HTMLElement;
    #search!: HTMLInputElement;
    #pandaBtn!: HTMLButtonElement;
    #empty!: HTMLElement;
    #slotTrigger!: HTMLSlotElement;
    #palettes: Palette[] = [];
    #value = '';
    #loadedCSS = new Set<string>();
    #scopeObs: MutationObserver | null = null;
    #applying = false;
    #fromOutside = false;
    #hold = false;

    #dismiss = createPopupDismiss(this, {
      onEscape: () => { this.#setOpen(false); this.#trigger.focus(); },
      onOutside: () => this.#setOpen(false),
    });

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#trigger = shadow.querySelector<HTMLButtonElement>('.trigger')!;
      this.#panel = shadow.querySelector<HTMLElement>('.panel')!;
      this.#menu = shadow.querySelector<HTMLElement>('.menu')!;
      this.#search = shadow.querySelector<HTMLInputElement>('.search')!;
      this.#pandaBtn = shadow.querySelector<HTMLButtonElement>('.panda')!;
      this.#empty = shadow.querySelector<HTMLElement>('.empty')!;
      this.#slotTrigger = shadow.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;

      this.#menu.addEventListener('click', this.#onMenuClick);
      this.#menu.addEventListener('keydown', this.#onMenuKey);
      this.#trigger.addEventListener('click', this.#onTriggerClick);
      this.#search.addEventListener('input', this.#onSearch);
      this.#search.addEventListener('keydown', this.#onSearchKey);
      this.#pandaBtn.addEventListener('click', this.#onPandaClick);
      this.#slotTrigger.addEventListener('slotchange', this.#onTriggerSlotChange);
      this.addEventListener('click', this.#onSlotClick);
    }

    override onDisconnected(): void {
      this.#dismiss.detach();
      this.#scopeObs?.disconnect();
      this.#scopeObs = null;
    }

    override onConnected(): void {
      this.#parsePalettes();
      this.#watchScope();
      this.#loadInitial();
      this.#render();
      this.#syncTriggerVisibility();
      this.#syncPandaVisibility();
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'palettes') {
        this.#parsePalettes();
        this.#render();
      } else if (name === 'value') {
        if (this.#applying || this.#hold) return;
        this.#apply(newVal);
      } else if (name === 'panda') {
        if (this.#applying) return;
        this.#applyPanda(newVal !== null);
      } else if (name === 'hide-panda') {
        this.#syncPandaVisibility();
      } else if (name === 'aria-label') {
        this.#trigger.setAttribute('aria-label', newVal || 'Elegir paleta');
      } else if (name === 'scope' && oldVal !== newVal) {
        this.#watchScope();
        this.#loadInitial();
      }
    }

    // ---- API pública ----

    get palettes(): Palette[] { return this.#palettes.slice(); }
    set palettes(list: Palette[] | null | undefined) {
      this.setAttribute('palettes', JSON.stringify(list || []));
    }

    get value(): string { return this.getAttribute('value') || ''; }
    set value(v: string) {
      if (v) this.setAttribute('value', v);
      else this.removeAttribute('value');
    }

    get panda(): boolean { return this.hasAttribute('panda'); }
    set panda(on: boolean) { this.toggleAttribute('panda', !!on); }

    open(): void { this.#setOpen(true); }
    close(): void { this.#setOpen(false); }
    toggle(): void { this.#setOpen(this.#panel.hidden); }

    // ---- privados ----

    #parsePalettes(): void {
      const raw = this.getAttribute('palettes');
      let list: PaletteCruda[] = DEFAULT_PALETTES;
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) list = parsed as PaletteCruda[];
        } catch (err) {
          console.warn('[iswc-palette-selector] palettes no es JSON válido:', err);
        }
      }
      this.#palettes = list.map((p): Palette => ({
        value: str(p.value),
        label: str(p.label) || str(p.value),
        family: str(p.family),
        origin: str(p.origin),
        mood: str(p.mood),
        accent: str(p.accent),
        css: str(p.css),
        h: num(p.h),
        s: str(p.s),
        b: str(p.b),
        contrastH: num(p.contrastH),
        contrastS: str(p.contrastS),
        contrastL: str(p.contrastL),
        tint: num(p.tint),
        fontTint: num(p.fontTint),
      })).filter((p) => p.value);
    }

    #scopeTarget(): HTMLElement {
      const mode = (this.getAttribute('scope') || 'root').trim().toLowerCase();
      if (mode === 'closest') return findPaletteContainer(this);
      return document.documentElement;
    }

    #onRoot(): boolean { return this.#scopeTarget() === document.documentElement; }

    #known(value: string): boolean {
      return !!value && this.#palettes.some((p) => p.value === value);
    }

    #watchScope(): void {
      this.#scopeObs?.disconnect();
      const target = this.#scopeTarget();
      const obs = new MutationObserver((records) => {
        if (this.#applying) return;
        if (records.some((r) => r.attributeName === 'data-panda' || r.attributeName === 'data-theme')) {
          const on = target.hasAttribute('data-panda');
          if (on !== this.panda) {
            this.#applying = true;
            this.toggleAttribute('panda', on);
            this.#applying = false;
          }
          this.#syncPandaSwitch();
          this.#syncSet();
        }
        const next = target.dataset.palette || '';
        if (!next || next === this.#value || !this.#known(next)) return;
        this.#fromOutside = true;
        if (this.getAttribute('value') !== next) this.setAttribute('value', next);
        else this.#apply(next);
        this.#fromOutside = false;
      });
      this.#scopeObs = obs;
      obs.observe(target, { attributes: true, attributeFilter: ['data-palette', 'data-panda', 'data-theme'] });
    }

    #loadInitial(): void {
      const target = this.#scopeTarget();
      const onRoot = target === document.documentElement;
      const cfg = onRoot ? leerAppCfg() : {};
      const stored = cfg.palette ?? '';
      const fromDom = target.dataset.palette || '';
      // Panda: preferencia guardada > atributo del componente > el DOM del target.
      const panda = typeof cfg.panda === 'boolean' ? cfg.panda : (this.hasAttribute('panda') || target.hasAttribute('data-panda'));
      this.#applyPanda(panda, false);
      const initial = (onRoot && this.#known(stored))
        ? stored
        : this.#known(fromDom)
          ? fromDom
          : this.#known(this.getAttribute('value') || '') ? this.getAttribute('value')! : this.#palettes[0]?.value || '';
      if (!initial) return;
      const foreign = !!fromDom && !this.#known(fromDom) && !(onRoot && this.#known(stored));
      if (foreign) {
        this.#hold = true;
        if (this.getAttribute('value') !== initial) this.setAttribute('value', initial);
        this.#value = initial;
        this.#hold = false;
        this.#paintTrigger();
        return;
      }
      if (initial !== this.getAttribute('value')) this.setAttribute('value', initial);
      else this.#apply(initial);
    }

    #current(): Palette | undefined {
      return this.#palettes.find((p) => p.value === this.#value) || this.#palettes[0];
    }

    #hasCustomTrigger(): boolean {
      const nodes = this.#slotTrigger?.assignedNodes({ flatten: true }) || [];
      return nodes.some((n) => (n.nodeType === 1) || (n.nodeType === 3 && (n.textContent || '').trim().length > 0));
    }

    #syncTriggerVisibility(): void {
      const hasCustom = this.#hasCustomTrigger();
      this.#trigger.hidden = hasCustom;
      if (hasCustom) this.#trigger.setAttribute('aria-hidden', 'true');
      else this.#trigger.removeAttribute('aria-hidden');
    }

    #syncPandaVisibility(): void {
      this.#pandaBtn.hidden = this.hasAttribute('hide-panda');
    }

    #syncPandaSwitch(): void {
      this.#pandaBtn.setAttribute('aria-checked', this.panda ? 'true' : 'false');
    }

    /** Juego de superficies que pinta el target: sl (claras) o sd (oscuras). */
    #syncSet(): void {
      const target = this.#scopeTarget();
      const themed = target.closest('[data-theme]') as HTMLElement | null;
      const dark = (themed?.dataset.theme || 'dark') === 'dark';
      const set = dark !== this.panda ? 'sd' : 'sl';
      this.#menu.dataset.set = set;
      this.#trigger.dataset.set = set;
    }

    #onTriggerSlotChange = (): void => {
      this.#syncTriggerVisibility();
      this.#paintTrigger();
    };

    #paintTrigger(): void {
      const current = this.#current();
      if (!current) return;
      const label = this.#trigger.querySelector<HTMLElement>('.trigger__label');
      if (label) label.textContent = current.label;
      paintSeeds(this.#trigger, current);
      // El host lleva data-palette para que el slot del consumidor herede los tokens de ESA paleta.
      this.dataset.palette = current.value;
      if (!this.getAttribute('aria-label')) {
        this.#trigger.setAttribute('aria-label', `Paleta ${current.label} — elegir paleta`);
      }
    }

    #render(): void {
      const current = this.#current();
      if (!current) return;
      this.#paintTrigger();
      this.#syncSet();
      this.#syncPandaSwitch();
      this.#search.hidden = this.#palettes.length < SEARCH_MIN;

      const groups = new Map<string, Palette[]>();
      for (const p of this.#palettes) {
        const key = p.family || '';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
      }
      const keys = [...groups.keys()].sort((a, b) => {
        const ia = FAMILY_ORDER.indexOf(a), ib = FAMILY_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const frag = document.createDocumentFragment();
      for (const key of keys) {
        const group = document.createElement('div');
        group.className = 'group';
        group.setAttribute('role', 'group');
        group.setAttribute('part', 'group');
        const title = FAMILY_LABEL.get(key) || key;
        if (title) {
          const h = document.createElement('div');
          h.className = 'group__title';
          h.id = `g-${key}`;
          h.textContent = title;
          group.setAttribute('aria-labelledby', h.id);
          group.appendChild(h);
        }
        for (const p of groups.get(key)!) group.appendChild(this.#buildOption(p, current));
        frag.appendChild(group);
      }
      this.#menu.replaceChildren(frag);
      this.#filter(this.#search.value);
    }

    /** Opción: muestras (fondo, papel, main, contraste, texto) + nombre + origen/ánimo + check. */
    #buildOption(p: Palette, current: Palette): HTMLElement {
      const opt = document.createElement('div');
      opt.setAttribute('role', 'option');
      opt.setAttribute('part', 'option');
      opt.tabIndex = -1;
      opt.dataset.palette = p.value;
      opt.dataset.search = norm(`${p.label} ${p.value} ${p.origin} ${p.mood} ${FAMILY_LABEL.get(p.family) || p.family}`);
      opt.setAttribute('aria-selected', p.value === current.value ? 'true' : 'false');
      paintSeeds(opt, p);

      const swatches = document.createElement('span');
      swatches.className = 'swatches';
      swatches.setAttribute('aria-hidden', 'true');
      for (const k of ['bg', 'paper', 'main', 'contrast', 'font']) {
        const s = document.createElement('span');
        s.className = `sw sw--${k}`;
        swatches.appendChild(s);
      }
      const text = document.createElement('span');
      text.className = 'option__text';
      const name = document.createElement('span');
      name.className = 'option__name';
      name.textContent = p.label;
      text.appendChild(name);
      const meta = [p.origin, p.mood].filter(Boolean).join(' · ');
      if (meta) {
        const m = document.createElement('span');
        m.className = 'option__meta';
        m.textContent = meta;
        text.appendChild(m);
      }
      const check = document.createElement('iswc-icon');
      check.className = 'option__check';
      check.setAttribute('icon', 'mdi:check');
      check.setAttribute('aria-hidden', 'true');
      opt.append(swatches, text, check);
      return opt;
    }

    #filter(q: string): void {
      const needle = norm(q.trim());
      let visible = 0;
      for (const group of this.#menu.querySelectorAll<HTMLElement>('.group')) {
        let inGroup = 0;
        for (const opt of group.querySelectorAll<HTMLElement>('[role="option"]')) {
          const show = !needle || (opt.dataset.search || '').includes(needle);
          opt.hidden = !show;
          if (show) inGroup++;
        }
        group.hidden = inGroup === 0;
        visible += inGroup;
      }
      this.#empty.hidden = visible > 0;
    }

    #apply(value: string | null): void {
      if (!value) return;
      const palette = this.#palettes.find((p) => p.value === value);
      if (!palette) return;
      this.#value = value;
      if (this.getAttribute('value') !== value) {
        this.#applying = true;
        this.setAttribute('value', value);
        this.#applying = false;
      }
      const target = this.#scopeTarget();
      this.#applying = true;
      if (target.dataset.palette !== value) target.dataset.palette = value;
      this.#applying = false;
      if (palette.css && !this.#loadedCSS.has(palette.css)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = palette.css;
        link.dataset.paletteCss = palette.value;
        document.head.appendChild(link);
        this.#loadedCSS.add(palette.css);
      }
      emit(this, 'iswc-palette-change', { value, palette, container: target });
      for (const opt of this.#menu.querySelectorAll<HTMLElement>('[role="option"]')) {
        opt.setAttribute('aria-selected', opt.dataset.palette === value ? 'true' : 'false');
      }
      if (!this.#fromOutside && target === document.documentElement && window.parent !== window) {
        window.parent.postMessage({ type: 'iswc-shell-sync', palette: value }, location.origin);
      }
      this.#paintTrigger();
    }

    #applyPanda(on: boolean, notify = true): void {
      const target = this.#scopeTarget();
      this.#applying = true;
      this.toggleAttribute('panda', on);
      if (target.hasAttribute('data-panda') !== on) target.toggleAttribute('data-panda', on);
      this.#applying = false;
      this.#syncPandaSwitch();
      this.#syncSet();
      if (notify) emit(this, 'iswc-panda-change', { panda: on, container: target });
    }

    #setOpen(open: boolean): void {
      this.#panel.hidden = !open;
      this.#trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        this.#syncSet();
        this.#ubicar();
        addEventListener('resize', this.#ubicar);
        addEventListener('scroll', this.#ubicar, true);
        this.#dismiss.attach();
        const sel = this.#menu.querySelector<HTMLElement>('[aria-selected="true"]');
        sel?.scrollIntoView?.({ block: 'nearest' });
        (this.#search.hidden ? sel : this.#search)?.focus?.({ preventScroll: true });
      } else {
        removeEventListener('resize', this.#ubicar);
        removeEventListener('scroll', this.#ubicar, true);
        this.#dismiss.detach();
      }
    }

    /** Abre hacia el centro de la pantalla: nunca se sale de la página, esté donde esté el selector. */
    #ubicar = (): void => {
      const r = computePosition({ anchor: this.#trigger, popupEl: this.#panel, placement: 'auto', distance: 6, flip: true, shift: true, flipPadding: 8, shiftPadding: 8, strategy: 'fixed' });
      if (!r) return;
      Object.assign(this.#panel.style, { top: `${r.top}px`, left: `${r.left}px` });
      this.#panel.dataset.currentPlacement = r.placement;
    };

    #choose(value: string | null): void {
      this.#apply(value);
      // Elección del usuario sobre la página: queda en la config de la app.
      if (value && this.#known(value) && this.#onRoot()) guardarAppCfg({ palette: value });
      this.#setOpen(false);
      this.#trigger.focus();
    }

    #visibleOptions(): HTMLElement[] {
      return [...this.#menu.querySelectorAll<HTMLElement>('[role="option"]')].filter((o) => !o.hidden && !(o.parentElement as HTMLElement).hidden);
    }

    #onTriggerClick = (): void => { this.#setOpen(this.#panel.hidden); };

    #onMenuClick = (e: Event): void => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const opt = target.closest<HTMLElement>('[role="option"]');
      if (opt && this.#menu.contains(opt)) this.#choose(opt.dataset.palette ?? null);
    };

    #onMenuKey = (e: KeyboardEvent): void => {
      const opts = this.#visibleOptions();
      const i = opts.indexOf(e.target as HTMLElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (e.key === 'ArrowUp' && i <= 0 && !this.#search.hidden) this.#search.focus();
        else next?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#choose((e.target as HTMLElement).dataset.palette ?? null);
      }
    };

    #onSearch = (): void => { this.#filter(this.#search.value); };

    #onSearchKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.#visibleOptions()[0]?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const first = this.#visibleOptions()[0];
        if (first) this.#choose(first.dataset.palette ?? null);
      }
    };

    #onPandaClick = (): void => {
      const on = !this.panda;
      this.#applyPanda(on);
      if (this.#onRoot()) guardarAppCfg({ panda: on });
    };

    #onSlotClick = (e: Event): void => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const trigger = this.querySelector<HTMLElement>('[slot="trigger"]');
      if (trigger && trigger.contains(target)) this.#setOpen(this.#panel.hidden);
    };
  }

  define(IswcPaletteSelector, 'IswcPaletteSelector');
})();
