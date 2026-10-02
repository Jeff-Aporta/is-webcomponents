import { defineElement } from '../../core/element.js';
import { createObserverElement } from './observer.js';

/**
 * <iswc-intersection-observer> — alias histórico de <iswc-observer type="intersection">.
 *
 * display:contents — observa hijos directos con IntersectionObserver.
 *
 * Atributos
 *   disabled         boolean
 *   intersect-class  string — clase a togglear en el hijo
 *   once             boolean — deja de observar tras primera intersección
 *   root             string — selector del root (closest → shadow → document; default viewport)
 *   root-margin      string
 *   threshold        number 0–1
 *
 * Eventos
 *   iswc-intersect  detail: { entry }
 */

defineElement(
  'iswc-intersection-observer',
  createObserverElement('intersection'),
  'IswcIntersectionObserver',
);
