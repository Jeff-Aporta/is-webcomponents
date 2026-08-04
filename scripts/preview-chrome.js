/**
 * preview-chrome.js — barra theme + paleta en docs de componentes.
 *
 * Standalone: controles + localStorage. La URL (?s=) solo se escribe al pulsar
 * «Guardar» (y se copia al portapapeles).
 * Embebido (s.embed / data-embed): oculta controles; aplica is-context del parent.
 *
 * Además inyecta automáticamente un `<is-cdn-snippet>` al final de la página
 * del componente, leyendo tag/categoría desde el nombre del archivo y el
 * manifest expuesto por `window.__IS_MANIFEST__`. Los snippets ya no viven
 * en el sidebar — la nav solo lista los componentes.
 */
import '../components/feedback/theme-toggle.js';
import '../components/actions/button.js';
import '../components/actions/button-group.js';
import '../components/media/icon.js';
import '../components/actions/copy-button.js';
import '../components/feedback/cdn-snippet.js';
import components from '../manifest.js';
// Expone el manifest a `window.__IS_MANIFEST__` para que `demo-code.js`
// pueda agrupar los `<script>` por categoría en el snippet "Ver código".
window.__IS_MANIFEST__ = components;

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
  if (toggle && typeof toggle.forceSync === 'function') toggle.forceSync();
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

/**
 * Inyecta un <is-cdn-snippet> al final del contenedor principal con los
 * enlaces del componente actual. Si la página no es de un componente (p. ej.
 * `home.html`) o no se encuentra en el manifest, no hace nada.
 *
 * Se monta una sola vez por página; si el usuario ya escribió un
 * `<is-cdn-snippet>` a mano, no lo duplica.
 */
function mountCdnSnippet() {
  if (document.querySelector('is-cdn-snippet[data-auto-cdn]')) return;

  const file = location.pathname.split('/').pop() || '';
  const m = /^is-([a-z0-9-]+)\.html$/i.exec(file);
  if (!m) return;

  // tag canónico: is-<name>; algunos componentes comparten página (p. ej.
  // is-tab + is-tab-panel). Cuando hay varias entradas con la misma `page`,
  // el panel del componente se completa con el primero; las filas se siguen
  // construyendo por tag individual, así que no perdemos información.
  //
  // El manifest guarda `page` folderizado (e.g. `actions/is-button.html`).
  // Comparamos por basename para que coincida tanto si el `page` viene
  // con categoria como si viene solo con el nombre de archivo.
  const matches = components.filter((c) => (c.page || '').split('/').pop() === file);
  if (!matches.length) return;

  const host = document.querySelector('is-main.main, main.main');
  if (!host) return;

  const snippet = document.createElement('is-cdn-snippet');
  snippet.dataset.autoCdn = '1';
  snippet.setAttribute('tag', matches[0].tag);
  snippet.setAttribute('category', matches[0].category || '');
  snippet.setAttribute('title', `CDN · ${matches[0].title || matches[0].tag}`);
  host.appendChild(snippet);

  host.appendChild(buildLlmLinks(matches[0]));
}

/**
 * Bloque de enlaces a los LLM.md, justo debajo del snippet de CDN y fuera del
 * shadow de <is-cdn-snippet>. Cada fila trae la URL a la vista, un botón para
 * copiarla y el enlace para abrirla.
 *
 * Los enlaces van al CDN (`/llm/**`) y no al .md del repo por una razón
 * concreta: ahí el build fuerza `Content-Type: text/plain` con `_headers`, así
 * que el navegador MUESTRA el texto al entrar. Servidos desde GitHub Pages
 * salen como `text/markdown` y el navegador los descarga. En ambos casos un
 * fetch lee el texto, pero se pidió que al entrar se viera.
 *
 * Antes esto apuntaba a `../LLM.md`, o sea `previews/LLM.md`, que no existe:
 * el enlace daba 404 en blanco.
 *
 * La ruta de la categoría se deriva del `script` del manifest, NO del nombre de
 * la categoría: son cosas distintas. Los tags de la categoría `data-viz` viven
 * repartidos entre `components/charts/` y `components/data-viz/`, así que
 * componer `components/<categoria>/LLM.md` daba una ruta inexistente.
 */
const LLM_BASE = 'https://is-webcomponents.pages.dev/llm';

function buildLlmLinks(entry) {
  const wrap = document.createElement('section');
  wrap.className = 'preview-chrome__llm';

  const folder = (entry.script || '').replace(/\/[^/]+\.js$/, '').replace(/^\.\.\/\.\.\//, '');
  const rows = [
    ['Categoría', `${entry.category || ''}`, folder ? `${LLM_BASE}/${folder}/LLM.md` : ''],
    ['Todos', 'índice global', `${LLM_BASE}/LLM.md`],
  ];

  const head = document.createElement('h3');
  head.className = 'preview-chrome__llm-title';
  head.textContent = 'Documentación para LLM';
  wrap.appendChild(head);

  for (const [label, detail, rel] of rows) {
    if (!rel) continue;
    const href = rel;
    const row = document.createElement('div');
    row.className = 'preview-chrome__llm-row';
    row.innerHTML = `
      <a class="preview-chrome__llm-btn" href="${href}" target="_blank" rel="noopener">
        <is-icon icon="mdi:file-document-outline" aria-hidden="true"></is-icon>
        <span class="preview-chrome__llm-label">LLM · ${label}</span>
        <span class="preview-chrome__llm-detail">${detail}</span>
      </a>
      <code class="preview-chrome__llm-url">${href}</code>
    `;
    // is-copy-button ya resuelve el portapapeles y el feedback de "Copiado":
    // no hay que reimplementarlo aquí.
    const copy = document.createElement('is-copy-button');
    copy.className = 'preview-chrome__llm-copy';
    copy.setAttribute('value', href);
    copy.setAttribute('copy-label', 'Copiar enlace');
    copy.setAttribute('success-label', 'Copiado');
    row.appendChild(copy);
    wrap.appendChild(row);
  }

  return wrap;
}

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
        <option value="insoft">InSoft</option>
        <option value="contapyme">ContaPyme</option>
        <option value="agrowin">AgroWin</option>
      </select>
    </label>
    <is-button-group class="preview-chrome__actions" pill aria-label="Acciones de la vista">
      <is-theme-toggle id="previewTheme"></is-theme-toggle>
      <is-button
        id="previewSave"
        class="preview-chrome__save"
        color="neutral"
        variant="plain"
        type="button"
        aria-label="Guardar enlace con tema y paleta"
        title="Guardar en la URL y copiar al portapapeles"
      >
        <is-icon slot="start" icon="mdi:content-save-outline"></is-icon>
      </is-button>
    </is-button-group>
  `;

  const main = document.querySelector('is-main.main, main.main');
  if (main) main.prepend(bar);
  else document.body.appendChild(bar);

  if (embedded) {
    bar.hidden = true;
    bar.setAttribute('inert', '');
    mountCdnSnippet();
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
      document.getElementById('previewTheme')?.forceSync?.();
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

  mountCdnSnippet();
}

await customElements.whenDefined('is-theme-toggle');
await customElements.whenDefined('is-button');
await customElements.whenDefined('is-cdn-snippet');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
