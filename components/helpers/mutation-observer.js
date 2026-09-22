/**
 * <is-mutation-observer> — Alias de <is-observer type="mutation">.
 *
 * Conserva el nombre histórico para no romper consumidores existentes.
 * El componente canónico vive en observer.js. Para código nuevo, usa
 * directamente <is-observer type="mutation">.
 */
import { createObserverElement } from './observer.js';

const IsMutationObserver = createObserverElement('mutation');

if (!customElements.get('is-mutation-observer')) {
  customElements.define('is-mutation-observer', IsMutationObserver);
}
if (typeof window !== 'undefined') window.IsMutationObserver = IsMutationObserver;