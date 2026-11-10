// @contexto INDICE.md · src/core/README.md
/**
 * localize.ts — idioma, dirección, términos del kit e `Intl` memorizado (F8; absorbe `resolve-locale.ts`).
 *
 *   resolverLocale(el, explicito?)   explícito → ancestro con `lang` (cruza shadows) → `<html lang>` → navegador → 'es'
 *   resolverDir(el)                  ancestro con `dir` → `<html dir>` → 'ltr'
 *   termino(locale, clave, ...args)  `es-CO` → `es` → diccionario base `es` → la clave tal cual
 *   registrarTerminos(lang, t)       fusiona y repinta los componentes vivos que usan `t()`
 *   formato(tipo, locale, opciones)  `Intl.*` memorizado por (tipo, locale, opciones)
 *   observarIdioma(el, activo)       alta/baja en el ÚNICO `MutationObserver` de `<html lang|dir>`
 *
 * Diccionario `es`: el base (aquí) lleva solo los términos que comparten muchos componentes; cada componente registra
 * sus términos propios en español junto a su código (`registrarTerminos('es', {…})` al cargar el módulo), así un
 * texto que solo usa el toast no viaja con todos. Los demás idiomas viven completos en `core/i18n/<lang>.ts` y se piden
 * con `import()` la primera vez que un componente resuelve ese idioma. A diferencia de Web Awesome, `lang` y `dir` se
 * heredan de los ancestros: una app puede tener una sección en otro idioma sin marcar cada componente.
 */
import type { Formateador, Localizable, Termino, Terminos, TipoFormato } from './schemas/localize.schemas.js';

const BASE = 'es';

/** Términos compartidos. Clave camelCase en español; función cuando hay plural o interpolación. */
const ES: Terminos = {
  aceptar: 'Aceptar',
  anterior: 'Anterior',
  buscar: 'Buscar',
  campoObligatorio: 'Este campo es obligatorio',
  cancelar: 'Cancelar',
  cargando: 'Cargando…',
  cerrar: 'Cerrar',
  limpiar: 'Limpiar',
  siguiente: 'Siguiente',
  sinResultados: 'Sin resultados',
};

const DICCIONARIOS = new Map<string, Terminos>([[BASE, ES]]);

/** Idiomas con diccionario propio en `core/i18n/`, pedidos la primera vez que se resuelven. */
const CARGABLES: Record<string, () => Promise<unknown>> = {
  en: () => import('./i18n/en.js'),
};

const VIVOS = new Set<Localizable>();
let observador: MutationObserver | null = null;

/** Repinta los componentes vivos (cambio de idioma o diccionario nuevo). */
function repintarVivos(): void {
  for (const el of VIVOS) el.solicitarRender();
}

/** Fusiona `terminos` en el diccionario de `lang` y repinta a quien ya esté usando `t()`. */
export function registrarTerminos(lang: string, terminos: Terminos): void {
  const clave = lang.toLowerCase();
  DICCIONARIOS.set(clave, { ...DICCIONARIOS.get(clave), ...terminos });
  repintarVivos();
}

/** Valor de `attr` en el propio elemento o en el ancestro más cercano, cruzando los límites de shadow. */
function heredado(el: Element | null | undefined, attr: string): string {
  for (let n: Node | null | undefined = el; n; ) {
    if (n instanceof Element) {
      const v = n.getAttribute(attr);
      if (v) return v.trim();
      n = n.parentNode ?? null;
    } else if (n instanceof ShadowRoot) n = n.host;
    else n = n.parentNode ?? null;
  }
  return '';
}

/** Locale BCP 47 para `Intl.*` y para `t()`. `explicito` (atributo `locale` del componente) gana siempre. */
export function resolverLocale(el?: Element | null, explicito?: string | null): string {
  const propio = explicito != null ? String(explicito).trim() : '';
  if (propio) return propio;
  if (typeof document === 'undefined') return BASE;
  const doc = heredado(el, 'lang') || String(document.documentElement?.lang || '').trim();
  if (doc) return doc;
  const nav = typeof navigator !== 'undefined' ? String(navigator.language || navigator.languages?.[0] || '').trim() : '';
  return nav || BASE;
}

/** Dirección de escritura heredada. */
export function resolverDir(el?: Element | null): 'ltr' | 'rtl' {
  if (typeof document === 'undefined') return 'ltr';
  const dir = heredado(el, 'dir') || document.documentElement?.dir || '';
  return dir.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
}

/** Pide (una vez) el diccionario de un idioma que no viene incrustado. */
function pedirDiccionario(idioma: string): void {
  void cargarIdioma(idioma);
}

const CARGAS = new Map<string, Promise<void>>();

/** Promesa del diccionario del idioma de `locale` (resuelta si viene incrustado o no existe). */
export function cargarIdioma(locale: string): Promise<void> {
  const idioma = locale.toLowerCase().split('-')[0] ?? BASE;
  const carga = CARGABLES[idioma];
  if (!carga || DICCIONARIOS.has(idioma)) return Promise.resolve();
  let p = CARGAS.get(idioma);
  if (!p) {
    p = carga().then(() => undefined, () => { CARGAS.delete(idioma); });
    CARGAS.set(idioma, p);
  }
  return p;
}

/** Término de `clave` para `locale`: región → idioma → base → la propia clave (visible, para detectar faltantes). */
export function termino(locale: string, clave: string, ...args: unknown[]): string {
  const completo = locale.toLowerCase();
  const idioma = completo.split('-')[0] ?? BASE;
  if (!DICCIONARIOS.has(idioma)) pedirDiccionario(idioma);
  const t: Termino | undefined = DICCIONARIOS.get(completo)?.[clave] ?? DICCIONARIOS.get(idioma)?.[clave] ?? DICCIONARIOS.get(BASE)?.[clave];
  if (t === undefined) return clave;
  return typeof t === 'function' ? t(...args) : t;
}

const FORMATOS = new Map<string, Formateador>();

/** `Intl.*` memorizado: crear un formateador por render era lo caro de los `format-*` y `date-*`. */
export function formato(tipo: 'number', locale: string, opciones?: Intl.NumberFormatOptions): Intl.NumberFormat;
export function formato(tipo: 'date', locale: string, opciones?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
export function formato(tipo: 'relative', locale: string, opciones?: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat;
export function formato(tipo: TipoFormato, locale: string, opciones: object = {}): Formateador {
  const clave = `${tipo}|${locale}|${JSON.stringify(opciones)}`;
  const previo = FORMATOS.get(clave);
  if (previo) return previo;
  const nuevo = crearFormato(tipo, locale, opciones);
  FORMATOS.set(clave, nuevo);
  return nuevo;
}

function crearFormato(tipo: TipoFormato, locale: string, opciones: object): Formateador {
  if (tipo === 'number') return new Intl.NumberFormat(locale, opciones);
  if (tipo === 'date') return new Intl.DateTimeFormat(locale, opciones);
  return new Intl.RelativeTimeFormat(locale, opciones);
}

/** Alta (`activo`) o baja de un componente en el observador único de `<html lang|dir>`. */
export function observarIdioma(el: Localizable, activo: boolean): void {
  if (!activo) {
    VIVOS.delete(el);
    return;
  }
  VIVOS.add(el);
  if (observador || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  observador = new MutationObserver(repintarVivos);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
}
