import { emit } from '@jeff-aporta/iswc-base/core/element.js';
import { crearNodo } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { getNumberAttr } from '@jeff-aporta/iswc-base/core/reflect.js';
import { PaginationTextosSchema } from './schemas/pagination.schemas.js';
import type { PaginationChangeDetail, PaginationSizeDetail, PaginationTextos } from './schemas/pagination.schemas.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import css from 'iswc:css';

/**
 * <iswc-pagination> — paginación numérica: pista de números desplazable (flechas, Shift+rueda, arrastre táctil) y selector
 * de tamaño opcional.
 *
 * Attributes
 *   page, pages                      página actual y total (1-based)
 *   page-size                        tamaño actual (si no es una de las opciones, vale la primera)
 *   elements-per-page                opciones de tamaño, separadas por comas o espacios (default 15 30 50)
 *   hide-page-size                   oculta el selector de tamaño
 *   total                            elementos del catálogo; si son menos que la opción menor, no hay selector
 *   disabled, compact                bloquea la navegación · versión baja para columnas estrechas
 *   variant, color                   apariencia del número actual (los de `iswc-button`)
 *   label                            aria-label de la navegación
 *
 * Propiedad `textos`: textos para lectores de pantalla.
 * Eventos: iswc-page-change { page }, iswc-page-size-change { pageSize }.
 * CSS parts: base, resumen, carril, pista, tamano.
 */

const OBSERVED = ['page', 'pages', 'page-size', 'elements-per-page', 'hide-page-size', 'total', 'disabled', 'compact', 'variant', 'color', 'label'] as const;
const TAMANOS = [15, 30, 50];
const TEXTOS: PaginationTextos = {
  pagina: 'Página {n}',
  irA: 'Ir a la página {n}',
  resumen: 'Página {n} de {total}',
  izquierda: 'Desplazar páginas a la izquierda',
  derecha: 'Desplazar páginas a la derecha',
  tamano: 'Elementos por página',
};

/** Tamaños positivos únicos de una lista separada por comas o espacios; `[]` si no hay ninguno válido. */
function parseSizes(raw: string | null): number[] {
  const nums = (raw ?? '').trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(nums)];
}

const rellenar = (plantilla: string, n: number, total = 0): string => plantilla.replace('{n}', String(n)).replace('{total}', String(total));

class IswcPagination extends IswcElement {
  static tag = 'iswc-pagination';
  static css = css;
  static deps = ['iswc-button', 'iswc-icon'];
  static observed = [...OBSERVED];

  #root: ShadowRoot;
  #abort: AbortController | null = null;
  #caja: ResizeObserver | null = null;
  #gen = 0;
  #textos: PaginationTextos = TEXTOS;

  constructor() {
    super();
    this.#root = this.shadowRoot!;
  }

