import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setCustomState } from '../../core/form-associated.js';
import '../media/icon.js';
import type { AppNavRow } from './schemas/app-nav.schemas.js';

/**
 * <iswc-app-nav> — Filas de pestañas para la barra de una app (primaria + secundarias).
 *
 * La primera fila es la primaria; las demás son secundarias. Una fila secundaria con
 * `parent` solo se ve cuando la primaria tiene ese valor; sin `parent` se ve siempre.
 * Todas las filas viven siempre en el DOM: mostrar/ocultar y cambiar la activa NO
 * recrea pestañas ni iconos (un <iswc-icon> recreado a media descarga cancela su SVG).
 *
 * Propiedad / atributo
 *   rows   AppNavRow[] (propiedad) o JSON (atributo `rows`)
 *          AppNavRow = { id, label?, value?, parent?, tabs: AppNavTab[] }
 *          AppNavTab = { id, label, icon?, href?, hidden?, disabled? }
 *
 * Eventos
 *   iswc-nav-select { row, id, href } — cancelable. Sin preventDefault() la pestaña queda
 *   activa; con preventDefault() la app decide (y vuelve a asignar `rows`).
 *
 * Teclado (patrón APG de activación manual): flechas / Home / End mueven el foco dentro
 * de la fila; Enter o Espacio activan.
 *
 * Métodos: getValue(rowId?) → valor activo de la fila (sin id: la primaria)
 * Parts: row, row-primary, row-secondary, tab, tab-active, icon, label
 * Custom states: secondary (hay una fila secundaria visible)
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `<nav class="nav" part="nav"></nav>`;

function normalizarFilas(v: unknown): AppNavRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((r): r is AppNavRow => !!r && typeof r === 'object' && typeof (r as AppNavRow).id === 'string')
    .map((r) => ({
      id: String(r.id),
      label: r.label == null ? undefined : String(r.label),
      value: r.value == null ? '' : String(r.value),
      parent: r.parent == null ? undefined : String(r.parent),
      tabs: (Array.isArray(r.tabs) ? r.tabs : [])
        .filter((t) => !!t && typeof t.id === 'string')
        .map((t) => ({
          id: String(t.id),
          label: String(t.label ?? t.id),
          icon: t.icon ? String(t.icon) : undefined,
          href: t.href ? String(t.href) : undefined,
          hidden: t.hidden === true,
          disabled: t.disabled === true,
        })),
    }));
}

/** Firma de la estructura (lo que obliga a reconstruir). Visibilidad y activo no cuentan. */
function firma(rows: AppNavRow[]): string {
  return rows
    .map((r) => `${r.id}|${r.label ?? ''}|${r.parent ?? ''}:${r.tabs.map((t) => `${t.id}|${t.label}|${t.icon ?? ''}|${t.href ?? ''}`).join(',')}`)
    .join(';');
}

class IswcAppNav extends ElementBase {
  static override get observedAttributes(): string[] { return ['rows']; }

