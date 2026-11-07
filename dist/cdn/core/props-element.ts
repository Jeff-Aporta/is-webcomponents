/**
 * props-element.ts — base de los componentes del kit que reciben sus datos en un solo objeto (`el.props = {…}`).
 *
 * Cada clave de `props` que no sea una función es también un atributo en kebab-case (`textoCargando` →
 * `texto-cargando`; un arreglo o un objeto va como JSON), así el mismo componente sirve desde HTML y desde JS. `props`
 * mezcla lo nuevo con lo anterior, valida con el esquema del componente y solo repinta si algo cambió: un refresco
 * idéntico no toca el DOM (ni parpadea, ni pierde el foco).
 *
 * Es una subclase de `IswcReactive` (core/iswc-reactive.ts, sobre el molde `IswcElement`): la subclase declara
 * `static tag`, `static css` y `static observed = atributosDe(INICIAL)`, y el molde crea el shadow y adopta las hojas.
 * `PropsElement` no usa `render()`: `pintar()` sigue siendo síncrono (un `props = …` se ve pintado en la línea
 * siguiente) y hereda `t()` y `estado()`.
 */
import { upgradeProperties } from './iswc-element.js';
import { IswcReactive } from './iswc-reactive.js';
import type { EsquemaProps } from './schemas/props-element.schemas.js';

const aKebab = (clave: string): string => clave.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Atributos observados de un componente: las claves de sus props iniciales que no son funciones. */
export function atributosDe(inicial: object): string[] {
  return Object.entries(inicial).filter(([, v]) => typeof v !== 'function').map(([k]) => aKebab(k));
}

/** Igualdad superficial; arrays y objetos se comparan por contenido para que un refresco idéntico no repinte. */
function iguales(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Valor de un atributo según el tipo del valor inicial de esa clave. */
function leerAtributo(el: Element, atributo: string, inicial: unknown): unknown {
  if (typeof inicial === 'boolean') return el.hasAttribute(atributo);
  const texto = el.getAttribute(atributo);
  if (texto === null) return inicial;
  if (typeof inicial === 'number') {
    const n = Number(texto);
    return Number.isFinite(n) ? n : inicial;
  }
  if (typeof inicial === 'object' && inicial !== null) {
    try {
      return JSON.parse(texto) as unknown;
    } catch {
      return inicial;
    }
  }
  return texto;
}

export abstract class PropsElement<P extends object> extends IswcReactive {
  readonly #inicial: P;
  readonly #esquema: EsquemaProps;
  #props: P;
  #atributosLeidos = false;

  /** `esquema` valida un `Partial<P>`: es el `.partial()` del objeto Zod del componente, sin `.default()` en sus claves. */
  constructor(inicial: P, esquema: EsquemaProps) {
    super();
    this.#inicial = inicial;
    this.#esquema = esquema;
    this.#props = { ...inicial };
  }

  /** Repinta. `previos` son las props anteriores: sirve para actualizar sin reconstruir. */
  protected abstract pintar(previos: P): void;

  get props(): P { return this.#props; }

  set props(valor: Partial<P> | null | undefined) {
    const r = this.#esquema.safeParse(valor ?? {});
    if (!r.success) {
      console.warn(`[${this.localName}] props inválidas`, r.error);
      return;
    }
    const nuevas = Object.entries(r.data as object).filter(([, v]) => v !== undefined);
    this.#aplicar(Object.fromEntries(nuevas) as Partial<P>);
  }

  #aplicar(cambios: Partial<P>): void {
    const previos = this.#props;
    const siguientes: P = { ...previos, ...cambios };
    const claves = Object.keys(siguientes) as (keyof P)[];
    if (claves.every((k) => iguales(previos[k], siguientes[k]))) return;
    this.#props = siguientes;
    if (this.mounted && this.isConnected) this.pintar(previos);
  }

  #valorDeAtributo(atributo: string): [string, unknown] | null {
    for (const [clave, inicial] of Object.entries(this.#inicial)) {
      if (typeof inicial !== 'function' && aKebab(clave) === atributo) return [clave, leerAtributo(this, atributo, inicial)];
    }
    return null;
  }

  override connectedCallback(): void {
    // `props` asignadas antes de definirse el tag (carga perezosa) quedan como propiedad propia que tapa el setter.
    upgradeProperties(this, ['props']);
    super.connectedCallback();
  }

  override onConnected(): void {
    if (!this.#atributosLeidos) {
      this.#atributosLeidos = true;
      const presentes = this.getAttributeNames().map((a) => this.#valorDeAtributo(a)).filter((e) => e !== null);
      this.#props = { ...this.#props, ...(Object.fromEntries(presentes) as Partial<P>) };
    }
    this.pintar(this.#props);
  }

  override onAttributeChanged(nombre: string): void {
    const entrada = this.#valorDeAtributo(nombre);
    if (entrada) this.#aplicar({ [entrada[0]]: entrada[1] } as Partial<P>);
  }
}
