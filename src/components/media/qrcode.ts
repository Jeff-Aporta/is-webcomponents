import { adoptCss, defineElement, emit } from '../../core/element.js';

/**
 * <is-qrcode> — Generador de QR en SVG.
 *
 * Usa la librería externa `qrcode-generator` (Kazuhiko Arase, MIT) cargada
 * dinámicamente desde esm.sh. Sin CDN no funciona — la mantenemos como
 * única dependencia externa a propósito de mantener este bundle pequeño.
 *
 * Atributos
 *   value       texto a codificar (requerido)
 *   level      L | M | Q | H   nivel de corrección   (default L)
 *   cell        tamaño en píxeles de cada módulo (default 4)
 *   margin      módulos de zona de silencio (default 2)
 *   fg, bg     color de módulos y fondo (default currentColor / transparent)
 *
 * Eventos
 *   is-render   detail: { svg }
 *
 * API
 *   qr.svg       mismo nodo SVG
 *   qr.dataURL() dataURL del PNG
 */
(() => {
  const OBSERVED = ['value', 'level', 'cell', 'margin', 'fg', 'bg'];

  class IsQrCode extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #lib = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="canvas" class="canvas" id="canvas"></div>
          <output part="status" class="status"></output>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#canvas = this.shadowRoot!.getElementById('canvas')!;
      this.#status = this.shadowRoot!.querySelector<HTMLElement>('.status')!;
    }

    async connectedCallback(): Promise<void> {
      this.#mounted = true;
      await this.#ensureLib();
      this.#render();
    }

    async attributeChangedCallback() {
      if (this.#mounted && this.#lib) await this.#ensureLib().then(() => this.#render());
    }

    get svg() { return this.#canvas.querySelector<HTMLElement>('svg'); }

    dataURL(type = 'image/png') {
      const svg = this.svg;
      if (!svg) return null;
      return new Promise((resolve) => {
        const xml = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = img.width;
          cv.height = img.height;
          cv.getContext('2d').drawImage(img, 0, 0);
          resolve(cv.toDataURL(type));
        };
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(xml);
      });
    }

    async #ensureLib() {
      if (this.#lib) return this.#lib;
      this.#status.textContent = 'Cargando generador QR…';
      try {
        const mod = await import('https://esm.sh/qrcode-generator@1.4.4');
        this.#lib = mod.default || mod;
        this.#status.textContent = '';
      } catch (err) {
        this.#status.textContent = 'No se pudo cargar qrcode-generator (offline?)';
        throw err;
      }
      return this.#lib;
    }

    #render() {
      if (!this.#lib) return;
      const value = this.getAttribute('value');
      if (!value) { this.#canvas.innerHTML = ''; return; }
      const level = this.getAttribute('level') || 'L';
      const cellSize = Number(this.getAttribute('cell')) || 4;
      const margin = Number(this.getAttribute('margin'));
      const fg = this.getAttribute('fg') || 'currentColor';
      const bg = this.getAttribute('bg') || 'transparent';

      let qr;
      try {
        qr = this.#lib(0, level); // type-number 0 = auto
        qr.addData(value);
        qr.make();
      } catch (err) {
        this.#status.textContent = String(err.message || err);
        return;
      }

      const size = qr.getModuleCount();
      const side = (size + (margin || 0) * 2) * cellSize;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('xmlns', NS);
      svg.setAttribute('viewBox', `0 0 ${side} ${side}`);
      svg.setAttribute('width', String(side));
      svg.setAttribute('height', String(side));
      svg.setAttribute('role', 'img');
      if (bg !== 'transparent') {
        const bgRect = document.createElementNS(NS, 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', String(side));
        bgRect.setAttribute('height', String(side));
        bgRect.setAttribute('fill', bg);
        svg.appendChild(bgRect);
      }
      const fgPath = document.createElementNS(NS, 'path');
      const m = margin || 0;
      let d = '';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (qr.isDark(y, x)) d += `M${(x + m) * cellSize},${(y + m) * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`;
        }
      }
      fgPath.setAttribute('d', d);
      fgPath.setAttribute('fill', fg);
      svg.appendChild(fgPath);
      this.#canvas.innerHTML = '';
      this.#canvas.appendChild(svg);
      emit(this, 'is-render', { svg });
    }

    #canvas!: HTMLElement;
    #status!: HTMLElement;
  }

  defineElement('is-qrcode', IsQrCode);
})();
