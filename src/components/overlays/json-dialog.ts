import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { crearNodo } from '@jeff-aporta/iswc-base/core/dom.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { JsonDialogPropsSchema, JsonValidacionSchema } from './schemas/json-dialog.schemas.js';
import type { JsonBotonEl, JsonDialogoEl, JsonDialogProps, JsonEditorEl, JsonValidacion, JsonDialogEventos } from './schemas/json-dialog.schemas.js';
import '@jeff-aporta/iswc-base/components/layout/dialog.js';
import '@jeff-aporta/iswc-base/components/code/code.js';
import css from 'iswc:css';

/**
 * <iswc-json-dialog> — ver y editar un documento como JSON en un diálogo. Valida mientras se escribe, para que los
 * errores se vean junto al editor y «Aplicar» solo se encienda con un JSON válido.
 *
 * Eventos: iswc-json-close, iswc-json-apply { valor } (el `normalized` del validador).
 * CSS parts: dialogo, errores, editor.
 */

const INICIAL: JsonDialogProps = { open: false, titulo: 'JSON', valor: '{}', readonly: true, validar: null, textoCerrar: 'Cerrar', textoCancelar: 'Cancelar', textoAplicar: 'Aplicar JSON' };

function validarJson(texto: string): JsonValidacion {
  try {
    return { ok: true, errors: [], normalized: JSON.parse(texto) as unknown };
  } catch (e) {
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)], normalized: undefined };
  }
}

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <iswc-dialog class="dialogo" part="dialogo" backdrop-variant="basic">
    <iswc-callout class="errores" part="errores" color="warning" role="alert" hidden><ul></ul></iswc-callout>
    <iswc-code class="editor" part="editor" lang="json" placeholder="{}"></iswc-code>
    <iswc-button class="cerrar" slot="footer" variant="plain"></iswc-button>
    <iswc-button class="aplicar" slot="footer" variant="filled" color="brand"></iswc-button>
  </iswc-dialog>
`;

class IswcJsonDialog extends PropsElement<JsonDialogProps> {
  static tag = 'iswc-json-dialog';
  declare static events: JsonDialogEventos;
  static css = css;
  static deps = ['iswc-callout', 'iswc-button'];
  static observed = atributosDe(INICIAL);

  #dialogo: JsonDialogoEl;
  #errores: HTMLElement;
  #editor: JsonEditorEl;
  #cerrar: HTMLElement;
  #aplicar: JsonBotonEl;
  /** Texto en edición: se toma de `valor` solo al abrir. Si se refrescara en cada sincronización, una edición a medias se perdería. */
  #texto = '';
  #validacion: JsonValidacion = { ok: false, errors: [], normalized: undefined };

  constructor() {
    super(INICIAL, JsonDialogPropsSchema.partial());
    const shadow = this.shadowRoot!;
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#dialogo = shadow.querySelector<JsonDialogoEl>('.dialogo')!;
    this.#errores = shadow.querySelector<HTMLElement>('.errores')!;
    this.#editor = shadow.querySelector<JsonEditorEl>('.editor')!;
    this.#cerrar = shadow.querySelector<HTMLElement>('.cerrar')!;
    this.#aplicar = shadow.querySelector<JsonBotonEl>('.aplicar')!;
    const cerrar = (): void => { emit(this, 'iswc-json-close'); };
    this.#dialogo.addEventListener('iswc-hide', cerrar);
    this.#cerrar.addEventListener('iswc-click', cerrar);
    this.#aplicar.addEventListener('iswc-click', () => { emit(this, 'iswc-json-apply', { valor: this.#validacion.normalized }); });
    // Solo se toca el pie y los errores, nunca el editor: reescribirlo en cada tecla perdería el cursor.
    this.#editor.addEventListener('iswc-input', () => {
      this.#texto = this.#editor.value;
      this.#validar();
    });
  }

  /** Pasa el texto por el validador (el del consumidor es dato externo: se parsea) y muestra sus errores. */
  #validar(): void {
    const r = JsonValidacionSchema.safeParse((this.props.validar ?? validarJson)(this.#texto));
    this.#validacion = r.success ? r.data : { ok: false, errors: ['El validador devolvió una respuesta inválida.'], normalized: undefined };
    const { errors } = this.#validacion;
    this.#errores.hidden = errors.length === 0;
    this.#errores.querySelector('ul')!.replaceChildren(...errors.map((e) => crearNodo('li', {}, e)));
    this.#aplicar.disabled = this.props.readonly || !this.#validacion.ok;
  }

  protected override pintar(previos: JsonDialogProps): void {
    const { open, titulo, valor, readonly, textoCerrar, textoCancelar, textoAplicar } = this.props;
    if (open && (!previos.open || !this.#texto)) {
      this.#texto = valor;
      this.#editor.value = valor;
    }
    this.#dialogo.setAttribute('label', titulo);
    this.#dialogo.toggleAttribute('open', open);
    this.#editor.toggleAttribute('readonly', readonly);
    this.#cerrar.textContent = readonly ? textoCerrar : textoCancelar;
    this.#aplicar.textContent = textoAplicar;
    this.#aplicar.hidden = readonly;
    if (open) this.#validar();
  }
}

define(IswcJsonDialog, 'IswcJsonDialog');
