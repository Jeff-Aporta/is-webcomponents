import { adoptCss } from '../_shared/adopt-css.js';
import { escapeHtml, copyText } from '../_shared/dom-utils.js';
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
 * `window.__IS_MANIFEST__` y el nombre del archivo actual.
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
      </ol>
    </section>
  `;

  const OBSERVED = ['tag', 'category', 'base', 'title', 'dependencies'];

  class IsCdnSnippet extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #urls = { single: '', category: '', all: '' };
    #onHighlightReady = () => this.#render();
    #deps = [];

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
      // El slot deps puede llegar después del connected (parser HTML).
      this.shadowRoot.addEventListener('slotchange', () => this.#render());
      // highlight-pre.js va con defer: puede no estar listo en el primer
      // render. Se reintenta al cargar la pagina y al cambiar de tema.
      window.addEventListener('load', this.#onHighlightReady);
      document.addEventListener('is-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback() {
      this.#mounted = false;
      window.removeEventListener('load', this.#onHighlightReady);
      document.removeEventListener('is-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
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
      const base = this.getAttribute('base') || CDN_BASE_DEFAULT;
      const tag = this.getAttribute('tag');
      const category = this.getAttribute('category');
      const fileTag = (tag || '').replace(/^is-/, '');
      this.#urls = {
        single:   (tag && category) ? `${base}/${category}/${fileTag}.min.js` : '',
        category: (tag && category) ? `${base}/${category}/category.${category}.min.js` : '',
        all:      `${base}/all.min.js`,
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
      const singlePre = root.querySelector('[data-slot="single"]');
      const catPre = root.querySelector('[data-slot="category-pre"]');
      const allPre = root.querySelector('[data-slot="all"]');

      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      if (fileTagEl) fileTagEl.textContent = (tag && category) ? `${category}/${tag.replace(/^is-/, '')}.min.js` : '—';
      if (catLabelEl) catLabelEl.textContent = category ? `${category}/category.${category}.min.js` : '—';

      const mk = (url) => url ? `<script type="module" src="${escapeHtml(url)}"><\/script>` : '—';
      if (singlePre) singlePre.innerHTML = escapeHtml(mk(this.#urls.single));
      if (catPre) catPre.innerHTML = escapeHtml(mk(this.#urls.category));
      if (allPre) allPre.innerHTML = escapeHtml(mk(this.#urls.all));

      // Si no hay tag, ocultamos la fila individual para no mostrar placeholder inútil.
      const singleRow = root.querySelector('[data-kind="single"]');
      if (singleRow) singleRow.hidden = !tag;

      this.#parseDeps();
      this.#renderDeps();
      // Tras pintar el texto: si CodeMirror ya cargo, colorear.
      this.#highlight();
    }


    /**
     * Resalta los <pre> del shadow con CodeMirror, igual que el resto de la
     * pagina. highlight-pre.js solo recorre el documento, asi que aqui hay
     * que llamarlo a mano Y meter el CSS del tema dentro del shadow: ninguna
     * de las dos cosas cruza la frontera del shadow DOM por si sola.
     */
    #highlight(intento = 0) {
      const paint = window.__isHighlightCode;
      // Hay que esperar a las DOS cosas: el pintor Y el propio CodeMirror.
      // El pintor puede existir antes que CodeMirror (van en scripts distintos
      // con `defer`) y en ese caso paint() sale sin hacer nada, dejando el
      // snippet sin color. Ademas este componente se auto-inyecta desde
      // preview-chrome, a veces DESPUES del evento load, asi que escuchar
      // solo a `load` tampoco bastaba.
      // ...y al MODO: los modos de CodeMirror (htmlmixed, xml…) son scripts
      // aparte del core. Con el modo sin cargar, runMode aplica el tema pero
      // no genera tokens y el snippet sale monocromo.
      const listo = typeof paint === 'function'
        && typeof window.CodeMirror?.runMode === 'function'
        && !!window.CodeMirror?.modes?.htmlmixed;
      if (!listo) {
        if (intento < 40) setTimeout(() => this.#highlight(intento + 1), 120);
        return;
      }
      this.#adoptCodeMirrorCss();
      for (const pre of this.shadowRoot.querySelectorAll('.cdn__pre')) {
        if (!pre.textContent.trim()) continue;
        pre.classList.add('code');
        pre.dataset.cmMode = 'htmlmixed';
        paint(pre);
      }
    }

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
      const text = kind === 'dep'
        ? (btn.dataset.copyValue || '')
        : (this.#urls[kind] ? `<script type="module" src="${this.#urls[kind]}"><\/script>` : '');
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
