/// <reference lib="dom" />
import { adoptCss, defineElement, emit } from '../../core/element.js';
import './split-panel.js';
import type { EntradaTocDocLayout, FuenteTocDocLayout, PanelesDocLayout, PrefsDocLayout, SplitPanelDocLayout } from './doc-layout.schemas.js';

export type { EntradaTocDocLayout, FuenteTocDocLayout, PanelesDocLayout, PrefsDocLayout } from './doc-layout.schemas.js';

/**
 * <iswc-doc-layout> — layout documental común: navegación a la izquierda, contenido
 * al centro e índice de la página a la derecha, con scroll-spy entre ambos.
 *
 * Lo reusan las vistas documentales (demos de componentes, lector de markdown,
 * guías): la app solo pone el contenido de cada zona.
 *
 *   <iswc-doc-layout storage-key="mis-docs">
 *     <strong slot="brand">Mi app</strong>
 *     <iswc-theme-toggle slot="actions"></iswc-theme-toggle>
 *     <nav slot="start">…</nav>
 *     <article>… <h2>Sección</h2> …</article>
 *     <!-- sin slot="end": el layout arma el índice de la página solo -->
 *   </iswc-doc-layout>
 *
 * Slots
 *   brand     título/identidad en la barra superior.
 *   actions   acciones de la app en la barra (tema, paleta, …).
 *   start     navegación (índice de páginas). En celular es un cajón.
 *   (default) contenido central; es el que hace scroll.
 *   end       panel derecho propio. Si queda vacío y `toc` no es "off", el layout
 *             genera el índice de la página con los encabezados del contenido.
 *
 * Responsive (lo decide el layout, no la app)
 *   celular (≤ 760 px)   laterales cerrados por defecto; se abren como cajón y se cierran al
 *                        elegir un enlace/botón dentro, con el velo o con Esc.
 *   tableta (≤ 1100 px)  navegación visible; índice de la página compacto salvo que el usuario lo abra.
 *   escritorio           ambos visibles y redimensionables; el usuario los compacta con la barra.
 *   TV (≥ 1700 px)       misma disposición con tipografía y barra más grandes.
 *   Las elecciones del usuario se recuerdan por tamaño de pantalla (`storage-key`).
 *
 * Atributos
 *   storage-key    prefijo para recordar anchos y paneles abiertos (localStorage).
 *   toc            "auto" (default) | "off".
 *   toc-selector   encabezados del índice. Default "h2, h3".
 *   toc-title      título del índice. Default "En esta página".
 *   spy-offset     px desde el borde superior del contenido para marcar la sección activa. Default 96.
 *   start-width / end-width   ancho inicial (px) de los laterales. Default 300 / 250.
 *   no-bar         oculta la barra superior (la app pone la suya y usa los métodos).
 *   hide-start / hide-end   oculta ese lateral y su botón (lo decide la app; gana a la preferencia del usuario).
 *   toc-min        mínimo de entradas para mostrar el índice generado (default 2): con menos,
 *                  el panel derecho y su botón se ocultan solos (una página de una sola sección).
 *
 * Métodos
 *   toggleStart() / toggleEnd()     compacta o muestra cada lateral.
 *   refreshToc()                    vuelve a leer los encabezados (tras pintar contenido asíncrono).
 *   scrollToHeading(id)             lleva el contenido a ese encabezado.
 *   scrollContentTo(top)            scroll del contenido (p. ej. 0 al cambiar de página).
 *   tocSource = (contenido) => HTMLElement[]   fuente propia de encabezados.
 *
 * Eventos
 *   iswc-doc-layout-panels   { start, end }      al cambiar la visibilidad de los laterales.
 *   iswc-doc-layout-active   { id }              al cambiar la sección activa (scroll-spy).
 *   iswc-doc-layout-navigate { id } cancelable   clic en el índice; preventDefault = la app navega.
 *
 * Panel derecho propio + scroll-spy: cualquier `a[href="#id"]` o `[data-spy="id"]`
 * dentro del slot `end` recibe `aria-current="location"` cuando esa sección está activa.
 */

const MOVIL = '(max-width: 760px)';
const TABLETA = '(max-width: 1100px)';

