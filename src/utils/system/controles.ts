// controles.ts: sistema de controles de demo (playground tipo Storybook),
// 100% JSON-driven. Los controles se declaran en el preview JSON del
// componente (is-preview/v1, bloque demo/html -> `controls` + `target`) y se
// aplican SIEMPRE vía JSON -> prop/attr del componente. Nunca otro sistema.
//
// El panel lo pinta <is-preview-controls> (components/layout); este módulo
// monta los paneles por demo, escucha sus cambios y aplica el valor al host.

/** Tipos de control soportados por el panel. */
export type TipoControl = 'text' | 'color' | 'number' | 'select' | 'boolean' | 'range' | 'json';

/** Opción de un select: valor plano o {value,label}. */
export type OpcionSelect = string | { value: string | number | boolean; label: string };

/** Definición JSON de un control (espejo de controls.schema.json). */
export interface ControlDef {
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
}

/** `controls` que puede declarar un bloque demo/html del preview. */
export interface ControlesDeDemo {
  /** Selector CSS del host dentro del demo (default: primer is-* del demo). */
  target?: string;
  /** Grupo por defecto de todos los controles del bloque. */
  group?: string;
  controls: ControlDef[];
}

/** Bloque de preview que puede llevar controles (kind demo|html). */
export type BloqueConControles = { kind: 'demo' | 'html'; html?: string } & ControlesDeDemo;

function esAttr(prop: string): boolean {
  return prop.startsWith('attr:');
}

/** Nombre del atributo (si prop va con prefijo attr:). */
export function nombreAtributo(prop: string): string | null {
  return esAttr(prop) ? prop.slice(5) : null;
}

function opcionesDe(def: ControlDef): Array<{ value: unknown; label: string }> {
  return (def.options ?? []).map((o) => (
    typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label }
  ));
}

/**
 * Lee el valor actual del host para un control (estado inicial del panel).
 * atributo -> getAttribute; prop existente -> propiedad; si no hay propiedad
 * en el host (componente solo-atributos) se lee el atributo reflejado.
 */
export function leerValor(el: Element, def: ControlDef): unknown {
  const attr = nombreAtributo(def.prop);
  if (attr) return el.getAttribute(attr);
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
export function opcionesSelect(def: ControlDef): Array<{ value: unknown; label: string }> {
  return opcionesDe(def);
}

/** Control inicial "default" resuelto (def.default ?? valor actual). */
export function valorInicial(el: Element, def: ControlDef): unknown {
  const actual = leerValor(el, def);
  return actual ?? def.default ?? null;
}

/** Formas estructurales mínimas del definition/context (sin acoplar _kit). */
export interface PreviewDefinitionShallow {
  tag: string;
  sections?: Array<{ id?: string; blocks?: Array<Record<string, unknown>> }>;
}
export interface PreviewMountCtxShallow {
  main?: HTMLElement | null;
  root?: HTMLElement | null;
}

/**
 * Monta los paneles de controles de todos los bloques demo/html con
 * `controls` del definition, dentro de ctx.main (que la dist ya pintó).
 * Cada panel escucha `is-controls-change` y aplica el valor al host.
 */
export async function montarControles(
  definition: PreviewDefinitionShallow,
  ctx: PreviewMountCtxShallow,
): Promise<void> {
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

async function montarPanel(
  contenedor: HTMLElement,
  _seccion: HTMLElement,
  defs: ControlDef[],
  targetSel: string,
  grupo: string,
): Promise<void> {
  const isDemo = contenedor.querySelector<HTMLElement>('is-demo');
  const raiz = (isDemo ?? contenedor) as ParentNode;
  let host: Element | null = null;
  if (targetSel) host = raiz.querySelector(targetSel);
  else {
    host = [...raiz.querySelectorAll('*')].find((el) => el.tagName.toLowerCase().startsWith('is-')) ?? null;
  }
  if (!host) throw new Error(`no se encontró el host de controles (target: ${targetSel || 'primer is-*'})`);
  const panel = document.createElement('is-preview-controls');
  panel.setAttribute('label', 'Controles');
  const spec = defs.map((def) => {
    const d = { ...def, group: def.group ?? grupo };
    return {
      ...d,
      // El panel espera opciones {value,label} y el valor inicial resuelto.
      options: d.control === 'select' ? opcionesSelect(d) : undefined,
      value: valorInicial(host as HTMLElement, d),
    };
  });
  (panel as unknown as { spec: unknown[] }).spec = spec;
  const ancla = isDemo ?? contenedor;
  ancla.insertAdjacentElement('afterend', panel);
  panel.addEventListener('is-controls-change', ((e: Event) => {
    const detalle = (e as CustomEvent<{ def: ControlDef; valor: unknown }>).detail;
    if (detalle?.def && host?.isConnected) aplicarValor(host, detalle.def, detalle.valor);
  }) as EventListener);
}
