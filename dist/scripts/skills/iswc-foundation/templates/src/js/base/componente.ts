// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/src/js/base/componente.ts
/**
 * componente.ts — base de los componentes `__PREFIJO__-*` con `props` (estándar iswc-foundation), sobre el molde
 * del kit (`IswcElement`; forma canónica en la skill del kit y en `specs/iswc/nuevo-componente.md`).
 *
 *   import { define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
 *   import css from 'iswc:css';                         // .css compilado hermano: el build lo incrusta
 *   import { Componente, html } from '../../base/componente.js';
 *
 *   class __CLASE__X extends Componente<__CLASE__XProps> {
 *     static tag = '__PREFIJO__-x';                      // = nombre del archivo
 *     static css = css;                                  // el molde crea UNA CSSStyleSheet por clase y la adopta
 *     static observed = ['color'];                       // atributos observados (el molde hace la unión)
 *     static deps = ['iswc-button'];                     // hijos del kit que se piden al loader al conectar
 *     protected override inicial(): __CLASE__XProps { return { … }; }
 *     protected override pintar(root: ShadowRoot, props: __CLASE__XProps): void { root.append(html`…`); }
 *   }
 *   define(__CLASE__X);
 *
 * Un componente sin `props` extiende `IswcElement` directamente (mismo import que `define`). Los estáticos van sin
 * `override`: el molde llega como JS publicado (`.min.mjs`) y TypeScript no los ve declarados.
 *
 * Qué pone esta base y nada más: `props` (mezcla lo nuevo con lo anterior, avisa claves desconocidas y repinta),
 * repintado parcial opcional (`parcial`), rescate de las props asignadas antes de definir el tag, plantillas (`html`,
 * `raw`, `el`) y el aviso por toast. El CSS no se busca junto al módulo: llega por `iswc:css`. Lo que sea dominio
 * vive en `core/`, `dominio/` o `view/<v>/utils/`; lo que sea estilo, en el `.scss` hermano.
 */
import { IswcElement } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import { revisarProps } from './props-registro.js';
import type { Atributos, Hijos } from '../consts/schemas/componentes.schemas.js';

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

/* ── Componente con props ───────────────────────────────────── */

/**
 * Molde + `props`. `pintar` rehace el contenido del shadow (las hojas adoptadas sobreviven; el `<style>`/`<link>` de
 * respaldo del molde se conserva) y `parcial` evita el repintado completo cuando devuelve `true` (foco, scroll).
 * Eventos: `this.emit(nombre, detail)` del molde (bubbles + composed), la única forma de emitir.
 */
export class Componente<P extends object = Record<string, never>> extends IswcElement {
  #props: P | null = null;

  /** Props por defecto de la clase. */
  protected inicial(): P {
    return {} as P;
  }

  /** Pinta el contenido completo en `root` (ya vacío). */
  protected pintar(_root: ShadowRoot, _props: P): void {}

  /** Repintado parcial: `true` si ya aplicó el cambio y no hace falta `pintar`. */
  protected parcial(_props: P, _previos: P): boolean {
    return false;
  }

  get props(): P {
    this.#props ??= this.inicial();
    return this.#props;
  }

  set props(v: Partial<P> | null | undefined) {
    revisarProps(this.localName, v);
    const previos = this.props;
    this.#props = { ...previos, ...(v ?? {}) };
    if (!this.mounted) return;
    if (this.parcial(this.#props, previos)) return;
    this.#repintar();
  }

  override onConnected(): void {
    this.#rescatarPropsTardias();
    this.#repintar();
  }

  /**
   * Props asignadas ANTES de definir el tag (vistas perezosas) quedan como propiedad propia que sombrea el accesor.
   * Se borran y se mezclan sin repintar (el repintado lo hace `onConnected`).
   */
  #rescatarPropsTardias(): void {
    if (!Object.prototype.hasOwnProperty.call(this, 'props')) return;
    const tardias = (this as { props?: Partial<P> }).props;
    delete (this as { props?: unknown }).props;
    revisarProps(this.localName, tardias);
    this.#props = { ...this.props, ...(tardias ?? {}) };
  }

  #repintar(): void {
    const root = this.shadow;
    if (!root) return;
    for (const n of [...root.childNodes]) {
      if (!(n instanceof HTMLStyleElement) && !(n instanceof HTMLLinkElement)) n.remove();
    }
    this.pintar(root, this.props);
  }
}

/** Notificación con el toaster del kit (`<iswc-toast>`); si no está montado, no hace nada. */
export function avisar(mensaje: string, color: 'brand' | 'success' | 'warning' | 'danger' = 'brand'): void {
  const t = document.querySelector('iswc-toast') as (HTMLElement & { create?(m: string, o?: object): unknown }) | null;
  void t?.create?.(mensaje, { color });
}

// Aquí NO van formateadores de fecha/número/bytes: el kit trae iswc-format-date/-number/-bytes.
