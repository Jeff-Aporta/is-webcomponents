// controles.ts: sistema de controles de demo (playground tipo Storybook),
// 100% JSON-driven. Los controles se declaran en el preview JSON del
// componente (iswc-preview/v1, bloque demo/html -> `controls` + `target`) y se
// aplican SIEMPRE vía JSON -> prop/attr del componente. Nunca otro sistema.
//
// El panel lo pinta <iswc-preview-controls> (components/layout); este módulo
// monta los paneles por demo, escucha sus cambios y aplica el valor al host.

import { iconForSelectOption } from './control-select-icons.js';
import { DEFAULT_BUTTON_SHAPE } from '../../components/_shared/button-shape.js';
import { DEFAULT_MEDIA_SHAPE } from '../../components/_shared/media-shape.js';
import { DEFAULT_INTENT } from '../../components/_shared/intent.js';
import { DEFAULT_TONE } from '../../components/_shared/tone.js';

/** Tipos de control soportados por el panel. */
export type TipoControl = 'text' | 'color' | 'number' | 'select' | 'boolean' | 'range' | 'json';

/** Opción de un select: valor plano o {value,label[,icon|html]}. */
export type OpcionSelect = string | {
  value: string | number | boolean;
  label: string;
  icon?: string;
  html?: string;
  description?: string;
  /**
   * Marca esta opción como placeholder (no se puede seleccionar como default).
   * El panel la renderiza en color neutral (#888) para indicar que el
   * componente no quema un default; HTML resuelve al valor `value` (típico "").
   */
  placeholder?: boolean;
};

/**
 * Información JSDoc-style opcional del atributo (Phase W36). Cuando está
 * presente, el botón info junto al label abre un popover con esta info; en
 * su defecto, el panel deriva lo que puede del propio control (tipo,
 * default, options).
 */
export type PanelInfoDef = {
  description?: string;
  type?: string;
  default?: string;
  values?: string[];
  example?: string;
};

