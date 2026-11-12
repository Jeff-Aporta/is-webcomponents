// @contexto INDICE.md · src/core/README.md
/**
 * iswc-form-chrome.ts — Chrome comun de los controles de formulario (F8): etiqueta, ayuda y texto de error.
 *
 *   class IswcFoo extends IswcFormChrome { … }
 *
 * `IswcFormControl` (core/iswc-form-control.ts) trae la parte de formulario: validez, estados y valor. El chrome
 * (lo que rodea al campo) vive aqui, en su propio modulo, para que solo lo paguen los controles que lo usan.
 *
 * El chrome son tres propiedades (`label`, `hint`, `error-text`), la marca `error` (el consumidor la fuerza sin
 * texto) y `estadoChrome()`: lo que se ve ahora en cada hueco.
 */
import { IswcFormControl } from './iswc-form-control.js';
import { prop } from './iswc-reactive.js';

export class IswcFormChrome extends IswcFormControl {
  /** Etiqueta del campo (tambien por el slot `label`). */
  @prop() accessor label = '';
  /** Ayuda del campo (tambien por el slot `hint`). */
  @prop() accessor hint = '';
  /** Texto de error (sustituye a la ayuda cuando hay error). */
  @prop() accessor errorText = '';
  /** Marca de error forzada por el consumidor (sin texto). */
  @prop({ type: 'bool' }) accessor error = false;

  /**
   * Lo que el chrome muestra ahora: el texto de cada hueco y si hay error.
   * El error sale de `error-text`; si no lo hay, del mensaje de la validacion nativa (solo tras interactuar).
   */
  estadoChrome(): { etiqueta: string; ayuda: string; error: string; invalido: boolean } {
    const failed = this.interactuado && this.internals?.validity?.valid === false;
    const invalido = this.error || failed;
    return {
      etiqueta: this.label.trim(),
      ayuda: this.hint.trim(),
      error: invalido ? (this.errorText || (failed ? this.validationMessage : '')) : '',
      invalido,
    };
  }
}
