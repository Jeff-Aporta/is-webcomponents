import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { setOptionalAttr, setStringAttr } from '@jeff-aporta/iswc-base/core/attrs.js';
import { escapeHtml } from '@jeff-aporta/iswc-base/core/dom.js';
import { loadArrayBuffer, resolveFileSource } from './utils/file-source.js';
import { pintarEstado, sincronizarAlto } from './utils/file-estado.js';
import { JSZIP_CDN, loadCdnScript, PPTX_PREVIEW_CDN } from './utils/load-cdn.js';
import type { ZipLike } from "./schemas/pptx-view.schemas.js";
import css from 'iswc:css';

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

  class IswcPptxView extends IswcElement {
    static tag = 'iswc-pptx-view';
    static css = css;
    static observed = OBSERVED;
    #stage!: HTMLElement;
    #gen = 0;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.innerHTML = `<div class="root" part="root"><div class="stage slides" part="stage"></div></div>`;
      this.#stage = shadow.querySelector('.stage')!;
    }

    onConnected() { sincronizarAlto(this); this.#reload(); }
    onAttributeChanged() { sincronizarAlto(this); this.#reload(); }

    get src() { return this.getAttribute('src'); }
    set src(v) { setOptionalAttr(this, 'src', v); }
    get content() { return this.getAttribute('content') ?? ''; }
    set content(v) { setStringAttr(this, 'content', v); }

    async #reload() {
      const gen = ++this.#gen;
      const source = resolveFileSource(this.getAttribute('src'), this.getAttribute('content'));
      if (source.kind === 'empty') {
        pintarEstado(this.#stage, 'Sin presentación');
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
          pintarEstado(this.#stage, 'Sin diapositivas legibles');
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
        pintarEstado(this.#stage, 'No se pudo previsualizar el PPTX', 'error');
        emit(this, 'iswc-error', { reason: (e as { reason?: string })?.reason || 'fetch' });
      }
    }
  }
  define(IswcPptxView);
})();
