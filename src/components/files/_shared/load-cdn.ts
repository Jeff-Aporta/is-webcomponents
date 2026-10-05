/** Carga unica de scripts npm via jsDelivr. */
const pending = new Map<string, Promise<void>>();

export function loadCdnScript(src: string, globalCheck?: () => boolean): Promise<void> {
  if (globalCheck?.()) return Promise.resolve();
  const hit = pending.get(src);
  if (hit) return hit;
  const p = new Promise<void>((resolve, reject) => {
    if (globalCheck?.()) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      pending.delete(src);
      const err = new Error(`cdn ${src}`) as Error & { reason: string };
      err.reason = 'cdn';
      reject(err);
    };
    document.head.appendChild(s);
  });
  pending.set(src, p);
  return p;
}

export const MAMMOTH_CDN =
  'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';

export const PPTX_PREVIEW_CDN =
  'https://cdn.jsdelivr.net/npm/pptx-preview@1.0.5/dist/pptx-preview.umd.js';

export const JSZIP_CDN =
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
