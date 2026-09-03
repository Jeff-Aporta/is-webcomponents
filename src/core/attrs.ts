/**
 * attrs.ts — Todo lo relativo a los ATRIBUTOS de un componente del kit.
 *
 * Consolida dos cosas que siempre se usan juntas y vivian separadas:
 *
 *   1. Los DECORADORES (`@attrBool`, `@attrStr`, `@attrEnum`, `@attrNum`), que
 *      convierten un atributo del DOM en una propiedad tipada y lo registran
 *      para `observedAttributes`.
 *   2. El mixin STYLE-ATTRS, que vuelca atributos a custom properties inline
 *      para poder personalizar sin escribir un `<style>` aparte.
 *
 * Los dos responden a la misma pregunta —«que atributos tiene este componente y
 * que hacen»— y separarlos obligaba a importar de dos sitios en cada fichero.
 *
 * Lo que hace a un elemento *ser* un elemento (registro, shadow, eventos) esta
 * en `element.ts`.
 */

/** Una entrada del mapa: la custom property, o la property con condicion. */
export type StyleAttrDef = string | { prop: string; onlyColorValues?: boolean };
export type StyleAttrMap = Record<string, StyleAttrDef>;

/** Nombres CSS con los que un consumidor puede pintar de verdad. */
const NAMED_COLORS = new Set([
  'currentcolor', 'transparent', 'black', 'white', 'red', 'green', 'blue',
  'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'brown', 'cyan',
  'magenta', 'lime', 'navy', 'teal', 'olive', 'maroon', 'silver', 'gold',
  'indigo', 'violet', 'salmon', 'coral', 'crimson', 'khaki', 'lavender',
  'plum', 'orchid', 'turquoise', 'tomato', 'dodgerblue', 'steelblue',
  'slategray', 'slategrey', 'seagreen', 'skyblue', 'royalblue', 'tan',
]);

