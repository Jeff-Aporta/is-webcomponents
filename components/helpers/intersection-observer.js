/**
 * <is-intersection-observer> — Alias de <is-observer type="intersection">.
 *
 * Conserva el nombre histórico para no romper consumidores existentes.
 * El componente canónico vive en observer.js. Para código nuevo, usa
 * directamente <is-observer type="intersection">.
 */
import { createObserverElement } from './observer.js';

const IsIntersectionObserver = createObserverElement('intersection');

if (!customElements.get('is-intersection-observer')) {
  customElements.define('is-intersection-observer', IsIntersectionObserver);
}
if (typeof window !== 'undefined') window.IsIntersectionObserver = IsIntersectionObserver;