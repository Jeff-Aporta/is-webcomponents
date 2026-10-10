/// <reference lib="dom" />
import { adoptCss, defineElement, emit } from '../../core/element.js';
import type { ItemDocIndex, ResultadoDocIndex, TextosDocIndex } from './doc-index.schemas.js';

export type { ItemDocIndex, ResultadoDocIndex, TextosDocIndex } from './doc-index.schemas.js';

/**
 * <iswc-doc-index> — índice documental con búsqueda: lista páginas agrupadas
 * (grupo → subgrupo → ítem) y, al escribir, busca en títulos, palabras clave y
 * TODO el texto, con los resultados ordenados por relevancia y el fragmento resaltado.
 *
 *   const idx = document.querySelector('iswc-doc-index');
 *   idx.items = [{ id: '010-General/x.md', title: 'Ficha', group: '010 · General', subgroup: 'Planteamiento', number: '010', text: '…' }];
 *   idx.current = '010-General/x.md';
 *   idx.addEventListener('iswc-doc-index-select', (e) => abrir(e.detail.id));
 *
 * Propiedades: `items`, `current` (id activo), `textos` (placeholder, sin resultados, resumen).
 * Atributos: `current`, `placeholder`.
 * Métodos: `focusSearch()`, `search(texto)`.
 * Evento: `iswc-doc-index-select` { id, item } al elegir un ítem o un resultado.
 * Columnas: el número o el ícono van en una columna fija; el título que se parte
 * queda alineado con su propio inicio, nunca debajo del número.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div class="buscar" part="search">
    <input type="search" part="search-input" autocomplete="off" spellcheck="false">
  </div>
  <div class="resumen" part="summary"></div>
  <nav class="lista" part="list"></nav>
`;

const sinAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const TEXTOS: TextosDocIndex = { placeholder: 'Buscar…', sinResultados: 'Sin resultados. Pruebe con otra palabra.', resumen: '{items} hojas · {grupos} módulos' };

class IswcDocIndex extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['current', 'placeholder'];
  }

  #shadow: ShadowRoot;
  #items: ItemDocIndex[] = [];
  #textos: TextosDocIndex = { ...TEXTOS };
  #consulta = '';

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    adoptCss(this.#shadow, import.meta.url);
    this.#shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#input.addEventListener('input', () => this.search(this.#input.value));
    this.#shadow.querySelector('nav.lista')!.addEventListener('click', (e) => {
      const b = e.composedPath().find((n): n is HTMLElement => n instanceof HTMLElement && n.dataset.id !== undefined);
      if (!b) return;
      const item = this.#items.find((i) => i.id === b.dataset.id);
      if (item) emit(this, 'iswc-doc-index-select', { id: item.id, item });
    });
  }

  connectedCallback(): void {
    this.#input.placeholder = this.getAttribute('placeholder') || this.#textos.placeholder;
    this.#pintar();
  }

  attributeChangedCallback(nombre: string): void {
    if (nombre === 'placeholder') this.#input.placeholder = this.getAttribute('placeholder') || this.#textos.placeholder;
    if (nombre === 'current') this.#marcar();
  }

  get #input(): HTMLInputElement {
    return this.#shadow.querySelector('input')!;
  }

  /** Ítems del índice, en orden de lectura. */
  get items(): ItemDocIndex[] { return [...this.#items]; }
  set items(v: ItemDocIndex[]) {
    this.#items = Array.isArray(v) ? v.filter((i) => i && typeof i.id === 'string') : [];
    this.#pintar();
  }

  /** Id del ítem activo. */
  get current(): string { return this.getAttribute('current') ?? ''; }
  set current(v: string) { this.setAttribute('current', v); }

  /** Textos de la interfaz (se mezclan con los por defecto). */
  get textos(): TextosDocIndex { return { ...this.#textos }; }
  set textos(v: Partial<TextosDocIndex>) {
    this.#textos = { ...TEXTOS, ...v };
    this.#input.placeholder = this.getAttribute('placeholder') || this.#textos.placeholder;
    this.#pintar();
  }

  focusSearch(): void {
    this.#input.focus();
  }

  /** Filtra el índice (≥ 2 caracteres); texto vacío vuelve al árbol. */
  search(texto: string): void {
    this.#consulta = texto;
    if (this.#input.value !== texto) this.#input.value = texto;
    this.#pintar();
  }

  #pintar(): void {
    const q = sinAcentos(this.#consulta.trim());
    const lista = this.#shadow.querySelector<HTMLElement>('nav.lista')!;
    lista.innerHTML = q.length >= 2 ? this.#htmlResultados(q) : this.#htmlArbol();
    const grupos = new Set(this.#items.map((i) => i.group).filter(Boolean)).size;
    const resumen = this.#shadow.querySelector<HTMLElement>('.resumen')!;
    resumen.textContent = q.length >= 2 || !this.#textos.resumen ? '' : this.#textos.resumen.replace('{items}', String(this.#items.length)).replace('{grupos}', String(grupos));
    resumen.hidden = !resumen.textContent;
    this.#marcar();
  }

  #htmlItem(i: ItemDocIndex, clase: string): string {
    const lado = i.icon ? `<span class="lado ico" aria-hidden="true">${escapar(i.icon)}</span>` : `<span class="lado num">${escapar(i.number ?? '')}</span>`;
    return `<button class="${clase}" part="item" type="button" data-id="${escapar(i.id)}" title="${escapar(i.hint ?? i.id)}">${lado}<span class="txt">${escapar(i.title)}</span></button>`;
  }

  #htmlArbol(): string {
    let html = this.#items.filter((i) => i.pinned).map((i) => this.#htmlItem(i, 'item fijo')).join('');
    const grupos = new Map<string, Map<string, ItemDocIndex[]>>();
    for (const i of this.#items) {
      if (i.pinned) continue;
      const g = grupos.get(i.group ?? '') ?? new Map<string, ItemDocIndex[]>();
      const s = g.get(i.subgroup ?? '') ?? [];
      s.push(i);
      g.set(i.subgroup ?? '', s);
      grupos.set(i.group ?? '', g);
    }
    for (const [grupo, subs] of grupos) {
      const cuerpo = [...subs].map(([sub, items]) => `<div class="sub" part="subgroup">${sub ? `<div class="sub-titulo" part="subgroup-title">${escapar(sub)}</div>` : ''}${items.map((i) => this.#htmlItem(i, 'item')).join('')}</div>`).join('');
      if (!grupo) { html += cuerpo; continue; }
      const cuenta = [...subs.values()].reduce((n, l) => n + l.length, 0);
      html += `<details class="grupo" part="group" open><summary part="group-title"><span>${escapar(grupo)}</span><span class="cuenta">${cuenta}</span></summary>${cuerpo}</details>`;
    }
    return html || `<div class="vacio">${escapar(this.#textos.sinResultados)}</div>`;
  }

  /** Resultados por relevancia: título/palabras clave pesan más que el cuerpo. */
  #buscar(q: string): ResultadoDocIndex[] {
    const terminos = q.split(/\s+/).filter(Boolean);
    const res: ResultadoDocIndex[] = [];
    for (const item of this.#items) {
      const cabecera = sinAcentos(`${item.title} ${(item.keywords ?? []).join(' ')} ${item.hint ?? item.id}`);
      const cuerpo = sinAcentos(item.text ?? '');
      if (!terminos.every((t) => cabecera.includes(t) || cuerpo.includes(t))) continue;
      const puntos = terminos.reduce((n, t) => n + (cabecera.includes(t) ? 10 : 0) + (cuerpo.split(t).length - 1), 0);
      const pos = cuerpo.indexOf(terminos[0]);
      const texto = item.text ?? '';
      const fragmento = pos >= 0 ? `${pos > 60 ? '…' : ''}${texto.slice(Math.max(0, pos - 60), pos + 120)}…` : '';
      res.push({ item, puntos, fragmento });
    }
    return res.sort((a, b) => b.puntos - a.puntos);
  }

  #htmlResultados(q: string): string {
    const terminos = q.split(/\s+/).filter(Boolean);
    const resaltar = (t: string) => {
      let out = escapar(t);
      for (const term of terminos) out = out.replace(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark part="match">$1</mark>');
      return out;
    };
    const res = this.#buscar(q);
    if (!res.length) return `<div class="vacio">${escapar(this.#textos.sinResultados)}</div>`;
    return res.slice(0, 40).map(({ item, fragmento }) => `<button class="resultado" part="result" type="button" data-id="${escapar(item.id)}"><strong>${resaltar(item.title)}</strong><small>${escapar(item.hint ?? item.id)}</small>${fragmento ? `<span>${resaltar(fragmento)}</span>` : ''}</button>`).join('');
  }

  #marcar(): void {
    const actual = this.current;
    for (const b of this.#shadow.querySelectorAll<HTMLElement>('nav.lista [data-id]')) {
      const es = b.dataset.id === actual && !b.classList.contains('resultado');
      if (es) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
  }
}

defineElement('iswc-doc-index', IswcDocIndex);
