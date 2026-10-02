import { defineElement } from '../../core/element.js';
import { createObserverElement } from './observer.js';

/**
 * <iswc-mutation-observer> — alias histórico de <iswc-observer type="mutation">.
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
 *   iswc-mutate  detail: { records }
 */

defineElement(
  'iswc-mutation-observer',
  createObserverElement('mutation'),
  'IswcMutationObserver',
);
