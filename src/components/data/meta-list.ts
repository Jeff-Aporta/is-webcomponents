import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import type { MetaGroup, MetaListLayout, MetaRow } from './meta-list.schemas.js';
import '../feedback/tag.js';

/**
 * <iswc-meta-list> — lista de metadatos clave → valor agrupada (ubicación, autor, estado, tags,
 * ruta…). Sustituye a los `<dl><dt><dd>` armados a mano en fichas, modales de información y
 * detalles de fila.
 *
 * Datos: propiedad `groups` (MetaGroup[]) o un `<script type="application/json">` hijo con el
 * mismo arreglo. Filas sin valor se omiten salvo que traigan `empty`; grupos vacíos se omiten.
 *
 * Attributes
 *   heading   título opcional de la lista (h3)
 *   layout    grid | stacked (default grid; en anchos < 360px se apila solo)
 *
 * CSS parts: heading, group, group-title, list, label, value.
 * CSS custom properties: --iswc-meta-list-label-width (default minmax(84px, max-content)).
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <h3 class="heading" part="heading" hidden></h3>
  <div class="groups"></div>
`;

const esTexto = (v: unknown): v is string => typeof v === 'string';

/** Normaliza datos externos (JSON hijo o propiedad) sin confiar en su forma. */
function aGrupos(crudo: unknown): MetaGroup[] {
  if (!Array.isArray(crudo)) return [];
  const grupos: MetaGroup[] = [];
  for (const g of crudo) {
    if (!g || typeof g !== 'object') continue;
    const filasCrudas: unknown = Reflect.get(g, 'rows');
    if (!Array.isArray(filasCrudas)) continue;
    const titulo: unknown = Reflect.get(g, 'title');
    const rows: MetaRow[] = [];
    for (const f of filasCrudas) {
      if (!f || typeof f !== 'object') continue;
      const label: unknown = Reflect.get(f, 'label');
      if (!esTexto(label)) continue;
      const value: unknown = Reflect.get(f, 'value');
      const empty: unknown = Reflect.get(f, 'empty');
      const tags: unknown = Reflect.get(f, 'tags');
      rows.push({
        label,
        value: esTexto(value) ? value : undefined,
        mono: Reflect.get(f, 'mono') === true,
        tags: Array.isArray(tags) ? tags.filter(esTexto) : undefined,
        empty: esTexto(empty) ? empty : undefined,
      });
    }
    grupos.push({ title: esTexto(titulo) ? titulo : undefined, rows });
  }
  return grupos;
}

const tieneValor = (r: MetaRow): boolean => Boolean((r.value ?? '').trim()) || Boolean(r.tags?.length);

class IswcMetaList extends ElementBase {
  static override get observedAttributes(): string[] { return ['heading', 'layout']; }

  #groups: MetaGroup[] = [];
  #heading: HTMLElement;
  #root: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#heading = shadow.querySelector<HTMLElement>('.heading')!;
    this.#root = shadow.querySelector<HTMLElement>('.groups')!;
  }

  override onConnected(): void {
    const fuente = this.querySelector('script[type="application/json"]');
    if (fuente && !this.#groups.length) {
      try { this.#groups = aGrupos(JSON.parse(fuente.textContent ?? '[]')); } catch { this.#groups = []; }
    }
    this.#render();
  }

  override onAttributeChanged(): void { this.#render(); }

  /** Grupos de filas clave → valor. */
  get groups(): MetaGroup[] { return this.#groups; }
  set groups(v: MetaGroup[]) {
    this.#groups = aGrupos(v);
    this.#render();
  }

  /** Título de la lista. */
  get heading(): string { return this.getAttribute('heading') ?? ''; }
  set heading(v: string) { setStringAttr(this, 'heading', v); }

  /** Disposición de las filas. */
  get layout(): MetaListLayout { return this.getAttribute('layout') === 'stacked' ? 'stacked' : 'grid'; }
  set layout(v: MetaListLayout) { setStringAttr(this, 'layout', v); }

  #valor(r: MetaRow): HTMLElement {
    const dd = document.createElement('dd');
    dd.part.add('value');
    if (r.tags?.length) {
      for (const t of r.tags) {
        const tag = document.createElement('iswc-tag');
        tag.setAttribute('pill', '');
        tag.textContent = t;
        dd.append(tag);
      }
    } else if (tieneValor(r) && r.mono) {
      const code = document.createElement('code');
      code.textContent = r.value ?? '';
      dd.append(code);
    } else if (tieneValor(r)) {
      dd.textContent = r.value ?? '';
    } else {
      dd.classList.add('empty');
      dd.textContent = r.empty ?? '';
    }
    return dd;
  }

  #render(): void {
    if (!this.#root) return;
    this.#heading.textContent = this.heading;
    this.#heading.hidden = !this.heading;
    const secciones: HTMLElement[] = [];
    for (const g of this.#groups) {
      const filas = g.rows.filter((r) => tieneValor(r) || r.empty);
      if (!filas.length) continue;
      const sec = document.createElement('section');
      sec.className = 'group';
      sec.part.add('group');
      if (g.title) {
        const h = document.createElement('h4');
        h.className = 'group-title';
        h.part.add('group-title');
        h.textContent = g.title;
        sec.append(h);
      }
      const dl = document.createElement('dl');
      dl.className = 'list';
      dl.part.add('list');
      for (const r of filas) {
        const dt = document.createElement('dt');
        dt.part.add('label');
        dt.textContent = r.label;
        dl.append(dt, this.#valor(r));
      }
      sec.append(dl);
      secciones.push(sec);
    }
    this.#root.replaceChildren(...secciones);
  }
}

defineElement('iswc-meta-list', IswcMetaList, 'IswcMetaList');