const COLOR_FN = /^(?:#|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\(|var\(|light-dark\()/i;

/**
 * ¿El valor es un color CSS literal (o una var/función que resuelve a color)?
 */
export function isCssColorValue(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  if (!v) return false;
  return COLOR_FN.test(v) || NAMED_COLORS.has(v);
}

/**
 * Una entrada del mapa puede ser:
 *   'radius': '--is-button-border-radius'          → siempre se aplica
 *   'color':  { prop: '--x', onlyColorValues: true } → solo si parece color
 */

/** @param {StyleAttrDef} def */
function normalize(def: StyleAttrDef): { prop: string; onlyColorValues: boolean } {
  return typeof def === 'string'
    ? { prop: def, onlyColorValues: false }
    : { prop: def.prop, onlyColorValues: def.onlyColorValues ?? false };
}

/**
 * Vuelca UN atributo a su custom property inline.
 */
export function syncStyleAttr(el: HTMLElement, attr: string, def: StyleAttrDef): void {
  const { prop, onlyColorValues } = normalize(def);
  const raw = el.getAttribute(attr);
  const apply = raw != null && raw !== '' && (!onlyColorValues || isCssColorValue(raw));
  if (apply) el.style.setProperty(prop, raw);
  else el.style.removeProperty(prop);
}

/**
 * Vuelca todos los atributos del mapa.
 */
export function syncStyleAttrs(el: HTMLElement, map: StyleAttrMap): void {
  for (const [attr, def] of Object.entries(map || {})) syncStyleAttr(el, attr, def);
}

/**
 * Como `syncStyleAttrs`, pero SOLO para los atributos presentes: no borra la
 * propiedad cuando el atributo falta. Es lo que hace falta después de aplicar
 * una rampa derivada (`applyToneRamp`), donde borrar por ausencia se llevaría
 * por delante los roles que acaba de calcular la rampa.
 */
export function syncPresentStyleAttrs(el: HTMLElement, map: StyleAttrMap): void {
  for (const [attr, def] of Object.entries(map || {})) {
    if (el.hasAttribute(attr)) syncStyleAttr(el, attr, def);
  }
}

/**
 * Nombres de atributo del mapa, para concatenarlos a `observedAttributes`.
 */
export function styleAttrNames(map: StyleAttrMap): string[] {
  return Object.keys(map || {});
}

/**
 * Documentación legible del mapa (la usan los .md y el panel de demos).
 */
export function describeStyleAttrs(map: StyleAttrMap): Array<{ attr: string; prop: string; onlyColorValues: boolean }> {
  return Object.entries(map || {}).map(([attr, def]) => ({ attr, ...normalize(def) }));
}

/**
 * Rampa de tono a partir de UN color literal.
 *
 * Un componente con variantes (filled/outlined/soft/…) no consume un color
 * suelto: consume roles (base, hover, active, texto, suave). Si el consumidor
 * escribe `color="#ae3ec9"` y solo se fija el rol base, el hover y el activo
 * se quedan con el tono semántico anterior y el botón cambia de familia al
 * pasar el puntero. Aquí se derivan todos los roles del mismo color con
 * `color-mix`, que el navegador resuelve en el espacio correcto.
 *
 */
export function applyToneRamp(el: HTMLElement, color: string | null, opts: { prefix?: string } = {}): void {
  const p = opts.prefix ?? '--_tone';
  const roles = {
    '': color,
    '-strong': color,
    '-stronger': `color-mix(in srgb, ${color} 86%, black)`,
    '-strongest': `color-mix(in srgb, ${color} 74%, black)`,
    '-paler': `color-mix(in srgb, ${color} 12%, white)`,
    '-pale': `color-mix(in srgb, ${color} 22%, white)`,
    '-text': `color-mix(in srgb, ${color} 86%, black)`,
    '-soft': `color-mix(in srgb, ${color} 16%, transparent)`,
    '-soft-active': `color-mix(in srgb, ${color} 26%, transparent)`,
    '-on': '#fff',
  };
  for (const [suffix, value] of Object.entries(roles)) {
    const prop = `${p}${suffix}`;
    if (color) el.style.setProperty(prop, value);
    else el.style.removeProperty(prop);
  }
}

/**
 * Mixin para componentes que NO extienden `ElementBase` (los que siguen
 * heredando de `HTMLElement` directamente). Da el mismo comportamiento que
 * `ElementBase`: volcar el mapa al conectar y mantenerlo al cambiar el
 * atributo, sin que cada componente repita el cableado.
 *
 *   class IsFoo extends withStyleAttrs(HTMLElement) {
 *     static styleAttrs = { radius: '--is-foo-radius' };
 *     static get observedAttributes() { return [...OBSERVED, ...IsFoo.styleAttrNames]; }
 *   }
 *
 * Encadena con los callbacks de la subclase: si la clase base ya definía
 * `connectedCallback` / `attributeChangedCallback`, se llaman igual.
 *
 */
type Constructor<T = HTMLElement> = new (...args: any[]) => T;

export function withStyleAttrs<T extends Constructor>(Base: T) {
  return class StyleAttrsElement extends Base {
    static styleAttrs: StyleAttrMap = {};

    static get styleAttrNames(): string[] { return styleAttrNames(this.styleAttrs); }

    // `super.x?.()` no vale: la clase base es generica y TS no sabe si define
    // los callbacks. Se resuelve por el prototipo, que es lo que hace el
    // encadenado real, y ademas respeta la cadena aunque la base los anada
    // despues.
    connectedCallback(...args: unknown[]): void {
      syncStyleAttrs(this, (this.constructor as typeof StyleAttrsElement).styleAttrs);
      const heredado = (Base.prototype as Record<string, unknown>)['connectedCallback'];
      if (typeof heredado === 'function') heredado.apply(this, args);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null, ...rest: unknown[]): void {
      const map = (this.constructor as typeof StyleAttrsElement).styleAttrs;
      if (map && name in map) syncStyleAttrs(this, { [name]: map[name]! });
      const heredado = (Base.prototype as Record<string, unknown>)['attributeChangedCallback'];
      if (typeof heredado === 'function') heredado.apply(this, [name, oldValue, newValue, ...rest]);
    }
  };
}


/* ───────────────────────────── decoradores ───────────────────────────── */

/** Nombre de atributo desde el nombre del campo: `labelPlacement` → `label-placement`. */
export function aAtributo(nombre: string): string {
  return nombre.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

const REGISTRO = new WeakMap<object, Set<string>>();

/**
 * Nombres empujados por `@attr*` mientras se evalúa el cuerpo de la clase.
 *
 * El decorador no recibe la clase: solo puede encolar aquí. `defineElement`
 * vacía la cola en el REGISTRO de ese `ctor` justo antes del `define`.
 */
const PENDIENTES: string[] = [];

/** Atributos declarados con estos decoradores en la clase y sus ancestros. */
export function atributosDeclarados(Clase: object): string[] {
  const vistos = new Set<string>();
  for (let c: object | null = Clase; c; c = Object.getPrototypeOf(c)) {
    for (const a of REGISTRO.get(c) ?? []) vistos.add(a);
  }
  return [...vistos];
}

/**
 * Vuelca la cola de `@attr*` al REGISTRO del `ctor` antes de `customElements.define`.
 *
 * El browser congela `observedAttributes` en el `define`. Si el REGISTRO está
 * vacío en ese instante, congela `[]` y attrs como `open` nunca disparan
 * `attributeChangedCallback` (is-dropdown marcaba `open` sin abrir el panel).
 *
 * No se puede hacer `new Clase()` aquí: antes del define el browser lanza
 * `Illegal constructor` y un try/catch dejaba el REGISTRO vacío igual.
 * La cola se llena en tiempo de decoración (evaluación de la clase).
 */
export function materializarAtributos(Clase: CustomElementConstructor): void {
  if (!PENDIENTES.length) return;
  let set = REGISTRO.get(Clase);
  if (!set) REGISTRO.set(Clase, (set = new Set()));
  for (const a of PENDIENTES) set.add(a);
  PENDIENTES.length = 0;
}

/** Registra el atributo en la clase donde se declara el campo. */
function registrar(ctx: { metadata?: object; addInitializer(fn: () => void): void }, attr: string): void {
  // Cola de evaluación: disponible en materializarAtributos sin construir.
  PENDIENTES.push(attr);
  // Refuerzo en instancia (herencia / lecturas tardías de atributosDeclarados).
  ctx.addInitializer(function (this: object) {
    const Clase = (this as { constructor: object }).constructor;
    let set = REGISTRO.get(Clase);
    if (!set) REGISTRO.set(Clase, (set = new Set()));
    set.add(attr);
  });
}

type Ctx<T> = ClassAccessorDecoratorContext<HTMLElement, T>;

/**
 * Booleano reflejado como presencia del atributo.
 *
 * Presencia, no valor: `open=""` y `open="false"` son ambos `true`, que es la
 * semántica de HTML y la que ya usaban los 71 componentes que hacían esto a
 * mano. Un booleano que necesite distinguir «false» explícito no es `@attrBool`.
 */
export function attrBool(_valor: unknown, ctx: Ctx<boolean>) {
  const attr = aAtributo(String(ctx.name));
  registrar(ctx, attr);
  return {
    get(this: HTMLElement): boolean { return this.hasAttribute(attr); },
    set(this: HTMLElement, v: boolean): void { this.toggleAttribute(attr, !!v); },
    // El valor inicial del campo solo se aplica si el HTML no dijo nada: el
    // marcado del consumidor manda sobre el defecto del componente.
    init(this: HTMLElement, v: boolean): boolean {
      if (v && !this.hasAttribute(attr)) this.toggleAttribute(attr, true);
      return v;
    },
  };
}

/** Texto con valor por defecto cuando el atributo falta. */
export function attrStr(porDefecto = '') {
  return function (_valor: unknown, ctx: Ctx<string>) {
    const attr = aAtributo(String(ctx.name));
    registrar(ctx, attr);
    return {
      get(this: HTMLElement): string { return this.getAttribute(attr) ?? porDefecto; },
      set(this: HTMLElement, v: string): void {
        // `null`/`undefined` quitan el atributo en vez de escribir "null":
        // es lo que espera quien limpia un valor.
        if (v == null) this.removeAttribute(attr);
        else this.setAttribute(attr, String(v));
      },
    };
  };
}

/**
 * Valor acotado a una lista. Fuera de la lista → el defecto.
 *
 * Sustituye el patrón `lista.includes(v) ? v : def`, 56 usos en 36 componentes.
 * Nunca lanza: un valor inválido en el HTML degrada al defecto en vez de
 * romper el render.
 */
export function attrEnum<const L extends readonly string[]>(lista: L, porDefecto: L[number]) {
  return function (_valor: unknown, ctx: Ctx<L[number]>) {
    const attr = aAtributo(String(ctx.name));
    registrar(ctx, attr);
    return {
      get(this: HTMLElement): L[number] {
        const v = this.getAttribute(attr);
        return v != null && lista.includes(v as L[number]) ? (v as L[number]) : porDefecto;
      },
      set(this: HTMLElement, v: L[number]): void {
        if (v == null) this.removeAttribute(attr);
        else this.setAttribute(attr, String(v));
      },
    };
  };
}

/**
 * Número con defecto. Un atributo ausente o no numérico da el defecto.
 *
 * `Number('')` es 0 y `Number(null)` también, así que se comprueba la ausencia
 * antes de convertir: sin eso, quitar el atributo daría 0 en vez del defecto.
 */
export function attrNum(porDefecto = 0) {
  return function (_valor: unknown, ctx: Ctx<number>) {
    const attr = aAtributo(String(ctx.name));
    registrar(ctx, attr);
    return {
      get(this: HTMLElement): number {
        const raw = this.getAttribute(attr);
        if (raw == null || raw === '') return porDefecto;
        const n = Number(raw);
        return Number.isFinite(n) ? n : porDefecto;
      },
      set(this: HTMLElement, v: number): void {
        if (v == null) this.removeAttribute(attr);
        else this.setAttribute(attr, String(v));
      },
    };
  };
}
