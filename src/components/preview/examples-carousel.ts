/**
 * <iswc-examples-carousel> — Helper W19: carrusel de ejemplos predefinidos.
 *
 * Estandar W15+W19 (2026-10-03-zod-migration): el playground de cada componente
 * incluye un carrusel de ejemplos predefinidos. Cada card contiene una
 * instancia REAL del componente target escalada via CSS para caber en la
 * card. Al hacer click, todos los props del ejemplo se aplican al host
 * target (CSS selector) en la misma pagina.
 *
 * Reuso (W19): todos los pedazos de UI se montan con componentes del kit.
 *   - <iswc-card>     para cada card del carrusel (variante outlined, vertical)
 *   - <iswc-button>   para la navegacion prev/next
 *   - <iswc-icon>     para chevrons y meta de cada card
 *   - <iswc-tab-group> + <iswc-tab> + <iswc-tab-panel> como filtro opcional
 *                     por categoria cuando los ejemplos las declaran.
 *
 * Uso (data-driven, recomendado en JSON):
 *
 *   <iswc-examples-carousel
 *     tag="iswc-button"
 *     target="#btn-play"
 *     label="Ejemplos predefinidos"
 *     examples='[
 *       { "label": "Primario",  "props": { "color": "brand",  "variant": "filled"   } },
 *       { "label": "Peligro",   "props": { "color": "danger", "variant": "outlined" } },
 *       { "label": "Discreto",  "props": { "color": "neutral","variant": "plain"   } }
 *     ]'>
 *   </iswc-examples-carousel>
 *
 * Atributos
 *   tag            string  — el target component (e.g. "iswc-button"). Required.
 *   target         string  — selector CSS del host en la misma pagina al que
 *                            aplicar los props. Si falta, no se aplica nada
 *                            (solo el carrusel visual).
 *   label          string  — titulo visible del header (default: "Ejemplos").
 *   lede           string  — subtitulo opcional del header.
 *   default-index  number  — indice del ejemplo a marcar como activo al inicio.
 *   category-field string  — nombre de la prop de `ExampleSpec` usada para
 *                            agrupar (default: "category"). Si los ejemplos
 *                            no la usan, no se renderiza el filtro de tabs.
 *
 * Propiedades
 *   examples       ExampleSpec[]   — array de { label, props, text?, slot?,
 *                                       category? }.
 *
 * Slots light DOM
 *   (default)      — opcional. Cada hijo con `data-label="..."` se considera
 *                    un ejemplo inline. Si hay hijos, se usan en lugar de
 *                    la propiedad `examples` JSON.
 *
 * Eventos
 *   iswc-examples-pick   detail: { example, index, applied }
 *                                  Se emite al hacer click en una card.
 *                                  `applied` indica si se pudo aplicar al
 *                                  target (true/false).
 *   iswc-examples-category   detail: { category }
 *                                  Se emite al cambiar de tab de categoria.
 */
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
// W19 reuso: cada bloque de UI del carrusel se monta con un componente del kit.
// Estos imports son side-effect: registran los CE si el bundle los necesita.
import '../layout/card.js';
import '../actions/button.js';
import '../media/icon.js';
import '../navigation/tab-group.js';

type ExampleSpec = {
  /** Texto visible en la card. */
  label: string;
  /** Props/atributos a aplicar al host target. */
  props?: Record<string, unknown>;
  /** Texto del slot default del target (string). */
  text?: string;
  /** HTML del slot default del target (string). */
  html?: string;
  /** Icono para la card (mdi:foo). */
  icon?: string;
  /** Color de fondo distintivo de la card. */
  swatch?: string;
  /** Categoria opcional. Se usa para agrupar y para el filtro por tabs. */
  category?: string;
  /** Descripcion accesible (title). */
  description?: string;
};

const OBSERVED = ['tag', 'target', 'label', 'lede', 'default-index', 'category-field'];

class IswcExamplesCarousel extends ElementBase {
  static get observedAttributes(): string[] { return OBSERVED; }

