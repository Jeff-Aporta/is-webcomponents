// @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/view/hola/components/__PREFIJO__-hola-mundo.ts
/**
 * <__PREFIJO__-hola-mundo> — el componente más simple posible: un título «Hola mundo».
 *
 * Es la referencia mínima del estándar: un componente = 4 archivos hermanos (este .ts, su .scss, su
 * .md y su .json), registrado UNA vez en `src/js/kit-tags.ts` (VIEW_TAGS.hola) y en la galería
 * (`view/demo/manifest.json`). Sin props, sin atributos, sin eventos: extiende el molde del kit directamente.
 */
import { IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.min.mjs';
import css from 'iswc:css';

const PLANTILLA = document.createElement('template');
PLANTILLA.innerHTML = '<h1 class="titulo" part="titulo">Hola mundo</h1>';

class __CLASE__HolaMundo extends IswcElement {
  static tag = '__PREFIJO__-hola-mundo';
  static css = css;
  static template = PLANTILLA;
}

define(__CLASE__HolaMundo);
