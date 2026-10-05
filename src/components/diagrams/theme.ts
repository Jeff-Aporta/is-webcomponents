// theme.ts — temas de diagrama (JSON) + json2css. Sin custom element.
//
// Uso en el kit:
//   <iswc-er-diagram theme="insoft">…</iswc-er-diagram>
//   { "erDiagram": { "theme": "insoft", "entities": […] } }
//
// Uso por CDN / Deno (vendor):
//   import { json2css, resolveErTheme, INSOFT_THEME } from '…/diagrams/theme.min.js'
//   fetch('…/diagrams/themes/insoft.json')  // fuente editable

import type { DiagramTheme } from './diagram-types.js';
import insoftJson from './themes/insoft.json' with { type: 'json' };
import type { ErThemeJson } from "./theme.schemas.js";

/** Contrato del JSON de tema ER (iswc-diagram-theme/v1). */

export const INSOFT_THEME = insoftJson as ErThemeJson;

const BUILTIN: Record<string, ErThemeJson> = {
  insoft: INSOFT_THEME,
};

/** Temas registrados en runtime (apps pueden `registerErTheme`). */
const EXTRA = new Map<string, ErThemeJson>();

export function registerErTheme(theme: ErThemeJson): void {
  if (!theme?.id) throw new TypeError('registerErTheme: theme.id required');
  EXTRA.set(theme.id, theme);
}

export function listErThemes(): string[] {
  return [...new Set([...Object.keys(BUILTIN), ...EXTRA.keys()])];
}

/**
 * Resuelve un id (`"insoft"`), un objeto tema, o null.
 * Acepta también `{ theme: "insoft" }` / payload con `erDiagram.theme`.
 */
export function resolveErTheme(input: unknown): ErThemeJson | null {
  if (input == null || input === '') return null;
  if (typeof input === 'string') {
    const id = input.trim().toLowerCase();
    return EXTRA.get(id) ?? BUILTIN[id] ?? null;
  }
  if (typeof input === 'object') {
    const o = input as Record<string, unknown>;
    // Objeto tema completo
    if (typeof o.id === 'string' && (o.entity || o.cluster || o.diagramTheme)) {
      return o as unknown as ErThemeJson;
    }
    // Payload: erDiagram.theme | componentDiagram.theme | theme
    const nested = o.erDiagram ?? o.er ?? o.componentDiagram;
    if (nested && typeof nested === 'object') {
      const t = (nested as Record<string, unknown>).theme;
      if (t != null) return resolveErTheme(t);
    }
    if (o.theme != null) return resolveErTheme(o.theme);
  }
  return null;
}

/** Fusiona `theme.light` o `theme.dark` sobre la base según el modo de página. */
export function pickThemeMode(theme: ErThemeJson, dark: boolean): ErThemeJson {
  const overlay = dark ? theme.dark : theme.light;
  if (!overlay) return theme;
  return {
    ...theme,
    ...overlay,
    font: { ...theme.font, ...overlay.font },
    canvas: { ...theme.canvas, ...overlay.canvas },
    entity: { ...theme.entity, ...overlay.entity },
    orphan: { ...theme.orphan, ...overlay.orphan },
    edge: { ...theme.edge, ...overlay.edge },
    cluster: {
      ...theme.cluster,
      ...overlay.cluster,
      palettes: { ...theme.cluster?.palettes, ...overlay.cluster?.palettes },
    },
    diagramTheme: { ...theme.diagramTheme, ...overlay.diagramTheme },
    light: theme.light,
    dark: theme.dark,
  };
}

