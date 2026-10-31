import palettes from './palettes.json' with { type: 'json' };
import { brandRampRules, brandFamilyBlock, ISWC_COLOR_VARIANTS } from './color-tokens.ts';
import { type IswcColorVariant } from './schemas/color-tokens.schemas.ts';
import type { ContrastFailure, PaletteConfig, PaletteFamily, PaletteSeedInput, ResolvedSurfaces, Rgb, SurfaceRecipe } from "./schemas/palette-build.schemas.js";

/**
 * palette-build.ts — fuente única de las 25 paletas del kit.
 *
 * Una paleta = sus semillas en palettes.json (h/s/b del main, tono del
 * contraste, intensidad del tinte). Todo lo demás (rampa brand, contraste,
 * bright, superficies claras/oscuras tintadas, textos) es CSS derivado con
 * `hsl()`/`color-mix()` desde esas semillas. `palettesScss()` escribe
 * palettes.scss completo (scripts/gen-palettes.mjs) y `resolvePalette()`
 * reproduce la misma matemática en JS para el contrato de contraste
 * (tests/gobernanza/palettes-contrast.test.ts y verify-theme-contract.cjs).
 */

export const PALETTES = palettes as PaletteConfig[];

/** Paleta por defecto del kit (va en :root). */
export const DEFAULT_PALETTE = 'delfin';

/** Familias de tono, en el orden en que las agrupa el selector. */
export const PALETTE_FAMILIES: { value: PaletteFamily; label: string }[] = [
  { value: 'rojos', label: 'Rojos' },
  { value: 'calidos', label: 'Naranjas y amarillos' },
  { value: 'verdes', label: 'Verdes' },
  { value: 'azules', label: 'Azules y cianes' },
  { value: 'violetas', label: 'Violetas y rosas' },
  { value: 'neutros', label: 'Neutros' },
];

const RAMP: Record<IswcColorVariant, string> = (() => {
  const out = {} as Record<IswcColorVariant, string>;
  for (const rule of brandRampRules()) {
    const m = rule.match(/--iswc-color-brand-(\w+):\s*(.+);/);
    if (!m) continue;
    out[m[1] as IswcColorVariant] = m[2].trim();
  }
  for (const v of ISWC_COLOR_VARIANTS) {
    if (!(v in out)) throw new Error(`brandRampRules() no devolvio la variante ${v}; helper roto`);
  }
  return out;
})();

/** Semillas completas (con defaults) de una paleta. */
export function paletteSeeds(p: PaletteSeedInput): Required<Pick<PaletteConfig, 'h' | 's' | 'b' | 'contrastH' | 'contrastS' | 'contrastL' | 'tint' | 'fontTint'>> {
  const tint = p.tint ?? 1;
  return {
    h: p.h,
    s: p.s,
    b: p.b,
    contrastH: p.contrastH ?? p.h,
    contrastS: p.contrastS ?? '80%',
    contrastL: p.contrastL ?? '50%',
    tint,
    fontTint: p.fontTint ?? (tint === 0 ? 0 : 1),
  };
}

/**
 * Recetas de superficie. Cada token = color-mix(in srgb, FUENTE pct*tinte, BASE).
 * FUENTE: brand (main) o bright (claro del tono). tinte: --iswc-tint (superficies)
 * o --iswc-font-tint (textos). Con tinte 0 la paleta queda en el gris neutro BASE.
 */
export const SURFACE_LIGHT: SurfaceRecipe[] = [
  { token: 'bg', from: 'bright', pct: 10, base: '#ffffff', tint: 'tint' },
  { token: 'bg-soft', from: 'bright', pct: 16, base: '#f6f8fa', tint: 'tint' },
  { token: 'bg-elev', from: 'bright', pct: 5, base: '#ffffff', tint: 'tint' },
  { token: 'border', from: 'brand', pct: 16, base: '#d0d7de', tint: 'tint' },
  { token: 'border-soft', from: 'brand', pct: 10, base: '#e1e4e8', tint: 'tint' },
  { token: 'code-bg', from: 'bright', pct: 14, base: '#f6f8fa', tint: 'tint' },
  { token: 'control-bg', from: 'bright', pct: 18, base: '#f1f3f5', tint: 'tint' },
  { token: 'control-bg-hover', from: 'bright', pct: 24, base: '#e9ecef', tint: 'tint' },
  { token: 'control-bg-active', from: 'bright', pct: 30, base: '#dee2e6', tint: 'tint' },
  { token: 'control-border', from: 'brand', pct: 22, base: '#adb5bd', tint: 'tint' },
  { token: 'text', from: 'brand', pct: 14, base: '#1f2328', tint: 'font' },
  { token: 'text-soft', from: 'brand', pct: 14, base: '#4a525c', tint: 'font' },
  { token: 'text-dim', from: 'brand', pct: 12, base: '#5a636e', tint: 'font' },
  { token: 'control-text', from: 'brand', pct: 12, base: '#212529', tint: 'font' },
  { token: 'code-text', from: 'brand', pct: 14, base: '#1f2328', tint: 'font' },
];

