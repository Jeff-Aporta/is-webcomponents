/**
 * view-sources.js — visor full-page de fuentes JS / CSS / MD del componente.
 *
 * En cada `<is-demo>` / `.demo` puede haber un botón que abre un `<is-dialog>`
 * a viewport completo con tabs (JS · CSS · MD). El contenido es el archivo
 * fuente del repo (local same-origin o raw.githubusercontent).
 *
 * Distinto de `demo-code.js` (snippet CDN del ejemplo) y de `demo-file-meta.js`
 * (barra `.file-meta` sin hints).
 */
import '../src/components/media/icon.js';
import '../src/components/actions/button.js';
import '../src/components/actions/copy-button.js';
import '../src/components/layout/dialog.js';
import '../src/components/navigation/tab-group.js';
import '../src/components/code/code.js';
import './highlight-pre.js';
import { repaint } from '../src/components/_shared/highlight-code.js';
import components from '../manifest.js';
import {
  resolveSourceFiles,
  fetchSourceFile,
  rawSourceUrl,
  localSourceUrl,
} from './component-sources.js';

const DIALOG_ID = 'is-view-sources-dialog';
const KINDS = /** @type {const} */ (['js', 'css', 'md']);
const LANG = { js: 'javascript', css: 'css', md: 'markdown' };

/** @type {string | null} */
let currentTag = null;

/** @type {Map<string, Promise<{ text: string, url: string, source: string } | { error: string }>>} */
const cache = new Map();

function entryFor(tag) {
  return components.find((c) => c.tag === tag) || null;
}

/** URL absoluta (con host) preferida para mostrar en el chrome del modal. */
function absoluteSourceUrl(repoPath, fetchedUrl) {
  if (fetchedUrl && /^https?:\/\//i.test(fetchedUrl)) return fetchedUrl;
  try {
    return new URL(localSourceUrl(repoPath), location.href).href;
  } catch {
    return localSourceUrl(repoPath);
  }
}

function ensureDialog() {
  let dlg = document.getElementById(DIALOG_ID);
  // Migrar instancia antigua (path relativo / ancho limitado).
  if (dlg && (!(dlg.querySelector('#vsPath') instanceof HTMLAnchorElement)
    || dlg.getAttribute('width') !== '100vw'
    || dlg.getAttribute('spacing') !== '0')) {
    dlg.remove();
    dlg = null;
  }
  if (dlg) return dlg;

  dlg = document.createElement('is-dialog');
  dlg.id = DIALOG_ID;
  dlg.className = 'is-view-sources';
  dlg.setAttribute('light-dismiss', '');
  dlg.setAttribute('width', '100vw');
  dlg.setAttribute('spacing', '0');
  dlg.style.setProperty('--is-dialog-width', '100vw');
  dlg.style.setProperty('--is-dialog-spacing', '0px');
  dlg.innerHTML = `
    <span slot="label" class="vs-title">Fuentes</span>
    <div slot="header-actions" class="vs-header-actions">
      <a class="vs-open" id="vsOpenRaw" href="#" target="_blank" rel="noopener noreferrer" hidden>Abrir</a>
      <is-copy-button id="vsCopy" copy-label="Copiar" success-label="Copiado"
                      tooltip-placement="bottom"></is-copy-button>
    </div>
    <div class="vs-body">
      <a class="vs-path" id="vsPath" href="#" target="_blank" rel="noopener noreferrer" hidden></a>
      <is-tab-group class="vs-tabs" id="vsTabs" active="js" activation="manual"
                    without-scroll-controls aria-label="Tipo de fuente">
        <is-tab slot="nav" panel="js">JS</is-tab>
        <is-tab slot="nav" panel="css">CSS</is-tab>
        <is-tab slot="nav" panel="md">MD</is-tab>
        ${KINDS.map((k) => `
          <is-tab-panel name="${k}">
            <div class="vs-panel" data-kind="${k}">
              <is-code class="code vs-pre is-code-view" data-lang="${LANG[k]}" data-kind="${k}"
                readonly compact wrap line-numbers="false"
                lang="${LANG[k] === 'markdown' ? 'plaintext' : LANG[k]}"></is-code>
              <p class="vs-empty" data-kind="${k}" hidden>No hay archivo o no se pudo cargar.</p>
            </div>
          </is-tab-panel>
        `).join('')}
      </is-tab-group>
    </div>
    <is-button slot="footer" id="vsClose" color="neutral" variant="outlined">Cerrar</is-button>
  `;
  document.body.append(dlg);

  dlg.querySelector('#vsClose')?.addEventListener('click', () => dlg.hide());
  const tabs = dlg.querySelector('#vsTabs');
  tabs?.addEventListener('is-tab-show', (e) => {
    const kind = e.detail?.name;
    if (KINDS.includes(kind)) syncActiveMeta(dlg, kind);
  });

  return dlg;
}

function panelEditor(dlg, kind) {
  return dlg.querySelector(`.vs-pre[data-kind="${kind}"]`);
}

function syncActiveMeta(dlg, kind) {
  const tag = dlg.dataset.tag || '';
  const entry = entryFor(tag);
  const files = entry ? resolveSourceFiles(entry) : {};
  const file = files[kind];
  const pathEl = dlg.querySelector('#vsPath');
  const openEl = dlg.querySelector('#vsOpenRaw');
  const copyEl = dlg.querySelector('#vsCopy');
  const pre = panelEditor(dlg, kind);

  if (pathEl) {
    if (file) {
      const url = absoluteSourceUrl(file.repoPath, pre?.dataset?.sourceUrl);
      pathEl.hidden = false;
      pathEl.textContent = url;
      pathEl.href = url;
      pathEl.title = url;
    } else {
      pathEl.hidden = true;
      pathEl.textContent = '';
      pathEl.removeAttribute('href');
    }
  }
  if (openEl) {
    if (file) {
      const url = absoluteSourceUrl(file.repoPath, pre?.dataset?.sourceUrl);
      openEl.hidden = false;
      openEl.href = url;
      openEl.title = url;
    } else {
      openEl.hidden = true;
      openEl.removeAttribute('href');
    }
  }
  if (copyEl && pre) {
    const text = pre.dataset.cmSource || pre.value || '';
    if (text && !pre.hasAttribute('data-vs-error')) copyEl.setAttribute('value', text);
    else copyEl.removeAttribute('value');
  }
}

async function loadKind(dlg, kind, file) {
  const pre = panelEditor(dlg, kind);
  const empty = dlg.querySelector(`.vs-empty[data-kind="${kind}"]`);
  if (!pre || !empty) return;

  if (!file) {
    pre.value = '';
    delete pre.dataset.cmSource;
    delete pre.dataset.sourceUrl;
    pre.setAttribute('data-vs-error', '1');
    pre.hidden = true;
    empty.hidden = false;
    empty.textContent = 'Este componente no declara este archivo.';
    return;
  }

  const key = file.repoPath;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetchSourceFile(file)
      .then((r) => r)
      .catch((err) => ({ error: err?.message || String(err) }));
    cache.set(key, pending);
  }

  pre.hidden = false;
  empty.hidden = true;
  pre.value = 'Cargando…';
  delete pre.dataset.cm;
  delete pre.dataset.cmSource;
  delete pre.dataset.sourceUrl;
  pre.removeAttribute('data-vs-error');

  const result = await pending;
  if (result.error) {
    pre.value = '';
    delete pre.dataset.sourceUrl;
    pre.setAttribute('data-vs-error', '1');
    pre.hidden = true;
    empty.hidden = false;
    empty.textContent = `No se pudo cargar ${file.repoPath}: ${result.error}`;
    return;
  }

  pre.hidden = false;
  empty.hidden = true;
  pre.dataset.cmSource = result.text;
  pre.dataset.sourceUrl = result.url || absoluteSourceUrl(file.repoPath);
  pre.value = result.text;
  pre.setAttribute('data-lang', LANG[kind]);
  pre.lang = LANG[kind] === 'markdown' ? 'plaintext' : LANG[kind];

  // MD: literal (no softFormat) para no alterar el markdown.
  if (kind === 'md') {
    delete pre.dataset.cm;
    return;
  }

  delete pre.dataset.cmMode;
  delete pre.dataset.cm;
  await repaint(pre);
}