/** Definición JSON de un control (espejo de controls.schema.json). */
export type ControlDef = {
  control: TipoControl;
  /** Propiedad del host; prefijo `attr:` aplica como atributo reflejado. */
  prop: string;
  label: string;
  group?: string;
  default?: unknown;
  options?: OpcionSelect[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Info JSDoc-style opcional (Phase W36). */
  info?: PanelInfoDef;
};

/** `controls` que puede declarar un bloque demo/html del preview. */
export type ControlesDeDemo = {
  /** Selector CSS del host dentro del demo (default: primer is-* del demo). */
  target?: string;
  /** Grupo por defecto de todos los controles del bloque. */
  group?: string;
  controls: ControlDef[];
};

/** Bloque de preview que puede llevar controles (kind demo|html). */
export type BloqueConControles = { kind: 'demo' | 'html'; html?: string } & ControlesDeDemo;

/** Forma del panel <iswc-preview-controls> (su setter `spec` vive en preview-controls.ts). */
type PanelConSpec = { spec: unknown[] };

function esAttr(prop: string): boolean {
  return prop.startsWith('attr:');
}

/** Nombre del atributo (si prop va con prefijo attr:). */
export function nombreAtributo(prop: string): string | null {
  return esAttr(prop) ? prop.slice(5) : null;
}

function opcionesDe(def: ControlDef): Array<{
  value: unknown;
  label: string;
  icon?: string;
  html?: string;
  description?: string;
  placeholder?: boolean;
}> {
  const attr = nombreAtributo(def.prop) ?? def.prop.replace(/^prop:/, '');
  return (def.options ?? []).map((o) => {
    const base = typeof o === 'string'
      ? { value: o, label: o }
      : {
        value: o.value,
        label: o.label,
        icon: o.icon,
        html: o.html,
        description: o.description,
        placeholder: o.placeholder,
      };
    // Completa icono si el JSON no lo trae (todos los selects del panel).
    if (!base.icon) {
      const icon = iconForSelectOption(attr, base.value);
      if (icon) base.icon = icon;
    }
    return base;
  });
}

function camelAttr(attr: string): string {
  return attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Lee el valor actual del host para un control (estado inicial del panel).
 * atributo -> getAttribute; prop existente -> propiedad; si no hay propiedad
 * en el host (componente solo-atributos) se lee el atributo reflejado.
 */
export function leerValor(el: Element, def: ControlDef): unknown {
  const attr = nombreAtributo(def.prop);
  if (attr) {
    const attrV = el.getAttribute(attr);
    // Atributos booleanos: el estado es presencia (no el string vacío).
    if (def.control === 'boolean') return attrV !== null;
    if (attrV !== null) return attrV;
    // Getter del CE (p. ej. shape → "round" aunque no haya atributo).
    const host = el as unknown as Record<string, unknown>;
    const camel = camelAttr(attr);
    if (camel in host || typeof host[camel] !== 'undefined') {
      const propV = host[camel];
      if (propV !== undefined && propV !== null && propV !== '') return propV;
    }
    return def.default ?? null;
  }
  const prop = def.prop.replace(/^prop:/, '');
  const host = el as unknown as Record<string, unknown>;
  if (prop in el || prop in host) {
    const v = host[prop];
    return v ?? def.default ?? null;
  }
  const attrV = el.getAttribute(prop);
  return attrV ?? def.default ?? null;
}

/**
 * Aplica el valor de un control al host: SIEMPRE vía JSON -> prop/attr.
 *  - attr:<name>  -> setAttribute / removeAttribute (booleans y vacíos)
 *  - prop:<name>  -> asignación de propiedad (valores complejos: objetos json)
 *  - sin prefijo   -> attr si el host no define la propiedad, si no prop
 */
export function aplicarValor(el: Element, def: ControlDef, valor: unknown): void {
  const attr = nombreAtributo(def.prop);
  if (attr) {
    if (typeof valor === 'boolean') {
      if (valor) el.setAttribute(attr, '');
      else el.removeAttribute(attr);
      return;
    }
    const v = valor == null ? '' : String(valor);
    if (v === '') el.removeAttribute(attr);
    else el.setAttribute(attr, v);
    return;
  }
  const prop = def.prop.replace(/^prop:/, '');
  const host = el as unknown as Record<string, unknown>;
  const esPropReal = prop in el || prop in host;
  if (esPropReal) {
    host[prop] = valor;
    return;
  }
  // Sin propiedad en el host: reflejar como atributo si el valor es plano.
  if (typeof valor === 'boolean') {
    if (valor) el.setAttribute(prop, '');
    else el.removeAttribute(prop);
  } else if (valor == null || valor === '') {
    el.removeAttribute(prop);
  } else {
    el.setAttribute(prop, typeof valor === 'object' ? JSON.stringify(valor) : String(valor));
  }
}

/** Resuelve las opciones para el panel (select). */
export function opcionesSelect(def: ControlDef): Array<{
  value: unknown;
  label: string;
  icon?: string;
  html?: string;
  description?: string;
  placeholder?: boolean;
}> {
  return opcionesDe(def);
}

/** Control inicial "default" resuelto (valor actual del CE o def.default). */
export function valorInicial(el: Element, def: ControlDef): unknown {
  const actual = leerValor(el, def);
  return actual ?? def.default ?? null;
}

/** Defaults de kit cuando el CE no expone getter (color/variant vía attrs). */
const DEFAULT_BY_ATTR: Record<string, string> = {
  color: DEFAULT_INTENT,
  variant: 'filled',
  type: 'button',
  placement: 'top',
  orientation: 'horizontal',
  position: 'bottom-right',
  loading: 'eager',
  fit: 'contain',
  'selection-display': 'text',
  checkmarks: 'end',
};

function opcionesValores(def: ControlDef): string[] {
  return (def.options ?? []).map((o) => String(typeof o === 'string' ? o : o.value));
}

/** Default canónico del control (JSON → getter CE → mapa kit). */
export function valorDefault(el: Element, def: ControlDef): unknown {
  if (def.default !== undefined && def.default !== null && def.default !== '') return def.default;
  const attr = nombreAtributo(def.prop) ?? def.prop.replace(/^prop:/, '');
  const host = el as unknown as Record<string, unknown>;
  const camel = camelAttr(attr);
  const propV = host[camel];
  if (propV !== undefined && propV !== null && propV !== '') return propV;

  const vals = opcionesValores(def);
  const tag = el.localName;
  if (attr === 'shape') {
    const shapeDef = (tag === 'iswc-avatar' || tag === 'iswc-theme-img')
      ? DEFAULT_MEDIA_SHAPE
      : DEFAULT_BUTTON_SHAPE;
    if (!vals.length || vals.includes(shapeDef)) return shapeDef;
  }
  if (attr === 'variant') {
    // Feedback (tag/badge) usa TONE; button usa filled/outlined/…
    const toneDef = DEFAULT_TONE;
    if (vals.includes(toneDef)) return toneDef;
    if (vals.includes('filled')) return 'filled';
  }
  const known = DEFAULT_BY_ATTR[attr];
  if (known && (!vals.length || vals.includes(known))) return known;
  return null;
}

/** Formas estructurales mínimas del definition/context (sin acoplar _kit). */
export type PreviewDefinitionShallow = { tag: string; sections?: Array<{ id?: string; blocks?: Array<Record<string, unknown>> }> };
export type PreviewMountCtxShallow = { main?: HTMLElement | null; root?: HTMLElement | null };

/**
 * Monta los paneles de controles de todos los bloques demo/html con
 * `controls` del definition, dentro de ctx.main (que la dist ya pintó).
 * Cada panel escucha `iswc-controls-change` y aplica el valor al host.
 */
export async function montarControles(definition: PreviewDefinitionShallow, ctx: PreviewMountCtxShallow): Promise<void> {
  const main = ctx.main ?? ctx.root;
  if (!main || typeof main.querySelector !== 'function') return;
  const { definePreviewControls } = await import('../../components/layout/preview-controls.js');
  definePreviewControls();

  let errores: string[] = [];
  for (const seccion of definition.sections ?? []) {
    const seccionEl = seccion.id
      ? main.querySelector<HTMLElement>(`section[id="${seccion.id}"], aside[id="${seccion.id}"]`)
      : null;
    if (!seccionEl) continue;
    const demos = [...seccionEl.querySelectorAll<HTMLElement>('.demo-block')];
    let nDemo = 0;
    for (const bloque of seccion.blocks ?? []) {
      const conControles = (bloque as Partial<BloqueConControles>);
      const defs = Array.isArray(conControles.controls) ? conControles.controls as ControlDef[] : null;
      if (!defs || defs.length === 0) continue;
      const contenedor = demos[nDemo] ?? seccionEl;
      nDemo++;
      try {
        await montarPanel(contenedor, seccionEl, defs, conControles.target ?? '', conControles.group ?? '');
      } catch (e) {
        errores.push(`${definition.tag}#${seccion.id ?? ''}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if (errores.length) {
    console.warn(`[controles] ${definition.tag}: ${errores.join(' | ')}`);
  }
}

async function montarPanel(contenedor: HTMLElement, _seccion: HTMLElement, defs: ControlDef[], targetSel: string, grupo: string): Promise<void> {
  const isDemo = contenedor.querySelector<HTMLElement>('iswc-demo');
  const raiz = (isDemo ?? contenedor) as ParentNode;
  let host: Element | null = null;
  if (targetSel) host = raiz.querySelector(targetSel);
  else {
    host = [...raiz.querySelectorAll('*')].find((el) => el.tagName.toLowerCase().startsWith('iswc-')) ?? null;
  }
  if (!host) throw new Error(`no se encontró el host de controles (target: ${targetSel || 'primer is-*'})`);
  const panel = document.createElement('iswc-preview-controls');
  panel.setAttribute('label', 'Atributos');
  const spec = defs.map((def) => {
    const d = { ...def, group: def.group ?? grupo };
    const defVal = valorDefault(host as HTMLElement, d);
    return {
      ...d,
      // El panel espera opciones {value,label[,icon]} y el valor inicial resuelto.
      options: d.control === 'select' ? opcionesSelect(d) : undefined,
      default: defVal ?? d.default,
      value: valorInicial(host as HTMLElement, d) ?? defVal,
    };
  });
  // Esperar define: asignar `spec` pre-upgrade crea data-prop que tapa el setter.
  if (!customElements.get('iswc-preview-controls')) {
    await customElements.whenDefined('iswc-preview-controls');
  }
  (panel as unknown as PanelConSpec).spec = spec;
  const ancla = isDemo ?? contenedor;
  ancla.insertAdjacentElement('afterend', panel);
  panel.addEventListener('iswc-controls-change', ((e: Event) => {
    const detalle = (e as CustomEvent<{ def: ControlDef; valor: unknown }>).detail;
    if (detalle?.def && host?.isConnected) aplicarValor(host, detalle.def, detalle.valor);
  }) as EventListener);
}