export const SURFACE_DARK: SurfaceRecipe[] = [
  { token: 'bg', from: 'brand', pct: 12, base: '#07090c', tint: 'tint' },
  { token: 'bg-soft', from: 'brand', pct: 15, base: '#0e1116', tint: 'tint' },
  { token: 'bg-elev', from: 'brand', pct: 18, base: '#151a20', tint: 'tint' },
  { token: 'border', from: 'brand', pct: 24, base: '#262c34', tint: 'tint' },
  { token: 'border-soft', from: 'brand', pct: 18, base: '#1b2027', tint: 'tint' },
  { token: 'code-bg', from: 'brand', pct: 10, base: '#0a0c10', tint: 'tint' },
  { token: 'control-bg', from: 'brand', pct: 16, base: '#1c2128', tint: 'tint' },
  { token: 'control-bg-hover', from: 'brand', pct: 20, base: '#272d35', tint: 'tint' },
  { token: 'control-bg-active', from: 'brand', pct: 24, base: '#323942', tint: 'tint' },
  { token: 'control-border', from: 'brand', pct: 30, base: '#535b65', tint: 'tint' },
  { token: 'text', from: 'bright', pct: 10, base: '#eceef1', tint: 'font' },
  { token: 'text-soft', from: 'bright', pct: 14, base: '#aeb5bf', tint: 'font' },
  { token: 'text-dim', from: 'bright', pct: 14, base: '#969fa9', tint: 'font' },
  { token: 'control-text', from: 'bright', pct: 8, base: '#f0f3f6', tint: 'font' },
  { token: 'code-text', from: 'bright', pct: 10, base: '#d4d8de', tint: 'font' },
];

function recipeCss(r: SurfaceRecipe): string {
  const knob = r.tint === 'font' ? '--iswc-font-tint' : '--iswc-tint';
  return `color-mix(in srgb, var(--iswc-color-${r.from}) calc(var(${knob}) * ${r.pct}%), ${r.base})`;
}

/** Derivadas de marca que un nodo con h/s/b recalcula (applyBrandVars las pinta en JS). */
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
  '--iswc-on-brand': 'oklch(from var(--iswc-color-brand-strong) clamp(0, calc((var(--iswc-bg2font-umbral, 0.65) - l) * 1000), 1) 0 0)',
  '--iswc-logo-fg': 'var(--iswc-on-brand)',
  '--iswc-logo-accent': 'var(--iswc-color-brand)',
  '--iswc-hue-rotate': 'calc((var(--iswc-brand-h) - var(--iswc-logo-h)) * 1deg)',
  '--iswc-color-contrast': 'hsl(calc(var(--iswc-contrast-h) * 1deg) var(--iswc-contrast-s) var(--iswc-contrast-l))',
  '--iswc-color-contrast-pale': 'hsl(from var(--iswc-color-contrast) h s 93%)',
  '--iswc-color-contrast-strong': 'hsl(from var(--iswc-color-contrast) h s calc(l * 0.72))',
  '--iswc-contrast-soft': 'rgb(from var(--iswc-color-contrast) r g b / 16%)',
  '--iswc-contrast-text': 'hsl(from var(--iswc-color-contrast) h s 72%)',
  '--iswc-color-bright': 'hsl(calc(var(--iswc-brand-h) * 1deg) min(100%, calc(var(--iswc-brand-s) * 1.6)) 70%)',
};

/** Superficies claras (--iswc-sl-*) y oscuras (--iswc-sd-*) de la paleta: las dos siempre calculadas. */
export const SURFACE_DERIVE: Record<string, string> = Object.fromEntries([
  ...SURFACE_LIGHT.map((r) => [`--iswc-sl-${r.token}`, recipeCss(r)]),
  ...SURFACE_DARK.map((r) => [`--iswc-sd-${r.token}`, recipeCss(r)]),
]);