  override onConnected(): void {
    this.#pintar();
    this.#caja = new ResizeObserver(() => {
      const pista = this.#root.querySelector<HTMLElement>('.pista');
      if (pista) this.#flechas(pista);
    });
    this.#caja.observe(this);
  }

  override onDisconnected(): void {
    this.#abort?.abort();
    this.#abort = null;
    this.#caja?.disconnect();
    this.#caja = null;
  }

  override onAttributeChanged(): void { this.#pintar(); }

  /** Página actual (1-based, mínimo 1). */
  get page(): number { return Math.max(1, getNumberAttr(this, 'page', 1) || 1); }
  set page(v: number) { this.setAttribute('page', String(Math.max(1, Number(v) || 1))); }

  /** Total de páginas (mínimo 1). */
  get pages(): number { return Math.max(1, getNumberAttr(this, 'pages', 1) || 1); }
  set pages(v: number) { this.setAttribute('pages', String(Math.max(1, Number(v) || 1))); }

  /** Tamaño efectivo: `page-size` si es una de las opciones; si no, la primera opción. */
  get pageSize(): number {
    const opciones = this.elementsPerPage;
    const n = getNumberAttr(this, 'page-size', 0);
    return opciones.includes(n) ? n : opciones[0]!;
  }
  set pageSize(v: number) { this.setAttribute('page-size', String(Math.max(1, Number(v) || TAMANOS[0]!))); }

  /** Opciones de tamaño. */
  get elementsPerPage(): number[] {
    const lista = parseSizes(this.getAttribute('elements-per-page'));
    return lista.length ? lista : TAMANOS;
  }
  set elementsPerPage(v: number[] | string) {
    this.setAttribute('elements-per-page', parseSizes(Array.isArray(v) ? v.join(' ') : v).join(' '));
  }

  /** Total de elementos del catálogo. */
  get total(): number | null {
    if (!this.hasAttribute('total')) return null;
    const n = Number(this.getAttribute('total'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  set total(v: number | null) {
    if (v == null || !Number.isFinite(v) || v < 0) this.removeAttribute('total');
    else this.setAttribute('total', String(Math.floor(v)));
  }

  /** Bloquea navegación y selector de tamaño. */
  get disabled(): boolean { return this.hasAttribute('disabled'); }
  set disabled(v: boolean) { this.setBooleanAttr('disabled', v); }

  /** Textos para lectores de pantalla; se mezclan con los de por defecto. */
  get textos(): PaginationTextos { return this.#textos; }
  set textos(v: Partial<PaginationTextos>) {
    const r = PaginationTextosSchema.partial().safeParse(v);
    if (!r.success) return;
    this.#textos = { ...TEXTOS, ...r.data };
    if (this.isConnected) this.#pintar();
  }

  #ir(destino: number): void {
    if (this.disabled || destino === this.page || destino < 1 || destino > this.pages) return;
    this.page = destino;
    emit<PaginationChangeDetail>(this, 'iswc-page-change', { page: destino });
  }

  #boton(clase: string, attrs: Record<string, string | boolean | null>, alPulsar: (() => void) | null, ...hijos: (Node | string)[]): HTMLElement {
    const b = crearNodo('iswc-button', { class: clase, shape: 'pill', ...attrs }, ...hijos);
    if (alPulsar) b.addEventListener('iswc-click', alPulsar);
    return b;
  }

  #selector(): HTMLElement | null {
    const opciones = this.elementsPerPage;
    const total = this.total;
    const pocos = total != null && total < Math.min(...opciones);
    if (this.hasAttribute('hide-page-size') || opciones.length < 2 || pocos) return null;
    const select = crearNodo(
      'iswc-select',
      { class: 'tamano', part: 'tamano', value: String(this.pageSize), title: this.#textos.tamano, 'aria-label': this.#textos.tamano, disabled: this.disabled },
      ...opciones.map((n) => crearNodo('iswc-option', { value: String(n) }, String(n))),
    );
    select.addEventListener('iswc-change', (ev) => {
      const n = Number((ev.target as HTMLSelectElement).value);
      if (!Number.isFinite(n) || n <= 0 || n === this.pageSize) return;
      this.pageSize = n;
      emit<PaginationSizeDetail>(this, 'iswc-page-size-change', { pageSize: n });
    });
    return select;
  }

  #pintar(): void {
    const { page, pages, disabled } = this;
    const t = this.#textos;
    const variante = this.getAttribute('variant') || 'filled';
    const color = this.getAttribute('color') || 'brand';
    const numeros = Array.from({ length: pages }, (_, i) => i + 1).map((item) => item === page
      ? this.#boton('pagina', { variant: variante, color, 'aria-current': 'page', 'aria-label': rellenar(t.pagina, item) }, null, String(item))
      : this.#boton('pagina', { variant: 'text', 'aria-label': rellenar(t.irA, item), disabled }, () => this.#ir(item), String(item)));
    const carril = crearNodo(
      'div',
      { class: 'carril', part: 'carril' },
      this.#boton('flecha flecha-prev', { variant: 'text', color, 'aria-label': t.izquierda, disabled }, () => this.#mover(-1), crearNodo('iswc-icon', { icon: 'mdi:chevron-left' })),
      crearNodo('div', { class: 'pista', part: 'pista', role: 'group' }, ...numeros),
      this.#boton('flecha flecha-next', { variant: 'text', color, 'aria-label': t.derecha, disabled }, () => this.#mover(1), crearNodo('iswc-icon', { icon: 'mdi:chevron-right' })),
    );
    this.#root.replaceChildren(crearNodo(
      'nav',
      { class: 'base', part: 'base', 'aria-label': this.getAttribute('label') || 'Paginación' },
      crearNodo('span', { class: 'resumen', part: 'resumen', 'aria-live': 'polite', 'aria-atomic': 'true' }, rellenar(t.resumen, page, pages)),
      carril,
      this.#selector(),
    ));
    this.#ligar();
  }

  /** Flechas, Shift+rueda y arrastre táctil recorren la pista. El número cambia la página. */
  #ligar(): void {
    this.#abort?.abort();
    const ac = new AbortController();
    this.#abort = ac;
    const gen = ++this.#gen;
    const pista = this.#root.querySelector<HTMLElement>('.pista');
    if (!pista) return;
    const { signal } = ac;
    pista.addEventListener('scroll', () => this.#flechas(pista), { signal, passive: true });
    pista.addEventListener('wheel', (ev) => {
      const lateral = ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
      if (!lateral) return;
      const dx = ev.shiftKey && Math.abs(ev.deltaY) >= Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX;
      if (!dx) return;
      ev.preventDefault();
      pista.scrollLeft += dx;
    }, { signal, passive: false });
    this.#arrastre(pista, signal);
    requestAnimationFrame(() => { if (gen === this.#gen) this.#centrar(pista); });
  }

  /** Arrastre táctil con inercia; un arrastre real no cuenta como clic sobre un número. */
  #arrastre(pista: HTMLElement, signal: AbortSignal): void {
    let id = -1;
    let origen = 0;
    let inicio = 0;
    let ultimoX = 0;
    let ultimoT = 0;
    let vel = 0;
    let inercia = 0;
    const frenar = (): void => {
      if (inercia) cancelAnimationFrame(inercia);
      inercia = 0;
    };
    pista.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' || this.disabled) return;
      frenar();
      id = ev.pointerId;
      origen = ultimoX = ev.clientX;
      inicio = pista.scrollLeft;
      ultimoT = ev.timeStamp;
      vel = 0;
      pista.setPointerCapture(id);
    }, { signal });
    pista.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== id) return;
      const dt = ev.timeStamp - ultimoT;
      if (dt > 0) vel = (ev.clientX - ultimoX) / dt;
      ultimoX = ev.clientX;
      ultimoT = ev.timeStamp;
      pista.scrollLeft = inicio - (ev.clientX - origen);
    }, { signal });
    pista.addEventListener('pointerup', (ev) => {
      if (ev.pointerId !== id) return;
      const movido = Math.abs(ev.clientX - origen);
      id = -1;
      if (movido > 6) {
        const cortar = (click: Event): void => {
          click.stopPropagation();
          click.preventDefault();
        };
        pista.addEventListener('click', cortar, { capture: true, once: true });
      }
      if (Math.abs(vel) < 0.04) return;
      let paso = vel * 16;
      const correr = (): void => {
        pista.scrollLeft -= paso;
        paso *= 0.92;
        inercia = Math.abs(paso) > 0.4 ? requestAnimationFrame(correr) : 0;
      };
      inercia = requestAnimationFrame(correr);
    }, { signal });
    pista.addEventListener('pointercancel', (ev) => {
      if (ev.pointerId === id) id = -1;
      frenar();
    }, { signal });
    signal.addEventListener('abort', frenar);
  }

  #mover(dir: number): void {
    const pista = this.#root.querySelector<HTMLElement>('.pista');
    if (!pista || this.disabled) return;
    pista.scrollBy({ left: dir * Math.max(pista.clientWidth * 0.85, 1), behavior: 'smooth' });
  }

  #centrar(pista: HTMLElement): void {
    const actual = pista.querySelector<HTMLElement>('[aria-current="page"]');
    if (actual) {
      const caja = pista.getBoundingClientRect();
      const chip = actual.getBoundingClientRect();
      const izq = chip.left - caja.left + pista.scrollLeft;
      pista.scrollLeft = Math.max(0, izq - (pista.clientWidth - chip.width) / 2);
    }
    this.#flechas(pista);
  }

  #flechas(pista: HTMLElement): void {
    const prev = this.#root.querySelector<HTMLElement>('.flecha-prev');
    const next = this.#root.querySelector<HTMLElement>('.flecha-next');
    if (!prev || !next) return;
    const marcar = (nodo: HTMLElement, visible: boolean): void => {
      nodo.classList.toggle('oculta', !visible);
      nodo.toggleAttribute('aria-hidden', !visible);
      nodo.toggleAttribute('disabled', !visible || this.disabled);
    };
    marcar(prev, pista.scrollLeft > 1);
    marcar(next, pista.scrollLeft + pista.clientWidth < pista.scrollWidth - 1);
  }
}

define(IswcPagination, 'IswcPagination');
