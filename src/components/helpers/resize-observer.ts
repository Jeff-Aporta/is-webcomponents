// @contexto INDICE.md · src/components/helpers/resize-observer.md
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
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

define(createObserverElement('resize', 'iswc-resize-observer'), 'IswcResizeObserver');
