/**
 * view-sources.js — visor full-view de fuentes JS / CSS / MD del componente.
 *
 * En cada `<is-demo>` / `.demo` añade un botón que abre un `<is-dialog>` a casi
 * viewport completo con tabs (JS · CSS · MD). El contenido es el archivo del
 * repo sin minificar (local same-origin o raw.githubusercontent), pensado
 * para auditar desde la galería en GitHub Pages.
 *
 * Distinto de `demo-code.js` (snippet CDN del ejemplo).
 */
import '../src/components/media/icon.js';
import '../src/components/actions/button.js';
import '../src/components/actions/copy-button.js';
import '../src/components/layout/dialog.js';
import '../src/components/navigation/tab-group.js';
import './highlight-pre.js';
import { ensureCodeMirror, paint } from '../src/components/_shared/highlight-code.js';
import components from '../manifest.js';
import {
  resolveSourceFiles,
  fetchSourceFile,
  rawSourceUrl,
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

function ensureDialog() {
  let dlg = document.getElementById(DIALOG_ID);
  if (dlg) return dlg;

  dlg = document.createElement('is-dialog');
  dlg.id = DIALOG_ID;
  dlg.className = 'is-view-sources';
  dlg.setAttribute('light-dismiss', '');
  dlg.style.setProperty('--width', 'min(96vw, 72rem)');
  dlg.innerHTML = `
    <span slot="label" class="vs-title">Fuentes</span>
    <div slot="header-actions" class="vs-header-actions">
      <a class="vs-open" id="vsOpenRaw" href="#" target="_blank" rel="noopener noreferrer" hidden>Abrir raw</a>
      <is-copy-button id="vsCopy" copy-label="Copiar" success-label="Copiado"
                      tooltip-placement="bottom"></is-copy-button>
    </div>
    <div class="vs-body">
      <p class="vs-path" id="vsPath" hidden></p>
      <is-tab-group class="vs-tabs" id="vsTabs" active="js" activation="manual"
                    without-scroll-controls aria-label="Tipo de fuente">
        <is-tab slot="nav" panel="js">JS</is-tab>
        <is-tab slot="nav" panel="css">CSS</is-tab>
        <is-tab slot="nav" panel="md">MD</is-tab>
        ${KINDS.map((k) => `
          <is-tab-panel name="${k}">
            <div class="vs-panel" data-kind="${k}">
              <pre class="code vs-pre" data-lang="${LANG[k]}" data-kind="${k}"></pre>
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

function syncActiveMeta(dlg, kind) {
  const tag = dlg.dataset.tag || '';
  const entry = entryFor(tag);
  const files = entry ? resolveSourceFiles(entry) : {};
  const file = files[kind];
  const pathEl = dlg.querySelector('#vsPath');
  const openEl = dlg.querySelector('#vsOpenRaw');
  const copyEl = dlg.querySelector('#vsCopy');
  const pre = dlg.querySelector(`pre.vs-pre[data-kind="${kind}"]`);

  if (pathEl) {
    if (file) {
      pathEl.hidden = false;
      pathEl.textContent = file.repoPath;
    } else {
      pathEl.hidden = true;
      pathEl.textContent = '';
    }
  }
  if (openEl) {
    if (file) {
      openEl.hidden = false;
      openEl.href = rawSourceUrl(file.repoPath);
      openEl.title = `Abrir ${file.repoPath} en raw.githubusercontent`;
    } else {
      openEl.hidden = true;
      openEl.removeAttribute('href');
    }
  }
  if (copyEl && pre) {
    const text = pre.dataset.cmSource || pre.textContent || '';
    if (text && !pre.hasAttribute('data-vs-error')) copyEl.setAttribute('value', text);
    else copyEl.removeAttribute('value');
  }
}

async function loadKind(dlg, kind, file) {
  const pre = dlg.querySelector(`pre.vs-pre[data-kind="${kind}"]`);
  const empty = dlg.querySelector(`.vs-empty[data-kind="${kind}"]`);
  if (!pre || !empty) return;

  if (!file) {
    pre.textContent = '';
    delete pre.dataset.cmSource;
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
  pre.textContent = 'Cargando…';
  delete pre.dataset.cm;
  delete pre.dataset.cmSource;
  pre.removeAttribute('data-vs-error');

  const result = await pending;
  if (result.error) {
    pre.textContent = '';
    pre.setAttribute('data-vs-error', '1');
    pre.hidden = true;
    empty.hidden = false;
    empty.textContent = `No se pudo cargar ${file.repoPath}: ${result.error}`;
    return;
  }

  pre.hidden = false;
  empty.hidden = true;
  pre.dataset.cmSource = result.text;
  pre.textContent = result.text;
  pre.setAttribute('data-lang', LANG[kind]);

  // MD: mostrar literal (auditoría). softFormat(js) podría alterar el markdown.
  if (kind === 'md') {
    delete pre.dataset.cm;
    return;
  }

  delete pre.dataset.cmMode;
  await ensureCodeMirror().catch(() => {});
  delete pre.dataset.cm;
  paint(pre);
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

  // Cargar las tres en paralelo; el tab activo se pinta primero.
  await loadKind(dlg, start, files[start]);
  if (tabs) tabs.active = start;
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

function mountPageButton(tag) {
  const host = document.querySelector('is-main.main, main.main');
  if (!host || !entryFor(tag)) return;

  let bar = host.querySelector(':scope > .vs-page-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'vs-page-bar';
    bar.innerHTML = `
      <is-button class="vs-page-btn" color="neutral" variant="outlined" type="button">
        <is-icon slot="start" icon="mdi:file-code-outline"></is-icon>
        Fuentes JS · CSS · MD
      </is-button>
      <span class="vs-page-hint">Archivos del repo sin minificar (auditoría / GH Pages)</span>
    `;
    const first = host.firstElementChild;
    if (first) host.insertBefore(bar, first);
    else host.append(bar);
  }

  const btn = bar.querySelector('.vs-page-btn');
  if (btn && btn.dataset.tag !== tag) {
    btn.dataset.tag = tag;
    btn.onclick = () => openViewSources(tag).catch(console.error);
  }
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
