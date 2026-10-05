import { adoptCss, defineElement, emit } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { loadArrayBuffer, resolveFileSource } from './_shared/file-source.js';
import { JSZIP_CDN, loadCdnScript, PPTX_PREVIEW_CDN } from './_shared/load-cdn.js';
import type { ZipLike } from "./pptx-view.schemas.js";

(() => {
  const OBSERVED = ['src', 'content', 'height'];

  async function extractSlides(buf: ArrayBuffer): Promise<string[]> {
    await loadCdnScript(JSZIP_CDN, () => !!(globalThis as { JSZip?: ZipLike }).JSZip);
    const JSZip = (globalThis as { JSZip?: ZipLike }).JSZip;
    if (!JSZip) throw Object.assign(new Error('jszip'), { reason: 'cdn' });
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const slides: string[] = [];
    for (const name of names) {
      const f = zip.file(name);
      if (!f) continue;
      const xml = await f.async('string');
      const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter(Boolean);
      slides.push(texts.join('\n') || '(diapositiva sin texto)');
    }
    return slides;
  }

  class IswcPptxView extends ElementBase {
    static get observedAttributes(): string[] { return OBSERVED; }
    #stage!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<div class="root" part="root"><div class="stage slides" part="stage"></div></div>`;
      adoptCss(shadow, import.meta.url);
      this.#stage = shadow.querySelector('.stage')!;
    }

    onConnected() { this.#reload(); }
    onAttributeChanged() { this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        this.#stage.innerHTML = '<p class="empty">Sin presentacion</p>';
        return;
      }
      try {
        const buf = await loadArrayBuffer(source);
        if (gen !== this.#gen) return;
        try {
          await loadCdnScript(PPTX_PREVIEW_CDN, () => !!(globalThis as { pptxPreview?: unknown }).pptxPreview);
        } catch { /* optional */ }
        const slides = await extractSlides(buf);
        if (gen !== this.#gen) return;
        if (!slides.length) {
          this.#stage.innerHTML = '<p class="empty">Sin diapositivas legibles</p>';
        } else {
          this.#stage.innerHTML = slides
            .map(
              (t, i) =>
                `<article class="slide" part="slide"><div class="slide-num">Diapositiva ${i + 1}</div><pre>${escapeHtml(t)}</pre></article>`,
            )
            .join('');
        }
        emit(this, 'iswc-load', { slides: slides.length });
      } catch (e) {
        if (gen !== this.#gen) return;
        this.#stage.innerHTML = '<p class="error">No se pudo previsualizar el PPTX</p>';
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  defineElement('iswc-pptx-view', IswcPptxView);
})();