  #titleEl!: HTMLElement;
  #ledeEl!: HTMLElement;
  #tabsHost!: HTMLElement;
  #trackEl!: HTMLElement;
  #prevBtn!: HTMLElement;
  #nextBtn!: HTMLElement;
  #examples: ExampleSpec[] = [];
  #activeIndex = -1;
  #activeCategory = '';

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.innerHTML = `
      <div class="root" part="root">
        <header class="head" part="head">
          <h3 class="title" part="title"></h3>
          <p class="lede" part="lede" hidden></p>
        </header>
        <div class="tabs" part="tabs" hidden>
          <iswc-tab-group class="tabs__group" part="tabs-group" placement="top" activation="auto"></iswc-tab-group>
        </div>
        <div class="viewport" part="viewport">
          <iswc-button class="nav nav--prev" part="nav-prev" type="button"
                       variant="ghost" color="text" shape="round"
                       aria-label="Ejemplos anteriores">
            <iswc-icon slot="start" icon="mdi:chevron-left" aria-hidden="true"></iswc-icon>
          </iswc-button>
          <div class="track" part="track" role="list" aria-label="Ejemplos predefinidos"></div>
          <iswc-button class="nav nav--next" part="nav-next" type="button"
                       variant="ghost" color="text" shape="round"
                       aria-label="Ejemplos siguientes">
            <iswc-icon slot="end" icon="mdi:chevron-right" aria-hidden="true"></iswc-icon>
          </iswc-button>
        </div>
      </div>
    `;
    this.#titleEl = shadow.querySelector<HTMLElement>('.title')!;
    this.#ledeEl = shadow.querySelector<HTMLElement>('.lede')!;
    this.#tabsHost = shadow.querySelector<HTMLElement>('.tabs')!;
    this.#trackEl = shadow.querySelector<HTMLElement>('.track')!;
    this.#prevBtn = shadow.querySelector<HTMLElement>('.nav--prev')!;
    this.#nextBtn = shadow.querySelector<HTMLElement>('.nav--next')!;
    // El <iswc-tab-group> interno; escuchamos iswc-tab-show para cambiar
    // de categoria.
    const tabGroup = shadow.querySelector<HTMLElement>('.tabs__group')!;
    tabGroup.addEventListener('iswc-tab-show', (ev) => {
      const detail = (ev as CustomEvent<{ name?: string }>).detail;
      if (!detail?.name || detail.name === '__all__') {
        this.#activeCategory = '';
      } else {
        this.#activeCategory = detail.name;
      }
      this.#applyCategoryFilter();
      emit(this, 'iswc-examples-category', { category: this.#activeCategory });
    });
    // Navegacion prev/next via los <iswc-button> reusados.
    this.#prevBtn.addEventListener('click', () => this.scrollBy(-1));
    this.#nextBtn.addEventListener('click', () => this.scrollBy(1));
  }

  onConnected(): void {
    this.#readInlineExamples();
    this.#syncChrome();
    this.#render();
    if (this.defaultIndex >= 0) this.setActive(this.defaultIndex);
  }

  onAttributeChanged(): void {
    if (!this.isConnected) return;
    this.#syncChrome();
    if (this.hasAttribute('examples')) {
      try {
        const v = JSON.parse(this.getAttribute('examples') || '[]');
        if (Array.isArray(v)) this.#examples = v;
      } catch { /* noop */ }
    }
    this.#render();
  }

  get tag(): string { return this.getAttribute('tag') ?? ''; }
  set tag(v: string) { setStringAttr(this, 'tag', v); }

  get target(): string { return this.getAttribute('target') ?? ''; }
  set target(v: string) { setStringAttr(this, 'target', v); }

  get label(): string { return this.getAttribute('label') ?? ''; }
  set label(v: string) { setStringAttr(this, 'label', v); }

  get lede(): string { return this.getAttribute('lede') ?? ''; }
  set lede(v: string) { setStringAttr(this, 'lede', v); }

  get defaultIndex(): number {
    const n = Number(this.getAttribute('default-index') || '-1');
    return Number.isFinite(n) ? n : -1;
  }
  set defaultIndex(v: number) {
    if (v == null) this.removeAttribute('default-index');
    else this.setAttribute('default-index', String(v));
  }

  get categoryField(): string {
    return (this.getAttribute('category-field') || 'category').trim() || 'category';
  }
  set categoryField(v: string) { setStringAttr(this, 'category-field', v); }

  get examples(): ExampleSpec[] { return this.#examples.slice(); }
  set examples(v: ExampleSpec[]) {
    // Phase W21 (zod-migration): el JSON de demos declara cada ejemplo con
    // `name` (ver `ExampleSchema` en `section-schema.ts`); el resto del
    // componente sigue hablando en `label` (legacy de la prop interna).
    // Aceptamos ambas formas: si el item trae `name` y no `label`, lo
    // mapeamos. Esto evita reventar demos viejos que ya pasan `label` desde
    // el atributo HTML y a la vez abre la puerta a que el JSON root del
    // preview alimente el carrusel directamente.
    const normalized: ExampleSpec[] = Array.isArray(v)
      ? v.map((raw) => {
          const ex = raw as Record<string, unknown>;
          if (ex && !ex.label && typeof ex.name === 'string') {
            return { ...ex, label: ex.name } as ExampleSpec;
          }
          return raw as ExampleSpec;
        })
      : [];
    this.#examples = normalized;
    if (this.isConnected) this.#render();
  }

  /** Categorias distintas presentes en los ejemplos. */
  #categories(): string[] {
    const set = new Set<string>();
    const field = this.categoryField;
    for (const ex of this.#examples) {
      const raw = (ex as unknown as Record<string, unknown>)[field];
      if (typeof raw === 'string' && raw.trim()) set.add(raw.trim());
    }
    return [...set];
  }

  /** Marca un ejemplo como activo (sin aplicar al target). */
  setActive(index: number): void {
    if (!this.#examples.length) return;
    const i = Math.max(0, Math.min(index, this.#examples.length - 1));
    this.#activeIndex = i;
    for (const card of this.#trackEl.querySelectorAll<HTMLElement>('.card')) {
      const idx = Number(card.dataset.index ?? '-1');
      const active = idx === i;
      card.toggleAttribute('active', active);
      card.setAttribute('aria-pressed', String(active));
    }
    const card = this.#trackEl.querySelector<HTMLElement>(`.card[data-index="${i}"]`);
    card?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  /** Aplica un ejemplo al target externo. Devuelve true si se aplico. */
  applyExample(index: number): boolean {
    if (index < 0 || index >= this.#examples.length) return false;
    const example = this.#examples[index];
    const host = this.#resolveTarget();
    if (!host) return false;
    this.#applyProps(host, example);
    this.setActive(index);
    emit(this, 'iswc-examples-pick', { example, index, applied: true });
    return true;
  }

  #syncChrome(): void {
    this.#titleEl.textContent = this.label || 'Ejemplos predefinidos';
    const lede = this.lede;
    if (lede) {
      this.#ledeEl.textContent = lede;
      this.#ledeEl.hidden = false;
    } else {
      this.#ledeEl.hidden = true;
    }
  }

  /**
   * Lee ejemplos inline: cada hijo con `data-label` es un ejemplo. Los props
   * se toman de `data-props` (JSON). Si hay hijos, pisan `examples`.
   */
  #readInlineExamples(): void {
    const children = [...this.children].filter(
      (n): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE,
    );
    if (!children.length) {
      // Si el atributo examples esta como string, parsearlo.
      const attr = this.getAttribute('examples');
      if (attr) {
        try {
          const v = JSON.parse(attr);
          if (Array.isArray(v)) this.#examples = v;
        } catch { /* noop */ }
      }
      return;
    }
    this.#examples = children.map((child) => {
      const ds = child.dataset;
      let props: Record<string, unknown> = {};
      if (ds.props) {
        try {
          const v = JSON.parse(ds.props);
          if (v && typeof v === 'object') props = v as Record<string, unknown>;
        } catch { /* noop */ }
      }
      return {
        label: ds.label || child.textContent?.trim() || 'Ejemplo',
        props,
        text: ds.text,
        html: ds.html,
        icon: ds.icon,
        swatch: ds.swatch,
        category: ds.category,
        description: ds.description,
      };
    });
  }

  #render(): void {
    this.#trackEl.replaceChildren();
    this.#renderTabs();
    if (!this.#examples.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No hay ejemplos predefinidos.';
      this.#trackEl.append(empty);
      return;
    }
    this.#examples.forEach((ex, i) => this.#renderCard(ex, i));
    this.#applyCategoryFilter();
  }

  /**
   * Renderiza el <iswc-tab-group> con un tab por cada categoria presente.
   * Si solo hay cero o una categoria, el filtro queda oculto.
   */
  #renderTabs(): void {
    const group = this.#tabsHost.querySelector<HTMLElement>('.tabs__group');
    if (!group) return;
    const cats = this.#categories();
    if (cats.length < 2) {
      this.#tabsHost.hidden = true;
      group.replaceChildren();
      return;
    }
    this.#tabsHost.hidden = false;
    // (Re)poblar tabs: 1 panel "Todos" + uno por categoria. Solo el panel
    // "Todos" lleva contenido visible (los demas quedan vacios y ocultos
    // para mantener el contrato de iswc-tab-group).
    group.replaceChildren();
    const allTab = document.createElement('iswc-tab');
    allTab.setAttribute('slot', 'nav');
    allTab.setAttribute('panel', '__all__');
    allTab.textContent = 'Todos';
    group.append(allTab);

    const allPanel = document.createElement('iswc-tab-panel');
    allPanel.setAttribute('name', '__all__');
    allPanel.textContent = '';
    group.append(allPanel);

    for (const c of cats) {
      const t = document.createElement('iswc-tab');
      t.setAttribute('slot', 'nav');
      t.setAttribute('panel', c);
      t.textContent = c;
      group.append(t);

      const p = document.createElement('iswc-tab-panel');
      p.setAttribute('name', c);
      p.textContent = '';
      group.append(p);
    }
    // Forzar el panel "Todos" como activo.
    (group as unknown as { active?: string }).active = '__all__';
  }

