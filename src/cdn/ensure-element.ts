/**
 * ensure-element — asegura que un custom element esté definido (lazy CDN).
 *
 * Preferir `ISWebComponentsLoader.ensure(tag)`: usa catálogo + app registry.
 * Este módulo sirve como helper suelto si la app no quiere el loader completo.
 */

import type { EnsureElementOpts } from "./ensure-element.schemas.js";

/** Pedidos por `tag|href`: en vuelo o ya resueltos con éxito (nunca se repite una carga lograda). */
const inflight = new Map<string, Promise<boolean>>();

/** Respuesta compartida para un tag ya definido: sin trabajo ni promesa nueva por llamada. */
const LISTO: Promise<boolean> = Promise.resolve(true);
const VACIO: Promise<boolean> = Promise.resolve(false);

export function isElementReady(tag: string): boolean {
  const name = String(tag || '').trim().toLowerCase();
  return typeof customElements !== 'undefined' && Boolean(name && customElements.get(name));
}

/**
 * Deja `tag` definido. Idempotente y barato: si ya está definido responde al instante;
 * si hay una carga en vuelo (o una ya lograda) devuelve esa misma promesa; nunca vuelve a
 * pedir ni evaluar el módulo. Solo un intento fallido se puede reintentar.
 */
export function ensureElement(tag: string, opts: EnsureElementOpts = {}): Promise<boolean> {
  const name = String(tag || '').trim().toLowerCase();
  if (!name) return VACIO;
  if (isElementReady(name)) return LISTO;

  const key = `${name}|${opts.href || ''}`;
  const prev = inflight.get(key);
  if (prev) return prev;

  const job = (async (): Promise<boolean> => {
    if (typeof opts.load === 'function') {
      await opts.load();
    } else if (opts.href) {
      if (typeof document === 'undefined') return false;
      const href = opts.href;
      const already = [...document.scripts].some((s) => (s.src || '') === href)
        || [...document.querySelectorAll<HTMLScriptElement>('script[type="module"]')].some(
          (s: HTMLScriptElement) => (s.getAttribute('src') || '') === href,
        );
      if (!already) {
        await new Promise<void>((resolve, reject) => {
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
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout ${name}`)), timeoutMs)),
      ]);
    } catch {
      /* ignore */
    }
    return isElementReady(name);
  })()
    .then((ok) => {
      if (!ok) inflight.delete(key);
      return ok;
    }, (err: unknown) => {
      inflight.delete(key);
      console.warn('[ensure-element]', name, err);
      return false;
    });

  inflight.set(key, job);
  return job;
}
