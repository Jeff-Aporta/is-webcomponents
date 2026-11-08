/**
 * iswc-reactive.ts — Propiedades reactivas y `render()` sobre el molde (F8, paridad con Web Awesome sin Lit).
 *
 *   import { IswcReactive, prop, state, watch } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
 *   import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';    // solo si el componente pinta con render()
 *
 *   class IswcFoo extends IswcReactive {
 *     static tag = 'iswc-foo';
 *     static css = css;
 *     @prop() accessor label = '';                          // ↔ atributo `label` (reflejado)
 *     @prop({ type: 'bool' }) accessor open = false;        // presencia del atributo
 *     @prop({ enum: ['a', 'b'] }) accessor modo = 'a';      // fuera de la lista → el defecto
 *     @state() accessor abierto = false;                    // interno: repinta, sin atributo
 *     @watch('open') alAbrir(antes: boolean, ahora: boolean) { … }   // antes de pintar
 *     render() { return html`<p ?hidden=${!this.label}>${this.label}</p>`; }
 *   }
 *   define(IswcFoo);
 *
 * Ciclo: cada escritura que cambia un valor encola UN repintado por microtarea (N escrituras en el mismo tick = 1
 * pintado). El primer pintado al conectar es síncrono (dentro de `connectedCallback`, antes de `onConnected`), así que
 * quien lea el shadow justo después de insertar el elemento ya lo ve pintado. `actualizarAhora()` vacía la cola en
 * síncrono y `actualizacionCompleta` espera al pintado pendiente.
 *
 * Plantilla: `render()` devuelve un `html\`…\`` de `core/plantilla.ts`, que al importarse registra su pintor aquí; una
 * clase que no pinta con `render()` (usa su `static template`) no carga la plantilla.
 */
import { IswcElement, upgradeProperties } from './iswc-element.js';
import { observarIdioma, resolverDir, resolverLocale, termino } from './localize.js';
import type { Cambios, DefProp, MetaReactiva, OpcionesProp, TipoProp } from './schemas/iswc-reactive.schemas.js';
import type { Resultado } from './schemas/plantilla.schemas.js';

// Los decoradores estándar guardan su `context.metadata` en `Clase[Symbol.metadata]`; los motores que aún no lo
// definen usan el mismo símbolo registrado que esbuild y TypeScript.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');
const META: symbol = (Symbol as unknown as { metadata: symbol }).metadata;

/** Pinta la vista de `render()`; lo registra `core/plantilla.ts` al importarse (quien no pinta no lo carga). */
let pintor: ((r: Resultado, raiz: Element | ShadowRoot, host: unknown) => void) | null = null;

/** Lo llama `core/plantilla.ts`. */
export function registrarPintor(fn: (r: Resultado, raiz: Element | ShadowRoot, host: unknown) => void): void {
  pintor = fn;
}

/* ─────────────────────────── propiedades reactivas ─────────────────────────── */

const aKebab = (nombre: string): string => nombre.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Metadatos propios de la clase que se está decorando (heredan por prototipo los del padre). */
function propsDe(ctx: { metadata?: unknown }): Record<string, DefProp> {
  const m = ctx.metadata as MetaReactiva;
  if (!Object.prototype.hasOwnProperty.call(m, 'iswcProps')) m.iswcProps = Object.create(m.iswcProps ?? null) as Record<string, DefProp>;
  return m.iswcProps!;
}

/** Todas las definiciones (propias y heredadas) de una clase. */
function definiciones(ctor: object): DefProp[] {
  const props = ((ctor as Record<symbol, MetaReactiva | undefined>)[META])?.iswcProps;
  const out: DefProp[] = [];
  for (const k in props) out.push(props[k]!);
  return out;
}

/** Valor de la propiedad desde el texto del atributo. */
function desdeAtributo(d: DefProp, texto: string | null): unknown {
  if (d.type === 'bool') return texto !== null;
  if (texto === null) return d.defecto;
  if (d.type === 'num') {
    if (texto === '') return d.defecto;
    const n = Number(texto);
    return Number.isFinite(n) ? n : d.defecto;
  }
  if (d.type === 'json') {
    try {
      return JSON.parse(texto) as unknown;
    } catch {
      return d.defecto;
    }
  }
  return normalizar(d, texto);
}

/** Acota un valor de texto a su lista (`enum`) o lo convierte al tipo declarado. */
function normalizar(d: DefProp, v: unknown): unknown {
  if (d.type === 'bool') return !!v;
  // null/undefined = «quitar»: texto y número vuelven al defecto (como `attrNum`), json conserva el null.
  if (v == null) return d.type === 'json' ? v : d.defecto;
  if (d.type === 'num') {
    const n = Number(v);
    return Number.isFinite(n) ? n : d.defecto;
  }
  if (d.type === 'json') return v;
  const texto = String(v);
  // Vacío = ausente (como `setStringAttr`), salvo `vacio: true` (como `setOptionalAttr`: `x=""` tiene significado).
  if ((texto === '' && !d.vacio) || (d.enum && !d.enum.includes(texto))) return d.defecto;
  return texto;
}