const ICONO = {
  start: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v14h4V5zm6 0v14h8V5z"/></svg>',
  end: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v14h8V5zm10 0v14h4V5z"/></svg>',
};

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <header class="bar" part="bar">
    <button class="toggle start" part="toggle-start" type="button" aria-label="Mostrar u ocultar la navegación" title="Navegación">${ICONO.start}</button>
    <div class="brand" part="brand"><slot name="brand"></slot></div>
    <div class="actions" part="actions"><slot name="actions"></slot></div>
    <button class="toggle end" part="toggle-end" type="button" aria-label="Mostrar u ocultar el índice de la página" title="En esta página">${ICONO.end}</button>
  </header>
  <iswc-split-panel class="ext" primary="start">
    <aside class="start" slot="start" part="start"><slot name="start" data-zona="start"></slot></aside>
    <iswc-split-panel class="int" slot="end" primary="end">
      <main class="content" slot="start" part="content" tabindex="-1"><slot></slot></main>
      <aside class="end" slot="end" part="end"><slot name="end" data-zona="end"><nav class="toc" part="toc"><h2 class="toc-title" part="toc-title"></h2><div class="toc-links" part="toc-links"></div></nav></slot></aside>
    </iswc-split-panel>
  </iswc-split-panel>
  <div class="scrim" part="scrim"></div>
  <aside class="drawer start" part="drawer-start"><slot name="start-cajon" data-cajon="start"></slot></aside>
  <aside class="drawer end" part="drawer-end"><slot name="end-cajon" data-cajon="end"></slot></aside>
