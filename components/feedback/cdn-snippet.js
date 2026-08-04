import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml, copyText } from '../_shared/dom-utils.js';
import { resolveRef, jsdelivrBase } from '../_shared/cdn-ref.js';
import { CODEMIRROR_READY, isReady as cmReady, paint } from '../_shared/highlight-code.js';
import '../media/icon.js';

/**
 * <is-cdn-snippet> — panel con los enlaces CDN de un componente.
 *
 * Atributos
 *   tag         string  · p. ej. "is-button" (obligatorio)
 *   category    string  · p. ej. "actions"   (obligatorio para el bundle de categoría)
 *   base        string  · override del CDN_BASE (opcional)
 *   title       string  · título del panel (default "Consumo por CDN")
 *
 * Pinta 3 filas: archivo individual, bundle de categoría, bundle global.
 * Cada fila tiene su <pre> con el snippet y un botón "Copiar".
 *
 * Pensado para inyectarse al final de cada preview; el script de chrome
 * (`preview-chrome.js`) lo crea automáticamente leyendo tag+category del
 * `manifest.js` y el nombre del archivo actual.
 */
(() => {
  const CDN_BASE_DEFAULT = 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn';

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="Enlaces CDN">
      <header class="cdn__head">
        <h3 class="cdn__title">Consumo por CDN</h3>
        <p class="cdn__hint">
          Pega el snippet en tu HTML. Cada componente registra su propio tag
          en <code>window.customElements</code>.
        </p>
      </header>
      <ol class="cdn__list">
        <li class="cdn__row" data-kind="common">
          <div class="cdn__row-head">
            <span class="cdn__label">Común · base + paletas (una vez por página)</span>
            <button type="button" class="cdn__copy" data-copy="common" aria-label="Copiar enlaces comunes">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="common"></pre>
        </li>
        <li class="cdn__row" data-kind="single">
          <div class="cdn__row-head">
            <span class="cdn__label">Individual · <code data-slot="fileTag"></code></span>
            <button type="button" class="cdn__copy" data-copy="single" aria-label="Copiar enlace individual">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="single"></pre>
        </li>
        <li class="cdn__row" data-kind="category">
          <div class="cdn__row-head">
            <span class="cdn__label">Categoría · <code data-slot="category"></code></span>
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
            <span class="cdn__label">Bundle · <code>all.min.js</code> (todos los componentes)</span>
            <button type="button" class="cdn__copy" data-copy="all" aria-label="Copiar bundle completo">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="all"></pre>
        </li>
        <li class="cdn__row" data-kind="skill">
          <div class="cdn__row-head">
            <span class="cdn__label">Skill agentes · <code>npx skills add</code></span>
            <button type="button" class="cdn__copy" data-copy="skill" aria-label="Copiar comando de instalación de la skill">
              <is-icon icon="mdi:content-copy" aria-hidden="true"></is-icon>
              Copiar
            </button>
          </div>
          <pre class="cdn__pre" data-slot="skill"></pre>
          <p class="cdn__dep-note" data-slot="skill-note">
            Instala la skill <code>is-webcomponents</code> para Cursor / Claude Code / Copilot.
            Obliga a reusar tags <code>is-*</code> del kit en vez de reinventarlos.
          </p>
        </li>
      </ol>
      <section class="cdn__docs" data-slot="docs" hidden>
        <h4 class="cdn__docs-title">Documentación para LLM</h4>
        <ul class="cdn__docs-list"></ul>
      </section>
    </section>
  `;

  const OBSERVED = ['tag', 'category', 'base', 'title', 'dependencies', 'config'];

  class IsCdnSnippet extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #urls = { single: '', category: '', all: '', skill: '', skillCdn: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];
    #docs = [];
    #resolvedBase = '';
    #skillCmd = 'npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      shadow.addEventListener('click', this.#onCopy);
    }

    connectedCallback() {
      this.#mounted = true;
      this.#render();
      // El snippet debe salir congelado en un commit: `@main` cambia bajo los
      // pies de quien lo pegó. El SHA se pide en runtime (nunca se quema) y
      // al llegar se repinta; mientras tanto se ve la base en `main`.
      resolveRef().then((ref) => {
        if (!this.#mounted || this.hasAttribute('base')) return;
        this.#resolvedBase = jsdelivrBase(ref);
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      // El slot deps puede llegar después del connected (parser HTML).
      this.shadowRoot.addEventListener('slotchange', () => this.#render());
      // Al cambiar de tema hay que repintar: el shadow no lo alcanza
      // `reapplyTheme()`, que solo recorre el documento. (El caso "CodeMirror
      // todavia no cargo" lo cubre `#highlight()` con `is-codemirror-ready`.)
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

    /**
     * `config`: JSON con las personalizaciones del panel. Es OPCIONAL — sin
     * él el componente se comporta como siempre. Acepta el atributo o un
     * <script type="application/json" slot="config"> hijo, igual que `deps`,
     * porque un JSON largo dentro de un atributo es incómodo de escribir.
     *
     *   { "title": "…",
     *     "docs": [ { "label": "Categoría actions", "url": "https://…" } ] }
     *
     * `docs` son los enlaces a la documentación para LLM. Van aquí dentro y no
     * sueltos en la página para que cada snippet decida si los muestra.
     */
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
        // El enlace ES la URL: sin botón aparte, y con el color de marca.
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

    /** Deps: atributo `dependencies` (JSON) o slot deps con script JSON. */
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

    /** Snippet de una dep: <link> del css (si hay) + <script> del js. */
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
      // Limpiar filas dep previas (todas menos la plantilla oculta).
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

    #buildUrls() {
      const base = this.getAttribute('base') || this.#resolvedBase || CDN_BASE_DEFAULT;
      const tag = this.getAttribute('tag');
      const category = this.getAttribute('category');
      const fileTag = (tag || '').replace(/^is-/, '');
      // Skill publicada en dist/cdn/skills/ (mismo pin SHA que el resto del CDN).
      const skillDir = `${base}/skills/is-webcomponents`;
      this.#urls = {
        common: `${base}/is-base.min.css`,
        commonPalette: `${base}/palettes.min.css`,
        single: (tag && category) ? `${base}/${category}/${fileTag}.min.js` : '',
        category: (tag && category) ? `${base}/${category}/category.${category}.min.js` : '',
        all: `${base}/all.min.js`,
        skill: this.#skillCmd,
        skillCdn: skillDir,
      };
    }


    #render() {
      const root = this.shadowRoot;
      if (!root) return;
      const tag = this.getAttribute('tag') || '';
      const category = this.getAttribute('category') || '';
      this.#buildUrls();

      const titleEl = root.querySelector('.cdn__title');
      const fileTagEl = root.querySelector('[data-slot="fileTag"]');
      const catLabelEl = root.querySelector('[data-slot="category"]');
      const commonPre = root.querySelector('[data-slot="common"]');
      const singlePre = root.querySelector('[data-slot="single"]');
      const catPre = root.querySelector('[data-slot="category-pre"]');
      const allPre = root.querySelector('[data-slot="all"]');
      const skillPre = root.querySelector('[data-slot="skill"]');

      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      if (fileTagEl) fileTagEl.textContent = (tag && category) ? `${category}/${tag.replace(/^is-/, '')}.min.js` : '—';
      if (catLabelEl) catLabelEl.textContent = category ? `${category}/category.${category}.min.js` : '—';

      const mkCss = (url) => url ? `<link rel="stylesheet" href="${escapeHtml(url)}">` : '';
      const mkJs = (url) => url ? `<script type="module" src="${escapeHtml(url)}"><\/script>` : '—';

      // Sólo se enlazan los CSS globales: el .min.css de cada componente lo
      // carga adoptCss() en su shadow leyendo la ruta hermana del .min.js.
      const commonSnippet = [mkCss(this.#urls.common), mkCss(this.#urls.commonPalette)].join('\n');
      if (commonPre) commonPre.innerHTML = escapeHtml(commonSnippet);
      if (singlePre) singlePre.innerHTML = escapeHtml(mkJs(this.#urls.single));
      if (catPre) catPre.innerHTML = escapeHtml(mkJs(this.#urls.category));
      if (allPre) allPre.innerHTML = escapeHtml(mkJs(this.#urls.all));
      if (skillPre) {
        skillPre.innerHTML = escapeHtml([
          this.#urls.skill,
          '# espejo CDN (mismo commit que el kit)',
          `npx skills add ${this.#urls.skillCdn}`,
        ].join('\n'));
      }

      // Si no hay tag, ocultamos la fila individual para no mostrar placeholder inútil.
      const singleRow = root.querySelector('[data-kind="single"]');
      if (singleRow) singleRow.hidden = !tag;

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#renderDocs();

      this.#parseDeps();
      this.#renderDeps();
      // Tras pintar el texto: si CodeMirror ya cargo, colorear.
      this.#highlight();
    }


    /**
     * Resalta los <pre> del shadow con CodeMirror, igual que el resto de la
     * pagina. El pintor solo recorre el documento, asi que aqui hay que
     * llamarlo a mano Y meter el CSS del tema dentro del shadow: ninguna de
     * las dos cosas cruza la frontera del shadow DOM por si sola.
     *
     * El pintor entra por import estatico desde `_shared/` (no desde
     * `scripts/`: esto es un componente y esbuild lo inlinearia en el bundle
     * del CDN). Antes esto sondeaba hasta 40 veces esperando a que
     * `window.__isHighlightCode`, CodeMirror y su modo `htmlmixed`
     * aparecieran; ahora no hay sondeo: si CodeMirror aun no cargo, se
     * espera UNA vez al evento `is-codemirror-ready` que emite el
     * highlighter del docs. Si la pagina no carga CodeMirror (consumo por
     * CDN puro), el snippet se queda en texto plano, como antes.
     */
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
        pre.classList.add('code');
        pre.dataset.cmMode = 'htmlmixed';
        delete pre.dataset.cm;
        delete pre.dataset.cmSource;
        paint(pre);
      }
    }

    /** Evita registrar N listeners de `is-codemirror-ready` por render. */
    #waitingCm = false;

    /** Clona en el shadow las hojas de CodeMirror que ya usa el documento. */
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

    #onCopy = async (e) => {
      const btn = e.target.closest('.cdn__copy');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      const asCss = (u) => (u ? `<link rel="stylesheet" href="${u}">` : '');
      const asJs = (u) => (u ? `<script type="module" src="${u}"><\/script>` : '');
      let text = '';
      if (kind === 'dep' || kind === 'doc') {
        text = btn.dataset.copyValue || '';
      } else if (kind === 'skill') {
        text = this.#urls.skill || this.#skillCmd;
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
