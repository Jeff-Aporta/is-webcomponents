/** Carga <iconify-icon> desde el CDN una sola vez por documento. */

const ICONIFY_SRC = 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js';
let iconifyReady = null;

export function ensureIconify() {
  if (customElements.get('iconify-icon')) return Promise.resolve();
  if (iconifyReady) return iconifyReady;
  iconifyReady = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((s) => s.src.includes('iconify-icon'));
    if (existing) {
      customElements.whenDefined('iconify-icon').then(resolve, reject);
      return;
    }
    const el = document.createElement('script');
    el.src = ICONIFY_SRC;
    el.async = true;
    el.onload = () => customElements.whenDefined('iconify-icon').then(resolve, reject);
    el.onerror = () => reject(new Error('iconify-icon CDN failed'));
    document.head.appendChild(el);
  });
  return iconifyReady;
}