/** Escribe el atributo que corresponde al valor (o lo quita). */
function reflejar(el: HTMLElement, d: DefProp, v: unknown): void {
  const attr = d.attr as string;
  if (d.type === 'bool') {
    el.toggleAttribute(attr, !!v);
    return;
  }
  const quitar = v == null || (v === '' && !d.vacio);
  if (quitar) {
    el.removeAttribute(attr);
    return;
  }
  const texto = d.type === 'json' ? JSON.stringify(v) : String(v);
  if (el.getAttribute(attr) !== texto) el.setAttribute(attr, texto);
}

function declarar<This extends IswcReactive, T>(d: Omit<DefProp, 'defecto'>, ctx: ClassAccessorDecoratorContext<This, T>): ClassAccessorDecoratorResult<This, T> {
  const def: DefProp = { ...d, defecto: undefined };
  propsDe(ctx)[def.prop] = def;
  return {
    get(this: This): T {
      // Reflejada: el atributo manda (como los getters a mano que sustituye), así el valor es correcto aunque una
      // subclase sobrescriba `attributeChangedCallback` sin llamar a super con los valores reales.
      if (def.reflect && def.attr) {
        const texto = this.getAttribute(def.attr);
        if (texto !== null || def.type !== 'bool' || def.defecto !== true) return desdeAtributo(def, texto) as T;
      }
      return this.leerProp(def.prop) as T;
    },
    set(this: This, v: T): void {
      this.escribirProp(def, v, true);
    },
    init(this: This, v: T): T {
      if (def.defecto === undefined) def.defecto = v;
      this.escribirProp(def, v, false);
      return v;
    },
  };
}

/**
 * Propiedad reactiva ↔ atributo. Por defecto el atributo es el nombre en kebab-case y se REFLEJA al escribir la
 * propiedad (la semántica histórica del kit: los setters a mano también escribían el atributo). Opciones: `type`
 * ('str' | 'bool' | 'num' | 'json'), `enum` (fuera de la lista → el defecto), `attr` (otro nombre, o `false` para
 * una propiedad sin atributo), `reflect: false` y `vacio: true` (el texto vacío se conserva como `x=""`).
 */
export function prop(o: OpcionesProp = {}) {
  return function <This extends IswcReactive, T>(_valor: ClassAccessorDecoratorTarget<This, T>, ctx: ClassAccessorDecoratorContext<This, T>): ClassAccessorDecoratorResult<This, T> {
    const nombre = String(ctx.name);
    const attr = o.attr === false ? false : (o.attr ?? aKebab(nombre));
    const type: TipoProp = o.type ?? 'str';
    return declarar({ prop: nombre, attr, reflect: attr !== false && o.reflect !== false, type, enum: o.enum ?? null, vacio: !!o.vacio }, ctx);
  };
}

/** Estado interno reactivo: repinta al cambiar, sin atributo. */
export function state() {
  return function <This extends IswcReactive, T>(_valor: ClassAccessorDecoratorTarget<This, T>, ctx: ClassAccessorDecoratorContext<This, T>): ClassAccessorDecoratorResult<This, T> {
    return declarar({ prop: String(ctx.name), attr: false, reflect: false, type: 'json', enum: null, vacio: false }, ctx);
  };
}

/** Llama al método con `(anterior, nuevo)` antes de pintar, una vez por propiedad vigilada que cambió. */
export function watch(props: string | readonly string[], o: { esperarPrimerRender?: boolean } = {}) {
  return function (_metodo: unknown, ctx: ClassMethodDecoratorContext) {
    const m = ctx.metadata as MetaReactiva;
    const vigia = { props: ([] as string[]).concat(props), metodo: String(ctx.name), esperar: !!o.esperarPrimerRender };
    m.iswcVigias = [...(m.iswcVigias ?? []), vigia];
  };
}

export class IswcReactive extends IswcElement {
  static override get observedAttributes(): string[] {
    const propios = definiciones(this).map((d) => d.attr).filter((a): a is string => !!a);
    return [...new Set([...super.observedAttributes, ...propios])];
  }

  #valores = new Map<string, unknown>();
  #cambios: Cambios = new Map();
  #pendiente: Promise<boolean> | null = null;
  #pintado = false;
  #reflejando = false;
  #internals: ElementInternals | null | undefined;
  #idioma = false;

  /** Valor actual de una propiedad reactiva. */
  leerProp(nombre: string): unknown {
    return this.#valores.get(nombre);
  }

  /** Escribe una propiedad reactiva: normaliza, compara, refleja (si toca) y encola el repintado. */
  escribirProp(d: DefProp, v: unknown, desdeSetter: boolean): void {
    const nuevo = d.type === 'json' && d.attr === false ? v : normalizar(d, v);
    // Desde el setter se compara con lo que devuelve el getter (el atributo, si se refleja), no con la caché.
    const antes = desdeSetter ? (this as unknown as Record<string, unknown>)[d.prop] : this.#valores.get(d.prop);
    if (this.#valores.has(d.prop) && Object.is(antes, nuevo)) return;
    this.#valores.set(d.prop, nuevo);
    // Escribir null/undefined QUITA el atributo aunque el valor vuelva al defecto (lo que hacían los setters a mano).
    if (desdeSetter && d.reflect) this.#reflejar(d, v == null && d.type !== 'bool' ? null : nuevo);
    this.solicitarRender(d.prop, antes);
  }

  #reflejar(d: DefProp, v: unknown): void {
    this.#reflejando = true;
    try {
      reflejar(this, d, v);
    } finally {
      this.#reflejando = false;
    }
  }

