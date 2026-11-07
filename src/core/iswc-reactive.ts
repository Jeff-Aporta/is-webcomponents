/**
 * iswc-reactive.ts — Propiedades reactivas y `render()` sobre el molde (F8, paridad con Web Awesome sin Lit).
 *
 *   import { IswcReactive, prop, state, watch, html } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
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
 * Plantilla: `html\`…\`` se prepara UNA vez por literal (marcadores + recorrido) y después solo se tocan las partes
 * cuyo valor cambió. Partes: hijo `${x}` (texto, `html`, lista, `repetir()`, null), atributo `a=${x}` (null/false lo
 * quita), booleano `?a=${x}`, propiedad `.p=${x}` y evento `@e=${fn}` (con `this` = el componente). No se admiten
 * valores parciales de atributo (`class="a ${x}"`: usar `class=${`a ${x}`}`) ni marcadores dentro de `<textarea>`,
 * `<title>` o `<style>` (usar `.value=${x}`). `svg\`…\`` parsea un fragmento suelto en el espacio SVG.
 */
import { IswcElement, upgradeProperties } from './iswc-element.js';
import { observarIdioma, resolverDir, resolverLocale, termino } from './localize.js';
import type { Cambios, DefProp, DescParte, Instancia, MetaReactiva, OpcionesProp, ParteViva, Preparada, Repeticion, Resultado, TipoParte, TipoProp } from './schemas/iswc-reactive.schemas.js';

// Los decoradores estándar guardan su `context.metadata` en `Clase[Symbol.metadata]`; los motores que aún no lo
// definen usan el mismo símbolo registrado que esbuild y TypeScript.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');
const META: symbol = (Symbol as unknown as { metadata: symbol }).metadata;

/* ───────────────────────────── plantilla html ───────────────────────────── */

/** Plantilla HTML: `render()` la devuelve y el molde la pinta con diff por parte. */
export const html = (s: TemplateStringsArray, ...v: unknown[]): Resultado => ({ s, v, svg: false });

/** Fragmento SVG suelto (sin `<svg>` envolvente en el literal). */
export const svg = (s: TemplateStringsArray, ...v: unknown[]): Resultado => ({ s, v, svg: true });

/** Lista con clave: los ítems que se mueven conservan su DOM (foco, estado de los controles). */
export function repetir<T>(items: readonly T[], clave: (item: T, i: number) => unknown, plantilla: (item: T, i: number) => Resultado): Repeticion {
  return { repetir: true, items, clave: clave as Repeticion['clave'], plantilla: plantilla as Repeticion['plantilla'] };
}

