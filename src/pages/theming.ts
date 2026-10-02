/**
 * Behavior del taller de Personalización.
 *
 * Persistencia:
 *   - localStorage `is-wc-theming-seeds`: nombre + seeds de los inputs (F5 los
 *     conserva).
 *   - "Aplicar a toda la página" es SOLO de sesión: no se guarda; F5 limpia
 *     los --iswc-* inline del <html> y deja el switch en off.
 *   - "Restaurar defaults" borra el LS y vuelve a DEFAULTS.
 */
import type {
  PreviewMountContext,
  ISComponentPreviewLike,
} from '../previews/_kit/types.d.ts';
import { BRAND_DERIVE, applyBrandVars, seedCss } from '../styles/palette-build.js';

/** Tripleta RGB lineal (0..1). */
type Rgb = [number, number, number];
/** Tripleta OKLab (L, a, b). */
type Oklab = [number, number, number];

interface Seed {
  brand: string;
  darkBg: string;
  darkText: string;
  lightBg: string;
  lightText: string;
}
interface OklchTriplet { l: number; c: number; h: number }
interface PersistedData { name: string; seeds: Seed }

type TokenMap = Record<string, string>;

interface BuildTokensResult {
  marca: TokenMap;
  dark: TokenMap;
  light: TokenMap;
  hsb: { h: number; s: string; b: string };
}

/** Editor de color (is-color-picker o <input type="color">). */
type ColorPicker = HTMLElement & { value: string };

/** Editor de texto / nombre. */
type TextEditor = HTMLElement & { value: string };

/** Toggle / checkbox (Aplicar a toda la página). */
type CheckboxEl = HTMLElement & { checked: boolean };