/** DiagramTheme del motor a partir del JSON (fallback light si falta). */
export function themeToDiagramTheme(theme: ErThemeJson, fallback?: DiagramTheme): DiagramTheme {
  const base: DiagramTheme = fallback ?? {
    text: '#0F172A',
    muted: '#475569',
    grid: 'rgba(100,116,139,0.28)',
    panel: 'transparent',
    border: 'rgba(0,0,0,0.32)',
    accent: '#000000',
    altFill: 'rgba(244,182,123,0.12)',
    altBorder: '#000000',
    chipFill: '#F4B67B',
    chipFillSoft: '#FFFFFF',
    dotText: '#0F172A',
  };
  const d = theme.diagramTheme ?? {};
  const canvas = theme.canvas ?? {};
  return {
    text: d.text ?? canvas.text ?? base.text,
    muted: d.muted ?? canvas.muted ?? base.muted,
    grid: d.grid ?? base.grid,
    panel: d.panel ?? base.panel,
    border: d.border ?? base.border,
    accent: d.accent ?? base.accent,
    altFill: d.altFill ?? base.altFill,
    altBorder: d.altBorder ?? base.altBorder,
    chipFill: d.chipFill ?? theme.entity?.fill ?? base.chipFill,
    chipFillSoft: d.chipFillSoft ?? base.chipFillSoft,
    dotText: d.dotText ?? base.dotText,
  };
}

/** Fill/borde de un cluster según id (`g_oper`, `oper`, …). */
export function clusterPalette(theme: ErThemeJson, clusterId: string | null | undefined): {
  border: string;
  fill: string;
} {
  const c = theme.cluster ?? {};
  const border = c.border ?? '#000000';
  const fallback = c.fallback ?? '#7ACFF4';
  if (!clusterId) return { border, fill: fallback };
  const short = clusterId.startsWith('g_') ? clusterId.slice(2) : clusterId;
  const palettes = c.palettes ?? {};
  for (const key of Object.keys(palettes)) {
    if (short.startsWith(key)) return { border, fill: palettes[key]! };
  }
  return { border, fill: fallback };
}

/** Estilo de entidad (normal vs huérfana sin aristas). */
export function entityPaint(theme: ErThemeJson, orphan: boolean): {
  fill: string;
  headerFill: string;
  border: string;
  borderWidth: number;
  radius: number;
  separator: string;
  separatorWidth: number;
} {
  const e = theme.entity ?? {};
  const o = theme.orphan ?? {};
  return {
    fill: orphan ? (o.fill ?? '#BFFFC0') : (e.fill ?? '#F4B67B'),
    headerFill: orphan ? (o.headerFill ?? o.fill ?? '#BFFFC0') : (e.headerFill ?? e.fill ?? '#F4B67B'),
    border: orphan ? (o.border ?? e.border ?? '#000000') : (e.border ?? '#000000'),
    borderWidth: e.borderWidth ?? 1.5,
    radius: e.radius ?? 0,
    separator: e.separator ?? '#FBE2A2',
    separatorWidth: e.separatorWidth ?? 0.7,
  };
}

/** Cajas de componente (no tablas ER): paleta `component` del theme. */
export function componentBoxPaint(theme: ErThemeJson): {
  fill: string;
  headerFill: string;
  border: string;
  borderWidth: number;
  radius: number;
  lollipop: string;
  noPackageTab: boolean;
  titleBackground: boolean;
} {
  const c = theme.component ?? {};
  const e = theme.entity ?? {};
  return {
    fill: c.fill ?? '#C1BFFF',
    headerFill: c.headerFill ?? c.fill ?? '#C1BFFF',
    border: c.border ?? e.border ?? '#000000',
    borderWidth: c.borderWidth ?? e.borderWidth ?? 1.5,
    radius: c.radius ?? 0,
    lollipop: c.lollipop ?? theme.cluster?.fallback ?? '#7ACFF4',
    noPackageTab: c.noPackageTab !== false,
    titleBackground: c.titleBackground === true,
  };
}

/** Estilo de arista. */
export function edgePaint(theme: ErThemeJson): {
  stroke: string;
  strokeWidth: number;
  dasharray: string;
  labelBg: string;
  hideLabels: boolean;
} {
  const e = theme.edge ?? {};
  return {
    stroke: e.stroke ?? '#3D5A80',
    strokeWidth: e.strokeWidth ?? 1.2,
    dasharray: e.dasharray ?? '4 3',
    labelBg: e.labelBg ?? '#FFFFFF',
    hideLabels: e.hideLabels !== false,
  };
}

