import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml, copyText } from '../_shared/dom-utils.js';
import {
  resolveRef,
  jsdelivrBase,
  MIRRORS,
  mirrorById,
  readMirrorId,
  writeMirrorId,
  fallbackBases,
} from '../_shared/cdn-ref.js';
import { CODEMIRROR_READY, isReady as cmReady, paint } from '../_shared/highlight-code.js';
import '../media/icon.js';

/**
 * <is-cdn-snippet> — panel CDN + mirrors + docs para agentes (sin npm/npx).
 *
 * Tabs
 *   enlaces  · snippets del espejo activo (jsDelivr / Pages)
 *   mirrors  · selector de espejo + boot con fallback encadenado
 *
 * Atributos
 *   tag         string  · p. ej. "is-button"
 *   category    string  · p. ej. "actions"
 *   base        string  · override del CDN_BASE (opcional; ignora espejo)
 *   title       string  · título del panel
 *   dependencies / config · ver #parseDeps / #parseConfig
 */
(() => {
  const CDN_BASE_DEFAULT = jsdelivrBase('main');

  const LLM_PROMPT = [
    'Usa el kit IS Web Components solo por CDN, sin npm ni npx.',
    'Espejos: jsDelivr (primario, pin @sha) y GitHub Pages (reserva). Un solo origen por página.',
    'Bootstrap: is-base.min.css + palettes.min.css + el .min.js del tag (o category.*.min.js / all.min.js).',
    'Si un espejo cae: usa el snippet «Boot con fallback» del tab Mirrors (prueba jsDelivr → Pages).',
    'Reutiliza tags is-* existentes; no reinventes botones, dialogs, tablas, charts, toasts ni iconos.',
    'Antes de inventar API: lee components/LLM.md, el LLM.md de la categoría y el MD del módulo.',
    'Tema/paleta: data-theme y data-palette en <html>. Iconos: <is-icon icon="mdi:…">.',
  ].join('\n');

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="Enlaces CDN">
      <header class="cdn__head">
        <h3 class="cdn__title">Consumo por CDN</h3>
        <p class="cdn__hint">
          Primero el CSS común; luego el JS del componente (o el bundle de
          categoría / <code>all.min.js</code>). Usa el tab
          <strong>Mirrors</strong> para cambiar de espejo o copiar un boot
          con fallback.
        </p>
      </header>

      <div class="cdn__tabs" role="tablist" aria-label="CDN">
        <button type="button" class="cdn__tab" role="tab" id="tab-enlaces"
                data-tab="enlaces" aria-selected="true" aria-controls="panel-enlaces">
          Enlaces
        </button>
        <button type="button" class="cdn__tab" role="tab" id="tab-mirrors"
                data-tab="mirrors" aria-selected="false" aria-controls="panel-mirrors">
          Mirrors
        </button>
      </div>

      <div class="cdn__panel" role="tabpanel" id="panel-enlaces" data-panel="enlaces"
           aria-labelledby="tab-enlaces">
        <div class="cdn__mirrors" data-slot="mirror-chips" role="group" aria-label="Espejo activo"></div>
        <ol class="cdn__list">
          <li class="cdn__row" data-kind="common">
            <div class="cdn__row-head">
              <span class="cdn__label">1 · CSS común (una vez por página)</span>
              <button type="button" class="cdn__copy" data-copy="common" aria-label="Copiar enlaces comunes">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <pre class="cdn__pre" data-slot="common"></pre>
          </li>
          <li class="cdn__row" data-kind="single">
            <div class="cdn__row-head">
              <span class="cdn__label">2 · JS del componente · <code data-slot="fileTag"></code></span>
              <button type="button" class="cdn__copy" data-copy="single" aria-label="Copiar enlace individual">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <pre class="cdn__pre" data-slot="single"></pre>
          </li>
          <li class="cdn__row" data-kind="category">
            <div class="cdn__row-head">
              <span class="cdn__label">Alternativa · categoría · <code data-slot="category"></code></span>
              <button type="button" class="cdn__copy" data-copy="category" aria-label="Copiar bundle de categoría">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <pre class="cdn__pre" data-slot="category-pre"></pre>
          </li>
          <li class="cdn__row cdn__row--dep" data-kind="dep" hidden>
            <div class="cdn__row-head">
              <span class="cdn__label cdn__dep-name">Dependencia · <code data-slot="dep-name"></code></span>
              <button type="button" class="cdn__copy" data-copy="dep" aria-label="Copiar enlaces de la dependencia">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <pre class="cdn__pre" data-slot="dep-pre"></pre>
            <p class="cdn__dep-note" data-slot="dep-note" hidden></p>
          </li>
          <li class="cdn__row" data-kind="all">
            <div class="cdn__row-head">
              <span class="cdn__label">Alternativa · todo el kit · <code>all.min.js</code></span>
              <button type="button" class="cdn__copy" data-copy="all" aria-label="Copiar bundle completo">
                <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
                Copiar
              </button>
            </div>
            <pre class="cdn__pre" data-slot="all"></pre>
          </li>
        </ol>
      </div>

      <div class="cdn__panel" role="tabpanel" id="panel-mirrors" data-panel="mirrors"
           aria-labelledby="tab-mirrors" hidden>
        <p class="cdn__hint">
          Un solo espejo por página (los imports relativos entre bundles no
          mezclan orígenes). Default: cerrar no aplica aquí — si jsDelivr
          cae, el boot prueba Pages.
        </p>
        <div class="cdn__mirrors" data-slot="mirror-list"></div>
        <div class="cdn__row" data-kind="boot">
          <div class="cdn__row-head">
            <span class="cdn__label">Boot con fallback · jsDelivr → Pages</span>
            <button type="button" class="cdn__copy" data-copy="boot" aria-label="Copiar boot con fallback">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="boot"></pre>
        </div>
      </div>

      <section class="cdn__agents" aria-label="Documentación para agentes">
        <header class="cdn__head">
          <h4 class="cdn__docs-title">Para agentes / LLM</h4>
          <p class="cdn__hint">
            Sin npm ni npx: el agente lee estos MD y consume el kit por CDN.
          </p>
        </header>
        <div class="cdn__row" data-kind="llm-prompt">
          <div class="cdn__row-head">
            <span class="cdn__label">Prompt · usar kit por CDN</span>
            <button type="button" class="cdn__copy" data-copy="llm-prompt" aria-label="Copiar prompt para agentes">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="llm-prompt"></pre>
        </div>
        <section class="cdn__docs" data-slot="docs" hidden>
          <h5 class="cdn__docs-subtitle">Referencias MD</h5>
          <ul class="cdn__docs-list"></ul>
        </section>
      </section>
    </section>
  `;

  const OBSERVED = ['tag', 'category', 'base', 'title', 'dependencies', 'config'];

  class IsCdnSnippet extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #urls = { single: '', category: '', all: '', llmPrompt: LLM_PROMPT, boot: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];
    #docs = [];
    #resolvedRef = 'main';
    #mirrorId = readMirrorId();
    #tab = 'enlaces';
    #waitingCm = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      shadow.addEventListener('click', this.#onClick);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#mirrorId = readMirrorId();
      this.#render();
      resolveRef().then((ref) => {
        if (!this.#mounted) return;
        this.#resolvedRef = ref;
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      this.shadowRoot.addEventListener('slotchange', () => this.#render());
      document.addEventListener('is-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback() {
      this.#mounted = false;
      document.removeEventListener('is-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    #activeBase() {
      if (this.hasAttribute('base')) return this.getAttribute('base');
      return mirrorById(this.#mirrorId).base(this.#resolvedRef);
    }

    #parseConfig() {
      let raw = this.getAttribute('config');
      if (!raw) {
        const script = this.querySelector('script[type="application/json"][slot="config"]');
        raw = script?.textContent || '';
      }
      this.#docs = [];
      if (!raw.trim()) return null;
      try {
        const cfg = JSON.parse(raw) || {};
        if (Array.isArray(cfg.docs)) {
          this.#docs = cfg.docs
            .filter((d) => d && d.url)
            .map((d) => ({ label: String(d.label || 'Documentación'), url: String(d.url) }));
        }
        return cfg;
      } catch {
        return null;
      }
    }

    #renderDocs() {
      const section = this.shadowRoot.querySelector('[data-slot="docs"]');
      const list = section?.querySelector('.cdn__docs-list');
      if (!section || !list) return;
      section.hidden = this.#docs.length === 0;
      list.textContent = '';
      for (const doc of this.#docs) {
        const li = document.createElement('li');
        li.className = 'cdn__docs-row';
        li.innerHTML = `
          <span class="cdn__docs-label">${escapeHtml(doc.label)}</span>
          <a class="cdn__docs-url" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.url)}</a>
          <button type="button" class="cdn__copy" data-copy="doc" aria-label="Copiar enlace de ${escapeHtml(doc.label)}">
            <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
            Copiar
          </button>
        `;
        li.querySelector('[data-copy="doc"]').dataset.copyValue = doc.url;
        list.appendChild(li);
      }
    }

    #parseDeps() {
      let raw = this.getAttribute('dependencies');
      if (!raw) {
        const script = this.querySelector('script[type="application/json"][slot="deps"]');
        raw = script?.textContent || '';
      }
      if (!raw.trim()) { this.#deps = []; return; }
      try {
        const data = JSON.parse(raw);
        this.#deps = Array.isArray(data)
          ? data.filter((d) => d && (d.js || d.css)).map((d) => ({
              name: String(d.name || 'dependencia'),
              version: d.version ? String(d.version) : '',
              css: d.css ? String(d.css) : '',
              js: d.js ? String(d.js) : '',
              note: d.note ? String(d.note) : '',
            }))
          : [];
      } catch { this.#deps = []; }
    }

    #buildDepSnippet(dep) {
      const lines = [];
      if (dep.css) lines.push(`<link rel="stylesheet" href="${dep.css}">`);
      if (dep.js) lines.push(`<script src="${dep.js}"><\/script>`);
      return lines.join('\n');
    }

    #renderDeps() {
      const root = this.shadowRoot;
      const template = root.querySelector('[data-kind="dep"][hidden]');
      if (!template) return;
      for (const row of root.querySelectorAll('[data-kind="dep"]:not([hidden])')) row.remove();
      const list = root.querySelector('.cdn__list');
      for (const dep of this.#deps) {
        const clone = template.cloneNode(true);
        clone.hidden = false;
        const label = clone.querySelector('[data-slot="dep-name"]');
        if (label) label.textContent = dep.version ? `${dep.name}@${dep.version}` : dep.name;
        const pre = clone.querySelector('[data-slot="dep-pre"]');
        const snippet = this.#buildDepSnippet(dep);
        if (pre) pre.textContent = snippet;
        const note = clone.querySelector('[data-slot="dep-note"]');
        if (note) { note.textContent = dep.note; note.hidden = !dep.note; }
        const btn = clone.querySelector('[data-copy="dep"]');
        if (btn) btn.dataset.copyValue = snippet;
        list.insertBefore(clone, template);
      }
    }

    #buildBootSnippet() {
      const bases = fallbackBases(this.#resolvedRef);
      const tag = this.getAttribute('tag') || '';
      const category = this.getAttribute('category') || '';
      const fileTag = tag.replace(/^is-/, '');
      const entry = (tag && category)
        ? `${category}/${fileTag}.min.js`
        : 'all.min.js';

      return `<script type="module">