export async function mount(ctx: PreviewMountContext, preview: ISComponentPreviewLike): Promise<void> {
  const root = ctx.main;
  const signal = preview.signal;
  const opts = signal ? { signal } : undefined;

  const LS_KEY = 'is-wc-theming-seeds';

  const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

  function hexToRgb(hex: string): Rgb {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) h = '808080';
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }
  function hexToHsb(hex: string): { h: number; s: string; b: string } {
    const [r, g, b] = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let hue = 0;
    let sat = 0;
    if (max !== min) {
      const d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hue *= 60;
    }
    return { h: Math.round(hue), s: `${Math.round(sat * 100)}%`, b: `${Math.round(l * 100)}%` };
  }
  const toHex2 = (n: number): string => Math.round(clamp01(n) * 255).toString(16).padStart(2, '0');
  const rgbToHex = ([r, g, b]: Rgb): string => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;

  const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const unlin = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function rgbToOklab([r0, g0, b0]: Rgb): Oklab {
    const r = lin(r0); const g = lin(g0); const b = lin(b0);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    ];
  }

  function oklabToRgb([L, a, bb]: Oklab): Rgb {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * bb;
    const l = l_ ** 3; const m = m_ ** 3; const s = s_ ** 3;
    return [
      unlin(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      unlin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      unlin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    ].map(clamp01) as Rgb;
  }

  function toOklch(hex: string): OklchTriplet {
    const [L, a, b] = rgbToOklab(hexToRgb(hex));
    return { l: L, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
  }

  function fromOklch({ l, c, h }: OklchTriplet): string {
    const rad = (h * Math.PI) / 180;
    let cc = Math.max(0, c);
    for (let i = 0; i < 24; i += 1) {
      const [r, g, b] = oklabToRgb([clamp01(l), cc * Math.cos(rad), cc * Math.sin(rad)]);
      if ([r, g, b].every((v: number) => v > 0.0005 && v < 0.9995) || cc < 0.002) break;
      cc *= 0.94;
    }
    return rgbToHex(oklabToRgb([clamp01(l), cc * Math.cos(rad), cc * Math.sin(rad)]));
  }

  const surface = (baseHex: string, dl: number, brandHue: number, tint: number): string => {
    const o = toOklch(baseHex);
    return fromOklch({
      l: clamp01(o.l + dl),
      c: Math.max(o.c, tint),
      h: o.c > 0.01 ? o.h : brandHue,
    });
  };

  const mix = (aHex: string, bHex: string, t: number): string => {
    const A = rgbToOklab(hexToRgb(aHex));
    const B = rgbToOklab(hexToRgb(bHex));
    const mixed: Rgb = A.map((v, i) => v + ((B[i] ?? 0) - v) * t) as Rgb;
    return rgbToHex(oklabToRgb(mixed));
  };

  const alpha = (hex: string, pct: number): string => {
    const [r, g, b] = hexToRgb(hex).map((v: number) => Math.round(v * 255));
    return `rgb(${r} ${g} ${b} / ${pct}%)`;
  };

  /** Rampa semantica. El color lo calcula BRAND_DERIVE, no un hex. */
  const RAMP_STEPS: { label: string; token: string }[] = [
    { label: 'brand-paler', token: '--iswc-color-brand-paler' },
    { label: 'brand-pale', token: '--iswc-color-brand-pale' },
    { label: 'brand', token: '--iswc-color-brand' },
    { label: 'brand-strong', token: '--iswc-color-brand-strong' },
    { label: 'brand-stronger', token: '--iswc-color-brand-stronger' },
    { label: 'brand-strongest', token: '--iswc-color-brand-strongest' },
  ];

  function buildTokens(seed: Seed): BuildTokensResult {
    const b = toOklch(seed.brand);
    const hsb = hexToHsb(seed.brand);
    const marca: TokenMap = {
      '--iswc-brand-h': String(hsb.h),
      '--iswc-brand-s': hsb.s,
      '--iswc-brand-b': hsb.b,
      ...BRAND_DERIVE,
      '--iswc-on-brand': b.l > 0.72 ? '#111111' : '#ffffff',
    };

    const tint = Math.min(b.c * 0.22, 0.016);

    const dark: TokenMap = {
      '--iswc-bg': rgbToHex(hexToRgb(seed.darkBg)),
      '--iswc-bg-soft': surface(seed.darkBg, 0.035, b.h, tint),
      '--iswc-bg-elev': surface(seed.darkBg, 0.065, b.h, tint),
      '--iswc-code-bg': surface(seed.darkBg, 0.012, b.h, tint),
      '--iswc-border': surface(seed.darkBg, 0.145, b.h, tint),
      '--iswc-border-soft': surface(seed.darkBg, 0.090, b.h, tint),
      '--iswc-control-bg': surface(seed.darkBg, 0.075, b.h, tint),
      '--iswc-control-bg-hover': surface(seed.darkBg, 0.120, b.h, tint),
      '--iswc-control-bg-active': surface(seed.darkBg, 0.170, b.h, tint),
      '--iswc-control-border': surface(seed.darkBg, 0.300, b.h, tint),
      '--iswc-text': rgbToHex(hexToRgb(seed.darkText)),
      '--iswc-text-soft': mix(seed.darkText, seed.darkBg, 0.28),
      '--iswc-text-dim': mix(seed.darkText, seed.darkBg, 0.45),
      '--iswc-control-text': rgbToHex(hexToRgb(seed.darkText)),
      '--iswc-code-text': mix(seed.darkText, seed.darkBg, 0.10),
      '--iswc-b-required': mix(seed.darkText, seed.darkBg, 0.40),
      '--iswc-b-optional': '#80c080',
      '--iswc-b-readonly': alpha(seed.darkText, 18),
      '--iswc-bg-readonly': surface(seed.darkBg, 0.050, b.h, tint),
      '--iswc-shadow': '0 1px 0 rgb(255 255 255 / 3%), 0 8px 24px rgb(0 0 0 / 25%)',
    };

    const light: TokenMap = {
      '--iswc-bg': rgbToHex(hexToRgb(seed.lightBg)),
      '--iswc-bg-soft': surface(seed.lightBg, -0.022, b.h, tint),
      '--iswc-bg-elev': surface(seed.lightBg, 0.008, b.h, tint),
      '--iswc-code-bg': surface(seed.lightBg, -0.026, b.h, tint),
      '--iswc-border': surface(seed.lightBg, -0.155, b.h, tint),
      '--iswc-border-soft': surface(seed.lightBg, -0.085, b.h, tint),
      '--iswc-control-bg': surface(seed.lightBg, -0.040, b.h, tint),
      '--iswc-control-bg-hover': surface(seed.lightBg, -0.070, b.h, tint),
      '--iswc-control-bg-active': surface(seed.lightBg, -0.110, b.h, tint),
      '--iswc-control-border': surface(seed.lightBg, -0.300, b.h, tint),
      '--iswc-text': rgbToHex(hexToRgb(seed.lightText)),
      '--iswc-text-soft': mix(seed.lightText, seed.lightBg, 0.28),
      '--iswc-text-dim': mix(seed.lightText, seed.lightBg, 0.45),
      '--iswc-control-text': rgbToHex(hexToRgb(seed.lightText)),
      '--iswc-code-text': rgbToHex(hexToRgb(seed.lightText)),
      '--iswc-brand-soft': 'var(--iswc-color-brand-paler)',
      '--iswc-brand-soft-active': 'var(--iswc-color-brand-pale)',
      '--iswc-brand-text': 'var(--iswc-color-brand-stronger)',
      '--iswc-focus': 'var(--iswc-color-brand)',
      '--iswc-b-required': mix(seed.lightText, seed.lightBg, 0.42),
      '--iswc-b-optional': '#80c080',
      '--iswc-b-readonly': alpha(seed.lightText, 25),
      '--iswc-bg-readonly': surface(seed.lightBg, -0.030, b.h, tint),
      '--iswc-shadow': '0 1px 0 rgb(0 0 0 / 4%), 0 8px 24px rgb(0 0 0 / 6%)',
    };

    return { marca, dark, light, hsb };
  }

  const block = (sel: string, obj: TokenMap): string => {
    const body = Object.entries(obj).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    return `${sel} {\n${body}\n}`;
  };

  function buildCss(name: string, t: BuildTokensResult): string {
    const safe = name || 'mi-marca';
    return `/* ${safe}.css — paleta generada. Solo se declara h, s y b.
 * La rampa (--iswc-color-brand y los alpha) se calcula en el mismo bloque.
 *
 *   class="theme-dark" data-theme="dark" data-palette="${safe}"
 *
 * Logo: filter: hue-rotate(var(--iswc-hue-rotate));
 * --iswc-logo-h es el tono en el que esta pintado el SVG (default 210).
 */

/* ─── Marca (ambos temas) ─────────────────────────────────────────── */
${block(`[data-palette="${safe}"]`, t.marca)}

/* ─── Superficies por tema ─────────────────────────────────────────── */
${block(`.theme-dark[data-palette="${safe}"]`, t.dark)}

${block(`.theme-light[data-palette="${safe}"]`, t.light)}
`;
  }

  const DEFAULTS: Seed = {
    brand: '#7048e8',
    darkBg: '#0b0d10',
    darkText: '#e6e8eb',
    lightBg: '#ffffff',
    lightText: '#1f2328',
  };
  const DEFAULT_NAME = 'mi-marca';

  const pickers = [...root.querySelectorAll<ColorPicker>('.tw-seed')];
  const nameInput = root.querySelector<TextEditor>('#palName');
  const panels = [...root.querySelectorAll<HTMLElement>('.tw-panel')];
  const rampEl = root.querySelector<HTMLElement>('#ramp');
  const tagName = root.querySelector<HTMLElement>('#tagName');
  const fileName = root.querySelector<HTMLElement>('#fileName');
  const applyRoot = root.querySelector<CheckboxEl>('#applyRoot');
  const labels: { dark: HTMLElement | null; light: HTMLElement | null } = {
    dark: root.querySelector<HTMLElement>('#darkBgLabel'),
    light: root.querySelector<HTMLElement>('#lightBgLabel'),
  };

  const tpl = root.querySelector<HTMLTemplateElement>('#tplPanel');
  if (tpl) {
    for (const p of panels) {
      p.querySelector<HTMLElement>('[data-panel-body]')?.append(tpl.content.cloneNode(true));
    }
  }

  const readSeeds = (): Seed => {
    const s: Seed = { ...DEFAULTS };
    for (const p of pickers) {
      const key = p.dataset.seed;
      if (!key) continue;
      const fallback = DEFAULTS[key as keyof Seed];
      const v = p.value || fallback;
      (s as unknown as Record<string, string>)[key] = v;
    }
    return s;
  };

  const persistSeeds = (): void => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        name: (nameInput?.value || DEFAULT_NAME).trim() || DEFAULT_NAME,
        seeds: readSeeds(),
      }));
    } catch { /* quota / private */ }
  };

  const loadPersisted = (): PersistedData | null => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedData;
    } catch {
      return null;
    }
  };

  const applyPersistedToInputs = (data: PersistedData | null): void => {
    if (!data) return;
    if (nameInput && data.name) nameInput.value = data.name;
    const seeds = data.seeds ?? {};
    for (const p of pickers) {
      const key = p.dataset.seed;
      if (!key) continue;
      const v = (seeds as unknown as Record<string, string | undefined>)[key];
      if (v) p.value = v;
    }
  };

  let lastCss = '';
  let lastJson = '';

  // Catalogo para is-palette-selector y para la semilla CSS (h, s, b).
  function paletteJson(name: string, hsb: { h: number; s: string; b: string }, accentHex: string): string {
    const parts = name.split('-').filter(Boolean);
    const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    const label = parts.map(cap).join(' ') || name;
    const lead = parts.length >= 2 ? parts[0] : name.slice(0, Math.min(4, Math.max(1, name.length)));
    const accentLabel = parts.length >= 2 ? parts.slice(1).map(cap).join('') : cap(name.slice(lead.length));
    return JSON.stringify([{
      value: name,
      label,
      lead,
      accentLabel,
      h: hsb.h,
      s: hsb.s,
      b: hsb.b,
      leadColor: '#111111',
      accentColor: accentHex,
    }], null, 2);
  }

  function buildTutoCss(name: string, hsb: { h: number; s: string; b: string }): string {
    return `/* Semilla. Solo h, s y b. El hex de marca no se escribe. */\n${seedCss(`[data-palette="${name}"]`, hsb)}\n\n/* La rampa (brand, strong, pale, alpha, hue-rotate) ya esta en\n   palettes.css sobre :root, [data-palette]. No la copies por paleta.\n   El tab CSS la trae resuelta en el bloque, mas las superficies. */\n`;
  }

  function buildTutoSelector(pretty: string): string {
    const compact = JSON.stringify(JSON.parse(pretty));
    return `<is-palette-selector palettes='${compact}'></is-palette-selector>\n`;
  }

  function writeOut(el: HTMLElement | null, text: string): void {
    if (!el) return;
    // is-code guarda la fuente en value. textContent no repinta el editor.
    if (el.localName === 'is-code') {
      const ed = el as HTMLElement & { value: string };
      ed.dataset.cmSource = text;
      ed.value = text;
      return;
    }
    el.textContent = text;
  }

  const downloadBlob = (filename: string, body: string, type: string): void => {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  function clearRootInline(): void {
    const html = document.documentElement;
    for (const k of [...html.style].filter((kk: string) => kk.startsWith('--iswc-'))) {
      html.style.removeProperty(k);
    }
  }

  function apply(): string {
    const seed = readSeeds();
    const t = buildTokens(seed);
    const name = (nameInput?.value || DEFAULT_NAME).trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-') || DEFAULT_NAME;

    for (const p of panels) {
      const set = p.classList.contains('theme-dark') ? t.dark : t.light;
      for (const [k, v] of Object.entries({ ...t.marca, ...set })) p.style.setProperty(k, v);
    }

    // Apply a <html> solo si el switch de sesión está on (no se persiste).
    if (applyRoot?.checked) {
      const html = document.documentElement;
      const set = html.classList.contains('theme-light') ? t.light : t.dark;
      for (const [k, v] of Object.entries({ ...t.marca, ...set })) html.style.setProperty(k, v);
    }

    if (labels.dark) labels.dark.textContent = t.dark['--iswc-bg'] ?? '';
    if (labels.light) labels.light.textContent = t.light['--iswc-bg'] ?? '';
    if (tagName) tagName.textContent = name;
    if (fileName) fileName.textContent = `${name}.css`;

    if (rampEl) {
      applyBrandVars(rampEl, t.hsb);
      rampEl.replaceChildren(...RAMP_STEPS.map(({ label, token }) => {
        const d = document.createElement('div');
        d.className = 'tw-chip';
        d.style.background = `var(${token})`;
        d.style.color = /pale/.test(label) ? '#111' : '#fff';
        d.title = token;
        d.innerHTML = `<b>${label}</b>`;
        return d;
      }));
    }

    lastCss = buildCss(name, t);
    writeOut(root.querySelector<HTMLElement>('#cssOut'), lastCss);
    lastJson = paletteJson(name, t.hsb, seed.brand);
    writeOut(root.querySelector<HTMLElement>('#jsonOut'), lastJson);
    const fileNameJson = root.querySelector<HTMLElement>('#fileNameJson');
    if (fileNameJson) fileNameJson.textContent = `${name}.json`;
    writeOut(root.querySelector<HTMLElement>('#tutoSeed'), buildTutoCss(name, t.hsb));
    writeOut(root.querySelector<HTMLElement>('#tutoSelector'), buildTutoSelector(lastJson));
    persistSeeds();
    return name;
  }

  // Sesión: nunca reaplicar a la página tras F5.
  clearRootInline();
  if (applyRoot) applyRoot.checked = false;

  applyPersistedToInputs(loadPersisted());

  for (const p of pickers) {
    p.addEventListener('is-input', apply, opts);
    p.addEventListener('is-change', apply, opts);
  }
  nameInput?.addEventListener('is-input', apply, opts);
  applyRoot?.addEventListener('is-change', () => {
    if (!applyRoot.checked) clearRootInline();
    apply();
  }, opts);

  // Si la página tiene la paleta aplicada y el usuario cambia claro/oscuro,
  // re-pintar los tokens correctos del tema activo.
  document.addEventListener('is-theme-change', () => {
    if (applyRoot?.checked) apply();
  }, opts);

  root.querySelector<HTMLElement>('#btnReset')?.addEventListener('click', () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* */ }
    for (const p of pickers) {
      const key = p.dataset.seed;
      if (!key) continue;
      p.value = DEFAULTS[key as keyof Seed];
    }
    if (nameInput) nameInput.value = DEFAULT_NAME;
    if (applyRoot) applyRoot.checked = false;
    clearRootInline();
    apply();
  }, opts);

  root.querySelector<HTMLElement>('#btnDownload')?.addEventListener('click', () => {
    const name = apply();
    downloadBlob(`${name}.css`, lastCss, 'text/css;charset=utf-8');
  }, opts);

  root.querySelector<HTMLElement>('#btnDownloadJson')?.addEventListener('click', () => {
    const name = apply();
    downloadBlob(`${name}.json`, lastJson, 'application/json;charset=utf-8');
  }, opts);

  apply();
}

export function unmount(): void {
  /* AbortSignal limpia listeners; no tocamos el <html> (sesión del usuario). */
}
