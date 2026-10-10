import { guardarAppCfg, leerAppCfg } from '../../core/app-cfg.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import '../isp/text.js';
import { ElementBase } from '../../core/element-base.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';
import { json2html } from '../_shared/json-html.js';
import { PALETTES } from '../../styles/palette-build.js';
import type { Palette, PaletteCruda } from "./palette-selector.schemas.js";

/**
 * <iswc-palette-selector> — Web Component (vanilla).
 *
 * Selector visual de paletas de marca. Por defecto expone las 3 paletas
 * que viven en `styles/palettes.css` (contapyme, insoft, agrowin) pero
 * el consumidor puede pasar un array JSON propio en el atributo
 * `palettes` para exponer SU marca / sus paletas / su CSS.
 *
 * Cada paleta del array puede traer una propiedad `css` (URL) — el
 * componente la inyecta como <link rel="stylesheet"> al seleccionar la
 * paleta, de modo que el consumidor no tiene que precargar todas las
 * hojas: se cargan bajo demanda.
 *
 * Atributos
 *   palettes      JSON string con array de { value, label, h, s, b, css?,
 *                                              lead?, accentLabel?, leadColor?,
 *                                              accentColor?, bg?, fg?, accent? }.
 *                 h/s/b derivan el swatch. accent (hex) solo si no hay hsb.
 *                 Default = palettes.json (contapyme, insoft, agrowin).
 *   value         string — la paleta activa. La escribe en el target del scope.
 *   scope         root | closest. root escribe <html>. closest escribe el
 *                 primer ancestro con data-palette (si no hay, <html>).
 *   (persistencia) la paleta elegida para <html> se guarda en la config de la
 *                 app (`iswc-app-cfg`, ver core/app-cfg.ts); un scope=closest no persiste.
 *   aria-label    string — etiqueta del botón trigger (default "Elegir paleta")
 *
 * Slots
 *   trigger    opcional — sustituye el botón trigger interno. El consumidor
 *              puede poner CUALQUIER HTML aquí (logo, row con dos <span>,
 *              icono + texto, etc.). El componente solo se preocupa de
 *              abrir/cerrar el menú y emitir el evento cuando el usuario
 *              selecciona una opción. Si el slot está VACÍO, se renderiza
 *              un trigger por defecto con el wordmark del JSON.
 *
 *   El menu no se personaliza con HTML. Cada item sale del JSON
 *   (palettes.json o el array `palettes` del consumidor): swatch, label y check.
 *
 * Eventos
 *   iswc-palette-change  detail: { value, palette }   bubbles, composed
 *
 * Mutaciones que produce
 *   data-palette en el target del scope (html o el ancestro)
 *   iswc-app-cfg.palette     — solo si el target es <html>
 *   Dos selectores con el mismo target y la misma paleta en su lista
 *   se siguen: observan data-palette y adoptan el valor.
 *
 * API JS del consumer
 *   el.palettes = [...]      // setter que escribe el atributo JSON
 *   el.value    = 'contapyme' // activa paleta y notifica
 *   el.open() / close() / toggle()
 *   el.addEventListener('iswc-palette-change', e => e.detail)
 */

/** Entrada normalizada de paleta, lista para render. */

/** Entrada cruda que puede llegar en el atributo `palettes`. */

