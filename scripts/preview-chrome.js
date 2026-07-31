/**
 * preview-chrome.js — barra theme + paleta en docs de componentes.
 *
 * Standalone: controles + localStorage. No reescribe ?s= (solo iniciales de carga).
 * Embebido (s.embed / data-embed): oculta controles; aplica is-context del parent.
 */
import '../components/feedback/theme-toggle.js';

const THEMES = new Set(['light', 'dark']);
const PALETTES = new Set(['insoft', 'contapyme', 'agrowin']);
const root = document.documentElement;
const embedded = root.dataset.embed === '1';

const applyTheme = (theme) => {
  if (!THEMES.has(theme)) return;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');
  root.dataset.theme = theme;
  const toggle = document.getElementById('previewTheme');
  if (toggle) toggle.dark = theme === 'dark';
};

const applyPalette = (palette) => {
  if (!PALETTES.has(palette)) return;
  root.dataset.palette = palette;
  const sel = document.getElementById('previewPalette');
  if (sel && sel.value !== palette) sel.value = palette;
};

const persist = () => {
  if (embedded) return;
  localStorage.setItem('is-theme', root.dataset.theme || 'dark');
  localStorage.setItem('is-palette', root.dataset.palette || 'insoft');
};

addEventListener('message', ({ data, origin }) => {
  if (data?.type !== 'is-context') return;
  if (origin && origin !== location.origin) return;
  if (data.theme) applyTheme(data.theme);
  if (data.palette) applyPalette(data.palette);
});

function mount() {
  if (document.getElementById('previewChrome')) return;

  const bar = document.createElement('div');
  bar.id = 'previewChrome';
  bar.className = 'preview-chrome';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Tema y paleta');
  bar.innerHTML = /* html */ `
    <label class="preview-chrome__palette">
      <span class="preview-chrome__label">Paleta</span>
      <select id="previewPalette" aria-label="Paleta de marca">
        <option value="insoft">Insoft</option>
        <option value="contapyme">ContaPyme</option>
        <option value="agrowin">AgroWin</option>
      </select>
    </label>
    <is-theme-toggle id="previewTheme"></is-theme-toggle>
  `;

  const main = document.querySelector('main.main');
  if (main) main.prepend(bar);
  else document.body.appendChild(bar);

  if (embedded) {
    bar.hidden = true;
    bar.setAttribute('inert', '');
    return;
  }

  applyTheme(root.dataset.theme || 'dark');
  applyPalette(root.dataset.palette || 'insoft');

  document.getElementById('previewTheme')?.addEventListener('theme-toggle', (e) => {
    const theme = e.detail?.theme || (root.dataset.theme === 'dark' ? 'light' : 'dark');
    // El toggle ya aplicó al contenedor; solo persistir + sync UI si fue el <html>
    if (e.detail?.container === root || !e.detail?.container) {
      applyTheme(theme);
      persist();
    } else {
      const toggle = document.getElementById('previewTheme');
      if (toggle) toggle.dark = root.dataset.theme === 'dark';
    }
  });
  document.getElementById('previewPalette')?.addEventListener('change', (e) => {
    applyPalette(e.target.value);
    persist();
  });
}

await customElements.whenDefined('is-theme-toggle');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