  /** Encola un repintado (coalescido por microtarea). Con `prop`, la anota en los cambios del ciclo. */
  solicitarRender(prop?: string, anterior?: unknown): Promise<boolean> {
    if (prop !== undefined && !this.#cambios.has(prop)) this.#cambios.set(prop, anterior);
    if (!this.#pintado) return Promise.resolve(false);
    this.#pendiente ??= Promise.resolve().then(() => this.#actualizar());
    return this.#pendiente;
  }

  /** Promesa del pintado pendiente (o resuelta si no hay ninguno). */
  get actualizacionCompleta(): Promise<boolean> {
    return this.#pendiente ?? Promise.resolve(true);
  }

  /** Vacía la cola en síncrono: pinta ya lo pendiente. */
  actualizarAhora(): void {
    if (this.#cambios.size || this.#pendiente || !this.#pintado) this.#actualizar();
  }

  #actualizar(): boolean {
    this.#pendiente = null;
    if (!this.isConnected) return false;
    const cambios = this.#cambios;
    this.#cambios = new Map();
    const vigias = ((this.constructor as unknown as Record<symbol, MetaReactiva | undefined>)[META])?.iswcVigias ?? [];
    const metodos = this as unknown as Record<string, (antes: unknown, ahora: unknown) => void>;
    for (const w of vigias) {
      if (w.esperar && !this.#pintado) continue;
      for (const p of w.props) if (cambios.has(p)) metodos[w.metodo]!.call(this, cambios.get(p), this.#valores.get(p));
    }
    const vista = this.render();
    if (vista) pintor?.(vista, this.shadowRoot ?? this, this);
    this.#pintado = true;
    this.actualizado(cambios);
    return true;
  }

  /** Plantilla del componente. `null` = no pinta (el componente usa su `static template`). */
  render(): Resultado | null {
    return null;
  }

  /** Tras cada pintado, con las propiedades que cambiaron (nombre → valor anterior). */
  actualizado(_cambios: Cambios): void {}

  /** `ElementInternals` perezoso (un `attachInternals` por elemento); null si el motor no lo admite. */
  get internals(): ElementInternals | null {
    if (this.#internals === undefined) {
      try {
        this.#internals = this.attachInternals();
      } catch {
        this.#internals = null;
      }
    }
    return this.#internals;
  }

  /** Estado CSS `:state(nombre)`; solo en motores sin `CustomStateSet` cae al respaldo `[data-nombre]`. */
  estado(nombre: string, activo: boolean): void {
    const estados = this.internals?.states;
    try {
      if (!estados) throw new Error('sin CustomStateSet');
      if (activo) estados.add(nombre);
      else estados.delete(nombre);
    } catch {
      this.toggleAttribute(`data-${nombre}`, activo);
    }
  }

  /** Locale resuelto (atributo `locale` propio, ancestros, documento, navegador). */
  get locale(): string {
    return resolverLocale(this, this.getAttribute('locale'));
  }

  /** Dirección heredada (`el.dir` nativo sigue siendo solo el atributo propio). */
  get direccion(): 'ltr' | 'rtl' {
    return resolverDir(this);
  }

  /** Término del kit en el idioma del componente; registra al componente para repintar si cambia el idioma. */
  t(clave: string, ...args: unknown[]): string {
    if (!this.#idioma && this.isConnected) {
      this.#idioma = true;
      observarIdioma(this, true);
    }
    return termino(this.locale, clave, ...args);
  }

  override connectedCallback(): void {
    const ctor = this.constructor as unknown as object;
    const defs = definiciones(ctor);
    if (!this.#pintado) {
      upgradeProperties(this, defs.map((d) => d.prop));
      for (const d of defs) if (d.reflect && this.#valores.get(d.prop) !== d.defecto) this.#reflejar(d, this.#valores.get(d.prop));
      this.#actualizar();
    } else if (this.#cambios.size) this.solicitarRender();
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    if (this.#idioma) {
      this.#idioma = false;
      observarIdioma(this, false);
    }
    super.disconnectedCallback();
  }

  override attributeChangedCallback(nombre: string, antes: string | null, ahora: string | null): void {
    if (!this.#reflejando) {
      const d = definiciones(this.constructor).find((x) => x.attr === nombre);
      // Se lee el atributo real: hay subclases históricas que llaman a super con (name, null, null).
      if (d) this.escribirProp(d, desdeAtributo(d, this.getAttribute(nombre)), false);
    }
    super.attributeChangedCallback(nombre, antes, ahora);
  }
}