(() => {
  // 3 paletas por defecto. Primera = default del kit (ContaPyme). El
  // `lead`/`accent` permiten que el trigger represente la marca en dos
  // colores. Como ESTOS CSS ya están enlazados en el <head>, no hace
  // falta inyectar <link> extra: solo se respeta data-palette="X" en <html>.
  const DEFAULT_PALETTES: Palette[] = PALETTES.map((p) => ({
    value: p.value,
    label: p.label,
    accent: '',
    css: '',
    lead: p.lead,
    accentLabel: p.accentLabel,
    leadColor: p.leadColor || '#111',
    accentColor: p.accentColor || '',
    bg: '',
    fg: '',
    h: p.h,
    s: p.s,
    b: p.b,
    content: null,
  }));

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root">
      <slot name="trigger"></slot>
      <button type="button" part="trigger" class="trigger iswc-focus-ring" aria-haspopup="listbox" aria-expanded="false" aria-label="Elegir paleta" title="Elegir paleta">
        <span part="mark" class="trigger__mark"></span>
      </button>
      <ul part="menu" class="menu" role="listbox" hidden aria-label="Paletas disponibles">
        <!-- opciones se inyectan en #render() desde el JSON -->
      </ul>
    </div>
  `;

  const OBSERVED = ['palettes', 'value', 'aria-label', 'scope'];

  // Primer ancestro con data-palette. No cuenta el host: el host lleva
  // data-palette solo para pintar la pastilla con los tokens de ESA marca.
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

  /** Wordmark: `content` json2xml, o lead/accent del JSON si no viene content. */
  function wordmarkOf(p: Palette): unknown[] {
    if (p.content?.length) return p.content;
    const nodes: unknown[] = [];
    if (p.lead) nodes.push({ 'iswc-text': { color: p.leadColor || '#000', content: [p.lead] } });
    const accent = p.accentLabel || (p.lead ? '' : p.label);
    if (accent) {
      const spec: Record<string, unknown> = { content: [accent] };
      if (p.accentColor) spec.color = p.accentColor;
      nodes.push({ 'iswc-text': spec });
    }
    return nodes;
  }

  class IswcPaletteSelector extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #root!: HTMLElement;
    #trigger!: HTMLElement;
    #menu!: HTMLElement;
    #slotTrigger!: HTMLSlotElement;
    #palettes: Palette[] = [];
    #value = '';
    /** CSS cargado dinámicamente por paleta, para no recargar dos veces. */
    #loadedCSS = new Set<string>();
    #scopeObs: MutationObserver | null = null;
    #applying = false;
    #fromOutside = false;
    #hold = false;

    /** Ciclo "menú abierto" compartido con iswc-dropdown / iswc-context-menu. */
    #dismiss = createPopupDismiss(this, {
      onEscape: () => { this.#setOpen(false); this.#trigger.focus(); },
      onOutside: () => this.#setOpen(false),
    });

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector<HTMLElement>('.root')!;
      this.#trigger = shadow.querySelector<HTMLElement>('.trigger')!;
      this.#menu = shadow.querySelector<HTMLElement>('.menu')!;
      this.#slotTrigger = shadow.querySelector<HTMLSlotElement>('slot[name="trigger"]')!;

      // Eventos dentro del Shadow DOM NO se re-dirigen al host por defecto;
      // los capturamos en el tree shadow directamente.
      this.#menu.addEventListener('click', this.#onClick);
      this.#trigger.addEventListener('click', this.#onClick);
      // Los slots viven en el light DOM; escuchar cambios para ajustar
      // el rendering del trigger y de los items del dropdown.
      this.#slotTrigger.addEventListener('slotchange', this.#onTriggerSlotChange);
      // Si el consumidor puso su propio trigger en el slot, capturamos
      // clicks en el root para delegación (slot content vive en light DOM).
      this.addEventListener('click', this.#onSlotClick);
    }

    onDisconnected(): void {
      this.#dismiss.detach();
      this.#scopeObs?.disconnect();
      this.#scopeObs = null;
      this.#menu?.removeEventListener('click', this.#onClick);
      this.#trigger?.removeEventListener('click', this.#onClick);
      this.#slotTrigger?.removeEventListener('slotchange', this.#onTriggerSlotChange);
    }

    onConnected(): void {
      this.#parsePalettes();
      this.#watchScope();
      this.#loadInitial();
      this.#render();
      // Ajustar visibilidad trigger interno vs slot.
      this.#syncTriggerVisibility();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'palettes') {
        this.#parsePalettes();
        this.#render();
      } else if (name === 'value') {
        if (this.#applying || this.#hold) return;
        this.#apply(newVal);
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

    /** Lanza el dropdown programáticamente. */
    open(): void { this.#setOpen(true); }
    close(): void { this.#setOpen(false); }
    toggle(): void { this.#setOpen(this.#menu.hidden); }

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
      // Normaliza cada entrada.
      this.#palettes = list.map((p): Palette => ({
        value: String(p.value || '').trim(),
        label: String(p.label || p.value || '').trim(),
        accent: p.accent ? String(p.accent) : '',
        css: p.css ? String(p.css) : '',
        lead: p.lead ? String(p.lead) : '',
        accentLabel: p.accentLabel ? String(p.accentLabel) : '',
        leadColor: p.leadColor ? String(p.leadColor) : '',
        accentColor: p.accentColor ? String(p.accentColor) : '',
        bg: p.bg ? String(p.bg) : '',
        fg: p.fg ? String(p.fg) : '',
        h: p.h == null || p.h === '' ? null : Number(p.h),
        s: p.s ? String(p.s) : '',
        b: p.b ? String(p.b) : '',
        content: Array.isArray(p.content) ? p.content : null,
      })).filter((p) => p.value);
    }

    #scopeTarget(): HTMLElement {
      const mode = (this.getAttribute('scope') || 'root').trim().toLowerCase();
      if (mode === 'closest') return findPaletteContainer(this);
      return document.documentElement;
    }

    #known(value: string): boolean {
      return !!value && this.#palettes.some((p) => p.value === value);
    }

    #watchScope(): void {
      this.#scopeObs?.disconnect();
      const target = this.#scopeTarget();
      const obs = new MutationObserver(() => {
        if (this.#applying) return;
        const next = target.dataset.palette || '';
        if (!next || next === this.#value || !this.#known(next)) return;
        this.#fromOutside = true;
        if (this.getAttribute('value') !== next) this.setAttribute('value', next);
        else this.#apply(next);
        this.#fromOutside = false;
      });
      this.#scopeObs = obs;
      obs.observe(target, { attributes: true, attributeFilter: ['data-palette'] });
    }

    #loadInitial(): void {
      const target = this.#scopeTarget();
      const onRoot = target === document.documentElement;
      const stored = onRoot ? leerAppCfg().palette ?? '' : '';
      const fromDom = target.dataset.palette || '';
      const initial = (onRoot && this.#known(stored))
        ? stored
        : this.#known(fromDom)
          ? fromDom
          : this.#palettes[0]?.value || '';
      if (!initial) return;
      // Paleta ajena en el target: no la pises (otro catalogo de prueba).
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

    /** Devuelve la paleta activa o la primera. */
    #current(): Palette | undefined {
      return this.#palettes.find((p) => p.value === this.#value) || this.#palettes[0];
    }

    /** ¿El slot trigger tiene contenido provisto por el consumidor? */
    #hasCustomTrigger(): boolean {
      const nodes = this.#slotTrigger?.assignedNodes({ flatten: true }) || [];
      return nodes.some((n) => {
        if (n.nodeType === 1) return true;
        if (n.nodeType === 3) return (n.textContent || '').trim().length > 0;
        return false;
      });
    }

    #syncTriggerVisibility(): void {
      const hasCustom = this.#hasCustomTrigger();
      this.#trigger.hidden = hasCustom;
      if (hasCustom) {
        this.#trigger.setAttribute('aria-hidden', 'true');
      } else {
        this.#trigger.removeAttribute('aria-hidden');
      }
    }

    /** Wordmark del slot: mitades y bg salen del JSON de la paleta activa. */
    #paintSlottedMark(current: Palette): void {
      const btn = this.querySelector<HTMLElement>('[slot="trigger"]');
      if (btn) {
        if (current.bg) btn.style.background = current.bg;
        else btn.style.background = '';
        if (current.fg) btn.style.color = current.fg;
      }
      const lead = this.querySelector<HTMLElement>('[data-role="lead"]');
      const accent = this.querySelector<HTMLElement>('[data-role="accent"]');
      if (lead) {
        if (current.lead) lead.textContent = current.lead;
        lead.style.color = current.leadColor || '#000';
      }
      if (accent) {
        if (current.accentLabel) accent.textContent = current.accentLabel;
        if (current.accentColor) accent.style.color = current.accentColor;
      }
    }

    /** Pinta el wordmark (json2xml) y el fondo dentro del trigger interno. */
    #paintOwnMark(current: Palette): void {
      const mark = this.#trigger.querySelector<HTMLElement>('.trigger__mark');
      if (mark) {
        mark.replaceChildren();
        const nodes = wordmarkOf(current);
        if (nodes.length) json2html(nodes, mark);
      }
      if (current.bg) this.#trigger.style.background = current.bg;
      else this.#trigger.style.background = '';
      if (current.fg) this.#trigger.style.color = current.fg;
      else this.#trigger.style.color = '';
    }

    /** Handler del slot "trigger" — sólo afecta el trigger button. */
    #onTriggerSlotChange = (): void => {
      this.#syncTriggerVisibility();
      this.#paintTrigger();
    };

    #paintTrigger(): void {
      const current = this.#current();
      if (!current) return;

      if (this.#hasCustomTrigger()) this.#paintSlottedMark(current);
      else this.#paintOwnMark(current);
      // La pastilla hereda --iswc-logo-* del host: palettes.css pinta [data-palette].
      this.dataset.palette = current.value;
      if (current.h != null && current.s && current.b) {
        this.style.setProperty('--iswc-brand-h', String(current.h));
        this.style.setProperty('--iswc-brand-s', current.s);
        this.style.setProperty('--iswc-brand-b', current.b);
      }
      if (current.bg) this.style.setProperty('--iswc-logo-bg', current.bg);
      else this.style.removeProperty('--iswc-logo-bg');
      if (current.fg) this.style.setProperty('--iswc-logo-fg', current.fg);
      else this.style.removeProperty('--iswc-logo-fg');
      const name = current.label || current.value;
      if (!this.getAttribute('aria-label')) {
        this.#trigger.setAttribute('aria-label', `${name} — elegir paleta`);
      }
    }

    #render(): void {
      const current = this.#current();
      if (!current) return;

      // Trigger (siempre se pinta, el helper decide si respeta el slot).
      this.#paintTrigger();

      // Menu items
      this.#menu.innerHTML = '';
      for (const p of this.#palettes) {
        this.#menu.appendChild(this.#buildDefaultOption(p, current));
      }
    }

    /** Item del menu: swatch + label + check, datos del JSON de paletas. */
    #buildDefaultOption(p: Palette, current: Palette): HTMLElement {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('part', 'option');
      li.tabIndex = -1;
      li.dataset.palette = p.value;
      li.setAttribute('aria-selected', p.value === current.value ? 'true' : 'false');
      const swatch = document.createElement('span');
      swatch.className = 'menu__swatch';
      if (p.h != null && p.s && p.b) {
        li.style.setProperty('--iswc-brand-h', String(p.h));
        li.style.setProperty('--iswc-brand-s', p.s);
        li.style.setProperty('--iswc-brand-b', p.b);
      } else if (p.accent) {
        li.style.setProperty('--iswc-swatch', p.accent);
      }
      li.appendChild(swatch);
      const label = document.createElement('span');
      label.className = 'menu__label';
      label.textContent = p.label;
      li.appendChild(label);
      const check = document.createElement('iswc-icon');
      check.className = 'menu__check';
      check.setAttribute('icon', 'mdi:check');
      check.setAttribute('aria-hidden', 'true');
      li.appendChild(check);
      return li;
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
      // Cargar CSS si la paleta lo trae y aún no está cargado.
      if (palette.css && !this.#loadedCSS.has(palette.css)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = palette.css;
        link.dataset.paletteCss = palette.value;
        document.head.appendChild(link);
        this.#loadedCSS.add(palette.css);
      }
      const onRoot = target === document.documentElement;
      emit(this, 'iswc-palette-change', { value, palette, container: target });
      for (const opt of this.#menu.querySelectorAll<HTMLElement>('[role="option"]')) {
        opt.setAttribute('aria-selected', opt.dataset.palette === value ? 'true' : 'false');
      }
      if (!this.#fromOutside && onRoot && window.parent !== window) {
        window.parent.postMessage({ type: 'iswc-shell-sync', palette: value }, location.origin);
      }
      // Repintar trigger (cambia colores si el consumidor tiene uno custom,
      // ese se queda; si es el interno, lo repintamos).
      this.#paintTrigger();
    }

    #setOpen(open: boolean): void {
      this.#menu.hidden = !open;
      this.#trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) this.#dismiss.attach();
      else this.#dismiss.detach();
    }

    /** Click dentro del shadow tree: trigger o menu. */
    #onClick = (e: PointerEvent): void => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const opt = target.closest('[role="option"]');
      if (opt && this.#menu.contains(opt)) {
        const paletteValue = opt instanceof HTMLElement ? opt.dataset.palette ?? null : null;
        this.#apply(paletteValue);
        // Elección del usuario sobre la página: queda en la config de la app. La carga
        // inicial, un scope=closest o un cambio que llega de fuera no se guardan.
        if (paletteValue && this.#known(paletteValue) && this.#scopeTarget() === document.documentElement) guardarAppCfg({ palette: paletteValue });
        this.#setOpen(false);
        return;
      }
      if (target.closest('.trigger')) {
        this.#setOpen(this.#menu.hidden);
      }
    };

    /** Click en el contenido del slot (light DOM). Cualquier click alli
     *  abre/cierra el menú. Si el consumidor quiere comportamiento especial
     *  (links, etc.) puede llamar `e.stopPropagation()` en su handler. */
    #onSlotClick = (e: PointerEvent): void => {
      // ¿El target está dentro del slot trigger (light DOM)?
      const target = e.target;
      if (!(target instanceof Node)) return;
      const trigger = this.querySelector<HTMLElement>('[slot="trigger"]');
      if (trigger && trigger.contains(target)) {
        this.#setOpen(this.#menu.hidden);
      }
    };

  }

  defineElement('iswc-palette-selector', IswcPaletteSelector, 'IswcPaletteSelector');
})();
