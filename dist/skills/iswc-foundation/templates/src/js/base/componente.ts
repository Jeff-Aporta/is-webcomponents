/**
 * componente.ts — base común de los componentes `__PREFIJO__-*` (estándar iswc-foundation).
 *
 * Cuatro cosas y nada más: adopción del CSS hermano (`adoptCss`), plantillas (`html`), registro
 * idempotente (`define`) y la fábrica `crearComponente`. Lo que sea dominio vive en `core/`,
 * `dominio/` o `view/<v>/utils/`; lo que sea estilo vive en el `.scss` hermano.
 *
 * Por qué hojas adoptadas y no `<link>`: un `<link>` dentro de un ShadowRoot no bloquea el pintado,
 * así que cada shadow que se recrea se ve un frame sin estilos. `adoptedStyleSheets` se aplica
 * síncrono y sobrevive a `replaceChildren()`. La hoja se descarga UNA vez por href y se comparte.
 */
import { revisarProps } from './props-registro.js';
import { rutaComponente } from '../kit-tags.js';
import type { Atributos, Hijos } from '../consts/schemas/componentes.schemas.js';

/* ── CSS ────────────────────────────────────────────────────── */

const HOJAS = new Map<string, CSSStyleSheet>();
const CARGAS = new Map<string, Promise<CSSStyleSheet | null>>();
const SOPORTA_HOJAS = (() => {
  try {
    return 'adoptedStyleSheets' in ShadowRoot.prototype && typeof new CSSStyleSheet().replaceSync === 'function';
  } catch {
    return false;
  }
})();

/** Raíz `dist/cdn/` cuando el módulo vive dentro de un bundle (`all.min.js`); la fija el barril. */
let CSS_BASE: string | null = null;
export function setCssBase(url: string): void {
  CSS_BASE = new URL(url, typeof location !== 'undefined' ? location.href : undefined).href;
}

/** `…/x.js` → `…/x.css`; en bundle, la carpeta del tag sale de `kit-tags` (registro único). */
function hrefCss(moduleUrl: string, nombre: string): string {
  if (CSS_BASE) return new URL(`${rutaComponente(nombre) ?? ''}${nombre}.css`, CSS_BASE).href;
  const u = new URL(moduleUrl);
  u.pathname = u.pathname.replace(/[^/]+$/, `${nombre}.css`);
  u.search = '';
  return u.href;
}

