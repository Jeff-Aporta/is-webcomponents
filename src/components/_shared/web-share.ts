/**
 * Web Share: share nativo, si no copia URL/texto. AbortError = el usuario canceló.
 */
export async function sharePayload(data = {}) {
  const payload = {
    title: data.title || document.title || '',
    text: data.text || '',
    url: data.url || '',
  };
  if (data.files?.length) payload.files = data.files;
  if (typeof navigator.share === 'function') {
    try {
      if (payload.files && typeof navigator.canShare === 'function' && !navigator.canShare({ files: payload.files })) {
        delete payload.files;
      }
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'abort';
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
