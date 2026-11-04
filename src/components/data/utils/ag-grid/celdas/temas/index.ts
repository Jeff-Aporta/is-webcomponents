/**
 * ag-grid/celdas/temas — Presets y parametros de tema (`--iswc-grid-*`).
 *
 * Los parametros usan los nombres de AG (`accentColor`, `rowHeight`, ...). Los
 * presets fijan forma y densidad; el color sale de los tokens del kit, por eso
 * cualquier preset responde a `data-theme` y a las 25 paletas sin duplicarse.
 * Un parametro numerico son px de AG: se convierte a em relativo a la fuente del tema.
 */

import type { ModoColor, Tema } from './index.schemas.js';
import type { GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import { aEm, limpiarCss } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/celdas/html.js';
import type { MedidasTema, ParamsTema } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/celdas/schemas.js';


const TOKENS: Record<string, string> = {
  accentColor: '--iswc-grid-accent',
  backgroundColor: '--iswc-grid-bg',
  foregroundColor: '--iswc-grid-fg',
  textColor: '--iswc-grid-fg',
  cellTextColor: '--iswc-grid-cell-fg',
  borderColor: '--iswc-grid-border',
  headerBackgroundColor: '--iswc-grid-header-bg',
  headerTextColor: '--iswc-grid-header-fg',
  headerFontWeight: '--iswc-grid-header-weight',
  headerFontSize: '--iswc-grid-header-font-size',
  oddRowBackgroundColor: '--iswc-grid-stripe',
  rowHoverColor: '--iswc-grid-row-hover',
  selectedRowBackgroundColor: '--iswc-grid-selected',
  rowBorder: '--iswc-grid-row-border',
  columnBorder: '--iswc-grid-col-border',
  headerRowBorder: '--iswc-grid-header-row-border',
  wrapperBorder: '--iswc-grid-wrapper-border',
  wrapperBorderRadius: '--iswc-grid-radius',
  borderRadius: '--iswc-grid-radius-sm',
  spacing: '--iswc-grid-spacing',
  fontFamily: '--iswc-grid-font',
  fontSize: '--iswc-grid-font-size',
  rowHeight: '--iswc-grid-row-h',
  headerHeight: '--iswc-grid-header-h',
  cellHorizontalPadding: '--iswc-grid-cell-px',
  valueChangeValueHighlightBackgroundColor: '--iswc-grid-flash',
  valueChangeDeltaUpColor: '--iswc-grid-up',
  valueChangeDeltaDownColor: '--iswc-grid-down',
  tooltipBackgroundColor: '--iswc-grid-tooltip-bg',
  tooltipTextColor: '--iswc-grid-tooltip-fg',
  tooltipBorder: '--iswc-grid-tooltip-border',
  sparklineColor: '--iswc-grid-spark',
};

/** Fuente por defecto del host (.875em de 16): con ella 40 unidades dan el 2.86em de ag-grid.scss. */
const FUENTE_HOST = 14;
const LONGITUDES = new Set(['spacing', 'fontSize', 'headerFontSize', 'rowHeight', 'headerHeight', 'cellHorizontalPadding', 'wrapperBorderRadius', 'borderRadius']);

export const PRESETS: Record<string, ParamsTema> = {
  quartz: { fontSize: 14, rowHeight: 42, headerHeight: 48, cellHorizontalPadding: 16, spacing: 8, wrapperBorderRadius: 8, borderRadius: 4, headerFontWeight: 500, columnBorder: 'none' },
  balham: { fontSize: 12, rowHeight: 28, headerHeight: 32, cellHorizontalPadding: 12, spacing: 4, wrapperBorderRadius: 2, borderRadius: 2, headerFontWeight: 700, columnBorder: '.0625em solid var(--iswc-grid-border)' },
  material: { fontSize: 13, rowHeight: 48, headerHeight: 56, cellHorizontalPadding: 24, spacing: 8, wrapperBorderRadius: 0, borderRadius: 2, headerFontWeight: 500, columnBorder: 'none' },
  alpine: { fontSize: 13, rowHeight: 42, headerHeight: 48, cellHorizontalPadding: 18, spacing: 6, wrapperBorderRadius: 3, borderRadius: 3, headerFontWeight: 700, columnBorder: 'none' },
  financiero: { fontSize: 13, rowHeight: 38, headerHeight: 36, cellHorizontalPadding: 12, spacing: 6, wrapperBorderRadius: 8, borderRadius: 4, headerFontWeight: 600, columnBorder: 'none', oddRowBackgroundColor: 'transparent' },
};


function crear(nombre: string, params: ParamsTema, light: ParamsTema, dark: ParamsTema): Tema {
  return {
    nombre,
    params,
    light,
    dark,
    withParams(nuevos, modo) {
      if (modo === 'light') return crear(nombre, params, { ...light, ...nuevos }, dark);
      if (modo === 'dark') return crear(nombre, params, light, { ...dark, ...nuevos });
      return crear(nombre, { ...params, ...nuevos }, light, dark);
    },
  };
}

/** Equivale a `themeQuartz.withParams(...)`: `crearTema('quartz').withParams({ accentColor: 'red' })`. */
export function crearTema(base = 'quartz', params: ParamsTema = {}): Tema {
  return crear(base, { ...PRESETS[base], ...params }, {}, {});
}

function pxDe(valor: string | number | undefined): number | null {
  if (typeof valor === 'number') return valor;
  const px = typeof valor === 'string' ? /^(-?[\d.]+)px$/.exec(valor.trim()) : null;
  return px ? Number(px[1]) : null;
}

/** El host resuelve estas medidas dentro del contenedor con `--iswc-grid-font-size`; `fontSize` se resuelve contra el padre. */
function valorCss(nombre: string, valor: string | number, baseFuente: number): string {
  const px = LONGITUDES.has(nombre) ? pxDe(valor) : null;
  if (px != null) return nombre === 'fontSize' ? aEm(px) : aEm((px / baseFuente) * 16);
  return typeof valor === 'number' ? String(valor) : limpiarCss(valor);
}

/** Convierte parametros a tokens. Un nombre desconocido pasa como `--iswc-grid-<kebab>`. */
export function tokensDe(params: ParamsTema): Record<string, string> {
  const salida: Record<string, string> = {};
  const baseFuente = pxDe(params['fontSize']) ?? FUENTE_HOST;
  for (const [nombre, valor] of Object.entries(params)) {
    const token = TOKENS[nombre] ?? `--iswc-grid-${nombre.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    salida[token] = valorCss(nombre, valor, baseFuente);
  }
  return salida;
}

export function paramsEfectivos(tema: Tema, modo: ModoColor): ParamsTema {
  return { ...tema.params, ...tema[modo] };
}

export function medidasDe(params: ParamsTema): MedidasTema {
  return { rowHeight: pxDe(params['rowHeight']), headerHeight: pxDe(params['headerHeight']) };
}

/** `theme` admite preset, Tema o los valores auto/light/dark del atributo, que no son tema de forma. */
export function resolverTema(opcion: unknown): Tema | null {
  if (typeof opcion === 'string') return Object.hasOwn(PRESETS, opcion) ? crearTema(opcion) : null;
  if (opcion != null && typeof opcion === 'object' && 'params' in opcion) return opcion as Tema;
  return null;
}

function modoDe(el: HTMLElement): ModoColor {
  const valor = el.closest('[data-theme]')?.getAttribute('data-theme');
  if (valor === 'dark' || valor === 'light') return valor;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Aplica la opcion `theme` en linea sobre el host y sigue los cambios de opcion y de modo. */
export class AplicadorTema {
  #grid: GridHost;
  #puestos: string[] = [];
  #observador: MutationObserver | null = null;
  #tema: Tema | null = null;

  constructor(grid: GridHost) {
    this.#grid = grid;
  }

  conectar(): () => void {
    const soltar = this.#grid.alCambiarOpcion('theme', () => this.aplicar());
    this.aplicar();
    return () => {
      soltar();
      this.#observador?.disconnect();
      this.#observador = null;
    };
  }

  aplicar(): void {
    this.#tema = resolverTema(this.#grid.opcion('theme'));
    this.#pintar();
    this.#vigilarModo();
  }

  #vigilarModo(): void {
    this.#observador?.disconnect();
    this.#observador = null;
    const tema = this.#tema;
    if (!tema || (!Object.keys(tema.dark).length && !Object.keys(tema.light).length)) return;
    this.#observador = new MutationObserver(() => this.#pintar());
    const raiz = this.#grid.el.closest('[data-theme]') ?? document.documentElement;
    this.#observador.observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });
  }

  #pintar(): void {
    const el = this.#grid.el;
    for (const token of this.#puestos) el.style.removeProperty(token);
    this.#puestos = [];
    const tema = this.#tema;
    if (!tema) return;
    const params = paramsEfectivos(tema, modoDe(el));
    for (const [token, valor] of Object.entries(tokensDe(params))) {
      el.style.setProperty(token, valor);
      this.#puestos.push(token);
    }
    this.#grid.emitir('themeChanged', { ...medidasDe(params), tema: tema.nombre });
  }

  medidas(): MedidasTema {
    return this.#tema ? medidasDe(this.#tema.params) : { rowHeight: null, headerHeight: null };
  }
}
