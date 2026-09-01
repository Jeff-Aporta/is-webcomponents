import { defineElement } from '../../core/element.js';
import { createObserverElement } from './observer.js';

/**
 * <is-mutation-observer> — alias histórico de <is-observer type="mutation">.
 *
 * display:contents — observa mutaciones en el host y sus hijos.
 *
 * Atributos (booleanos salvo attr)
 *   disabled         boolean
 *   attr             string — filtro de atributos
 *   child-list       boolean (default true)
 *   character-data   boolean
 *
 * Eventos
 *   is-mutate  detail: { records }
 */

defineElement(
  'is-mutation-observer',
  createObserverElement('mutation'),
  'IsMutationObserver',
);
