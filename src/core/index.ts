/**
 * core — La base tipada del kit.
 *
 * Es lo único que se publica en `.ts` sobre el CDN, y la razón es la forma de
 * consumo, no una preferencia de formato:
 *
 *   - Un COMPONENTE se consume como etiqueta (`<is-dropdown>`): lo ejecuta el
 *     navegador, así que viaja en `.js` minificado.
 *   - El CORE se consume para *escribir* componentes nuevos: se extiende, no se
 *     ejecuta suelto. Ahí el artefacto útil es el `.ts`, con decoradores
 *     expresados y tipos vivos.
 *
 * Regla corta: **`.js` lo que se ejecuta, `.ts` lo que se extiende.**
 *
 * Otro proyecto lo trae con estrategia vendor —un pin del `.ts`, como
 * `cf/worker/vendor/`— y con eso ya puede escribir componentes `is-*` con la
 * misma forma que los de este repo.
 */

export {
  defineElement, globalNameFor,
  adoptCss, siblingCssHref,
  emit, emitCancelable,
  upgradeProperties,
} from './element.js';

export {
  attrBool, attrStr, attrEnum, attrNum,
  atributosDeclarados, aAtributo,
  withStyleAttrs, syncStyleAttrs, syncStyleAttr, syncPresentStyleAttrs,
  styleAttrNames, describeStyleAttrs, isCssColorValue, applyToneRamp,
} from './attrs.js';

export { ElementBase } from './element-base.js';

export type { StyleAttrDef, StyleAttrMap } from './attrs.js';
export type { ElementBaseConstructor } from './element-base.js';
