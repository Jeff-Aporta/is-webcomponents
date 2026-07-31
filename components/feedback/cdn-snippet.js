import { adoptCss } from '../_shared/adopt-css.js';
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

  const OBSERVED = ['tag', 'category', 'base', 'title'];

  class IsCdnSnippet extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #urls = { single: '', category: '', all: '' };

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
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    #buildUrls() {
      const base = this.getAttribute('base') || CDN_BASE_DEFAULT;
      const tag = this.getAttribute('tag');
      const category = this.getAttribute('category');
      const fileTag = (tag || '').replace(/^is-/, '');
      this.#urls = {
        single:   tag ? `${base}/${fileTag}.min.js` : '',
        category: (tag && category) ? `${base}/${category}.min.js` : '',
        all:      `${base}/all.min.js`,
      };
    }

    #escape(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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

      if (fileTagEl) fileTagEl.textContent = tag ? `${tag.replace(/^is-/, '')}.min.js` : '—';
      if (catLabelEl) catLabelEl.textContent = category ? `${category}.min.js` : '—';

      const mk = (url) => url ? `<script type="module" src="${this.#escape(url)}"><\/script>` : '—';
      if (singlePre) singlePre.innerHTML = this.#escape(mk(this.#urls.single));
      if (catPre) catPre.innerHTML = this.#escape(mk(this.#urls.category));
      if (allPre) allPre.innerHTML = this.#escape(mk(this.#urls.all));

      // Si no hay tag, ocultamos la fila individual para no mostrar placeholder inútil.
      const singleRow = root.querySelector('[data-kind="single"]');
      if (singleRow) singleRow.hidden = !tag;
    }

    #onCopy = async (e) => {
      const btn = e.target.closest('.cdn__copy');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      const url = this.#urls[kind];
      if (!url) return;
      const text = `<script type="module" src="${url}"><\/script>`;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
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
