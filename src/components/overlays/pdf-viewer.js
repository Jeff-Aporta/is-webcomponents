import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-pdf-viewer> — Visor de PDF. Por defecto usa el visor nativo del navegador
 * (&lt;iframe type="application/pdf"&gt;); si necesitás features avanzadas
 * (search, thumbnails, text-layer), apuntá `engine="pdfjs"` y serví
 * pdf.js desde tu build pipeline.
 *
 * Atributos
 *   src         URL del PDF (requerido)
 *   page        número de página a saltar (1) — sólo aplica con engine=pdfjs
 *   zoom        nivel de zoom (1) — sólo engine=pdfjs
 *   engine      native (default) | pdfjs
 *   height      alto del iframe (default 80vh)
 *   download    boolean — muestra el botón "Descargar"
 *   print       boolean — muestra el botón "Imprimir"
 *
 * Eventos
 *   is-load    al finalizar la carga del PDF
 *   is-error   si el PDF no se pudo cargar
 *
 * Slot
 *   toolbar — contenido personalizado a la derecha de los botones
 */
(() => {
  const OBSERVED = ['src', 'page', 'zoom', 'engine', 'height', 'download', 'print'];

  class IsPdfViewer extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }
    #mounted = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="toolbar" class="toolbar">
            <span class="title"><slot name="title">Documento PDF</slot></span>
            <span class="spacer"></span>
            <button part="download" class="btn" id="dl" hidden>
              <span aria-hidden="true">⤓</span> Descargar
            </button>
            <button part="print" class="btn" id="print" hidden>
              <span aria-hidden="true">⎙</span> Imprimir
            </button>
            <slot name="toolbar"></slot>
          </div>
          <iframe part="frame" class="frame" id="frame" title="Visor PDF"></iframe>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#iframe = this.shadowRoot.getElementById('frame');
      this.#dl = this.shadowRoot.getElementById('dl');
      this.#print = this.shadowRoot.getElementById('print');
      this.#dl.addEventListener('click', () => this.#download());
      this.#print.addEventListener('click', () => this.#printIt());
    }

    connectedCallback() {
      this.#mounted = true;
      this.#sync();
      this.#iframe.addEventListener('load', () => this.dispatchEvent(new CustomEvent('is-load', { bubbles: true, composed: true })));
      this.#iframe.addEventListener('error', () => this.dispatchEvent(new CustomEvent('is-error', { bubbles: true, composed: true })));
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#sync();
    }

    get src() { return this.getAttribute('src'); }
    set src(v) { v == null ? this.removeAttribute('src') : this.setAttribute('src', v); }

    get currentPage() {
      try {
        const f = this.#iframe;
        const hash = new URL(f.src).hash;
        const m = hash.match(/page=(\d+)/);
        return m ? Number(m[1]) : 1;
      } catch { return 1; }
    }

    #sync() {
      const src = this.getAttribute('src');
      const engine = this.getAttribute('engine') || 'native';
      if (engine === 'pdfjs') {
        // pdfjs requiere bundling externo; dejamos el atributo en iframe para
        // que un wrapper externo (no nativo del componente) lo monte.
        this.#iframe.removeAttribute('type');
      } else {
        this.#iframe.setAttribute('type', 'application/pdf');
      }
      if (src) this.#iframe.src = src;
      this.#dl.hidden = !this.hasAttribute('download');
      this.#print.hidden = !this.hasAttribute('print');
      this.#iframe.style.height = this.getAttribute('height') || '80vh';
    }

    #download() {
      const a = document.createElement('a');
      a.href = this.getAttribute('src') || '';
      a.download = '';
      a.click();
    }

    #printIt() {
      try {
        this.#iframe.contentWindow?.focus();
        this.#iframe.contentWindow?.print();
      } catch { /* CORS may block; users can right-click → print */ }
    }

    #iframe;
    #dl;
    #print;
  }

  if (!customElements.get('is-pdf-viewer')) customElements.define('is-pdf-viewer', IsPdfViewer);
})();
