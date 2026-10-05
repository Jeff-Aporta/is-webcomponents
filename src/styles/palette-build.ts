import palettes from './palettes.json' with { type: 'json' };
import {
  brandRampRules,
  ISWC_COLOR_VARIANTS,
  type IswcColorVariant,
} from './color-tokens.ts';
import type { PaletteConfig } from "./palette-build.schemas.js";

/** Config de una paleta: el usuario declara h, s y b. El CSS deriva la rampa. */

export const PALETTES = palettes as PaletteConfig[];

/**
 * Capa comun. Va en :root y en cada [data-palette] para que un hijo
 * con su propio h/s/b recalcule la rampa (las custom props no se reevaluan al heredar).
 * --iswc-logo-h es el tono en el que esta pintado el SVG; el filtro es la resta.
 *
 * Phase W24: la rampa de 5 variantes tonal (paler/pale/strong/stronger/strongest)
 * la genera `brandRampRules()` desde el helper canonico en color-tokens.ts.
 * Asi un refactor de tokens futuros toca UN sitio y se propaga a palettes.css,
 * a este builder, y a applyBrandVars(). Antes la rampa vivia duplicada aqui
 * y como hex fijos en palettes.css; cualquier cambio requeria editarlos a mano
 * en sincronia.
 */
const RAMP: Record<IswcColorVariant, string> = (() => {
  const out = {} as Record<IswcColorVariant, string>;
  for (const rule of brandRampRules()) {
    // rule = `  --iswc-color-brand-X: hsl(...);`
    const m = rule.match(/--iswc-color-brand-(\w+):\s*(.+);/);
    if (!m) continue;
    out[m[1] as IswcColorVariant] = m[2].trim();
  }
  // Asegura que las 5 variantes esten (defensa contra un refactor que borre alguna)
  for (const v of ISWC_COLOR_VARIANTS) {
    if (!(v in out)) {
      throw new Error(`brandRampRules() no devolvio la variante ${v}; helper roto`);
    }
  }
  return out;
})();

export const BRAND_DERIVE: Record<string, string> = {
  '--iswc-color-brand': 'hsl(calc(var(--iswc-brand-h) * 1deg) var(--iswc-brand-s) var(--iswc-brand-b))',
  '--iswc-color-brand-paler': RAMP.paler,
  '--iswc-color-brand-pale': RAMP.pale,
  '--iswc-color-brand-strong': RAMP.strong,
  '--iswc-color-brand-stronger': RAMP.stronger,
  '--iswc-color-brand-strongest': RAMP.strongest,
  '--iswc-accent': 'var(--iswc-color-brand)',
  '--iswc-accent-bg': 'rgb(from var(--iswc-accent) r g b / 12%)',
  '--iswc-brand-soft': 'rgb(from var(--iswc-accent) r g b / 18%)',
  '--iswc-brand-soft-active': 'rgb(from var(--iswc-accent) r g b / 28%)',
  '--iswc-brand-text': 'hsl(from var(--iswc-color-brand) h s 76%)',
  '--iswc-focus': 'var(--iswc-color-brand)',
  '--iswc-logo-bg': 'var(--iswc-color-brand)',
  '--iswc-logo-fg': '#fff',
  '--iswc-logo-accent': 'var(--iswc-color-brand)',
  '--iswc-hue-rotate': 'calc((var(--iswc-brand-h) - var(--iswc-logo-h)) * 1deg)',
};

export function brandDeriveCss(selector: string): string {
  const body = Object.entries(BRAND_DERIVE).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `${selector} {\n${body}\n}`;
}

export function seedCss(selector: string, p: Pick<PaletteConfig, 'h' | 's' | 'b'>): string {
  return `${selector} {\n  --iswc-brand-h: ${p.h};\n  --iswc-brand-s: ${p.s};\n  --iswc-brand-b: ${p.b};\n}`;
}

/** Pinta h/s/b y la rampa derivada en un nodo (taller, panel, chip). */
export function applyBrandVars(el: HTMLElement, p: Pick<PaletteConfig, 'h' | 's' | 'b'>): void {
  el.style.setProperty('--iswc-brand-h', String(p.h));
  el.style.setProperty('--iswc-brand-s', p.s);
  el.style.setProperty('--iswc-brand-b', p.b);
  for (const [k, v] of Object.entries(BRAND_DERIVE)) el.style.setProperty(k, v);
}

/** Arma los <li> del brand-wrap a partir del JSON de paletas. */
export function buildBrandMenu(menu: HTMLElement, list: PaletteConfig[], selected: string): void {
  menu.replaceChildren(...list.map((p) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.tabIndex = -1;
    li.dataset.palette = p.value;
    li.setAttribute('aria-selected', p.value === selected ? 'true' : 'false');
    const swatch = document.createElement('span');
    swatch.className = 'brand-menu__swatch';
    swatch.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'brand-menu__label';
    label.textContent = p.label;
    const check = document.createElement('iswc-icon');
    check.className = 'brand-menu__check';
    check.setAttribute('icon', 'mdi:check');
    check.setAttribute('aria-hidden', 'true');
    li.append(swatch, label, check);
    return li;
  }));
}
