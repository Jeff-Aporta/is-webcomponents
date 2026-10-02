import palettes from './palettes.json' with { type: 'json' };

/** Config de una paleta: el usuario declara h, s y b. El CSS deriva la rampa. */
export interface PaletteConfig {
  value: string;
  label: string;
  lead: string;
  accentLabel: string;
  tail?: string;
  /** Tono 0–360. Numero pelado para poder restarlo en calc(). */
  h: number;
  /** Saturacion HSL, p. ej. "100%". */
  s: string;
  /** Brillo, expresado como luminosidad HSL porque css hsl() no tiene canal HSV. */
  b: string;
  leadColor?: string;
  accentColor?: string;
}

export const PALETTES = palettes as PaletteConfig[];

/**
 * Capa comun. Va en :root y en cada [data-palette] para que un hijo
 * con su propio h/s/b recalcule la rampa (las custom props no se reevaluan al heredar).
 * --iswc-logo-h es el tono en el que esta pintado el SVG; el filtro es la resta.
 */
export const BRAND_DERIVE: Record<string, string> = {
  '--iswc-color-brand': 'hsl(calc(var(--iswc-brand-h) * 1deg) var(--iswc-brand-s) var(--iswc-brand-b))',
  '--iswc-color-brand-strong': 'hsl(from var(--iswc-color-brand) h s calc(l * 0.88))',
  '--iswc-color-brand-stronger': 'hsl(from var(--iswc-color-brand) h s calc(l * 0.72))',
  '--iswc-color-brand-strongest': 'hsl(from var(--iswc-color-brand) h s calc(l * 0.56))',
  '--iswc-color-brand-pale': 'hsl(from var(--iswc-color-brand) h s 93%)',
  '--iswc-color-brand-paler': 'hsl(from var(--iswc-color-brand) h s 97%)',
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
