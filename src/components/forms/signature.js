import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-signature> — Pad de firma manuscrita (touch + mouse). Exporta a PNG/SVG.
 *
 * Atributos
 *   width, height   dimensiones del canvas en píxeles (default 320 × 140)
 *   pen-color       color del trazo (default var(--is-text))
 *   line-width      grosor del trazo (default 2)
 *   background      color de fondo (default transparent)
 *   hint            texto placeholder cuando está vacío
 *
 * API
 *   pad.toDataURL(type = 'image/png')   devuelve PNG/SVG
 *   pad.toSVG()   SVG inline con los trazos
 *   pad.clear()   borra todo
 *   pad.isEmpty   boolean
 *
 * Eventos
 *   is-stroke-end   detail: { dataURL }
 *   is-change       detail: { strokes }
 */
(() => {
  const OBSERVED = ['width', 'height', 'pen-color', 'line-width', 'background', 'hint'];

  class IsSignature extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #strokes = []; // cada trazo: [{x, y}, ...]
    #current = null;
    #cancelled = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = /* html */ `
        <div part="root" class="root">
          <canvas part="canvas" class="canvas" aria-label="Pad de firma"></canvas>
          <div part="hint" class="hint">Firma aquí</div>
        </div>
      `;
      adoptCss(this.shadowRoot, import.meta.url);
      this.#canvas = this.shadowRoot.querySelector('.canvas');
      this.#hint = this.shadowRoot.querySelector('.hint');
      this.#ctx = this.#canvas.getContext('2d');

      this.#canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
      this.#canvas.addEventListener('pointermove', (e) => this.#onMove(e));
      this.#canvas.addEventListener('pointerup', (e) => this.#onUp(e));
      this.#canvas.addEventListener('pointercancel', (e) => this.#onUp(e));
      this.#canvas.addEventListener('pointerleave', (e) => this.#onUp(e));
    }

    connectedCallback() {
      this.#mounted = true;
      this.#resize();
      this.#paint();
    }

    disconnectedCallback() {
      this.#mounted = false;
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'width' || name === 'height') this.#resize();
      this.#paint();
    }

    get width() { return Number(this.getAttribute('width')) || 320; }
    get height() { return Number(this.getAttribute('height')) || 140; }

    get isEmpty() { return this.#strokes.length === 0; }

    clear() {
      this.#strokes = [];
      this.#paint();
      this.#syncHint();
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { strokes: this.#strokes } }));
    }

    toDataURL(type = 'image/png') {
      if (type === 'image/svg+xml') return 'data:' + type + ';utf8,' + encodeURIComponent(this.toSVG());
      return this.#canvas.toDataURL(type);
    }

    toSVG() {
      const w = this.#canvas.width;
      const h = this.#canvas.height;
      const strokes = this.#strokes.map((stroke) => {
        if (stroke.length < 2) return '';
        let d = `M ${stroke[0].x} ${stroke[0].y}`;
        for (let i = 1; i < stroke.length - 1; i++) {
          const xc = (stroke[i].x + stroke[i + 1].x) / 2;
          const yc = (stroke[i].y + stroke[i + 1].y) / 2;
          d += ` Q ${stroke[i].x} ${stroke[i].y} ${xc} ${yc}`;
        }
        d += ` T ${stroke[stroke.length - 1].x} ${stroke[stroke.length - 1].y}`;
        return `<path d="${d}" fill="none" stroke="${this.getAttribute('pen-color') || 'currentColor'}" stroke-width="${this.getAttribute('line-width') || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${strokes}</svg>`;
    }

    #resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.#canvas.width = this.width * dpr;
      this.#canvas.height = this.height * dpr;
      this.#canvas.style.width = `${this.width}px`;
      this.#canvas.style.height = `${this.height}px`;
      this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.style.setProperty('--_w', `${this.width}px`);
      this.style.setProperty('--_h', `${this.height}px`);
    }

    #paint() {
      const ctx = this.#ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      const bg = this.getAttribute('background');
      if (bg && bg !== 'transparent') {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);
      }
      const color = this.getAttribute('pen-color') || 'currentColor';
      const lw = Number(this.getAttribute('line-width')) || 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of this.#strokes) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length - 1; i++) {
          const xc = (stroke[i].x + stroke[i + 1].x) / 2;
          const yc = (stroke[i].y + stroke[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
        }
        ctx.lineTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
        ctx.stroke();
      }
    }

    #onDown(e) {
      e.preventDefault();
      this.#canvas.setPointerCapture(e.pointerId);
      const p = this.#localPoint(e);
      this.#current = [p];
      this.#strokes.push(this.#current);
    }

    #onMove(e) {
      if (!this.#current) return;
      const p = this.#localPoint(e);
      this.#current.push(p);
      // pinta incremental: último segmento
      const c = this.#current;
      const ctx = this.#ctx;
      if (c.length >= 2) {
        ctx.strokeStyle = this.getAttribute('pen-color') || 'currentColor';
        ctx.lineWidth = Number(this.getAttribute('line-width')) || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const a = c[c.length - 2];
        const b = c[c.length - 1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      this.#syncHint();
    }

    #onUp(e) {
      if (!this.#current) return;
      this.#current = null;
      this.dispatchEvent(new CustomEvent('is-stroke-end', { bubbles: true, composed: true, detail: { dataURL: this.toDataURL() } }));
      this.dispatchEvent(new CustomEvent('is-change', { bubbles: true, composed: true, detail: { strokes: this.#strokes } }));
    }

    #localPoint(e) {
      const r = this.#canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    #syncHint() {
      this.#hint.style.display = this.isEmpty ? '' : 'none';
      this.#hint.textContent = this.getAttribute('hint') || this.#hint.textContent;
    }

    #canvas;
    #ctx;
    #hint;
  }

  if (!customElements.get('is-signature')) customElements.define('is-signature', IsSignature);
})();