/* IS Web Components — boot con fallback de espejos.
   Orden: jsDelivr (pin) → GitHub Pages. Un solo origen gana. */
const MIRRORS = ${JSON.stringify(bases, null, 2)};
const ENTRY = ${JSON.stringify(entry)};

const loadCss = (href) => new Promise((resolve, reject) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.onload = () => resolve();
  link.onerror = () => reject(new Error(href));
  document.head.append(link);
});

let ok = false;
for (const base of MIRRORS) {
  try {
    await loadCss(base + '/is-base.min.css');
    await loadCss(base + '/palettes.min.css');
    await import(base + '/' + ENTRY);
    ok = true;
    break;
  } catch (err) {
    console.warn('[is-cdn] espejo falló', base, err);
  }
}
if (!ok) throw new Error('[is-cdn] ningún espejo respondió');
<\/script>`;
    }

    #buildUrls() {
      const base = this.#activeBase() || CDN_BASE_DEFAULT;
      const tag = this.getAttribute('tag');
      const category = this.getAttribute('category');
      const fileTag = (tag || '').replace(/^is-/, '');
      this.#urls = {
        common: `${base}/is-base.min.css`,
        commonPalette: `${base}/palettes.min.css`,
        single: (tag && category) ? `${base}/${category}/${fileTag}.min.js` : '',
        category: (tag && category) ? `${base}/${category}/category.${category}.min.js` : '',
        all: `${base}/all.min.js`,
        llmPrompt: LLM_PROMPT,
        boot: this.#buildBootSnippet(),
      };
    }

    #renderMirrorChips() {
      const root = this.shadowRoot;
      for (const slot of root.querySelectorAll('[data-slot="mirror-chips"], [data-slot="mirror-list"]')) {
        slot.textContent = '';
        for (const m of MIRRORS) {
          const base = m.base(this.#resolvedRef);
          if (slot.dataset.slot === 'mirror-chips') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cdn__chip';
            btn.dataset.mirror = m.id;
            btn.setAttribute('aria-pressed', String(m.id === this.#mirrorId));
            btn.innerHTML = `<span class="cdn__chip-label">${escapeHtml(m.label)}</span>`;
            if (m.id === this.#mirrorId) btn.classList.add('is-active');
            slot.appendChild(btn);
          } else {
            const row = document.createElement('div');
            row.className = 'cdn__mirror-card';
            row.dataset.mirror = m.id;
            if (m.id === this.#mirrorId) row.classList.add('is-active');
            row.innerHTML = `
              <div class="cdn__mirror-head">
                <strong>${escapeHtml(m.label)}</strong>
                <span class="cdn__mirror-hint">${escapeHtml(m.hint)}</span>
                <button type="button" class="cdn__chip" data-mirror="${escapeHtml(m.id)}"
                        aria-pressed="${m.id === this.#mirrorId}">
                  ${m.id === this.#mirrorId ? 'Activo' : 'Usar'}
                </button>
              </div>
              <code class="cdn__mirror-base">${escapeHtml(base)}</code>
            `;
            slot.appendChild(row);
          }
        }
      }
    }

    #syncTabs() {
      const root = this.shadowRoot;
      for (const tab of root.querySelectorAll('.cdn__tab')) {
        const on = tab.dataset.tab === this.#tab;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }
      for (const panel of root.querySelectorAll('[data-panel]')) {
        panel.hidden = panel.dataset.panel !== this.#tab;
      }
    }

    #render() {
      const root = this.shadowRoot;
      if (!root) return;
      const tag = this.getAttribute('tag') || '';
      const category = this.getAttribute('category') || '';
      this.#buildUrls();
      this.#syncTabs();
      this.#renderMirrorChips();

      const titleEl = root.querySelector('.cdn__title');
      const fileTagEl = root.querySelector('[data-slot="fileTag"]');
      const catLabelEl = root.querySelector('[data-slot="category"]');
      const commonPre = root.querySelector('[data-slot="common"]');
      const singlePre = root.querySelector('[data-slot="single"]');
      const catPre = root.querySelector('[data-slot="category-pre"]');
      const allPre = root.querySelector('[data-slot="all"]');
      const llmPromptPre = root.querySelector('[data-slot="llm-prompt"]');
      const bootPre = root.querySelector('[data-slot="boot"]');

      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      if (fileTagEl) fileTagEl.textContent = (tag && category) ? `${category}/${tag.replace(/^is-/, '')}.min.js` : '—';
      if (catLabelEl) catLabelEl.textContent = category ? `${category}/category.${category}.min.js` : '—';

      const mkCss = (url) => url ? `<link rel="stylesheet" href="${escapeHtml(url)}">` : '';
      const mkJs = (url) => url ? `<script type="module" src="${escapeHtml(url)}"><\/script>` : '—';

      const commonSnippet = [mkCss(this.#urls.common), mkCss(this.#urls.commonPalette)].join('\n');
      if (commonPre) commonPre.innerHTML = escapeHtml(commonSnippet);
      if (singlePre) singlePre.innerHTML = escapeHtml(mkJs(this.#urls.single));
      if (catPre) catPre.innerHTML = escapeHtml(mkJs(this.#urls.category));
      if (allPre) allPre.innerHTML = escapeHtml(mkJs(this.#urls.all));
      if (llmPromptPre) llmPromptPre.innerHTML = escapeHtml(this.#urls.llmPrompt);
      if (bootPre) bootPre.innerHTML = escapeHtml(this.#urls.boot);

      const singleRow = root.querySelector('[data-kind="single"]');
      if (singleRow) singleRow.hidden = !tag;

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#renderDocs();

      this.#parseDeps();
      this.#renderDeps();
      this.#highlight();
    }

    #highlight() {
      if (!cmReady()) {
        if (this.#waitingCm) return;
        this.#waitingCm = true;
        document.addEventListener(CODEMIRROR_READY, () => {
          this.#waitingCm = false;
          this.#highlight();
        }, { once: true });
        return;
      }
      this.#adoptCodeMirrorCss();
      for (const pre of this.shadowRoot.querySelectorAll('.cdn__pre')) {
        if (!pre.textContent.trim()) continue;
        if (pre.dataset.slot === 'llm-prompt') continue;
        pre.classList.add('code');
        pre.dataset.cmMode = 'htmlmixed';
        delete pre.dataset.cm;
        delete pre.dataset.cmSource;
        paint(pre);
      }
    }

    #adoptCodeMirrorCss() {
      const hrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map((l) => l.href)
        .filter((h) => /codemirror/i.test(h));
      for (const href of hrefs) {
        if (this.shadowRoot.querySelector(`link[href="${href}"]`)) continue;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        this.shadowRoot.prepend(link);
      }
    }

    #onClick = async (e) => {
      const tab = e.target.closest('.cdn__tab');
      if (tab?.dataset.tab) {
        this.#tab = tab.dataset.tab;
        this.#syncTabs();
        return;
      }

      const chip = e.target.closest('[data-mirror]');
      if (chip?.dataset.mirror) {
        this.#mirrorId = chip.dataset.mirror;
        writeMirrorId(this.#mirrorId);
        this.#render();
        return;
      }

      const btn = e.target.closest('.cdn__copy');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      const asCss = (u) => (u ? `<link rel="stylesheet" href="${u}">` : '');
      const asJs = (u) => (u ? `<script type="module" src="${u}"><\/script>` : '');
      let text = '';
      if (kind === 'dep' || kind === 'doc') {
        text = btn.dataset.copyValue || '';
      } else if (kind === 'llm-prompt') {
        text = this.#urls.llmPrompt || LLM_PROMPT;
      } else if (kind === 'boot') {
        text = this.#urls.boot || this.#buildBootSnippet();
      } else if (kind === 'common') {
        text = [asCss(this.#urls.common), asCss(this.#urls.commonPalette)].filter(Boolean).join('\n');
      } else {
        text = asJs(this.#urls[kind]);
      }
      if (!text) return;
      await copyText(text);
      const original = btn.innerHTML;
      btn.innerHTML = '<is-icon icon="mdi:check" aria-hidden="true"></is-icon> Copiado';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('is-copied');
      }, 1200);
    };
  }

  if (!customElements.get('is-cdn-snippet')) {
    customElements.define('is-cdn-snippet', IsCdnSnippet);
  }
  if (typeof window !== 'undefined') {
    window.IsCdnSnippet = IsCdnSnippet;
  }
})();
