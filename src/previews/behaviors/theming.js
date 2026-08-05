/**
 * Behavior migrado desde HTML inline de theming.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  /* ═══════════════════════════════════════════════════════════════
         Derivación de la paleta. Todo en OKLCH: es el mismo espacio que
         ya usa palettes.css con `oklch(from … l calc(c * 0.25) h)`, pero
         resuelto en JS para poder emitir hex literales en el archivo
         exportado (un consumidor puede no tener color relativo).
         ═══════════════════════════════════════════════════════════════ */
  
      const clamp01 = (n) => Math.min(1, Math.max(0, n));
  
      function hexToRgb(hex) {
        let h = String(hex || '').trim().replace('#', '');
        if (h.length === 3) h = h.split('').map((c) => c + c).join('');
        if (!/^[0-9a-f]{6}$/i.test(h)) h = '808080';
        return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
      }
      const toHex2 = (n) => Math.round(clamp01(n) * 255).toString(16).padStart(2, '0');
      const rgbToHex = ([r, g, b]) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  
      const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      const unlin = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  
      function rgbToOklab([r0, g0, b0]) {
        const r = lin(r0), g = lin(g0), b = lin(b0);
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return [
          0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        ];
      }
  
      function oklabToRgb([L, a, bb]) {
        const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
        const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
        const s_ = L - 0.0894841775 * a - 1.2914855480 * bb;
        const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
        return [
          unlin(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          unlin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          unlin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
        ].map(clamp01);
      }
  
      function toOklch(hex) {
        const [L, a, b] = rgbToOklab(hexToRgb(hex));
        return { l: L, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
      }
  
      function fromOklch({ l, c, h }) {
        const rad = (h * Math.PI) / 180;
        // Reducir croma hasta que entre en sRGB: evita el "clipping" plano que
        // aplasta tonos saturados al convertir con un simple clamp por canal.
        let cc = Math.max(0, c);
        for (let i = 0; i < 24; i += 1) {
          const [r, g, b] = oklabToRgb([clamp01(l), cc * Math.cos(rad), cc * Math.sin(rad)]);
          const raw = [r, g, b];
          if (raw.every((v) => v > 0.0005 && v < 0.9995) || cc < 0.002) break;
          cc *= 0.94;
        }
        return rgbToHex(oklabToRgb([clamp01(l), cc * Math.cos(rad), cc * Math.sin(rad)]));
      }
  
      /** Mismo color con L/C forzados o escalados. */
      const shift = (hex, { l, lm, dl, c, cm }) => {
        const o = toOklch(hex);
        return fromOklch({
          l: clamp01(l ?? (o.l * (lm ?? 1) + (dl ?? 0))),
          c: c ?? o.c * (cm ?? 1),
          h: o.h,
        });
      };
  
      /** Escalón de superficie: L desplazada + croma mínimo en el tono de marca. */
      const surface = (baseHex, dl, brandHue, tint) => {
        const o = toOklch(baseHex);
        return fromOklch({ l: clamp01(o.l + dl), c: Math.max(o.c, tint), h: o.c > 0.01 ? o.h : brandHue });
      };
  
      /** Mezcla lineal en OKLab: usada para text-soft / text-dim. */
      const mix = (aHex, bHex, t) => {
        const A = rgbToOklab(hexToRgb(aHex)); const B = rgbToOklab(hexToRgb(bHex));
        return rgbToHex(oklabToRgb(A.map((v, i) => v + (B[i] - v) * t)));
      };
  
      const alpha = (hex, pct) => {
        const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
        return `rgb(${r} ${g} ${b} / ${pct}%)`;
      };
  
      /* ── Construcción de los tres bloques de tokens ─────────────────── */
  
      function buildTokens(seed) {
        const b = toOklch(seed.brand);
        const brand = {
          50:  shift(seed.brand, { l: 0.97, cm: 0.18 }),
          100: shift(seed.brand, { l: 0.92, cm: 0.40 }),
          500: rgbToHex(hexToRgb(seed.brand)),
          600: shift(seed.brand, { lm: 0.88 }),
          700: shift(seed.brand, { lm: 0.75, cm: 0.92 }),
          800: shift(seed.brand, { lm: 0.60, cm: 0.80 }),
        };
  
        const marca = {
          '--is-color-brand-paler': brand[50],
          '--is-color-brand-pale': brand[100],
          '--is-color-brand': brand[500],
          '--is-color-brand-strong': brand[600],
          '--is-color-brand-stronger': brand[700],
          '--is-color-brand-strongest': brand[800],
          '--is-accent': brand[500],
          '--is-accent-bg': alpha(brand[500], 12),
          '--is-on-brand': b.l > 0.72 ? '#111111' : '#ffffff',
          '--is-logo-bg': brand[500],
          '--is-logo-fg': b.l > 0.72 ? '#111111' : '#ffffff',
          '--is-logo-accent': b.l > 0.72 ? '#111111' : '#ffffff',
        };
  
        const tint = Math.min(b.c * 0.22, 0.016);
  
        const dark = {
          '--is-bg': rgbToHex(hexToRgb(seed.darkBg)),
          '--is-bg-soft': surface(seed.darkBg, 0.035, b.h, tint),
          '--is-bg-elev': surface(seed.darkBg, 0.065, b.h, tint),
          '--is-code-bg': surface(seed.darkBg, 0.012, b.h, tint),
          '--is-border': surface(seed.darkBg, 0.145, b.h, tint),
          '--is-border-soft': surface(seed.darkBg, 0.090, b.h, tint),
          '--is-control-bg': surface(seed.darkBg, 0.075, b.h, tint),
          '--is-control-bg-hover': surface(seed.darkBg, 0.120, b.h, tint),
          '--is-control-bg-active': surface(seed.darkBg, 0.170, b.h, tint),
          '--is-control-border': surface(seed.darkBg, 0.300, b.h, tint),
          '--is-text': rgbToHex(hexToRgb(seed.darkText)),
          '--is-text-soft': mix(seed.darkText, seed.darkBg, 0.28),
          '--is-text-dim': mix(seed.darkText, seed.darkBg, 0.45),
          '--is-control-text': rgbToHex(hexToRgb(seed.darkText)),
          '--is-code-text': mix(seed.darkText, seed.darkBg, 0.10),
          '--is-brand-soft': alpha(brand[500], 18),
          '--is-brand-soft-active': alpha(brand[500], 28),
          '--is-brand-text': shift(brand[500], { l: Math.max(0.78, b.l), cm: 0.85 }),
          '--is-focus': shift(brand[500], { dl: 0.10 }),
          '--is-b-required': mix(seed.darkText, seed.darkBg, 0.40),
          '--is-b-optional': '#80c080',
          '--is-b-readonly': alpha(seed.darkText, 18),
          '--is-bg-readonly': surface(seed.darkBg, 0.050, b.h, tint),
          '--is-shadow': '0 1px 0 rgb(255 255 255 / 3%), 0 8px 24px rgb(0 0 0 / 25%)',
        };
  
        const light = {
          '--is-bg': rgbToHex(hexToRgb(seed.lightBg)),
          '--is-bg-soft': surface(seed.lightBg, -0.022, b.h, tint),
          '--is-bg-elev': surface(seed.lightBg, 0.008, b.h, tint),
          '--is-code-bg': surface(seed.lightBg, -0.026, b.h, tint),
          '--is-border': surface(seed.lightBg, -0.155, b.h, tint),
          '--is-border-soft': surface(seed.lightBg, -0.085, b.h, tint),
          '--is-control-bg': surface(seed.lightBg, -0.040, b.h, tint),
          '--is-control-bg-hover': surface(seed.lightBg, -0.070, b.h, tint),
          '--is-control-bg-active': surface(seed.lightBg, -0.110, b.h, tint),
          '--is-control-border': surface(seed.lightBg, -0.300, b.h, tint),
          '--is-text': rgbToHex(hexToRgb(seed.lightText)),
          '--is-text-soft': mix(seed.lightText, seed.lightBg, 0.28),
          '--is-text-dim': mix(seed.lightText, seed.lightBg, 0.45),
          '--is-control-text': rgbToHex(hexToRgb(seed.lightText)),
          '--is-code-text': rgbToHex(hexToRgb(seed.lightText)),
          '--is-brand-soft': brand[50],
          '--is-brand-soft-active': brand[100],
          '--is-brand-text': brand[700],
          '--is-focus': brand[500],
          '--is-b-required': mix(seed.lightText, seed.lightBg, 0.42),
          '--is-b-optional': '#80c080',
          '--is-b-readonly': alpha(seed.lightText, 25),
          '--is-bg-readonly': surface(seed.lightBg, -0.030, b.h, tint),
          '--is-shadow': '0 1px 0 rgb(0 0 0 / 4%), 0 8px 24px rgb(0 0 0 / 6%)',
        };
  
        return { brand, marca, dark, light };
      }
  
      /* ── CSS exportable ─────────────────────────────────────────────── */
  
      const block = (sel, obj, indentComment) => {
        const body = Object.entries(obj)
          .map(([k, v]) => `  ${k}: ${v};`)
          .join('\n');
        return `${indentComment}${sel} {\n${body}\n}`;
      };
  
      function buildCss(name, t) {
        const safe = name || 'mi-marca';
        return `/* ${safe}.css — paleta generada con el taller de Personalización
   * de IS Web Components.
   *
   * Uso: carga primero is-base.min.css, luego este archivo (puede sustituir
   * a palettes.css o convivir con él) y activa la paleta en cualquier
   * ancestro con el atributo data-palette:
   *
   *   class="theme-dark" data-theme="dark" data-palette="${safe}"
   *
   * Los tokens semánticos (success / warning / danger) se heredan de
   * is-base.css a propósito: son señales de estado, no marca.
   */
  
  /* ─── Marca: vale para los dos temas ─────────────────────────────── */
  ${block(`[data-palette="${safe}"]`, t.marca, '')}
  
  /* ─── Superficies y marca por tema: dependen de la PAREJA ─────────── */
  ${block(`.theme-dark[data-palette="${safe}"]`, t.dark, '')}
  
  ${block(`.theme-light[data-palette="${safe}"]`, t.light, '')}
  `;
      }
  
      /* ── Cableado de la página ──────────────────────────────────────── */
  
      const DEFAULTS = {
        brand: '#7048e8',
        darkBg: '#0b0d10',
        darkText: '#e6e8eb',
        lightBg: '#ffffff',
        lightText: '#1f2328',
      };
  
      const pickers = [...document.querySelectorAll('.tw-seed')];
      const nameInput = document.getElementById('palName');
      const panels = [...document.querySelectorAll('.tw-panel')];
      const out = document.getElementById('cssOut');
      const rampEl = document.getElementById('ramp');
      const tagName = document.getElementById('tagName');
      const applyRoot = document.getElementById('applyRoot');
      const labels = { dark: document.getElementById('darkBgLabel'), light: document.getElementById('lightBgLabel') };
  
      // Mismo molde clonado en los dos paneles.
      const tpl = document.getElementById('tplPanel');
      for (const p of panels) {
        p.querySelector('[data-panel-body]').append(tpl.content.cloneNode(true));
      }
  
      const readSeeds = () => {
        const s = { ...DEFAULTS };
        for (const p of pickers) s[p.dataset.seed] = p.value || DEFAULTS[p.dataset.seed];
        return s;
      };
  
      let lastCss = '';
  
      function apply() {
        const seed = readSeeds();
        const t = buildTokens(seed);
        const name = (nameInput.value || 'mi-marca').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'mi-marca';
  
        // Los tokens se escriben SOBRE el panel: los shadow roots de los is-*
        // los heredan sin necesidad de tocar <html>.
        for (const p of panels) {
          const set = p.classList.contains('theme-dark') ? t.dark : t.light;
          for (const [k, v] of Object.entries({ ...t.marca, ...set })) p.style.setProperty(k, v);
        }
  
        if (applyRoot.checked) {
          const root = document.documentElement;
          const set = root.classList.contains('theme-light') ? t.light : t.dark;
          for (const [k, v] of Object.entries({ ...t.marca, ...set })) root.style.setProperty(k, v);
        }
  
        labels.dark.textContent = t.dark['--is-bg'];
        labels.light.textContent = t.light['--is-bg'];
        tagName.textContent = name;
  
        rampEl.replaceChildren(...Object.entries(t.brand).map(([step, hex]) => {
          const d = document.createElement('div');
          d.className = 'tw-chip';
          d.style.background = hex;
          d.style.color = toOklch(hex).l > 0.65 ? '#111' : '#fff';
          d.innerHTML = `<b>brand-${step}</b><span>${hex}</span>`;
          return d;
        }));
  
        lastCss = buildCss(name, t);
        out.textContent = lastCss;
        return name;
      }
  
      function clearRoot() {
        const root = document.documentElement;
        for (const k of [...root.style].filter((k) => k.startsWith('--is-'))) root.style.removeProperty(k);
      }
  
      for (const p of pickers) {
        p.addEventListener('is-input', apply);
        p.addEventListener('is-change', apply);
      }
      nameInput.addEventListener('is-input', apply);
      applyRoot.addEventListener('is-change', () => { if (!applyRoot.checked) clearRoot(); apply(); });
  
      document.getElementById('btnReset').addEventListener('click', () => {
        for (const p of pickers) p.value = DEFAULTS[p.dataset.seed];
        nameInput.value = 'mi-marca';
        apply();
      });
  
      document.getElementById('btnDownload').addEventListener('click', () => {
        const name = apply();
        const url = URL.createObjectURL(new Blob([lastCss], { type: 'text/css;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.css`;
        document.body.append(a);
        a.click();
        a.remove();
        // Revocar en el siguiente tick: Safari cancela la descarga si se libera
        // el objeto antes de que el navegador la haya tomado.
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      });
  
      apply();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