/**
 * json2css — convierte el JSON de tema en CSS (vars + tipografía).
 * Mantenible: editas el JSON y regeneras CSS sin tocar el CE.
 */
export function json2css(
  theme: ErThemeJson,
  opts: { selector?: string; includeImport?: boolean } = {},
): string {
  const sel = opts.selector ?? 'svg';
  const includeImport = opts.includeImport !== false;
  const lines: string[] = [];

  if (includeImport && theme.font?.import) {
    lines.push(`@import url("${theme.font.import}");`);
  }

  const vars: string[] = [];
  const push = (name: string, val: string | number | undefined | null) => {
    if (val == null || val === '') return;
    vars.push(`  --er-${name}: ${val};`);
  };

  push('font-family', theme.font?.family);
  push('bg', theme.canvas?.background);
  push('text', theme.canvas?.text ?? theme.diagramTheme?.text);
  push('muted', theme.canvas?.muted ?? theme.diagramTheme?.muted);
  push('entity-fill', theme.entity?.fill);
  push('entity-header', theme.entity?.headerFill ?? theme.entity?.fill);
  push('entity-border', theme.entity?.border);
  push('entity-border-width', theme.entity?.borderWidth);
  push('entity-radius', theme.entity?.radius);
  push('entity-separator', theme.entity?.separator);
  push('orphan-fill', theme.orphan?.fill);
  push('orphan-header', theme.orphan?.headerFill ?? theme.orphan?.fill);
  push('edge-stroke', theme.edge?.stroke);
  push('edge-width', theme.edge?.strokeWidth);
  push('edge-dash', theme.edge?.dasharray);
  push('cluster-border', theme.cluster?.border);
  push('cluster-border-width', theme.cluster?.borderWidth);
  push('cluster-fallback', theme.cluster?.fallback);

  if (theme.cluster?.palettes) {
    for (const [k, v] of Object.entries(theme.cluster.palettes)) {
      push(`cluster-${k}`, v);
    }
  }

  if (vars.length) {
    lines.push(`${sel} {`);
    lines.push(...vars);
    lines.push('}');
  }

  const family = theme.font?.family;
  if (family) {
    lines.push(`${sel} text, ${sel} .t-primary, ${sel} .t-muted { font-family: ${family}; }`);
  }

  return lines.join('\n');
}

/** Ids de entidades sin ninguna relación (from/to). */
export function findOrphanEntityIds(
  entities: ReadonlyArray<{ id: string }>,
  relations: ReadonlyArray<{ from: string; to: string }>,
): Set<string> {
  const ref = new Set<string>();
  for (const r of relations) {
    ref.add(r.from);
    ref.add(r.to);
  }
  return new Set(entities.filter((e) => !ref.has(e.id)).map((e) => e.id));
}

/**
 * Inyecta (o reemplaza) el `<style data-iswc-theme>` con el CSS del tema.
 * Útil en Deno/vendor tras exportar el SVG o al pintar en el CE.
 */
export function injectThemeCss(
  svg: SVGElement | { querySelector: (s: string) => Element | null; insertBefore: (n: Node, r: Node | null) => Node; firstChild: ChildNode | null; ownerDocument?: Document | null },
  theme: ErThemeJson,
  opts?: { includeImport?: boolean },
): void {
  const css = json2css(theme, { selector: 'svg', includeImport: opts?.includeImport });
  const doc = (svg as SVGElement).ownerDocument ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  let style = svg.querySelector(':scope > style[data-iswc-theme]') as SVGStyleElement | null;
  if (!style) {
    style = doc.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement;
    style.setAttribute('data-iswc-theme', theme.id || '1');
    svg.insertBefore(style, svg.firstChild);
  } else {
    style.setAttribute('data-iswc-theme', theme.id || '1');
  }
  style.textContent = css;
}

export { insoftJson };