  /**
   * Construye una card con <iswc-card> (W19 reuso). El click se delega en
   * el contenedor `.track` para no atar un listener por card.
   */
  #renderCard(ex: ExampleSpec, i: number): void {
    const card = document.createElement('iswc-card');
    card.className = 'card';
    card.dataset.index = String(i);
    card.dataset.category = ex.category ?? '';
    card.setAttribute('variant', 'outlined');
    card.setAttribute('orientation', 'vertical');
    card.setAttribute('part', 'card');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', ex.label);
    card.setAttribute('aria-pressed', 'false');
    if (ex.description) card.title = ex.description;
    if (ex.swatch) {
      card.style.setProperty('--card-swatch', ex.swatch);
      card.setAttribute('data-swatch', ex.swatch);
    }

    // Media slot: la instancia real escalada del componente target.
    const media = document.createElement('div');
    media.setAttribute('slot', 'media');
    media.className = 'card__media';
    const preview = this.#buildPreview(ex);
    if (preview) media.append(preview);
    card.append(media);

    // Body slot (default): texto de la card.
    const meta = document.createElement('div');
    meta.className = 'card__meta';
    if (ex.icon) {
      const icon = document.createElement('iswc-icon');
      icon.className = 'card__icon';
      icon.setAttribute('icon', ex.icon);
      icon.setAttribute('aria-hidden', 'true');
      meta.append(icon);
    }
    const label = document.createElement('span');
    label.className = 'card__label';
    label.textContent = ex.label;
    meta.append(label);
    card.append(meta);

