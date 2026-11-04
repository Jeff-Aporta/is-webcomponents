/**
 * element-base.ts — Alias de compatibilidad del molde `IswcElement` (core/iswc-element.ts, plan D4).
 *
 * Los componentes del kit extienden `IswcElement` directamente. `ElementBase` se conserva para el código externo que
 * ya lo extendía, con su contrato de siempre:
 *
 *   class IswcFoo extends ElementBase {
 *     static TEMPLATE = TEMPLATE;                       // alias de `static template`
 *     static override get observedAttributes(): string[] { return ['color']; }
 *     constructor() { super(); this.initShadow(); }     // el shadow lo crea la subclase
 *     override onConnected(): void { … }
 *   }
 *
 * La única diferencia con el molde es `shadowInit = null`: `ElementBase` nunca creó el shadow por su cuenta, la
 * subclase llamaba `initShadow()` (o `attachShadow`) cuando quería. Ciclo de vida, guards, `mounted`,
 * `upgradeProperties`, `setBooleanAttr` y `styleAttrNames` son los del molde.
 */
import { IswcElement } from './iswc-element.js';

export class ElementBase extends IswcElement {
  static override shadowInit: ShadowRootInit | null = null;
}