`;

const slugDe = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

/**
 * Deja `el` visible dentro de su contenedor con scroll más cercano, sin mover la
 * página ni los paneles ocultos (`scrollIntoView` desplaza también los ancestros:
 * con un cajón fuera de pantalla movía el layout entero de lado).
 */
export function desplazarDentro(el: HTMLElement): void {
  let caja: HTMLElement | null = el.parentElement;
  while (caja && !(caja.scrollHeight > caja.clientHeight && /(auto|scroll)/.test(getComputedStyle(caja).overflowY))) caja = caja.parentElement;
  if (!caja || caja.offsetParent === null) return;
  const r = el.getBoundingClientRect();
  const c = caja.getBoundingClientRect();
  if (r.top < c.top) caja.scrollTop -= c.top - r.top + 8;
  else if (r.bottom > c.bottom) caja.scrollTop += r.bottom - c.bottom + 8;
}

/** Encabezados dentro de `raiz`, atravesando shadow roots abiertos. */
function buscarProfundo(raiz: ParentNode, selector: string, out: HTMLElement[] = []): HTMLElement[] {
  for (const el of Array.from(raiz.querySelectorAll<HTMLElement>(`${selector}, *`))) {
    if (el.matches(selector)) out.push(el);
    if (el.shadowRoot) buscarProfundo(el.shadowRoot, selector, out);
  }
  return out;
}

class IswcDocLayout extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['storage-key', 'toc', 'toc-title', 'start-width', 'end-width', 'hide-start', 'hide-end', 'toc-min'];
  }

  /** Fuente propia de encabezados; por defecto, búsqueda profunda de `toc-selector` en el contenido. */
  tocSource: FuenteTocDocLayout | null = null;

  #shadow: ShadowRoot;
  #ext: SplitPanelDocLayout;
  #int: SplitPanelDocLayout;
  #content: HTMLElement;
  #toc: EntradaTocDocLayout[] = [];
  #activo: string | null = null;
  #pendiente = 0;
  #prefs: PrefsDocLayout = {};
  #consultas = [matchMedia(MOVIL), matchMedia(TABLETA)];

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    adoptCss(this.#shadow, import.meta.url);
    this.#shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#ext = this.#shadow.querySelector<SplitPanelDocLayout>('.ext')!;
    this.#int = this.#shadow.querySelector<SplitPanelDocLayout>('.int')!;
    this.#content = this.#shadow.querySelector<HTMLElement>('main.content')!;
  }

  connectedCallback(): void {
    this.#prefs = this.#leerPrefs();
    this.#aplicarAnchos();
    this.#shadow.querySelector('.toggle.start')!.addEventListener('click', () => this.toggleStart());
    this.#shadow.querySelector('.toggle.end')!.addEventListener('click', () => this.toggleEnd());
    this.#shadow.querySelector('.scrim')!.addEventListener('click', () => this.#cerrarCajones());
    // En celular, elegir algo dentro de un cajón (enlace, botón) lo cierra: el lector vuelve al contenido.
    for (const cajon of this.#shadow.querySelectorAll<HTMLElement>('.drawer')) {
      cajon.addEventListener('click', (e) => {
        const accion = e.composedPath().some((n) => n instanceof HTMLElement && (n.tagName === 'A' || n.tagName === 'BUTTON' || n.dataset.cierraCajon !== undefined));
        if (accion) { this.#cerrarCajones(); this.#aplicarPaneles(); }
      });
    }
    this.#shadow.querySelector('.toc-links')!.addEventListener('click', (e) => this.#clicIndice(e));
    this.#shadow.querySelector('slot[name="end"]')!.addEventListener('click', (e) => this.#clicIndice(e));
    this.#content.addEventListener('scroll', this.#alDesplazar, { passive: true });
    this.#shadow.querySelector('slot:not([name])')!.addEventListener('slotchange', () => this.refreshToc());
    for (const q of this.#consultas) q.addEventListener('change', this.#alCambiarPantalla);
    addEventListener('keydown', this.#alTeclado);
    this.#syncTitulo();
    this.#alCambiarPantalla();
    requestAnimationFrame(() => this.refreshToc());
  }

  disconnectedCallback(): void {
    this.#content.removeEventListener('scroll', this.#alDesplazar);
    for (const q of this.#consultas) q.removeEventListener('change', this.#alCambiarPantalla);
    removeEventListener('keydown', this.#alTeclado);
  }

  attributeChangedCallback(nombre: string): void {
    if (!this.isConnected) return;
    if (nombre === 'toc-title') this.#syncTitulo();
    if (nombre === 'start-width' || nombre === 'end-width' || nombre === 'storage-key') this.#aplicarAnchos();
    if (nombre === 'toc' || nombre === 'toc-min') this.refreshToc();
    if (nombre === 'hide-start' || nombre === 'hide-end') this.#aplicarPaneles();
  }

  /** Visibilidad efectiva de los laterales en el tamaño de pantalla actual. */
  get panels(): PanelesDocLayout {
    return { start: this.#visible('start'), end: this.#visible('end') };
  }

  /** Sección activa del scroll-spy (id del encabezado) o null. */
  get activeId(): string | null {
    return this.#activo;
  }

  /** Encabezados del índice actual. */
  get headings(): EntradaTocDocLayout[] {
    return [...this.#toc];
  }

  toggleStart(): void {
    if (this.#oculto('start')) return;
    if (matchMedia(MOVIL).matches) { this.#abrirCajon('start'); return; }
    this.#prefs.start = !this.#visible('start');
    this.#guardarPrefs();
  }

  toggleEnd(): void {
    if (this.#oculto('end')) return;
    if (matchMedia(MOVIL).matches) { this.#abrirCajon('end'); return; }
    const nuevo = !this.#visible('end');
    if (matchMedia(TABLETA).matches) this.#prefs.endTableta = nuevo;
    else this.#prefs.end = nuevo;
    this.#guardarPrefs();
  }

  scrollContentTo(top: number): void {
    this.#content.scrollTo({ top, behavior: 'auto' });
    this.#alDesplazar();
  }

  scrollToHeading(id: string): void {
    const objetivo = this.#toc.find((h) => h.id === id)?.el ?? null;
    if (!objetivo) return;
    const delta = objetivo.getBoundingClientRect().top - this.#content.getBoundingClientRect().top;
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#content.scrollTo({ top: this.#content.scrollTop + delta - 16, behavior: reducido ? 'auto' : 'smooth' });
    this.#marcar(id);
  }

  /** Relee los encabezados del contenido y repinta el índice (el contenido asíncrono lo llama al terminar). */
  refreshToc(): void {
    const selector = this.getAttribute('toc-selector') || 'h2, h3';
    const asignados = (this.#shadow.querySelector<HTMLSlotElement>('slot:not([name])')?.assignedElements({ flatten: true }) ?? []) as HTMLElement[];
    const crudos = this.tocSource ? this.tocSource(asignados) : asignados.flatMap((el) => [...(el.matches(selector) ? [el] : []), ...buscarProfundo(el, selector), ...(el.shadowRoot ? buscarProfundo(el.shadowRoot, selector) : [])]);
    const usados = new Set<string>();
    this.#toc = crudos.filter((el) => (el.textContent ?? '').trim()).map((el, i) => {
      let id = el.id || slugDe(el.textContent ?? '') || `seccion-${i + 1}`;
      while (usados.has(id)) id = `${id}-${i + 1}`;
      usados.add(id);
      if (!el.id) el.id = id;
      return { id, texto: (el.textContent ?? '').trim(), nivel: Number(el.tagName.slice(1)) || 2, el };
    });
    this.#pintarIndice();
    this.#aplicarPaneles();
    // Página nueva: el índice de la derecha vuelve arriba con scroll suave (el spy marca desde ahí).
    const lado = this.#shadow.querySelector<HTMLElement>('aside.end');
    if (lado && lado.scrollTop > 0) lado.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    this.#alDesplazar();
  }

  #syncTitulo(): void {
    this.#shadow.querySelector('.toc-title')!.textContent = this.getAttribute('toc-title') || 'En esta página';
  }

  #pintarIndice(): void {
    const caja = this.#shadow.querySelector<HTMLElement>('.toc-links')!;
    const apagado = this.getAttribute('toc') === 'off';
    this.toggleAttribute('data-toc-vacio', apagado || this.#toc.length === 0);
    caja.replaceChildren(...(apagado ? [] : this.#toc.map((h) => {
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.dataset.spy = h.id;
      a.textContent = h.texto;
      a.className = `toc-link nivel-${Math.min(4, Math.max(2, h.nivel))}`;
      a.setAttribute('part', `toc-link toc-link-${Math.min(4, Math.max(2, h.nivel))}`);
      return a;
    })));
    this.#activo = null;
  }

  #clicIndice(e: Event): void {
    const enlace = e.composedPath().find((n): n is HTMLElement => n instanceof HTMLElement && (n.dataset.spy !== undefined || (n.tagName === 'A' && (n.getAttribute('href') ?? '').startsWith('#'))));
    if (!enlace) return;
    const id = enlace.dataset.spy ?? decodeURIComponent((enlace.getAttribute('href') ?? '').slice(1));
    if (!id) return;
    e.preventDefault();
    this.#cerrarCajones();
    const sigue = emit(this, 'iswc-doc-layout-navigate', { id }, { cancelable: true });
    if (sigue) this.scrollToHeading(id);
  }

  #alDesplazar = (): void => {
    if (this.#pendiente) return;
    this.#pendiente = requestAnimationFrame(() => {
      this.#pendiente = 0;
      const tope = this.#content.getBoundingClientRect().top + Number(this.getAttribute('spy-offset') || 96);
      let activo: string | null = this.#toc[0]?.id ?? null;
      for (const h of this.#toc) {
        if (h.el.getBoundingClientRect().top <= tope) activo = h.id;
        else break;
      }
      // Al final del contenido manda el último encabezado (aunque no llegue arriba).
      const c = this.#content;
      if (c.scrollTop + c.clientHeight >= c.scrollHeight - 4 && this.#toc.length) activo = this.#toc[this.#toc.length - 1].id;
      this.#marcar(activo);
    });
  };

  #marcar(id: string | null): void {
    if (id === this.#activo) return;
    this.#activo = id;
    const enlaces = [
      ...this.#shadow.querySelectorAll<HTMLElement>('.toc-links [data-spy]'),
      ...((this.#shadow.querySelector<HTMLSlotElement>('slot[name="end"]')?.assignedElements({ flatten: true }) ?? []) as HTMLElement[])
        .flatMap((el) => [...el.querySelectorAll<HTMLElement>('[data-spy], a[href^="#"]')]),
    ];
    for (const a of enlaces) {
      const destino = a.dataset.spy ?? decodeURIComponent((a.getAttribute('href') ?? '').slice(1));
      const es = destino === id;
      a.classList.toggle('activo', es);
      if (es) {
        a.setAttribute('aria-current', 'location');
        desplazarDentro(a);
      } else a.removeAttribute('aria-current');
    }
    emit(this, 'iswc-doc-layout-active', { id });
  }

  /** El índice generado no aporta con menos de `toc-min` entradas (default 2): el panel derecho sobra. */
  #tocSobra(): boolean {
    if (this.querySelector(':scope > [slot="end"]')) return false;
    const minimo = Number(this.getAttribute('toc-min') ?? 2);
    return this.getAttribute('toc') === 'off' || this.#toc.length < (Number.isFinite(minimo) ? minimo : 2);
  }

  /** Lateral oculto por la app (`hide-start` / `hide-end`) o, el derecho, porque no hay índice que mostrar. */
  #oculto(zona: 'start' | 'end'): boolean {
    return this.hasAttribute(`hide-${zona}`) || (zona === 'end' && this.#tocSobra());
  }

  #visible(zona: 'start' | 'end'): boolean {
    if (this.#oculto(zona)) return false;
    if (matchMedia(MOVIL).matches) return false;
    if (zona === 'end' && matchMedia(TABLETA).matches) return this.#prefs.endTableta === true;
    return this.#prefs[zona] !== false;
  }

  #alCambiarPantalla = (): void => {
    const movil = matchMedia(MOVIL).matches;
    this.toggleAttribute('data-movil', movil);
    // En celular el contenido de cada lateral se proyecta en su cajón (un slot por nombre: gana el primero).
    const ponerNombre = (sel: string, nombre: string | null) => {
      const s = this.#shadow.querySelector<HTMLSlotElement>(sel)!;
      if (nombre) s.setAttribute('name', nombre); else s.removeAttribute('name');
    };
    ponerNombre('slot[data-zona="start"]', movil ? 'start-escritorio' : 'start');
    ponerNombre('slot[data-cajon="start"]', movil ? 'start' : 'start-cajon');
    ponerNombre('slot[data-zona="end"]', movil ? 'end-escritorio' : 'end');
    ponerNombre('slot[data-cajon="end"]', movil ? 'end' : 'end-cajon');
    if (movil) {
      // El índice generado también va al cajón derecho.
      const caja = this.#shadow.querySelector('.drawer.end')!;
      const nav = this.#shadow.querySelector('nav.toc');
      if (nav && !this.querySelector(':scope > [slot="end"]')) caja.append(nav);
    } else {
      const nav = this.#shadow.querySelector('nav.toc');
      const slotEnd = this.#shadow.querySelector('slot[data-zona="end"]');
      if (nav && slotEnd && nav.parentElement !== slotEnd) slotEnd.append(nav);
      this.#cerrarCajones();
    }
    this.#aplicarPaneles();
  };

  #aplicarPaneles(): void {
    const { start, end } = this.panels;
    if (start) this.#ext.removeAttribute('collapse'); else this.#ext.setAttribute('collapse', 'start');
    if (end) this.#int.removeAttribute('collapse'); else this.#int.setAttribute('collapse', 'end');
    const movil = matchMedia(MOVIL).matches;
    // Sin nada que mostrar en un lateral, su botón tampoco aparece.
    this.#shadow.querySelector<HTMLElement>('.toggle.start')!.hidden = this.#oculto('start');
    this.#shadow.querySelector<HTMLElement>('.toggle.end')!.hidden = this.#oculto('end');
    this.#shadow.querySelector('.toggle.start')!.setAttribute('aria-pressed', String(movil ? this.hasAttribute('data-cajon-start') : start));
    this.#shadow.querySelector('.toggle.end')!.setAttribute('aria-pressed', String(movil ? this.hasAttribute('data-cajon-end') : end));
    emit(this, 'iswc-doc-layout-panels', { start, end });
  }

  #abrirCajon(zona: 'start' | 'end'): void {
    const abierto = this.hasAttribute(`data-cajon-${zona}`);
    this.#cerrarCajones();
    if (!abierto) this.setAttribute(`data-cajon-${zona}`, '');
    this.#aplicarPaneles();
  }

  #cerrarCajones(): void {
    this.removeAttribute('data-cajon-start');
    this.removeAttribute('data-cajon-end');
  }

  #alTeclado = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && (this.hasAttribute('data-cajon-start') || this.hasAttribute('data-cajon-end'))) {
      this.#cerrarCajones();
      this.#aplicarPaneles();
    }
  };

  #aplicarAnchos(): void {
    // El split recibe ancho y llave por propiedad (no las observa como atributo).
    const key = this.getAttribute('storage-key');
    if (key) {
      this.#ext.storageKey = `${key}:ancho-start`;
      this.#int.storageKey = `${key}:ancho-end`;
    }
    this.#ext.positionInPixels = Number(this.getAttribute('start-width') || 300);
    this.#int.positionInPixels = Number(this.getAttribute('end-width') || 250);
  }

  #leerPrefs(): PrefsDocLayout {
    const key = this.getAttribute('storage-key');
    if (!key) return {};
    try {
      const crudo: unknown = JSON.parse(localStorage.getItem(`${key}:paneles`) || '{}');
      if (typeof crudo !== 'object' || crudo === null) return {};
      const prefs: PrefsDocLayout = {};
      for (const k of ['start', 'end', 'endTableta'] as const) {
        const v: unknown = Reflect.get(crudo, k);
        if (typeof v === 'boolean') prefs[k] = v;
      }
      return prefs;
    } catch {
      return {};
    }
  }

  #guardarPrefs(): void {
    const key = this.getAttribute('storage-key');
    if (key) { try { localStorage.setItem(`${key}:paneles`, JSON.stringify(this.#prefs)); } catch { /* sin storage */ } }
    this.#aplicarPaneles();
  }
}

defineElement('iswc-doc-layout', IswcDocLayout);