    // Click handler: aplica los props al target. Se hace por card para que
    // el evento siga funcionando si el host se mueve dentro del track.
    card.addEventListener('click', () => this.applyExample(i));

    this.#trackEl.append(card);
  }

  /**
   * Construye un nodo que muestra el ejemplo. Estrategia: crear un
   * <iswc-target> con los props aplicados + el texto/html del slot. Esto
   * requiere que `tag` este registrado (el playground ya lo hace).
   */
  #buildPreview(ex: ExampleSpec): HTMLElement | null {
    const tag = this.tag;
    if (!tag) return null;
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(ex.props ?? {})) {
      this.#writeProp(el, k, v);
    }
    if (ex.html) {
      const tpl = document.createElement('template');
      tpl.innerHTML = ex.html.trim();
      el.append(tpl.content.cloneNode(true));
    } else if (ex.text != null) {
      el.textContent = ex.text;
    }
    return el;
  }

  /** Escribe un prop/attr al target, con la misma convencion que controles.ts. */
  #writeProp(host: HTMLElement, name: string, value: unknown): void {
    if (name.startsWith('attr:')) {
      const attr = name.slice(5);
      if (typeof value === 'boolean') {
        if (value) host.setAttribute(attr, '');
        else host.removeAttribute(attr);
      } else if (value == null || value === '') {
        host.removeAttribute(attr);
      } else {
        host.setAttribute(attr, String(value));
      }
      return;
    }
    const prop = name.replace(/^prop:/, '');
    try {
      (host as unknown as Record<string, unknown>)[prop] = value as never;
    } catch {
      // Fallback a atributo.
      if (typeof value === 'boolean') {
        if (value) host.setAttribute(prop, '');
        else host.removeAttribute(prop);
      } else {
        host.setAttribute(prop, String(value));
      }
    }
  }

  #resolveTarget(): HTMLElement | null {
    const sel = this.target;
    if (!sel) return null;
    // Buscar en la pagina, no en el shadow.
    const root = this.getRootNode() as Document | ShadowRoot;
    return (root as Document).querySelector<HTMLElement>(sel);
  }

  #applyProps(host: HTMLElement, ex: ExampleSpec): void {
    for (const [k, v] of Object.entries(ex.props ?? {})) {
      this.#writeProp(host, k, v);
    }
    if (ex.html != null) {
      host.innerHTML = ex.html;
    } else if (ex.text != null) {
      host.textContent = ex.text;
    }
  }

  /**
   * Aplica la categoria activa como filtro: oculta las cards que no
   * pertenezcan. Si la categoria activa es vacia, las muestra todas.
   */
  #applyCategoryFilter(): void {
    const active = this.#activeCategory;
    for (const card of this.#trackEl.querySelectorAll<HTMLElement>('.card')) {
      const cat = card.dataset.category || '';
      const visible = !active || cat === active;
      card.hidden = !visible;
      card.setAttribute('aria-hidden', String(!visible));
    }
  }

  #scrollBy(dir: -1 | 1): void {
    // Buscar la primera card visible en la direccion pedida.
    const cards = [...this.#trackEl.querySelectorAll<HTMLElement>('.card')]
      .filter((c) => !c.hidden);
    if (!cards.length) return;
    const activeIdx = cards.findIndex((c) => c.hasAttribute('active'));
    const nextIdx = dir > 0
      ? Math.min(cards.length - 1, Math.max(0, activeIdx) + 1)
      : Math.max(0, (activeIdx < 0 ? cards.length - 1 : activeIdx) - 1);
    cards[nextIdx]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

let _defined = false;
/** Define <iswc-examples-carousel> una sola vez (idempotente). */
export function defineExamplesCarousel(): void {
  if (_defined || customElements.get('iswc-examples-carousel')) {
    _defined = true;
    return;
  }
  defineElement('iswc-examples-carousel', IswcExamplesCarousel, 'IswcExamplesCarousel');
  _defined = true;
}

if (typeof customElements !== 'undefined') defineExamplesCarousel();

export { IswcExamplesCarousel, type ExampleSpec };
export default IswcExamplesCarousel;
