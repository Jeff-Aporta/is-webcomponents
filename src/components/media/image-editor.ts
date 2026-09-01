import { adoptCss, defineElement, emit } from '../../core/element.js';

/**
 * <is-image-editor> — Editor de imagen con crop, zoom y rotación.
 *
 * Atributos
 *   src        URL de la imagen a editar (requerido)
 *   zoom       factor 1 = 100%, default 1
 *   rotation   grados, default 0
 *   aspect     relación del crop: "1", "4/3", "16/9" o "" (libre)
 *
 * Slot
 *   toolbar — botones con data-action="zoom-in"|"zoom-out"|"rotate" |
 *             "rotate-ccw" | "reset" | "crop" para delegar acciones.
 *
 * API
 *   editor.image    HTMLImageElement cargado
 *   editor.crop({x, y, width, height})   coordenadas en píxeles de imagen
 *   editor.cropped   dataURL actual (tras aplicar zoom + rotation + crop)
 *   editor.applyZoom(delta)   editor.applyRotation(deg)
 *
 * Eventos
 *   is-load       detail: { image }
 *   is-change     detail: { crop }
 *   is-crop       detail: { dataURL, crop }
 */
(() => {
  const OBSERVED = ['src', 'zoom', 'rotation', 'aspect'];

  class IsImageEditor extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #img = null;
    #cropRect = { x: 0, y: 0, width: 0, height: 0 };
    #drag = null;
    #ro;
    #onWinMove;
    #onWinUp;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <div part="viewport" class="viewport">
            <canvas part="canvas" class="canvas" aria-label="Lienzo del editor"></canvas>
            <div part="selection" class="selection" hidden>
              <span class="handle nw" data-handle="nw"></span>
              <span class="handle ne" data-handle="ne"></span>
              <span class="handle sw" data-handle="sw"></span>
              <span class="handle se" data-handle="se"></span>
            </div>
          </div>
          <div part="toolbar" class="toolbar">
            <slot name="toolbar"></slot>
          </div>
          <output part="status" class="status"></output>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#canvas = this.shadowRoot!.querySelector<HTMLElement>('.canvas')!;
      this.#viewport = this.shadowRoot!.querySelector<HTMLElement>('.viewport')!;
      this.#selection = this.shadowRoot!.querySelector<HTMLElement>('.selection')!;
      this.#status = this.shadowRoot!.querySelector<HTMLElement>('.status')!;

      this.#canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
      this.#onWinMove = (e) => this.#onMove(e);
      this.#onWinUp = () => this.#endDrag();

      this.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'zoom-in')   this.applyZoom(0.1);
        if (action === 'zoom-out')  this.applyZoom(-0.1);
        if (action === 'rotate')    this.applyRotation(90);
        if (action === 'rotate-ccw') this.applyRotation(-90);
        if (action === 'reset')     { this.zoom = 1; this.rotation = 0; }
        if (action === 'crop')      this.cropped();
      });
    }

    connectedCallback(): void {
      this.#mounted = true;
      this.#ro = new ResizeObserver(() => this.#draw());
      this.#ro.observe(this.#viewport);
      if (this.hasAttribute('src')) this.#load(this.getAttribute('src'));
      window.addEventListener('pointermove', this.#onWinMove);
      window.addEventListener('pointerup', this.#onWinUp);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#ro?.disconnect();
      window.removeEventListener('pointermove', this.#onWinMove);
      window.removeEventListener('pointerup', this.#onWinUp);
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'src') this.#load(newVal);
      if (name === 'zoom' || name === 'rotation') this.#draw();
    }

    get zoom() { return Number(this.getAttribute('zoom')) || 1; }
    set zoom(v) {
      const n = Math.max(0.1, Math.min(8, Number(v) || 1));
      this.setAttribute('zoom', String(n));
    }
    get rotation() { return Number(this.getAttribute('rotation')) || 0; }
    set rotation(v) {
      const n = ((Number(v) || 0) % 360 + 360) % 360;
      this.setAttribute('rotation', String(n));
    }

    applyZoom(delta) { this.zoom = this.zoom + delta; }
    applyRotation(deg) { this.rotation = this.rotation + deg; }

    /** Devuelve el recorte como dataURL (image/png). */
    cropped() {
      if (!this.#img || !this.#cropRect.width) return null;
      const r = this.#cropRect;
      const cv = document.createElement('canvas');
      cv.width = Math.round(r.width);
      cv.height = Math.round(r.height);
      const ctx = cv.getContext('2d');
      ctx.drawImage(this.#img, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), 0, 0, cv.width, cv.height);
      const url = cv.toDataURL('image/png');
      emit(this, 'is-crop', { dataURL: url, crop: { ...r } });
      return url;
    }

    #load(src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.#img = img;
        // crop inicial centrado cubriendo 80%
        const cxp = img.width / 2;
        const cyp = img.height / 2;
        const w = img.width * 0.8;
        const h = img.height * 0.8;
        this.#cropRect = { x: cxp - w / 2, y: cyp - h / 2, width: w, height: h };
        emit(this, 'is-load', { image: img });
        this.#draw();
      };
      img.onerror = () => { this.#status.textContent = 'No se pudo cargar la imagen'; };
      img.src = src;
    }

    #draw() {
      const img = this.#img;
      if (!img) return;
      const cw = Math.max(this.#viewport.clientWidth, 1);
      const ch = Math.max(this.#viewport.clientHeight, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.#canvas.width = cw * dpr;
      this.#canvas.height = ch * dpr;
      this.#canvas.style.width = `${cw}px`;
      this.#canvas.style.height = `${ch}px`;
      const ctx = this.#canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = 'transparent';
      ctx.save();
      const z = this.zoom;
      const rot = this.rotation * Math.PI / 180;
      const base = Math.min(cw / img.width, ch / img.height);
      const scale = base * z;
      const w = img.width * scale;
      const h = img.height * scale;
      const cx = cw / 2;
      const cy = ch / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
      // dibujar crop overlay como un path con hueco
      const on = this.#screenRect();
      if (on) this.#drawSelectionMask(ctx, cw, ch, on);
      this.#selection.hidden = !on;
      if (on) {
        this.#selection.style.left = `${on.x}px`;
        this.#selection.style.top = `${on.y}px`;
        this.#selection.style.width = `${on.width}px`;
        this.#selection.style.height = `${on.height}px`;
      }
      this.#status.textContent = `${img.naturalWidth}×${img.naturalHeight}px · zoom ${(z * 100).toFixed(0)}% · ${this.rotation}°`;
    }

    #screenRect() {
      const img = this.#img;
      if (!img) return null;
      const cw = this.#viewport.clientWidth;
      const ch = this.#viewport.clientHeight;
      const base = Math.min(cw / img.width, ch / img.height);
      const scale = base * this.zoom;
      const w = img.width * scale;
      const h = img.height * scale;
      const cx = cw / 2;
      const cy = ch / 2;
      const rot = this.rotation * Math.PI / 180;
      const r = this.#cropRect;
      const corners = [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
      ].map(({ x, y }) => {
        // invierte la transformación aplicada (escala + rotación + traslación inversa)
        const dx = (x - img.width / 2) * scale;
        const dy = (y - img.height / 2) * scale;
        const xr = dx * Math.cos(rot) - dy * Math.sin(rot);
        const yr = dx * Math.sin(rot) + dy * Math.cos(rot);
        return { x: cx + xr, y: cy + yr };
      });
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }

    #drawSelectionMask(ctx, W, H, r) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(r.x + r.width, r.y, -r.width, r.height);
      ctx.fill('evenodd');
      ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--is-accent').trim() || '#339af0';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);
      ctx.restore();
    }

    // Eventos de drag (mover crop)
    #onDown(e) {
      const handle = e.target.closest('[data-handle]');
      const on = this.#screenRect();
      if (!on) return;
      const aspect = this.getAttribute('aspect');
      this.#drag = {
        handle: handle ? handle.dataset.handle : 'move',
        startX: e.clientX, startY: e.clientY,
        origRect: { ...this.#cropRect },
        origScreenRect: on,
        aspect: aspect ? evalAspect(aspect) : null,
      };
      this.#canvas.setPointerCapture(e.pointerId);
    }

    #onMove(e) {
      if (!this.#drag || !this.#img) return;
      const dx = e.clientX - this.#drag.startX;
      const dy = e.clientY - this.#drag.startY;
      const cs = this.#drag.origScreenRect;
      const ar = this.#drag.aspect;

      let { x, y, width, height } = this.#drag.origRect;

      // convertir pixel-deltas a delta-en-imagen
      const cw = this.#viewport.clientWidth;
      const ch = this.#viewport.clientHeight;
      const base = Math.min(cw / this.#img.width, ch / this.#img.height);
      const scale = base * this.zoom;
      const rot = this.rotation * Math.PI / 180;
      const cosA = Math.cos(-rot);
      const sinA = Math.sin(-rot);
      const ldx = (dx * cosA - dy * sinA) / scale;
      const ldy = (dx * sinA + dy * cosA) / scale;

      switch (this.#drag.handle) {
        case 'move':  { x += ldx; y += ldy; break; }
        case 'se':    { width += ldx; height += ldy; break; }
        case 'sw':    { x += ldx; width -= ldx; height += ldy; break; }
        case 'ne':    { width += ldx; y += ldy; height -= ldy; break; }
        case 'nw':    { x += ldx; y += ldy; width -= ldx; height -= ldy; break; }
      }

      // aspect lock
      if (ar && this.#drag.handle !== 'move') {
        if (Math.abs(width / height - ar) > 0.001) {
          // ajustar usando width como referencia
          const newH = width / ar;
          if (this.#drag.handle === 'nw' || this.#drag.handle === 'sw') {
            y += (height - newH);
          }
          height = newH;
        }
      }

      // clamp tamaño mínimo
      if (width < 8) width = 8;
      if (height < 8) height = 8;

      // clamp a los bordes de la imagen
      x = Math.max(0, Math.min(x, this.#img.width - 8));
      y = Math.max(0, Math.min(y, this.#img.height - 8));
      width = Math.min(width, this.#img.width - x);
      height = Math.min(height, this.#img.height - y);

      this.#cropRect = { x, y, width, height };
      this.#draw();
      emit(this, 'is-change', { crop: { ...this.#cropRect } });
    }

    #endDrag() {
      this.#drag = null;
    }

    #canvas!: HTMLElement;
    #viewport!: HTMLElement;
    #selection!: HTMLElement;
    #status!: HTMLElement;
  }

  function evalAspect(s: string) {
    if (!s) return null;
    const [a, b] = s.split('/').map(Number);
    if (!b) return a > 0 ? a : null;
    return a / b;
  }

  defineElement('is-image-editor', IsImageEditor);
})();