function descargarHoja(href: string): Promise<CSSStyleSheet | null> {
  const enCurso = CARGAS.get(href);
  if (enCurso) return enCurso;
  const carga = fetch(href)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${href}`))))
    .then((texto) => {
      const hoja = new CSSStyleSheet();
      hoja.replaceSync(texto);
      HOJAS.set(href, hoja);
      return hoja;
    })
    .catch(() => null); // el <link> de respaldo sigue puesto: solo se pierde la ruta rápida
  CARGAS.set(href, carga);
  return carga;
}

/** Empieza a bajar la hoja al importar el módulo (el primer pintado tampoco parpadea). */
export function precargarCss(moduleUrl: string, nombre: string): void {
  if (SOPORTA_HOJAS) void descargarHoja(hrefCss(moduleUrl, nombre));
}

/** Adopta la hoja hermana. Llamar DESPUÉS de rellenar el shadow (el <link> de respaldo es un hijo). */
export function adoptCss(shadow: ShadowRoot, moduleUrl: string, nombre: string): void {
  const href = hrefCss(moduleUrl, nombre);
  const adoptar = (h: CSSStyleSheet) => {
    if (!shadow.adoptedStyleSheets.includes(h)) shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, h];
  };
  const enlazar = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    shadow.prepend(link);
    return link;
  };
  if (!SOPORTA_HOJAS) {
    if (!shadow.querySelector('link[rel="stylesheet"]')) enlazar();
    return;
  }
  const hoja = HOJAS.get(href);
  if (hoja) return adoptar(hoja);
  const link = enlazar();
  void descargarHoja(href).then((h) => {
    if (!h) return;
    adoptar(h);
    link.remove();
  });
}

/* ── Plantillas ─────────────────────────────────────────────── */

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CRUDO = Symbol('html-crudo');
/** HTML de confianza (ya saneado) dentro de `html`. */
export const raw = (valor: unknown) => ({ [CRUDO]: String(valor ?? '') });
const esCrudo = (v: unknown): v is Record<symbol, string> => typeof v === 'object' && v !== null && CRUDO in v;

/**
 * `html` — plantilla etiquetada que devuelve un DocumentFragment.
 *   primitivo → texto escapado · Node/fragmento → se monta tal cual · array → cada elemento
 *   `on<evento>=${fn}` → addEventListener (admite guiones: `oniswc-click`) · `raw(x)` → HTML crudo
 *   `?attr=${bool}` → atributo booleano · null/false/true → nada. El escape por defecto es lo que hace seguro pintar datos de terceros.
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment => {
  const nodos: Node[] = [];
  const handlers: Array<{ evento: string; fn: EventListener }> = [];
  let acc = '';
  for (let i = 0; i < strings.length; i++) {
    acc += strings[i];
    if (i >= values.length) continue;
    const v = values[i];
    // `?attr=${bool}`: atributo booleano (contrato lit). `true` lo escribe vacío; cualquier otro valor lo omite.
    const booleano = acc.match(/\s+\?([\w-]+)=\s*$/);
    if (booleano) {
      acc = acc.slice(0, acc.length - booleano[0].length) + (v === true ? ` ${booleano[1]}` : '');
      continue;
    }
    if (v == null || v === false || v === true) continue;
    const evento = typeof v === 'function' ? acc.match(/\s+on([a-zA-Z][\w-]*)=\s*$/) : null;
    if (evento) {
      acc = `${acc.slice(0, acc.length - evento[0].length)} data-ev="${handlers.length}"`;
      handlers.push({ evento: evento[1]!.toLowerCase(), fn: v as EventListener });
      continue;
    }
    for (const item of Array.isArray(v) ? v : [v]) {
      if (item == null || item === false || item === true) continue;
      if (item instanceof Node) {
        acc += `<template data-nodo="${nodos.length}"></template>`;
        nodos.push(item);
      } else acc += esCrudo(item) ? item[CRUDO] : esc(item);
    }
  }
  const t = document.createElement('template');
  t.innerHTML = acc;
  for (const m of [...t.content.querySelectorAll<HTMLElement>('template[data-nodo]')]) {
    m.replaceWith(nodos[Number(m.dataset.nodo)] ?? document.createComment('nodo'));
  }
  for (const n of [...t.content.querySelectorAll<HTMLElement>('[data-ev]')]) {
    const h = handlers[Number(n.dataset.ev)];
    if (h) n.addEventListener(h.evento, h.fn);
    n.removeAttribute('data-ev');
  }
  return t.content;
};

/** Elemento suelto (cuando una plantilla es demasiado). */
export function el(tag: string, attrs: Atributos = {}, hijos: Hijos = []): HTMLElement {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2), v as EventListener);
    else nodo.setAttribute(k, v === true ? '' : String(v));
  }
  for (const h of Array.isArray(hijos) ? hijos : [hijos]) if (h != null) nodo.append(h);
  return nodo;
}

/* ── Registro y fábrica ─────────────────────────────────────── */

/** Registro idempotente: el string del tag es exactamente el nombre del archivo. */
export const define = (tag: string, clase: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, clase);
};

/** Emite un evento de dominio que cruza el Shadow DOM. Única forma de emitir. */
export const emitir = (host: HTMLElement, nombre: string, detail?: unknown): void => {
  host.dispatchEvent(new CustomEvent(nombre, { detail, bubbles: true, composed: true }));
};

/**
 * Props asignadas ANTES de definir el tag (vistas perezosas) quedan como propiedad propia que
 * sombrea el setter. Se rescatan al conectar: se borran y se reasignan por el setter real.
 */
export function adoptarPropsTardias(host: HTMLElement & { props?: unknown }): void {
  if (!Object.prototype.hasOwnProperty.call(host, 'props')) return;
  const tardias = host.props;
  delete (host as { props?: unknown }).props;
  host.props = tardias;
}

/**
 * Fábrica de componente: `props` mezcla lo nuevo con lo anterior (lo ausente se conserva) y
 * repinta. `nombre` = tag = nombre de la hoja (obligatorio: en un bundle `import.meta.url` es el
 * del bundle). `parcial` evita el repintado completo cuando devuelve `true` (foco, scroll).
 */
export function crearComponente<P extends object>(
  moduleUrl: string,
  nombre: string,
  inicial: P,
  render: (root: ShadowRoot, props: P, host: HTMLElement) => void,
  parcial?: (root: ShadowRoot, props: P, previos: P, host: HTMLElement) => boolean,
): CustomElementConstructor {
  precargarCss(moduleUrl, nombre);
  return class extends HTMLElement {
    #props: P = inicial;
    #root = this.attachShadow({ mode: 'open' });

    connectedCallback(): void {
      adoptarPropsTardias(this);
      this.#pintar();
    }

    get props(): P {
      return this.#props;
    }

    set props(v: Partial<P> | null | undefined) {
      revisarProps(nombre, v);
      const previos = this.#props;
      this.#props = { ...previos, ...(v ?? {}) };
      if (!this.isConnected) return;
      if (parcial?.(this.#root, this.#props, previos, this)) return;
      this.#pintar();
    }

    #pintar(): void {
      this.#root.replaceChildren();
      render(this.#root, this.#props, this);
      adoptCss(this.#root, moduleUrl, nombre);
    }
  };
}

/** Notificación con el toaster del kit (`<iswc-toast>`); si no está montado, no hace nada. */
export function avisar(mensaje: string, color: 'brand' | 'success' | 'warning' | 'danger' = 'brand'): void {
  const t = document.querySelector('iswc-toast') as (HTMLElement & { create?(m: string, o?: object): unknown }) | null;
  void t?.create?.(mensaje, { color });
}

// Aquí NO van formateadores de fecha/número/bytes: el kit trae iswc-format-date/-number/-bytes.
