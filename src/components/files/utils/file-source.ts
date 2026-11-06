/** Contrato src|content de la familia file-preview (S-FP1). */

/** Si ambos llegan, gana content. */
import type { FileSource } from '@jeff-aporta/iswc-base/components/files/schemas/file-source.schemas.js';


// ── load-cdn ──
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

// ── file-source ──
export function resolveFileSource(
  src: string | null | undefined,
  content: string | null | undefined,
): FileSource {
  if (content != null && String(content) !== '') {
    return { kind: 'content', content: String(content) };
  }
  if (src != null && String(src) !== '') {
    return { kind: 'src', src: String(src) };
  }
  return { kind: 'empty' };
}

export async function loadText(source: FileSource): Promise<string> {
  if (source.kind === 'empty') return '';
  if (source.kind === 'content') return source.content;
  const r = await fetch(source.src);
  if (!r.ok) {
    const err = new Error(`fetch ${r.status}`) as Error & { reason: string };
    err.reason = 'fetch';
    throw err;
  }
  return r.text();
}

/** content: data-URL, base64 puro, o texto (UTF-8 bytes). */
export async function loadArrayBuffer(source: FileSource): Promise<ArrayBuffer> {
  if (source.kind === 'empty') return new ArrayBuffer(0);
  if (source.kind === 'content') {
    const c = source.content;
    if (c.startsWith('data:')) {
      const r = await fetch(c);
      return r.arrayBuffer();
    }
    try {
      const bin = atob(c);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    } catch {
      return new TextEncoder().encode(c).buffer;
    }
  }
  const r = await fetch(source.src);
  if (!r.ok) {
    const err = new Error(`fetch ${r.status}`) as Error & { reason: string };
    err.reason = 'fetch';
    throw err;
  }
  return r.arrayBuffer();
}

export function blobUrlFromBuffer(buf: ArrayBuffer, mime: string): string {
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}
