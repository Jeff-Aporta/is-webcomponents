// @contexto INDICE.md · src/components/overlays/pdf-viewer.md
import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import {
  blobUrlFromBuffer,
  loadArrayBuffer,
  resolveFileSource,
} from '@jeff-aporta/iswc-base/components/files/utils/file-source.js';
import css from 'iswc:css';
import type { PdfViewerEventos } from './schemas/pdf-viewer.schemas.js';

/**
 * <iswc-pdf-viewer> — Visor de PDF. Por defecto usa el visor nativo del navegador
 * (&lt;iframe type="application/pdf"&gt;); si necesitás features avanzadas
 * (search, thumbnails, text-layer), apuntá `engine="pdfjs"` y serví
 * pdf.js desde tu build pipeline.
 *
 * Atributos
 *   src         URL del PDF
 *   content     payload inline (data-URL o base64); gana sobre src (familia files)
 *   page        número de página a saltar (1) — sólo aplica con engine=pdfjs
 *   zoom        nivel de zoom (1) — sólo engine=pdfjs
 *   engine      native (default) | pdfjs
 *   height      alto del iframe (default 80vh)
 *   download    boolean — muestra el botón "Descargar"
 *   print       boolean — muestra el botón "Imprimir"
 *
 * Eventos
 *   iswc-load    al finalizar la carga del PDF
 *   iswc-error   si el PDF no se pudo cargar
 *
 * Slot
 *   toolbar — contenido personalizado a la derecha de los botones
 */
(() => {
  const OBSERVED = ['src', 'content', 'page', 'zoom', 'engine', 'height', 'download', 'print'];

  class IswcPdfViewer extends IswcElement {
    static override tag = 'iswc-pdf-viewer';
    declare static events: PdfViewerEventos;
    static override css = css;
    static override deps = ['iswc-button', 'iswc-icon', 'iswc-empty-state'];

    static override observed = [...OBSERVED, 'shadow', 'bar-gap'];

    constructor() {
      super();
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root iswc-popover-panel" role="region" aria-label="Visor de PDF">
          <div part="toolbar" class="toolbar iswc-surface-bar" role="toolbar" aria-label="Controles del visor">
            <span class="title" id="pdf-title"><slot name="title">Documento PDF</slot></span>
            <span class="spacer"></span>
            <iswc-button part="download" class="btn" id="dl" variant="soft" color="text" aria-label="Descargar PDF" hidden>
              <iswc-icon slot="start" icon="mdi:download" aria-hidden="true"></iswc-icon>Descargar
            </iswc-button>
            <iswc-button part="print" class="btn" id="print" variant="soft" color="text" aria-label="Imprimir PDF" hidden>
              <iswc-icon slot="start" icon="mdi:printer-outline" aria-hidden="true"></iswc-icon>Imprimir
            </iswc-button>
            <slot name="toolbar"></slot>
          </div>
          <iframe part="frame" class="frame" id="frame"
            title="Visor PDF" role="document"></iframe>
          <iswc-empty-state part="empty" class="vacio" icono="mdi:file-pdf-box" titulo="Sin documento" texto="Indica un PDF con src o content." hidden></iswc-empty-state>
        </div>
      `;
      this.#iframe = this.shadowRoot!.getElementById('frame') as HTMLIFrameElement;
      this.#dl = this.shadowRoot!.getElementById('dl')!;
      this.#print = this.shadowRoot!.getElementById('print')!;
      this.#vacio = this.shadowRoot!.querySelector<HTMLElement>('.vacio')!;
      this.#dl.addEventListener('click', () => this.#download());
      this.#print.addEventListener('click', () => this.#printIt());
      this.#iframe.addEventListener('load', () => { if (this.#iframe.hasAttribute('src')) emit(this, 'iswc-load'); });
      this.#iframe.addEventListener('error', () => emit(this, 'iswc-error'));
    }

    override onConnected() {
      this.#sync();
      // Vincular el iframe con la cabecera (#pdf-title) para que el lector
      // de pantalla tenga un nombre accesible sincronizado con el titulo.
      this.#iframe.setAttribute('aria-labelledby', 'pdf-title');
    }

    override onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      this.#sync();
    }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }

    get currentPage() {
      try {
        const f = this.#iframe;
        const hash = new URL(f.src).hash;
        const m = hash.match(/page=(\d+)/);
        return m ? Number(m[1]) : 1;
      } catch { return 1; }
    }

    async #sync() {
      const gen = ++this.#syncGen;
      const engine = this.getAttribute('engine') || 'native';
      if (engine === 'pdfjs') {
        // pdfjs requiere bundling externo; dejamos el atributo en iframe para
        // que un wrapper externo (no nativo del componente) lo monte.
        this.#iframe.removeAttribute('type');
      } else {
        this.#iframe.setAttribute('type', 'application/pdf');
      }
      this.#dl.hidden = !this.hasAttribute('download');
      this.#print.hidden = !this.hasAttribute('print');
      this.#iframe.style.height = this.getAttribute('height') || '80vh';

      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      // Sin documento, un aviso en vez de un rectángulo en blanco.
      this.#vacio.hidden = source.kind !== 'empty';
      this.#iframe.hidden = source.kind === 'empty';
      if (source.kind === 'empty') {
        this.#revokeBlob();
        this.#iframe.removeAttribute('src');
        return;
      }
      try {
        let href: string;
        if (source.kind === 'content') {
          const buf = await loadArrayBuffer(source);
          if (gen !== this.#syncGen) return;
          this.#revokeBlob();
          this.#blobUrl = blobUrlFromBuffer(buf, 'application/pdf');
          href = this.#blobUrl;
        } else {
          this.#revokeBlob();
          href = source.src;
        }
        this.#iframe.src = href;
      } catch {
        if (gen !== this.#syncGen) return;
        emit(this, 'iswc-error', { reason: 'fetch' });
      }
    }

    #download() {
      const a = document.createElement('a');
      a.href = this.#blobUrl || this.getAttribute('src') || '';
      a.download = '';
      a.click();
    }

    #printIt() {
      try {
        this.#iframe.contentWindow?.focus();
        this.#iframe.contentWindow?.print();
      } catch { /* CORS may block; users can right-click → print */ }
    }

    #iframe!: HTMLIFrameElement;
    #dl!: HTMLElement;
    #print!: HTMLElement;
    #vacio!: HTMLElement;
    #blobUrl: string | null = null;
    #syncGen = 0;

    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    override onDisconnected() {
      this.#revokeBlob();
    }

    #revokeBlob() {
      if (this.#blobUrl) {
        URL.revokeObjectURL(this.#blobUrl);
        this.#blobUrl = null;
      }
    }
  }

  define(IswcPdfViewer);
})();
