import { defineElement } from '../../core/element.js';
import { createObserverElement } from './observer.js';

/**
 * <iswc-resize-observer> — alias histórico de <iswc-observer type="resize">.
 *
 * display:contents — observa hijos directos con ResizeObserver.
 *
 * Atributos
 *   disabled  boolean
 *
 * Eventos
 *   iswc-resize  detail: { entries }
 */

defineElement(
  'iswc-resize-observer',
  createObserverElement('resize'),
  'IswcResizeObserver',
);