/**
 * @param {string} tag
 * @param {string} [prefer='js']
 */
export async function openViewSources(tag, prefer = 'js') {
  const entry = entryFor(tag);
  if (!entry) return;

  const dlg = ensureDialog();
  dlg.dataset.tag = tag;
  const title = dlg.querySelector('.vs-title');
  if (title) title.textContent = `Fuentes · ${tag}`;

  const files = resolveSourceFiles(entry);
  const tabs = dlg.querySelector('#vsTabs');
  const available = KINDS.filter((k) => files[k]);
  const start = available.includes(prefer) ? prefer : (available[0] || 'js');

  if (tabs) tabs.active = start;
  // URL absoluta con host ya visible mientras carga el contenido.
  syncActiveMeta(dlg, start);

  await loadKind(dlg, start, files[start]);
  syncActiveMeta(dlg, start);

  KINDS.filter((k) => k !== start).forEach((k) => {
    loadKind(dlg, k, files[k]).then(() => {
      if ((tabs?.active || start) === k) syncActiveMeta(dlg, k);
    });
  });

  dlg.show();
}

function enhanceDemo(demo) {
  if (!(demo instanceof Element)) return;
  if (demo.dataset.sourcesReady || demo.hasAttribute('data-no-sources')) return;

  const tag = currentTag
    || demo.closest('is-preview-component')?.preview?.definition?.tag
    || null;
  if (!tag || !entryFor(tag)) return;

  demo.dataset.sourcesReady = '1';
  demo.classList.add('demo--with-sources');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'demo-sources-btn';
  btn.setAttribute('aria-label', 'Ver fuentes JS / CSS / MD');
  btn.title = 'Ver fuentes (JS · CSS · MD)';
  btn.innerHTML = '<is-icon icon="mdi:file-code-outline"></is-icon>';
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openViewSources(tag).catch(console.error);
  });
  demo.append(btn);
}

function mountPageButton(_tag) {
  // La barra de página es exclusiva de `demo-file-meta.js` (sin hints).
  document.querySelectorAll('.vs-page-bar').forEach((el) => el.remove());
}

document.addEventListener('is-demo-connected', (e) => {
  const el = e.target;
  if (el instanceof Element) enhanceDemo(el);
});

document.addEventListener('is-preview-ready', (e) => {
  const { tag } = e.detail ?? {};
  if (typeof tag !== 'string') return;
  currentTag = tag;
  cache.clear();
  mountPageButton(tag);
  document.querySelectorAll('.demo, is-demo').forEach(enhanceDemo);
});

const boot = () => {
  document.querySelectorAll('.demo, is-demo').forEach(enhanceDemo);
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { enhanceDemo, mountPageButton };
