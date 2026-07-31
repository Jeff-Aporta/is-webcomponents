/**
 * preview-chrome.js — barra theme + paleta en docs de componentes.
 *
 * Standalone: controles + localStorage. La URL (?s=) solo se escribe al pulsar
 * «Guardar» (y se copia al portapapeles).
 * Embebido (s.embed / data-embed): oculta controles; aplica is-context del parent.
 */
import '../components/feedback/theme-toggle.js';
import '../components/actions/button.js';
import '../components/media/icon.js';

const THEMES = new Set(['light', 'dark']);
const PALETTES = new Set(['insoft', 'contapyme', 'agrowin']);
const root = document.documentElement;
const embedded = root.dataset.embed === '1';

const b64urlEncode = (input) => {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

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

/** Escribe theme/palette en ?s= y devuelve la URL absoluta resultante. */
const writeShareUrl = () => {
  const theme = root.dataset.theme || 'dark';
  const palette = root.dataset.palette || 'insoft';
  const encoded = b64urlEncode(JSON.stringify({ theme, palette }));
  const next = new URL(location.href);
  next.searchParams.set('s', encoded);
  // Quitar legacy si existían
  next.searchParams.delete('theme');
  next.searchParams.delete('palette');
  next.searchParams.delete('mode');
  next.searchParams.delete('embed');
  history.replaceState(null, '', next);
  return next.href;
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
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
    <is-button
      id="previewSave"
      class="preview-chrome__save"
      variant="neutral"
      appearance="plain"
      pill
      type="button"
      aria-label="Guardar enlace con tema y paleta"
      title="Guardar en la URL y copiar al portapapeles"
    >
      <is-icon slot="start" icon="mdi:content-save-outline"></is-icon>
    </is-button>
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

  const saveBtn = document.getElementById('previewSave');
  saveBtn?.addEventListener('click', async () => {
    persist();
    const url = writeShareUrl();
    const icon = saveBtn.querySelector('is-icon');
    try {
      await copyText(url);
      saveBtn.setAttribute('aria-label', 'Enlace copiado');
      saveBtn.title = 'Copiado';
      if (icon) icon.setAttribute('icon', 'mdi:check');
      setTimeout(() => {
        saveBtn.setAttribute('aria-label', 'Guardar enlace con tema y paleta');
        saveBtn.title = 'Guardar en la URL y copiar al portapapeles';
        if (icon) icon.setAttribute('icon', 'mdi:content-save-outline');
      }, 1600);
    } catch {
      saveBtn.title = 'No se pudo copiar';
      if (icon) icon.setAttribute('icon', 'mdi:alert-circle-outline');
      setTimeout(() => {
        saveBtn.title = 'Guardar en la URL y copiar al portapapeles';
        if (icon) icon.setAttribute('icon', 'mdi:content-save-outline');
      }, 1600);
    }
  });
}

await customElements.whenDefined('is-theme-toggle');
await customElements.whenDefined('is-button');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
