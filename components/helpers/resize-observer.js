/**
 * <is-resize-observer> — Alias de <is-observer type="resize">.
 *
 * Conserva el nombre histórico para no romper consumidores existentes.
 * El componente canónico vive en observer.js. Para código nuevo, usa
 * directamente <is-observer type="resize">.
 */
import { createObserverElement } from './observer.js';

const IsResizeObserver = createObserverElement('resize');

if (!customElements.get('is-resize-observer')) {
  customElements.define('is-resize-observer', IsResizeObserver);
}
if (typeof window !== 'undefined') window.IsResizeObserver = IsResizeObserver;