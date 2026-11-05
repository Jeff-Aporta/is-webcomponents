/**
 * diagram-palette.ts — tema de diagrama leído de los tokens del kit. Mismos colores que las gráficas,
 * resueltos a literales porque el SVG de un diagrama se exporta y debe verse igual fuera de la página.
 * Sin tokens (headless, export en Deno) quedan los temas base de sequence-spec.
 */
import { fijarSerieColores, SERIE_HUES } from '@jeff-aporta/iswc-base/core/color.js';
import { resolveColor, seriesColor } from '@jeff-aporta/iswc-base/components/charts/utils/chart-palette.js';
import type { DiagramTheme } from '@jeff-aporta/iswc-base/components/diagrams/schemas/diagram-types.schemas.js';
import { sequenceThemeDark, sequenceThemeLight } from './sequence-spec.js';

/** Tema del diagrama `el` con la paleta activa, y las series listas para los tonos automáticos. */
export function paletteTheme(el: Element, dark: boolean): DiagramTheme {
  const base = dark ? sequenceThemeDark() : sequenceThemeLight();
  if (typeof document === 'undefined') return base;
  fijarSerieColores(SERIE_HUES.map((_h, i) => resolveColor(el, seriesColor(i), base.accent)));
  const elev = 'var(--iswc-bg-elev)';
  const mezcla = (color: string, pct: number): string => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  return {
    ...base,
    text: resolveColor(el, 'var(--iswc-text)', base.text),
    muted: resolveColor(el, 'var(--iswc-text-dim)', base.muted),
    grid: resolveColor(el, mezcla('var(--iswc-border)', 85), base.grid),
    border: resolveColor(el, 'var(--iswc-border)', base.border),
    accent: resolveColor(el, 'var(--iswc-chart-1)', base.accent),
    altFill: resolveColor(el, mezcla('var(--iswc-chart-1)', 8), base.altFill),
    altBorder: resolveColor(el, mezcla('var(--iswc-chart-1)', 55), base.altBorder),
    chipFill: resolveColor(el, mezcla(elev, 90), base.chipFill),
    chipFillSoft: resolveColor(el, mezcla(elev, 50), base.chipFillSoft),
    dotText: resolveColor(el, 'var(--iswc-chart-on-1)', base.dotText),
  };
}
