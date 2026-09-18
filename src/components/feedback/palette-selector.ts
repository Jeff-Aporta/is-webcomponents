import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import { ElementBase } from '../../core/element-base.js';
import { createPopupDismiss } from '../_shared/popup-dismiss.js';

/**
 * <is-palette-selector> — Web Component (vanilla).
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
 *   palettes      JSON string con array de { value, label, accent, css?,
 *                                              lead?, leadColor?,
 *                                              accentColor?, bg?, fg? }.
 *                 Default = DEFAULT_PALETTES (contapyme, insoft, agrowin).
 *   value         string — la paleta activa. Reflect → data-palette en <html>.
 *   storage-key   string — clave de localStorage (default 'is-palette')
 *   aria-label    string — etiqueta del botón trigger (default "Elegir paleta")
 *
 * Slots
 *   trigger    opcional — sustituye el botón trigger interno. El consumidor
 *              puede poner CUALQUIER HTML aquí (logo, row con dos <span>,
 *              icono + texto, etc.). El componente solo se preocupa de
 *              abrir/cerrar el menú y emitir el evento cuando el usuario
 *              selecciona una opción. Si el slot está VACÍO, se renderiza
 *              un trigger por defecto con bg + label.
 *
 *   option     opcional — sustituye el render de cada item del dropdown.
 *              El consumidor pone un `<template slot="option">` (un único
 *              `<template>` compartido) con placeholders `{value}`,
 *              `{label}`, `{accent}`, `{lead}`, `{accentLabel}`,
 *              `{leadColor}`, `{accentColor}`, `{bg}`, `{fg}`. El componente
 *              clona la plantilla para cada paleta y bindea:
 *                - data-palette="<value>"
 *                - role="option"
 *                - aria-selected="true|false"
 *                - data-role="lead|accent|swatch|label|check" (los
 *                  elementos con estos roles reciben el contenido y
 *                  color de la paleta). El escape { se hace con {{}.
 *              Atajo: dentro de un atributo style=, el componente
 *              encuentra {tokens} y los reemplaza. En texto, simplemente
 *              pone el valor del campo de la paleta.
 *              Si el slot está vacío, se renderiza el item default
 *              (swatch + label + check).
 *
 * Eventos
 *   is-palette-change  detail: { value, palette }   bubbles, composed
 *
 * Mutaciones que produce
 *   <html data-palette="X">   — activa la paleta visualmente
 *   localStorage[storageKey]  — persiste la elección
 *
 * API JS del consumer
 *   el.palettes = [...]      // setter que escribe el atributo JSON
 *   el.value    = 'contapyme' // activa paleta y notifica
 *   el.open() / close() / toggle()
 *   el.addEventListener('is-palette-change', e => e.detail)
 */

/** Entrada normalizada de paleta, lista para render. */
interface Palette {
  value: string;
  label: string;
  accent: string;
  css: string;
  /** Para el trigger estilo logo (dos mitades de texto). */
  lead: string;
  accentLabel: string;
  leadColor: string;
  accentColor: string;
  bg: string;
  fg: string;
}

/** Entrada cruda que puede llegar en el atributo `palettes`. */
interface PaletteCruda {
  value?: unknown;
  label?: unknown;
  accent?: unknown;
  css?: unknown;
  lead?: unknown;
  accentLabel?: unknown;
  leadColor?: unknown;
  accentColor?: unknown;
  bg?: unknown;
  fg?: unknown;
}

/** Tokens disponibles para sustitución dentro de `{...}`. */
type TemplateTokens = Record<keyof Palette, string>;