const PREPARADAS = new WeakMap<TemplateStringsArray, Preparada>();
const VIVAS = new WeakMap<Node, Instancia>();
/** Fin de un trozo en posición de atributo: `nombre=`, `nombre="`, `?nombre=`, `.nombre=`, `@nombre=`. */
const EN_ATRIBUTO = /([.?@]?)([\w:-]+)=(["']?)$/;
const TEXTO_CRUDO = /<(textarea|title|style|script)\b[^>]*>[^<]*$/i;

const esResultado = (v: unknown): v is Resultado => !!v && typeof v === 'object' && 's' in v && 'v' in v;
const esRepeticion = (v: unknown): v is Repeticion => !!v && typeof v === 'object' && (v as Repeticion).repetir === true;

/** Construye el HTML con marcadores y localiza las partes una sola vez por literal. */
function preparar(r: Resultado): Preparada {
  const s = r.s;
  let fuente = '';
  let comilla = '';
  const atributos = new Map<number, DescParte>();
  for (let i = 0; i < s.length; i++) {
    let trozo = s[i] ?? '';
    if (comilla && trozo.startsWith(comilla)) trozo = trozo.slice(1);
    comilla = '';
    if (i === s.length - 1) {
      fuente += trozo;
      break;
    }
    const hasta = fuente + trozo;
    const enEtiqueta = hasta.lastIndexOf('<') > hasta.lastIndexOf('>');
    const m = enEtiqueta ? EN_ATRIBUTO.exec(trozo) : null;
    if (enEtiqueta && !m) throw new Error(`html: atributo parcial «${trozo.slice(-20)}»`);
    if (!enEtiqueta && TEXTO_CRUDO.test(hasta)) throw new Error('html: valor en texto crudo');
    if (m) {
      fuente += `${trozo.slice(0, -m[0].length)} isw-${i}=""`;
      comilla = m[3] ?? '';
      atributos.set(i, { i, nodo: -1, tipo: (m[1] || 'a') as TipoParte, nombre: m[2] ?? '' });
    } else {
      fuente += `${trozo}<!--isw-${i}-->`;
    }
  }
  const t = document.createElement('template');
  if (r.svg) {
    t.innerHTML = `<svg>${fuente}</svg>`;
    const raiz = t.content.firstChild as Element;
    t.content.replaceChildren(...raiz.childNodes);
  } else t.innerHTML = fuente;
  const partes: DescParte[] = [];
  const w = document.createTreeWalker(t.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let n = 0;
  for (let nodo = w.nextNode(); nodo; nodo = w.nextNode(), n++) {
    if (nodo.nodeType === Node.COMMENT_NODE) {
      const dato = (nodo as Comment).data;
      if (dato.startsWith('isw-')) partes.push({ i: Number(dato.slice(4)), nodo: n, tipo: 'h', nombre: '' });
      continue;
    }
    const el = nodo as Element;
    for (const a of [...el.attributes]) {
      if (!a.name.startsWith('isw-')) continue;
      const d = atributos.get(Number(a.name.slice(4)));
      if (d) partes.push({ ...d, nodo: n });
      el.removeAttribute(a.name);
    }
  }
  partes.sort((a, b) => a.i - b.i);
  const prep = { t, partes };
  PREPARADAS.set(s, prep);
  return prep;
}

/** Clona la plantilla dentro de un rango [inicio, fin] y aplica los valores. Devuelve la instancia y su fragmento. */
function instanciar(r: Resultado, host: unknown): [Instancia, DocumentFragment] {
  const prep = PREPARADAS.get(r.s) ?? preparar(r);
  const frag = prep.t.content.cloneNode(true) as DocumentFragment;
  const w = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  const nodos: Node[] = [];
  for (let nodo = w.nextNode(); nodo; nodo = w.nextNode()) nodos.push(nodo);
  const partes: ParteViva[] = prep.partes.map((d) => ({ d, el: nodos[d.nodo]!, ultimo: undefined, texto: null, sub: null, lista: null, claves: null, host }));
  const inicio = document.createComment('');
  const fin = document.createComment('');
  frag.prepend(inicio);
  frag.append(fin);
  const inst: Instancia = { s: r.s, inicio, fin, partes };
  aplicar(inst, r.v);
  return [inst, frag];
}

/** Nodos del rango de una instancia, marcadores incluidos. */
function rango(inst: Instancia): Node[] {
  const out: Node[] = [];
  for (let n: Node | null = inst.inicio; n; n = n.nextSibling) {
    out.push(n);
    if (n === inst.fin) break;
  }
  return out;
}

function quitarRango(inst: Instancia | null): void {
  if (inst) for (const n of rango(inst)) (n as ChildNode).remove();
}

/** Mueve el rango de `inst` delante de `antes` (si no está ya ahí). */
function moverRango(inst: Instancia, antes: Node): void {
  if (inst.fin.nextSibling === antes) return;
  const padre = antes.parentNode;
  if (!padre) return;
  for (const n of rango(inst)) padre.insertBefore(n, antes);
}

/** Vacía una parte hija (texto, plantilla o listas). */
function vaciarHijo(p: ParteViva): void {
  p.texto?.remove();
  p.texto = null;
  quitarRango(p.sub);
  p.sub = null;
  for (const i of p.lista ?? []) quitarRango(i);
  p.lista = null;
  p.claves = null;
}

function hijoPlantilla(p: ParteViva, r: Resultado): void {
  if (p.sub && p.sub.s === r.s) {
    aplicar(p.sub, r.v);
    return;
  }
  vaciarHijo(p);
  const [inst, frag] = instanciar(r, p.host);
  p.el.parentNode?.insertBefore(frag, p.el);
  p.sub = inst;
}

/** Lista por índice: reutiliza la instancia de la misma posición si es del mismo literal. */
function hijoLista(p: ParteViva, items: readonly unknown[]): void {
  if (!p.lista) vaciarHijo(p);
  const previas = p.lista ?? [];
  const siguientes: Instancia[] = [];
  items.forEach((item, k) => {
    const r = esResultado(item) ? item : html`${item}`;
    const ya = previas[k];
    if (ya && ya.s === r.s) {
      aplicar(ya, r.v);
      siguientes.push(ya);
      return;
    }
    quitarRango(ya ?? null);
    const [inst, frag] = instanciar(r, p.host);
    const antes = previas[k + 1]?.inicio ?? p.el;
    antes.parentNode?.insertBefore(frag, antes);
    siguientes.push(inst);
  });
  for (const sobra of previas.slice(items.length)) quitarRango(sobra);
  p.lista = siguientes;
}

/** Lista con clave: conserva y reordena los rangos existentes. */
function hijoRepetir(p: ParteViva, rep: Repeticion): void {
  if (!p.claves) vaciarHijo(p);
  const previas = p.claves ?? new Map<unknown, Instancia>();
  const siguientes = new Map<unknown, Instancia>();
  const orden: Instancia[] = [];
  rep.items.forEach((item, k) => {
    const clave = rep.clave(item, k);
    const r = rep.plantilla(item, k);
    let inst = previas.get(clave);
    if (inst && inst.s !== r.s) {
      quitarRango(inst);
      inst = undefined;
    }
    if (inst) aplicar(inst, r.v);
    else {
      const [nueva, frag] = instanciar(r, p.host);
      p.el.parentNode?.insertBefore(frag, p.el);
      inst = nueva;
    }
    previas.delete(clave);
    siguientes.set(clave, inst);
    orden.push(inst);
  });
  for (const sobra of previas.values()) quitarRango(sobra);
  for (let k = orden.length - 1, antes: Node = p.el; k >= 0; k--) {
    moverRango(orden[k]!, antes);
    antes = orden[k]!.inicio;
  }
  p.claves = siguientes;
}

function hijoTexto(p: ParteViva, v: unknown): void {
  const texto = v == null || v === false ? '' : String(v);
  if (p.texto) {
    if (p.texto.data !== texto) p.texto.data = texto;
    return;
  }
  vaciarHijo(p);
  p.texto = document.createTextNode(texto);
  p.el.parentNode?.insertBefore(p.texto, p.el);
}

function hijo(p: ParteViva, v: unknown): void {
  if (esResultado(v)) hijoPlantilla(p, v);
  else if (esRepeticion(v)) hijoRepetir(p, v);
  else if (Array.isArray(v)) hijoLista(p, v);
  else if (v instanceof Node) {
    vaciarHijo(p);
    p.el.parentNode?.insertBefore(v, p.el);
  } else hijoTexto(p, v);
}

/** Aplica los valores a las partes que cambiaron. Las plantillas y listas hijas siempre se revisan por dentro. */
function aplicar(inst: Instancia, valores: readonly unknown[]): void {
  for (const p of inst.partes) {
    const v = valores[p.d.i];
    const compuesto = p.d.tipo === 'h' && v !== null && typeof v === 'object';
    if (!compuesto && p.ultimo !== undefined && Object.is(v, p.ultimo)) continue;
    const el = p.el as Element & Record<string, unknown>;
    const { tipo, nombre } = p.d;
    if (tipo === 'h') hijo(p, v);
    else if (tipo === '?') el.toggleAttribute(nombre, !!v);
    else if (tipo === '.') el[nombre] = v;
    else if (tipo === '@') {
      if (p.ultimo === undefined) el.addEventListener(nombre, (e) => (p.ultimo as ((e: Event) => void) | null)?.call(p.host, e));
    } else if (v == null || v === false) el.removeAttribute(nombre);
    else {
      const texto = String(v);
      if (el.getAttribute(nombre) !== texto) el.setAttribute(nombre, texto);
    }
    p.ultimo = tipo === '@' ? (v ?? null) : v;
  }
}

/**
 * Pinta `r` dentro de `raiz` (al final de lo que ya tenga). La primera vez clona; las siguientes solo tocan las partes
 * que cambiaron. Un literal distinto reemplaza el rango anterior. `host` es el `this` de los `@evento`.
 */
export function render(r: Resultado | null, raiz: Element | ShadowRoot | DocumentFragment, host: unknown = raiz): void {
  const viva = VIVAS.get(raiz);
  if (r && viva && viva.s === r.s && viva.inicio.parentNode === raiz) {
    aplicar(viva, r.v);
    return;
  }
  quitarRango(viva ?? null);
  VIVAS.delete(raiz);
  if (!r) return;
  const [inst, frag] = instanciar(r, host);
  raiz.appendChild(frag);
  VIVAS.set(raiz, inst);
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
    if (vista) render(vista, this.shadowRoot ?? this, this);
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
