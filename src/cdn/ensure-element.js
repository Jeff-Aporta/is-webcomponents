/**
 * ensure-element — asegura que un custom element esté definido (lazy CDN).
 *
 * Preferir `ISWebComponentsLoader.ensure(tag)`: usa catálogo + app registry.
 * Este módulo sirve como helper suelto si la app no quiere el loader completo.
 */

/** @type {Map<string, Promise<boolean>>} */
const inflight = new Map();

/**
 * @param {string} tag
 * @returns {boolean}
 */
export function isElementReady(tag) {
  const name = String(tag || '').trim().toLowerCase();
  return typeof customElements !== 'undefined' && Boolean(name && customElements.get(name));
}

/**
 * @param {string} tag
 * @param {{
 *   href?: string,
 *   load?: () => Promise<unknown>,
 *   timeoutMs?: number,
 * }} [opts]
 * @returns {Promise<boolean>}
 */
export function ensureElement(tag, opts = {}) {
  const name = String(tag || '').trim().toLowerCase();
  if (!name) return Promise.resolve(false);
  if (isElementReady(name)) return Promise.resolve(true);

  const key = `${name}|${opts.href || ''}`;
  const prev = inflight.get(key);
  if (prev) return prev;

  const job = (async () => {
    if (typeof document === 'undefined') return false;

    if (typeof opts.load === 'function') {
      await opts.load();
    } else if (opts.href) {
      const href = opts.href;
      const already = [...document.scripts].some((s) => (s.src || '') === href)
        || [...document.querySelectorAll('script[type="module"]')].some((s) => (s.getAttribute('src') || '') === href);
      if (!already) {
        await new Promise((resolve, reject) => {
          const el = document.createElement('script');
          el.type = 'module';
          el.src = href;
          el.onload = () => resolve();
          el.onerror = () => reject(new Error(`No se pudo cargar ${name}: ${href}`));
          document.head.appendChild(el);
        });
      }
    } else {
      return isElementReady(name);
    }

    try {
      const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 15000;
      await Promise.race([
        customElements.whenDefined(name),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${name}`)), timeoutMs)),
      ]);
    } catch {
      /* ignore */
    }
    return isElementReady(name);
  })()
    .catch((err) => {
      inflight.delete(key);
      console.warn('[ensure-element]', name, err);
      return false;
    });

  inflight.set(key, job);
  return job;
}