(() => {
  // 3 paletas por defecto. Primera = default del kit (ContaPyme). El
  // `lead`/`accent` permiten que el trigger represente la marca en dos
  // colores. Como ESTOS CSS ya están enlazados en el <head>, no hace
  // falta inyectar <link> extra: solo se respeta data-palette="X" en <html>.
  const DEFAULT_PALETTES: Palette[] = [
    { value: 'contapyme', label: 'ContaPyme', accent: 'dodgerblue', css: '', lead: 'conta', accentLabel: 'pyme', leadColor: '#111', accentColor: 'dodgerblue', bg: '#fff', fg: '#111' },
    // El logo InSoft lleva la S en MAYUSCULA y en el color de marca: in + Soft.
    { value: 'insoft',    label: 'InSoft',    accent: '#e03131',    css: '', lead: 'in',    accentLabel: 'Soft', leadColor: '#111', accentColor: '#e03131',    bg: '#fff', fg: '#111' },
    { value: 'agrowin',   label: 'AgroWin',   accent: 'yellowgreen',css: '', lead: 'agro',  accentLabel: 'win',  leadColor: '#111', accentColor: 'yellowgreen',bg: '#fff', fg: '#111' },
  ];

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root">
      <slot name="trigger"></slot>
      <button type="button" part="trigger" class="trigger is-focus-ring" aria-haspopup="listbox" aria-expanded="false" aria-label="Elegir paleta" title="Elegir paleta">
        <span part="lead" class="trigger__lead" aria-hidden="true"></span>
        <span part="label" class="trigger__label">Paleta</span>
        <is-icon part="caret" class="trigger__caret" icon="mdi:chevron-down" aria-hidden="true"></is-icon>
      </button>
      <ul part="menu" class="menu" role="listbox" hidden aria-label="Paletas disponibles">
        <!-- opciones se inyectan en #render() -->
      </ul>
      <slot name="option"></slot>
    </div>
  `;

  const OBSERVED = ['palettes', 'value', 'storage-key', 'aria-label'];

  class IsPaletteSelector extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }

    #root!: HTMLElement;
    #trigger!: HTMLElement;
    #menu!: HTMLElement;
    #slotTrigger!: HTMLSlotElement;
    #slotOption!: HTMLSlotElement;
    #palettes: Palette[] = [];
    #value = '';
    /** CSS cargado dinámicamente por paleta, para no recargar dos veces. */
    #loadedCSS = new Set<string>();

    /** Ciclo "menú abierto" compartido con is-dropdown / is-context-menu. */
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
      this.#slotOption = shadow.querySelector<HTMLSlotElement>('slot[name="option"]')!;

      // Eventos dentro del Shadow DOM NO se re-dirigen al host por defecto;
      // los capturamos en el tree shadow directamente.
      this.#menu.addEventListener('click', this.#onClick);
      this.#trigger.addEventListener('click', this.#onClick);
      // Los slots viven en el light DOM; escuchar cambios para ajustar
      // el rendering del trigger y de los items del dropdown.
      this.#slotTrigger.addEventListener('slotchange', this.#onTriggerSlotChange);
      this.#slotOption.addEventListener('slotchange', this.#onOptionSlotChange);
      // Si el consumidor puso su propio trigger en el slot, capturamos
      // clicks en el root para delegación (slot content vive en light DOM).
      this.addEventListener('click', this.#onSlotClick);
    }

    onDisconnected(): void {
      this.#dismiss.detach();
      this.#menu?.removeEventListener('click', this.#onClick);
      this.#trigger?.removeEventListener('click', this.#onClick);
      this.#slotTrigger?.removeEventListener('slotchange', this.#onTriggerSlotChange);
      this.#slotOption?.removeEventListener('slotchange', this.#onOptionSlotChange);
    }

    onConnected(): void {
      this.#parsePalettes();
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
        this.#apply(newVal);
      } else if (name === 'aria-label') {
        this.#trigger.setAttribute('aria-label', newVal || 'Elegir paleta');
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
          console.warn('[is-palette-selector] palettes no es JSON válido:', err);
        }
      }
      // Normaliza cada entrada.
      this.#palettes = list.map((p): Palette => ({
        value: String(p.value || '').trim(),
        label: String(p.label || p.value || '').trim(),
        accent: String(p.accent || '#888'),
        css: p.css ? String(p.css) : '',
        // Para el trigger estilo logo (dos mitades de texto).
        lead: p.lead ? String(p.lead) : '',
        accentLabel: p.accentLabel ? String(p.accentLabel) : '',
        leadColor: p.leadColor ? String(p.leadColor) : '',
        accentColor: p.accentColor ? String(p.accentColor) : '',
        bg: p.bg ? String(p.bg) : '',
        fg: p.fg ? String(p.fg) : '',
      })).filter((p) => p.value);
    }

    #loadInitial(): void {
      const root = document.documentElement;
      const fromDom = root.dataset.palette;
      const key = this.getAttribute('storage-key') || 'is-palette';
      const fromStorage = localStorage.getItem(key);
      const initial = (fromDom && this.#palettes.some((p) => p.value === fromDom))
        ? fromDom
        : (fromStorage && this.#palettes.some((p) => p.value === fromStorage))
          ? fromStorage
          : this.#palettes[0]?.value || '';
      if (initial && initial !== this.getAttribute('value')) {
        this.setAttribute('value', initial);
      } else {
        this.#apply(initial);
      }
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

    /** Handler del slot "trigger" — sólo afecta el trigger button. */
    #onTriggerSlotChange = (): void => {
      this.#syncTriggerVisibility();
      this.#paintTrigger();
    };

    /** Handler del slot "option" — re-render menu items. */
    #onOptionSlotChange = (): void => {
      this.#render();
    };

    #paintTrigger(): void {
      const current = this.#current();
      if (!current) return;

      // Si el consumidor proveyó su propio trigger, NO sobrescribimos su HTML.
      if (this.#hasCustomTrigger()) return;

      // Trigger interno: estilo logo (lead + accent) si tenemos esos datos,
      // sino bg + label plano.
      const lead = this.#trigger.querySelector<HTMLElement>('.trigger__lead');
      const label = this.#trigger.querySelector<HTMLElement>('.trigger__label');
      if (current.lead && current.accentLabel) {
        if (lead) lead.textContent = current.lead;
        if (lead) lead.style.color = current.leadColor || 'currentColor';
        if (label) label.textContent = current.accentLabel;
        if (label) label.style.color = current.accentColor || 'currentColor';
      } else {
        if (lead) lead.textContent = '';
        if (label) label.textContent = current.label;
      }
      this.#trigger.style.background = current.bg || '';
      this.#trigger.style.color = current.fg || '';
    }

    #render(): void {
      const current = this.#current();
      if (!current) return;

      // Trigger (siempre se pinta, el helper decide si respeta el slot).
      this.#paintTrigger();

      // Menu items
      this.#menu.innerHTML = '';
      const tmpl = this.#getOptionTemplate();
      for (const p of this.#palettes) {
        const li = tmpl ? this.#buildOptionFromTemplate(tmpl, p, current) : this.#buildDefaultOption(p, current);
        this.#menu.appendChild(li);
      }
    }

    /** Devuelve el <template> del slot si el consumidor proveyó uno. */
    #getOptionTemplate(): HTMLTemplateElement | null {
      const nodes = this.#slotOption?.assignedNodes({ flatten: true }) || [];
      const found = nodes.find((n) => n.nodeName === 'TEMPLATE');
      return (found as HTMLTemplateElement | undefined) ?? null;
    }

    /**
     * Clona el <template> del consumidor, reemplaza {tokens} y bindea
     * data-palette / aria-selected / role="option". Si el árbol tiene
     * [data-role="..."], el helper los rellena con campos específicos.
     */
    #buildOptionFromTemplate(template: HTMLTemplateElement, p: Palette, current: Palette): HTMLElement {
      const frag = template.content.cloneNode(true) as DocumentFragment;
      // El elemento root del item. El consumidor puede marcarlo con
      // cualquier tag (li, button, div). Le añadimos los attrs ARIA.
      let root = frag.firstElementChild as HTMLElement | null;
      if (!root) {
        // Fallback: el consumidor puso texto o múltiples nodos.
        // Envolvemos en un <li>.
        root = document.createElement('li');
        root.appendChild(frag);
      }
      root.setAttribute('role', 'option');
      root.setAttribute('part', 'option');
      root.tabIndex = -1;
      root.dataset.palette = p.value;
      root.setAttribute('aria-selected', p.value === current.value ? 'true' : 'false');

      // Reemplazar {tokens} en atributos y textos.
      this.#bindTemplate(root, p);

      // data-role="*" -> setters específicos.
      const swatch = root.querySelector<HTMLElement>('[data-role="swatch"]');
      if (swatch) {
        swatch.style.background = p.accent;
      }
      const lead = root.querySelector<HTMLElement>('[data-role="lead"]');
      if (lead) {
        lead.textContent = p.lead || '';
        if (p.leadColor) lead.style.color = p.leadColor;
      }
      const accent = root.querySelector<HTMLElement>('[data-role="accent"]');
      if (accent) {
        accent.textContent = p.accentLabel || p.label || '';
        if (p.accentColor) accent.style.color = p.accentColor;
      }
      const label = root.querySelector<HTMLElement>('[data-role="label"]');
      if (label) label.textContent = p.label || '';
      const check = root.querySelector<HTMLElement>('[data-role="check"]');
      if (check) {
        if (p.value !== current.value) check.style.opacity = '0';
      }
      return root;
    }

    /**
     * Reemplaza {token} en atributos y textContent del subtree.
     * Escape {{ }}. Tokens disponibles: value, label, accent,
     * lead, accentLabel, leadColor, accentColor, bg, fg.
     */
    #bindTemplate(root: Node, p: Palette): void {
      const tokens: TemplateTokens = {
        value: p.value,
        label: p.label,
        accent: p.accent,
        css: p.css,
        lead: p.lead,
        accentLabel: p.accentLabel,
        leadColor: p.leadColor,
        accentColor: p.accentColor,
        bg: p.bg,
        fg: p.fg,
      };
      const replace = (raw: string): string => raw
        .replace(/\{\{([^}]+)\}\}/g, '{$1}')
        .replace(/\{([a-zA-Z]+)\}/g, (_: string, k: string): string => (k in tokens ? tokens[k as keyof Palette] : ''));
      const walk = (node: Node): void => {
        if (node.nodeType === 1) {
          const el = node as Element;
          for (const attr of [...el.attributes]) {
            const v = attr.value;
            if (v.includes('{')) {
              const next = replace(v);
              if (next !== v) attr.value = next;
            }
          }
        } else if (node.nodeType === 3) {
          const t = node as Text;
          const v = t.nodeValue ?? '';
          if (v.includes('{')) {
            const next = replace(v);
            if (next !== v) t.nodeValue = next;
          }
        }
        for (const child of [...node.childNodes]) walk(child);
      };
      walk(root);
    }

    /** Item default cuando el slot está vacío (swatch + lead/accent + check,
     *  a juego con el trigger "logo style" por defecto). */
    #buildDefaultOption(p: Palette, current: Palette): HTMLElement {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('part', 'option');
      li.tabIndex = -1;
      li.dataset.palette = p.value;
      li.setAttribute('aria-selected', p.value === current.value ? 'true' : 'false');
      const swatch = document.createElement('span');
      swatch.className = 'menu__swatch';
      swatch.style.background = p.accent;
      li.appendChild(swatch);

      // Lead + accent (estilo logo) si la paleta tiene esos datos.
      if (p.lead && p.accentLabel) {
        const lead = document.createElement('span');
        lead.className = 'menu__lead';
        lead.textContent = p.lead;
        if (p.leadColor) lead.style.color = p.leadColor;
        const accent = document.createElement('span');
        accent.className = 'menu__accent';
        accent.textContent = p.accentLabel;
        if (p.accentColor) accent.style.color = p.accentColor;
        li.append(lead, accent);
      } else {
        const label = document.createElement('span');
        label.className = 'menu__label';
        label.textContent = p.label;
        li.appendChild(label);
      }

      const check = document.createElement('is-icon');
      check.className = 'menu__check';
      check.setAttribute('icon', 'mdi:check');
      check.setAttribute('aria-hidden', 'true');
      if (p.value !== current.value) check.style.opacity = '0';
      li.appendChild(check);
      return li;
    }

    #apply(value: string | null): void {
      if (!value) return;
      const palette = this.#palettes.find((p) => p.value === value);
      if (!palette) return;
      this.#value = value;
      // data-palette en <html>
      document.documentElement.dataset.palette = value;
      // Cargar CSS si la paleta lo trae y aún no está cargado.
      if (palette.css && !this.#loadedCSS.has(palette.css)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = palette.css;
        link.dataset.paletteCss = palette.value;
        document.head.appendChild(link);
        this.#loadedCSS.add(palette.css);
      }
      // Persistir.
      const key = this.getAttribute('storage-key') || 'is-palette';
      try { localStorage.setItem(key, value); } catch (_err) { /* ignore */ }
      // Emitir evento.
      emit(this, 'is-palette-change', { value, palette });
      // Actualizar aria-selected del menu.
      for (const opt of this.#menu.querySelectorAll<HTMLElement>('[role="option"]')) {
        opt.setAttribute('aria-selected', opt.dataset.palette === value ? 'true' : 'false');
        const check = opt.querySelector<HTMLElement>('.menu__check');
        if (check) check.style.opacity = opt.dataset.palette === value ? '1' : '0';
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

  defineElement('is-palette-selector', IsPaletteSelector, 'IsPaletteSelector');
})();
