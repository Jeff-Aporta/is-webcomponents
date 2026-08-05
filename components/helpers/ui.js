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

const SHEETS = new Map();

/** Hoja constructable memoizada por texto: N instancias comparten 1 objeto. */
export const css = (shadow, cssText) => {
  let sheet = SHEETS.get(cssText);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    SHEETS.set(cssText, sheet);
  }
  shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
};

export const el = (tag, attrs = {}, children = []) => {
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
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

const CRUDO = Symbol('is-ui-html-crudo');

/** Marca una cadena como HTML de confianza dentro de `html`. */
export const raw = (valor) => ({ [CRUDO]: String(valor ?? '') });

const esCrudo = (v) => typeof v === 'object' && v !== null && CRUDO in v;

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Plantilla etiquetada → DocumentFragment.
 * Función tras `on…=` / `onis-…=` → addEventListener.
 * `raw(str)` → HTML sin escapar. Node → se inserta. null/false → nada.
 */
export const html = (strings, ...values) => {
  const nodos = [];
  const handlers = [];
  let acc = '';

  for (let i = 0; i < strings.length; i++) {
    acc += strings[i];
    if (i >= values.length) continue;
    const v = values[i];

    if (v == null || v === false || v === true) continue;

    const enAtributoEvento = typeof v === 'function' && /\s+on([a-zA-Z][\w-]*)=\s*$/.test(acc);
    if (enAtributoEvento) {
      const m = acc.match(/\s+on([a-zA-Z][\w-]*)=\s*$/);
      acc = acc.slice(0, acc.length - m[0].length);
      acc += ` data-is-ui-ev="${handlers.length}"`;
      handlers.push({ evento: m[1].toLowerCase(), fn: v });
      continue;
    }

    if (esCrudo(v)) {
      acc += v[CRUDO];
      continue;
    }

    const lista = Array.isArray(v) ? v : [v];
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

  for (const marca of [...frag.querySelectorAll('template[data-is-ui-nodo]')]) {
    const idx = Number(marca.dataset.isUiNodo);
    marca.replaceWith(nodos[idx] ?? document.createComment('is-ui:nodo'));
  }

  for (const elx of [...frag.querySelectorAll('[data-is-ui-ev]')]) {
    const idx = Number(elx.dataset.isUiEv);
    const h = handlers[idx];
    if (h) elx.addEventListener(h.evento, h.fn);
    elx.removeAttribute('data-is-ui-ev');
  }

  return frag;
};

/** JSON embebido para los `is-*` que leen config de un hijo <script>. */
export const jsonScript = (data) => {
  const s = document.createElement('script');
  s.type = 'application/json';
  s.textContent = JSON.stringify(data);
  return s;
};

export const rec = (v) =>
  (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const FECHA = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const fecha = (iso, conHora = false) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return (conHora ? FECHA_HORA : FECHA).format(d);
};

/** Registro idempotente: volver a cargar el mismo fuente no lanza. */
export const define = (tag, clase) => {
  if (!customElements.get(tag)) customElements.define(tag, clase);
};

/**
 * Fábrica de componente con estado propio: shadow + CSS adoptado y
 * `props` que dispara render() (repintado completo).
 */
export const crearComponente = (cssText, render, inicial) => class extends HTMLElement {
  #props = inicial;
  #root;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    css(this.#root, cssText);
  }

  connectedCallback() { this.#render(); }

  get props() { return this.#props; }
  set props(v) {
    this.#props = { ...this.#props, ...v };
    if (this.isConnected) this.#render();
  }

  #render() {
    while (this.#root.firstChild) this.#root.removeChild(this.#root.firstChild);
    render(this.#root, this.#props, this);
  }
};

export const IsUi = {
  css, el, html, raw, esc, rec, fecha, jsonScript, define, crearComponente,
};

if (typeof globalThis !== 'undefined') {
  globalThis.IsUi = IsUi;
  if (!globalThis.Ui) globalThis.Ui = IsUi;
}

export default IsUi;
