import { defineElement } from '../../core/element.js';

/**
 * helpers/ui.js — primitivas de render para apps consumidoras del kit.
 *
 * NO es un custom element. Expone `IsUi` (y alias `Ui`) en globalThis y
 * exporta ESM: plantilla `html`, CSS constructable, `define`,
 * `crearComponente`, etc.
 *
 * Origen: el mismo motor que usaban `r2admin` (`_ui.ts`) y
 * `jagudeloe/frontend-webcomponents` (`tk/_shared.ts`). Vive aquí para
 * no venderlo en cada app.
 *
 * CDN
 *   …/dist/cdn/helpers/ui.min.js
 *   (también entra en all.min.js)
 *
 * Uso
 *   import { html, css, define } from '…/helpers/ui.min.js';
 *   // o, tras all.min.js:  IsUi.html`…`  /  Ui.html`…`
 */

const SHEETS = new Map<string, CSSStyleSheet>();

export type ElChild = Node | string | null | false | true;

/** Hoja constructable memoizada por texto: N instancias comparten 1 objeto. */
export const css = (shadow: ShadowRoot, cssText: string): void => {
  let sheet = SHEETS.get(cssText);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    SHEETS.set(cssText, sheet);
  }
  shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
};

export type ElAttrs = Record<string, string | number | boolean | null | undefined | ((ev: Event) => void)>;

export const el = (tag: string, attrs: ElAttrs = {}, children: ElChild | ElChild[] = []): HTMLElement => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  const lista = Array.isArray(children) ? children : [children];
  for (const c of lista) {
    if (c == null) continue;
    if (typeof c === 'string') node.append(document.createTextNode(c));
    else if (c instanceof Node) node.append(c);
  }
  return node;
};

const CRUDO: unique symbol = Symbol('is-ui-html-crudo');
type Crudo = { [CRUDO]: string };

/** Marca una cadena como HTML de confianza dentro de `html`. */
export const raw = (valor: unknown): Crudo => ({ [CRUDO]: String(valor ?? '') });

const esCrudo = (v: unknown): v is Crudo =>
  typeof v === 'object' && v !== null && CRUDO in (v as Record<symbol, unknown>);

export const esc = (s: unknown): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface HandlerEntry {
  evento: string;
  fn: (ev: Event) => void;
}

/**
 * Crea un `<section role="region">` con `aria-label` (proposal g09 ui.ts).
 *
 * Solo añade `role="region"` cuando hay label o labelledby: la norma ARIA
 * dice que un region sin nombre accesible no debe promocionarse a landmark
 * (ensucia el mapa de nodos sin aportar navegación). Los consumidores que
 * quieren un wrapper sin landmark deben usar `el('section', { class: 'x' })`
 * directamente.
 *
 * @param label    Texto accesible o id del elemento que lo provee.
 * @param opts.useLabel    Si `true`, `label` se aplica como `aria-label`.
 *                        Si `false`, se aplica como `aria-labelledby`.
 * @param children Nodos hijos.
 *
 * @example
 *   // region con aria-label propio
 *   const sec = region('Productos', el('h2', { text: 'Productos' }));
 *   // region que apunta a un <h2> existente en el documento
 *   const sec = region('productos-title', { labelledby: true }, ul);
 */
export function region(
  label: string,
  optsOrChildren: (ElChild | ElChild[]) | { labelledby?: boolean },
  maybeChildren?: ElChild | ElChild[],
): HTMLElement {
  const isOpts = (v: unknown): v is { labelledby?: boolean } =>
    !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Node) && !('nodeType' in (v as object));

  const opts = isOpts(optsOrChildren) ? optsOrChildren : {};
  const children = isOpts(optsOrChildren) ? maybeChildren : optsOrChildren;

  const sec = document.createElement('section');
  const text = String(label ?? '').trim();
  if (text) {
    if (opts.labelledby) sec.setAttribute('aria-labelledby', text);
    else sec.setAttribute('aria-label', text);
    sec.setAttribute('role', 'region');
  }
  const lista = Array.isArray(children) ? children : children == null ? [] : [children];
  for (const c of lista) {
    if (c == null || c === false || c === true) continue;
    if (typeof c === 'string') sec.append(document.createTextNode(c));
    else if (c instanceof Node) sec.append(c);
  }
  return sec;
}

/**
 * Crea un `<div role="dialog" aria-modal="true">` (proposal g09 ui.ts).
 * Complementa `region` para secciones interactivas tipo modal. El consumidor
 * sigue siendo responsable del focus trap y de cerrar al Escape (ver
 * `IsFloating` que ya lo trae integrado).
 */
export function dialog(
  labelOrOpts: string | { label?: string; labelledby?: string; modal?: boolean },
  children: ElChild | ElChild[] = [],
): HTMLElement {
  const opts = typeof labelOrOpts === 'string'
    ? { label: labelOrOpts }
    : (labelOrOpts ?? {});
  const dlg = document.createElement('div');
  dlg.setAttribute('role', 'dialog');
  if (opts.modal !== false) dlg.setAttribute('aria-modal', 'true');
  if (opts.label) dlg.setAttribute('aria-label', opts.label);
  if (opts.labelledby) dlg.setAttribute('aria-labelledby', opts.labelledby);
  const lista = Array.isArray(children) ? children : children == null ? [] : [children];
  for (const c of lista) {
    if (c == null || c === false || c === true) continue;
    if (typeof c === 'string') dlg.append(document.createTextNode(c));
    else if (c instanceof Node) dlg.append(c);
  }
  return dlg;
}