export function brandDeriveCss(selector: string): string {
  const body = Object.entries(BRAND_DERIVE).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `${selector} {\n${body}\n}`;
}

export function seedCss(selector: string, p: PaletteSeedInput): string {
  const s = paletteSeeds(p);
  const lines = [
    `  --iswc-brand-h: ${s.h};`,
    `  --iswc-brand-s: ${s.s};`,
    `  --iswc-brand-b: ${s.b};`,
    `  --iswc-contrast-h: ${s.contrastH};`,
    `  --iswc-contrast-s: ${s.contrastS};`,
    `  --iswc-contrast-l: ${s.contrastL};`,
    `  --iswc-tint: ${s.tint};`,
    `  --iswc-font-tint: ${s.fontTint};`,
  ];
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/** Pinta las semillas y las derivadas en un nodo (muestras del selector, taller). */
export function applyBrandVars(el: HTMLElement, p: PaletteSeedInput): void {
  const s = paletteSeeds(p);
  el.style.setProperty('--iswc-brand-h', String(s.h));
  el.style.setProperty('--iswc-brand-s', s.s);
  el.style.setProperty('--iswc-brand-b', s.b);
  el.style.setProperty('--iswc-contrast-h', String(s.contrastH));
  el.style.setProperty('--iswc-contrast-s', s.contrastS);
  el.style.setProperty('--iswc-contrast-l', s.contrastL);
  el.style.setProperty('--iswc-tint', String(s.tint));
  el.style.setProperty('--iswc-font-tint', String(s.fontTint));
  for (const [k, v] of Object.entries(BRAND_DERIVE)) el.style.setProperty(k, v);
  for (const [k, v] of Object.entries(SURFACE_DERIVE)) el.style.setProperty(k, v);
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

// ─── Matemática de color (espejo JS del CSS, para el contrato de contraste) ──

function pct(v: string): number { return parseFloat(v) / 100; }

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = Math.min(1, Math.max(0, s));
  const lig = Math.min(1, Math.max(0, l));
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hex(v: string): Rgb {
  const m = v.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function mix(a: Rgb, p: number, b: Rgb): Rgb {
  const t = Math.min(1, Math.max(0, p));
  return [a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), a[2] * t + b[2] * (1 - t)];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function toHex(c: Rgb): string {
  return '#' + c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('');
}

/** Corte de bg2font (espejo del default de `--iswc-bg2font-umbral`). */
const BG2FONT_UMBRAL = 0.65;

/** Luminosidad L de oklch (0-1). */
function oklchL([r, g, b]: Rgb): number {
  const lin = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/** Tono de `--iswc-color-brand-strong`: el fondo de los controles filled. */
const brandStrongOf = (h: number, s: string, b: string): Rgb => hslToRgb(h, pct(s), pct(b) * 0.88);

/** Texto sobre brand-strong (espejo de bg2font): blanco por debajo del umbral, negro por encima. */
export function onBrandOf(p: PaletteSeedInput): string {
  return oklchL(brandStrongOf(p.h, p.s, p.b)) < BG2FONT_UMBRAL ? '#fff' : '#000';
}

/** Colores resueltos de una paleta en un juego de superficies ('light' = sl, 'dark' = sd). */
export function resolvePalette(p: PaletteConfig, set: 'light' | 'dark'): ResolvedSurfaces {
  const s = paletteSeeds(p);
  const brand = hslToRgb(s.h, pct(s.s), pct(s.b));
  const bright = hslToRgb(s.h, pct(s.s) * 1.6, 0.7);
  const contrast = hslToRgb(s.contrastH, pct(s.contrastS), pct(s.contrastL));
  const src = { brand, bright };
  const out: ResolvedSurfaces = { brand, bright, contrast };
  for (const r of set === 'light' ? SURFACE_LIGHT : SURFACE_DARK) {
    const k = r.tint === 'font' ? s.fontTint : s.tint;
    out[r.token] = mix(src[r.from], (k * r.pct) / 100, hex(r.base));
  }
  const [bh, bs, bl] = rgbToHsl(brand);
  const [ch, cs] = rgbToHsl(contrast);
  if (set === 'dark') {
    out['brand-text'] = hslToRgb(bh, bs, 0.76);
    out['contrast-text'] = hslToRgb(ch, cs, 0.72);
  } else {
    out['brand-text'] = mix(brand, 0.45, [0, 0, 0]);
    out['contrast-text'] = mix(contrast, 0.45, [0, 0, 0]);
  }
  void bl;
  const ob = onBrandOf(p);
  out['on-brand'] = ob === '#fff' ? [255, 255, 255] : [0, 0, 0];
  out['brand-strong'] = brandStrongOf(s.h, s.s, s.b);
  return out;
}

/** Pares del contrato: [texto, fondo, mínimo]. */
export const CONTRAST_PAIRS: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'bg-soft', 4.5],
  ['text', 'bg-elev', 4.5],
  ['text', 'control-bg', 4.5],
  ['text-soft', 'bg', 4.5],
  ['text-soft', 'bg-elev', 4.5],
  ['text-dim', 'bg', 4.5],
  ['text-dim', 'bg-elev', 4.5],
  ['control-text', 'control-bg', 4.5],
  ['control-text', 'control-bg-hover', 4.5],
  ['code-text', 'code-bg', 4.5],
  ['brand-text', 'bg', 4.5],
  ['contrast-text', 'bg', 4.5],
  ['on-brand', 'brand-strong', 3],
];

/**
 * Contrato de contraste: 25 paletas × claro/oscuro. Panda solo cambia el fondo de
 * la página, así que superficies y textos se validan contra el juego del tema.
 */
export function checkPaletteContrast(list: PaletteConfig[] = PALETTES): { checked: number; failures: ContrastFailure[] } {
  const failures: ContrastFailure[] = [];
  let checked = 0;
  for (const p of list) {
    for (const theme of ['light', 'dark'] as const) {
      const c = resolvePalette(p, theme);
      for (const [fg, bg, min] of CONTRAST_PAIRS) {
        checked++;
        const ratio = contrastRatio(c[fg], c[bg]);
        if (ratio < min) failures.push({ palette: p.value, theme, panda: false, fg, bg, ratio: Math.round(ratio * 100) / 100, min });
      }
    }
  }
  return { checked, failures };
}

// ─── Generador de palettes.scss ─────────────────────────────────────────────

const APPLY_TOKENS = [...SURFACE_LIGHT.map((r) => r.token)];

function applyBlock(selector: string, set: 'sl' | 'sd', scheme: 'light' | 'dark'): string {
  const lines = [`  color-scheme: ${scheme};`, '  --iswc-bg-page: var(--iswc-bg);', '  --iswc-text-page: var(--iswc-text);', '  --iswc-text-page-soft: var(--iswc-text-soft);', '  --iswc-text-page-dim: var(--iswc-text-dim);', ...APPLY_TOKENS.map((t) => `  --iswc-${t}: var(--iswc-${set}-${t});`)];
  if (scheme === 'light') {
    lines.push(
      '  --iswc-shadow: 0 1px 0 rgb(0 0 0 / 4%), 0 8px 24px color-mix(in srgb, var(--iswc-color-brand) calc(var(--iswc-tint) * 6%), rgb(0 0 0 / 6%));',
      '  --iswc-brand-text: color-mix(in srgb, var(--iswc-color-brand) 45%, black);',
      '  --iswc-brand-soft: var(--iswc-color-brand-paler);',
      '  --iswc-brand-soft-active: var(--iswc-color-brand-pale);',
      '  --iswc-contrast-text: color-mix(in srgb, var(--iswc-color-contrast) 45%, black);',
    );
  } else {
    lines.push(
      '  --iswc-shadow: 0 1px 0 rgb(255 255 255 / 3%), 0 8px 24px color-mix(in srgb, var(--iswc-color-brand) calc(var(--iswc-tint) * 12%), rgb(0 0 0 / 30%));',
      '  --iswc-brand-text: hsl(from var(--iswc-color-brand) h s 76%);',
      '  --iswc-brand-soft: rgb(from var(--iswc-accent) r g b / 18%);',
      '  --iswc-brand-soft-active: rgb(from var(--iswc-accent) r g b / 28%);',
      '  --iswc-contrast-text: hsl(from var(--iswc-color-contrast) h s 72%);',
    );
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/** palettes.scss completo, derivado de palettes.json. */
export function palettesScss(list: PaletteConfig[] = PALETTES): string {
  const def = list.find((p) => p.value === DEFAULT_PALETTE) ?? list[0];
  const header = `/* palettes.css — las ${list.length} paletas del kit + modificador Panda.
 *
 * GENERADO por scripts/gen-palettes.mjs desde src/styles/palettes.json
 * (palettesScss() en palette-build.ts). No lo edites a mano: cambia el JSON
 * o las recetas y regenera; el guardian palettes-contrast lo compara.
 *
 *   <link rel="stylesheet" href=".../is-base.min.css">
 *   <link rel="stylesheet" href=".../palettes.min.css">
 *   <html data-theme="dark" data-palette="turquesa" data-panda>
 *
 * Cada [data-palette] SOLO declara semillas:
 *   --iswc-brand-h/s/b        main (botones, foco, acentos)
 *   --iswc-contrast-h/s/l     acento secundario mas vivo (camaleon: hsl(h 80% 50%))
 *   --iswc-tint               intensidad del tinte de superficies (0 = neutras)
 *   --iswc-font-tint          intensidad del tinte de los textos
 *   --iswc-on-brand           texto sobre el main: bg2font (blanco o negro según L de oklch)
 *
 * La capa comun deriva la rampa brand, --iswc-color-contrast (+pale/strong),
 * --iswc-color-bright (hsl(h 100% 70%)), y DOS juegos de superficies:
 *   --iswc-sl-*  claras: bright mezclado hacia blanco (fondo 10%, papel 5%)
 *   --iswc-sd-*  oscuras: main mezclado hacia negro
 * El tema elige el juego; data-panda solo invierte --iswc-bg-page (el fondo de la página).
 * Default palette = ${def.value}, en :root.
 *
 * Brand es la 7a familia del helper canonico (color-tokens.ts); sus lineas
 * DEBEN coincidir con brandFamilyBlock() (guardian w24-color-tokens-helper).
 */`;

  const familyLines = brandFamilyBlock(':root, [data-palette]').split('\n').slice(1, -1);
  const common = [
    ':root,',
    '[data-palette] {',
    ...familyLines,
    ...Object.entries(BRAND_DERIVE).filter(([k]) => !k.startsWith('--iswc-color-brand')).map(([k, v]) => `  ${k}: ${v};`),
    '  /* Tono en el que estan pintados los SVG. La paleta solo mueve --iswc-brand-h. */',
    '  --iswc-logo-h: 210;',
    ...Object.entries(SURFACE_DERIVE).map(([k, v]) => `  ${k}: ${v};`),
    '',
    '  --iswc-color-info-paler: #e7f5ff;',
    '  --iswc-color-info-pale: #d0ebff;',
    '  --iswc-color-info: #228be6;',
    '  --iswc-color-info-strong: #1c7ed6;',
    '  --iswc-color-info-stronger: #1864ab;',
    '  --iswc-color-info-strongest: #145591;',
    '',
    '  --iswc-radius: 0.5em;',
    '  --iswc-radius-sm: 0.25em;',
    '}',
  ].join('\n');

  const seeds = list.map((p) => {
    const sel = p.value === def.value ? `:root,\n[data-palette="${p.value}"]` : `[data-palette="${p.value}"]`;
    return `/* ${p.label} · ${p.origin} — ${p.mood} */\n${seedCss(sel, p)}`;
  }).join('\n\n');

  const apply = [
    '/* ─── Tema → juego de superficies; data-panda solo invierte la página ── */',
    '/* Solo el nodo con data-theme (html o contenedor scoped); nunca :not([data-theme]) suelto. */',
    applyBlock('[data-theme="light"]', 'sl', 'light'),
    '',
    applyBlock('[data-theme="dark"]', 'sd', 'dark'),
    '',
    '[data-theme="light"][data-panda] { --iswc-bg-page: var(--iswc-sd-bg); --iswc-text-page: var(--iswc-sd-text); --iswc-text-page-soft: var(--iswc-sd-text-soft); --iswc-text-page-dim: var(--iswc-sd-text-dim); }',
    '[data-theme="dark"][data-panda] { --iswc-bg-page: var(--iswc-sl-bg); --iswc-text-page: var(--iswc-sl-text); --iswc-text-page-soft: var(--iswc-sl-text-soft); --iswc-text-page-dim: var(--iswc-sl-text-dim); }',
  ].join('\n');

  return `${header}\n\n/* ─── Capa comun: semillas → rampa, contraste, bright y superficies ─── */\n\n${common}\n\n/* ─── Semillas por paleta ───────────────────────────────────────────── */\n\n${seeds}\n\n${apply}\n`;
}
