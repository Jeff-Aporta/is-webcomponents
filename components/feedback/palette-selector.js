import { adoptCss } from '../_shared/adopt-css.js';
import '../media/icon.js';

/**
 * <is-palette-selector> — Web Component (vanilla).
 *
 * Selector visual de paletas de marca. Por defecto expone las 3 paletas
 * que viven en `styles/palettes.css` (insoft, contapyme, agrowin) pero
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
 *                 Default = DEFAULT_PALETTES (insoft, contapyme, agrowin).
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
 *   el.value    = 'insoft'   // activa paleta y notifica
 *   el.open() / close() / toggle()
 *   el.addEventListener('is-palette-change', e => e.detail)
 */

(() => {
  // 3 paletas por defecto. El `lead`/`accent` permiten que el trigger por
  // defecto represente la marca como "in" + "Soft" en dos colores. Como
  // ESTOS CSS ya están enlazados en el <head>, no hace falta inyectar
  // <link> extra: solo se respeta data-palette="X" en <html>.
  const DEFAULT_PALETTES = [
    // El logo lleva la S en MAYUSCULA y en el color de marca: in + Soft.
    // Ver el mismo criterio en index.html; aqui estaba en minuscula y el
    // wordmark salia como "insoft".
    { value: 'insoft',    label: 'InSoft',    accent: '#e03131', lead: 'in',  accentLabel: 'Soft',  leadColor: '#111', accentColor: '#e03131', bg: '#fff', fg: '#111' },
    { value: 'contapyme', label: 'ContaPyme', accent: 'dodgerblue', lead: 'conta', accentLabel: 'pyme', leadColor: '#111', accentColor: 'dodgerblue', bg: '#fff', fg: '#111' },
    { value: 'agrowin',   label: 'AgroWin',   accent: 'yellowgreen', lead: 'agro', accentLabel: 'win',  leadColor: '#111', accentColor: 'yellowgreen', bg: '#fff', fg: '#111' },
  ];

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="root">
      <slot name="trigger"></slot>
      <button type="button" part="trigger" class="trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Elegir paleta" title="Elegir paleta">
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

  class IsPaletteSelector extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #root;
    #trigger;
    #menu;
    #slotTrigger;
    #slotOption;
    #palettes = [];
    #value = '';
    #mounted = false;
    /** CSS cargado dinámicamente por paleta, para no recargar dos veces. */
    #loadedCSS = new Set();

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#root = shadow.querySelector('.root');
      this.#trigger = shadow.querySelector('.trigger');
      this.#menu = shadow.querySelector('.menu');
      this.#slotTrigger = shadow.querySelector('slot[name="trigger"]');
      this.#slotOption = shadow.querySelector('slot[name="option"]');

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
      this.addEventListener('keydown', this.#onKeydown);
      // Cerrar al hacer click fuera del componente.
      document.addEventListener('click', this.#onDocClick);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.#onDocClick);
      this.#menu?.removeEventListener('click', this.#onClick);
      this.#trigger?.removeEventListener('click', this.#onClick);
      this.#slotTrigger?.removeEventListener('slotchange', this.#onTriggerSlotChange);
      this.#slotOption?.removeEventListener('slotchange', this.#onOptionSlotChange);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#parsePalettes();
      this.#loadInitial();
      this.#render();
      // Ajustar visibilidad trigger interno vs slot.
      this.#syncTriggerVisibility();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
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

    get palettes() { return this.#palettes.slice(); }
    set palettes(list) {
      this.setAttribute('palettes', JSON.stringify(list || []));
    }

    get value() { return this.getAttribute('value') || ''; }
    set value(v) {
      if (v) this.setAttribute('value', v);
      else this.removeAttribute('value');
    }

    /** Lanza el dropdown programáticamente. */
    open() { this.#setOpen(true); }
    close() { this.#setOpen(false); }
    toggle() { this.#setOpen(this.#menu.hidden); }

    // ---- privados ----

    #parsePalettes() {
      const raw = this.getAttribute('palettes');
      let list = DEFAULT_PALETTES;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) list = parsed;
        } catch (err) {
          console.warn('[is-palette-selector] palettes no es JSON válido:', err);
        }
      }
      // Normaliza cada entrada.
      this.#palettes = list.map((p) => ({
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

    #loadInitial() {
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
    #current() {
      return this.#palettes.find((p) => p.value === this.#value) || this.#palettes[0];
    }

    /** ¿El slot trigger tiene contenido provisto por el consumidor? */
    #hasCustomTrigger() {
      const nodes = this.#slotTrigger?.assignedNodes({ flatten: true }) || [];
      return nodes.some((n) => {
        if (n.nodeType === 1) return true;
        if (n.nodeType === 3) return (n.textContent || '').trim().length > 0;
        return false;
      });
    }

    #syncTriggerVisibility() {
      const hasCustom = this.#hasCustomTrigger();
      this.#trigger.hidden = hasCustom;
      if (hasCustom) {
        this.#trigger.setAttribute('aria-hidden', 'true');
      } else {
        this.#trigger.removeAttribute('aria-hidden');
      }
    }

    /** Handler del slot "trigger" — sólo afecta el trigger button. */
    #onTriggerSlotChange = () => {
      this.#syncTriggerVisibility();
      this.#paintTrigger();
    };

    /** Handler del slot "option" — re-render menu items. */
    #onOptionSlotChange = () => {
      this.#render();
    };

    #paintTrigger() {
      const current = this.#current();
      if (!current) return;

      // Si el consumidor proveyó su propio trigger, NO sobrescribimos su HTML.
      if (this.#hasCustomTrigger()) return;

      // Trigger interno: estilo logo (lead + accent) si tenemos esos datos,
      // sino bg + label plano.
      const lead = this.#trigger.querySelector('.trigger__lead');
      const label = this.#trigger.querySelector('.trigger__label');
      if (current.lead && current.accentLabel) {
        lead.textContent = current.lead;
        lead.style.color = current.leadColor || 'currentColor';
        label.textContent = current.accentLabel;
        label.style.color = current.accentColor || 'currentColor';
      } else {
        lead.textContent = '';
        label.textContent = current.label;
      }
      this.#trigger.style.background = current.bg || '';
      this.#trigger.style.color = current.fg || '';
    }

    #render() {
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
    #getOptionTemplate() {
      const nodes = this.#slotOption?.assignedNodes({ flatten: true }) || [];
      return nodes.find((n) => n.nodeName === 'TEMPLATE') || null;
    }

    /**
     * Clona el <template> del consumidor, reemplaza {tokens} y bindea
     * data-palette / aria-selected / role="option". Si el árbol tiene
     * [data-role="..."], el helper los rellena con campos específicos.
     */
    #buildOptionFromTemplate(template, p, current) {
      const frag = template.content.cloneNode(true);
      // El elemento root del item. El consumidor puede marcarlo con
      // cualquier tag (li, button, div). Le añadimos los attrs ARIA.
      let root = frag.firstElementChild;
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
      this.#bindTemplate(root, p, current.value);

      // data-role="*" -> setters específicos.
      const swatch = root.querySelector('[data-role="swatch"]');
      if (swatch) {
        swatch.style.background = p.accent;
      }
      const lead = root.querySelector('[data-role="lead"]');
      if (lead) {
        lead.textContent = p.lead || '';
        if (p.leadColor) lead.style.color = p.leadColor;
      }
      const accent = root.querySelector('[data-role="accent"]');
      if (accent) {
        accent.textContent = p.accentLabel || p.label || '';
        if (p.accentColor) accent.style.color = p.accentColor;
      }
      const label = root.querySelector('[data-role="label"]');
      if (label) label.textContent = p.label || '';
      const check = root.querySelector('[data-role="check"]');
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
    #bindTemplate(root, p, currentValue) {
      const tokens = {
        value: p.value,
        label: p.label,
        accent: p.accent,
        lead: p.lead,
        accentLabel: p.accentLabel,
        leadColor: p.leadColor,
        accentColor: p.accentColor,
        bg: p.bg,
        fg: p.fg,
      };
      const walk = (node) => {
        if (node.nodeType === 1) {
          for (const attr of [...node.attributes]) {
            const v = attr.value;
            if (v.includes('{')) {
              const next = v.replace(/\{\{([^}]+)\}\}/g, '{$1}').replace(/\{([a-zA-Z]+)\}/g, (_, k) => (k in tokens ? tokens[k] : ''));
              if (next !== v) attr.value = next;
            }
          }
        } else if (node.nodeType === 3) {
          const v = node.nodeValue;
          if (v.includes('{')) {
            const next = v.replace(/\{\{([^}]+)\}\}/g, '{$1}').replace(/\{([a-zA-Z]+)\}/g, (_, k) => (k in tokens ? tokens[k] : ''));
            if (next !== v) node.nodeValue = next;
          }
        }
        for (const child of node.childNodes) walk(child);
      };
      walk(root);
    }

    /** Item default cuando el slot est\u00e1 vac\u00edo (swatch + lead/accent + check,
     *  a juego con el trigger "logo style" por defecto). */
    #buildDefaultOption(p, current) {
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

    #apply(value) {
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
      try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
      // Emitir evento.
      this.dispatchEvent(new CustomEvent('is-palette-change', {
        detail: { value, palette },
        bubbles: true,
        composed: true,
      }));
      // Actualizar aria-selected del menu.
      for (const opt of this.#menu.querySelectorAll('[role="option"]')) {
        opt.setAttribute('aria-selected', opt.dataset.palette === value ? 'true' : 'false');
        const check = opt.querySelector('.menu__check');
        if (check) check.style.opacity = opt.dataset.palette === value ? '1' : '0';
      }
      // Repintar trigger (cambia colores si el consumidor tiene uno custom,
      // ese se queda; si es el interno, lo repintamos).
      this.#paintTrigger();
    }

    #setOpen(open) {
      this.#menu.hidden = !open;
      this.#trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /** Click dentro del shadow tree: trigger o menu. */
    #onClick = (e) => {
      const opt = e.target.closest('[role="option"]');
      if (opt && this.#menu.contains(opt)) {
        this.#apply(opt.dataset.palette);
        this.#setOpen(false);
        return;
      }
      if (e.target.closest('.trigger')) {
        this.#setOpen(this.#menu.hidden);
      }
    };

    /** Click en el contenido del slot (light DOM). Cualquier click alli
     *  abre/cierra el menú. Si el consumidor quiere comportamiento especial
     *  (links, etc.) puede llamar `e.stopPropagation()` en su handler. */
    #onSlotClick = (e) => {
      // ¿El target está dentro del slot trigger (light DOM)?
      const trigger = this.querySelector('[slot="trigger"]');
      if (trigger && trigger.contains(e.target)) {
        this.#setOpen(this.#menu.hidden);
      }
    };

    #onKeydown = (e) => {
      if (e.key === 'Escape' && !this.#menu.hidden) {
        this.#setOpen(false);
        this.#trigger.focus();
      }
    };

    #onDocClick = (e) => {
      if (!this.#menu.hidden && !this.contains(e.target)) {
        this.#setOpen(false);
      }
    };
  }

  if (!customElements.get('is-palette-selector')) {
    customElements.define('is-palette-selector', IsPaletteSelector);
  }
  if (typeof window !== 'undefined') {
    window.IsPaletteSelector = IsPaletteSelector;
  }
})();