/**
 * Plantilla etiquetada → DocumentFragment.
 * Función tras `on…=` / `onis-…=` → addEventListener.
 * `raw(str)` → HTML sin escapar. Node → se inserta. null/false → nada.
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment => {
  const nodos: Node[] = [];
  const handlers: HandlerEntry[] = [];
  let acc = '';

  for (let i = 0; i < strings.length; i++) {
    acc += strings[i];
    if (i >= values.length) continue;
    const v = values[i];

    if (v == null || v === false || v === true) continue;

    const enAtributoEvento = typeof v === 'function' && /\s+on([a-zA-Z][\w-]*)=\s*$/.test(acc);
    if (enAtributoEvento) {
      const m = acc.match(/\s+on([a-zA-Z][\w-]*)=\s*$/);
      if (m) {
        acc = acc.slice(0, acc.length - m[0].length);
        acc += ` data-is-ui-ev="${handlers.length}"`;
        handlers.push({ evento: m[1].toLowerCase(), fn: v as (ev: Event) => void });
        continue;
      }
    }

    if (esCrudo(v)) {
      acc += v[CRUDO];
      continue;
    }

    const lista = Array.isArray(v) ? v as unknown[] : [v];
    for (const item of lista) {
      if (item == null || item === false || item === true) continue;
      if (item instanceof Node) {
        acc += `<template data-is-ui-nodo="${nodos.length}"></template>`;
        nodos.push(item);
      } else if (esCrudo(item)) {
        acc += item[CRUDO];
      } else {
        acc += esc(item);
      }
    }
  }

  const plantilla = document.createElement('template');
  plantilla.innerHTML = acc;
  const frag = plantilla.content;

  for (const marca of [...frag.querySelectorAll<HTMLTemplateElement>('template[data-is-ui-nodo]')]) {
    const idx = Number(marca.dataset.isUiNodo);
    marca.replaceWith(nodos[idx] ?? document.createComment('is-ui:nodo'));
  }

  for (const elx of [...frag.querySelectorAll<HTMLElement>('[data-is-ui-ev]')]) {
    const idx = Number(elx.dataset.isUiEv);
    const h = handlers[idx];
    if (h) elx.addEventListener(h.evento, h.fn);
    elx.removeAttribute('data-is-ui-ev');
  }

  return frag;
};

/** JSON embebido para los `is-*` que leen config de un hijo <script>. */
export const jsonScript = (data: unknown): HTMLScriptElement => {
  const s = document.createElement('script');
  s.type = 'application/json';
  s.textContent = JSON.stringify(data);
  return s;
};

export const rec = <T extends Record<string, unknown>>(v: unknown): T =>
  (v && typeof v === 'object' && !Array.isArray(v) ? v as T : ({} as T));

const FECHA = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const fecha = (iso: string, conHora = false): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return (conHora ? FECHA_HORA : FECHA).format(d);
};

/** Registro idempotente: volver a cargar el mismo fuente no lanza. */
export const define = (tag: string, clase: CustomElementConstructor): void => {
  defineElement(tag, clase);
};

/**
 * Inyecta el `.css` hermano del módulo en el ShadowRoot (mismo contrato que
 * `components/core/element.ts` del kit, sin scrollbars del kit).
 *
 * Convención CDN/apps: `app-foo.js` ↔ `app-foo.css` (o `.min.js` ↔ `.min.css`).
 * Llamar **después** de rellenar el shadow: un `innerHTML = …` / vaciado
 * borra los `<link>`.
 */
export const adoptCss = (shadowRoot: ShadowRoot, moduleUrl: string | URL): void => {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.js$/i, '.css');
  const ya = shadowRoot.querySelector<HTMLElement>(`link[rel="stylesheet"][href="${sibling.href}"]`);
  if (ya) {
    shadowRoot.prepend(ya);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = sibling.href;
  shadowRoot.prepend(link);
};

const esUrlModulo = (s: unknown): boolean =>
  typeof s === 'string' && (/^[a-z][a-z0-9+.-]*:/i.test(s) || /\.m?js$/i.test(s));

/**
 * Fábrica de componente con estado propio.
 *
 * Primer argumento:
 *   - `import.meta.url` → CSS hermano vía `adoptCss` (recomendado en apps CDN)
 *   - string CSS        → hoja constructable vía `css` (solo prototipos)
 */
export const crearComponente = <P extends Record<string, unknown>>(
  cssOrModuleUrl: string,
  render: (root: ShadowRoot, props: P, host: HTMLElement) => void,
  inicial: P,
): CustomElementConstructor => class extends HTMLElement {
  #props: P = inicial;
  #root!: ShadowRoot;
  #cssOrUrl: string = cssOrModuleUrl;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void { this.#render(); }

  get props(): P { return this.#props; }
  set props(v: Partial<P>) {
    this.#props = { ...this.#props, ...v };
    if (this.isConnected) this.#render();
  }

  #render(): void {
    while (this.#root.firstChild) this.#root.removeChild(this.#root.firstChild);
    render(this.#root, this.#props, this);
    if (esUrlModulo(this.#cssOrUrl)) adoptCss(this.#root, this.#cssOrUrl);
    else if (typeof this.#cssOrUrl === 'string' && this.#cssOrUrl.trim()) css(this.#root, this.#cssOrUrl);
  }
};

export const IsUi = {
  css, adoptCss, el, html, raw, esc, rec, fecha, jsonScript, define, crearComponente,
  region, dialog,
};

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).IsUi = IsUi;
  if (!(globalThis as Record<string, unknown>).Ui) (globalThis as Record<string, unknown>).Ui = IsUi;
}

export default IsUi;
