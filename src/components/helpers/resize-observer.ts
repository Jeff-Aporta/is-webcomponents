import { defineElement } from '../../core/element.js';
import { createObserverElement } from './observer.js';

/**
 * <is-resize-observer> — alias histórico de <is-observer type="resize">.
 *
 * display:contents — observa hijos directos con ResizeObserver.
 *
 * Atributos
 *   disabled  boolean
 *
 * Eventos
 *   is-resize  detail: { entries }
 */

defineElement(
  'is-resize-observer',
  createObserverElement('resize'),
  'IsResizeObserver',
);
