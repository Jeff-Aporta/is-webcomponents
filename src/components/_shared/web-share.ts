/**
 * Web Share: share nativo, si no copia URL/texto. AbortError = el usuario canceló.
 */

/** Tipado del payload que espera `navigator.share` — subset estricto. */

import type { ShareData, ShareResult, NativeShareData } from "./web-share.schemas.js";
export async function sharePayload(data: ShareData = {}): Promise<ShareResult> {
  const payload: NativeShareData = {
    title: data.title || document.title || '',
    text: data.text || '',
    url: data.url || '',
  };
  if (data.files?.length) payload.files = [...data.files];
  if (typeof navigator.share === 'function') {
    try {
      if (payload.files && typeof navigator.canShare === 'function' && !navigator.canShare({ files: payload.files })) {
        delete payload.files;
      }
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      const name = (err as { name?: unknown } | null)?.name;
      if (name === 'AbortError') return 'abort';
    }
  }
  const clip = payload.url || payload.text || payload.title;
  if (clip && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(clip);
      return 'copied';
    } catch { /* noop */ }
  }
  return 'fail';
}