  #internals: ElementInternals | null = null;
  #rows: AppNavRow[] = [];
  #firma = '';
  #nav!: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    try { this.#internals = this.attachInternals(); } catch { this.#internals = null; }
    this.#nav = shadow.querySelector('.nav') as HTMLElement;
    this.#nav.addEventListener('click', this.#onClick);
    this.#nav.addEventListener('keydown', this.#onKey);
  }

  override onConnected(): void {
    if (!this.#rows.length && this.hasAttribute('rows')) this.#leerAtributo();
    this.#paint();
  }

  override onAttributeChanged(name: string): void {
    if (name === 'rows') {
      this.#leerAtributo();
      this.#paint();
    }
  }

  /** Filas actuales (copia normalizada). */
  get rows(): AppNavRow[] { return this.#rows.map((r) => ({ ...r, tabs: r.tabs.map((t) => ({ ...t })) })); }
  set rows(v: AppNavRow[] | string | null | undefined) {
    if (typeof v === 'string') {
      try { this.#rows = normalizarFilas(JSON.parse(v)); } catch { this.#rows = []; }
    } else {
      this.#rows = normalizarFilas(v);
    }
    if (this.mounted) this.#paint();
  }

  /** Valor activo de una fila ('' si no hay o la fila no existe). */
  getValue(rowId?: string): string {
    if (rowId === undefined) return this.#rows[0]?.value ?? '';
    return this.#rows.find((r) => r.id === rowId)?.value ?? '';
  }

  #leerAtributo(): void {
    const raw = this.getAttribute('rows');
    if (raw == null) return;
    try { this.#rows = normalizarFilas(JSON.parse(raw)); } catch { this.#rows = []; }
  }

  #paint(): void {
    const f = firma(this.#rows);
    if (f !== this.#firma) {
      this.#firma = f;
      this.#build();
    }
    this.#update();
  }

  /** Reconstrucción completa: solo cuando cambia la estructura. */
  #build(): void {
    const frag = document.createDocumentFragment();
    this.#rows.forEach((r, i) => {
      const row = document.createElement('div');
      const tier = i === 0 ? 'primary' : 'secondary';
      row.className = `row row--${tier}`;
      row.setAttribute('part', `row row-${tier}`);
      row.setAttribute('role', 'tablist');
      row.setAttribute('aria-label', r.label || r.id);
      row.dataset.row = r.id;
      for (const t of r.tabs) {
        const a = document.createElement('a');
        a.className = 'tab';
        a.setAttribute('role', 'tab');
        a.dataset.tab = t.id;
        a.title = t.label;
        if (t.href) a.href = t.href;
        if (t.icon) {
          a.classList.add('tab--icon');
          const icon = document.createElement('iswc-icon');
          icon.setAttribute('icon', t.icon);
          icon.setAttribute('part', 'icon');
          icon.setAttribute('aria-hidden', 'true');
          a.append(icon);
        }
        const label = document.createElement('span');
        label.className = 'label';
        label.setAttribute('part', 'label');
        label.textContent = t.label;
        a.append(label);
        row.append(a);
      }
      frag.append(row);
    });
    this.#nav.replaceChildren(frag);
  }

  /** Actualización parcial: activo, visibilidad y roving tabindex, sin tocar los nodos. */
  #update(): void {
    const primaria = this.#rows[0]?.value ?? '';
    let secundariaVisible = false;
    this.#rows.forEach((r, i) => {
      const row = this.#nav.querySelector<HTMLElement>(`.row[data-row="${CSS.escape(r.id)}"]`);
      if (!row) return;
      const visible = i === 0 || r.parent === undefined || r.parent === primaria;
      row.hidden = !visible;
      if (i > 0 && visible) secundariaVisible = true;
      const tabs = Array.from(row.querySelectorAll<HTMLElement>('.tab'));
      let foco: HTMLElement | null = null;
      for (const el of tabs) {
        const t = r.tabs.find((x) => x.id === el.dataset.tab);
        const activo = !!t && t.id === r.value;
        el.hidden = t?.hidden === true;
        el.classList.toggle('tab--active', activo);
        el.setAttribute('part', activo ? 'tab tab-active' : 'tab');
        el.setAttribute('aria-selected', activo ? 'true' : 'false');
        if (t?.disabled) el.setAttribute('aria-disabled', 'true');
        else el.removeAttribute('aria-disabled');
        el.setAttribute('tabindex', '-1');
        if (activo && !el.hidden) foco = el;
      }
      // Una sola parada de Tab por fila: la activa o, sin activa, la primera visible.
      const parada: HTMLElement | undefined = foco ?? tabs.find((el) => !el.hidden);
      parada?.setAttribute('tabindex', '0');
    });
    setCustomState(this.#internals, 'secondary', secundariaVisible);
  }

  #select(rowId: string, tabId: string): void {
    const row = this.#rows.find((r) => r.id === rowId);
    const tab = row?.tabs.find((t) => t.id === tabId);
    if (!row || !tab || tab.disabled || tab.hidden) return;
    const ok = emit(this, 'iswc-nav-select', { row: rowId, id: tabId, href: tab.href ?? null }, { cancelable: true });
    if (!ok) return;
    row.value = tabId;
    this.#update();
  }

  #onClick = (ev: MouseEvent): void => {
    const tab = (ev.target as Element | null)?.closest?.('.tab') as HTMLElement | null;
    const row = tab?.closest('.row') as HTMLElement | null;
    if (!tab || !row) return;
    // Ctrl/Cmd/Shift/clic medio sobre un href: el navegador hace lo suyo.
    if (tab.hasAttribute('href') && (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey)) return;
    ev.preventDefault();
    this.#select(row.dataset.row!, tab.dataset.tab!);
  };

  #onKey = (ev: KeyboardEvent): void => {
    const tab = (ev.target as Element | null)?.closest?.('.tab') as HTMLElement | null;
    const row = tab?.closest('.row') as HTMLElement | null;
    if (!tab || !row) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.#select(row.dataset.row!, tab.dataset.tab!);
      return;
    }
    const tabs = Array.from(row.querySelectorAll<HTMLElement>('.tab')).filter((el) => !el.hidden);
    const i = tabs.indexOf(tab);
    if (i < 0) return;
    let next = -1;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (ev.key === 'Home') next = 0;
    else if (ev.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    ev.preventDefault();
    tabs[next]!.focus();
  };
}

defineElement('iswc-app-nav', IswcAppNav as unknown as CustomElementConstructor);

declare global {
  interface HTMLElementTagNameMap {
    'iswc-app-nav': IswcAppNav;
  }
}
