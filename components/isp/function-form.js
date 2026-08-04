import { adoptCss } from '../_shared/adopt-css.js';
import './form.js';
import '../forms/input.js';
import '../forms/select.js';
import '../forms/option.js';

/**
 * <is-function-form> — Formulario de atributos de una "función" del editor.
 *
 * Port de `src/lib/form/richEditor/_FormularioFuncion.svelte`
 * (ISP-SvelteComponents). Recibe una función con su lista de `atributos`,
 * pinta un control por atributo según su `tdatributo` y, al enviar, emite una
 * COPIA de la función con los valores capturados.
 *
 * Igual que el original, el formulario trabaja siempre sobre un clon: mientras
 * no se pulse Aceptar/Guardar, el catálogo de categorías no se toca.
 *
 * Datos
 *   .funcion = { ifuncion, icategoria, label, descripcion, tdfuncion,
 *                valorpordefecto, script?, controlador?, atributos: [
 *                  { iatributo, tdatributo, label, requerido, descripcion,
 *                    valor, opciones?: [{ opcion, label }] } ] }
 *   o un <script type="application/json"> hijo con el mismo objeto.
 *
 * Atributos
 *   edicion     boolean — el botón pasa de "Agregar" a "Guardar"
 *   deletable   boolean — añade el botón "Eliminar"
 *
 * Eventos (bubbles + composed)
 *   is-function-submit  detail: { funcion }
 *   is-function-cancel  detail: { funcion }
 *   is-function-delete  detail: { funcion }
 */

/** `TTDRichEditorFuncion` de `$lib/UlConst`. */
export const TD_FUNCION = {
  none: '',
  entidad: 'entidad',
  script: 'script',
  controlador: 'controlador',
};

/** `TTDRichEditorAtributo` de `$lib/UlConst`. */
export const TD_ATRIBUTO = {
  none: '',
  opcion: 'opcion',
  multiSelect: 'multiSelect',
  texto: 'string',
  numero: 'number',
  fecha: 'date',
  contexto: 'contexto',
};

/** Equivalente a `val2StringEnum(v, none, Enum)`: fuera de la enum ⇒ `none`. */
export function tdEnum(value, table) {
  const v = value == null ? '' : String(value);
  return Object.values(table).includes(v) ? v : table.none;
}

/** Clona profundo sin arrastrar getters ni prototipos (el `clone()` de TObject). */
export function cloneFuncion(funcion) {
  if (!funcion) return null;
  try { return structuredClone(funcion); } catch { return JSON.parse(JSON.stringify(funcion)); }
}

/**
 * Serializa una función al tag `<customcode>` que vive dentro del editor.
 * Mismo contrato de atributos que el blot `CustomCodeBase.create()` de ISP.
 *
 * @param {object} funcion
 * @param {string} [customCodeStyle] clase extra heredada del consumidor
 * @returns {HTMLElement}
 */
export function funcionToCustomCodeNode(funcion, customCodeStyle = '') {
  const node = document.createElement('customcode');
  node.setAttribute('ifuncion', funcion.ifuncion ?? '');
  node.setAttribute('valorpordefecto', funcion.valorpordefecto ?? '');
  node.setAttribute('icategoria', funcion.icategoria ?? '');
  node.setAttribute('tdfuncion', funcion.tdfuncion ?? '');

  const atributos = funcion.atributos ?? [];
  for (const atributo of atributos) node.setAttribute(atributo.iatributo, atributo.valor ?? '');

  // Un token nunca es editable: se selecciona y se borra como una unidad.
  node.setAttribute('contenteditable', 'false');

  if (tdEnum(funcion.tdfuncion, TD_FUNCION) === TD_FUNCION.script) {
    const attrs = Object.fromEntries(atributos.map((a) => [a.iatributo, a.valor]));
    if (funcion.script) {
      // Igual que ISP: el script del catálogo genera su propio HTML.
      try { node.innerHTML = new Function('attrs', funcion.script)(attrs) ?? ''; } catch { node.textContent = funcion.label ?? 'variable'; }
    }
  } else {
    if (funcion.controlador) node.setAttribute('controlador', funcion.controlador);
    node.setAttribute('data-token', '');
    node.className = `badge-richeditor ${customCodeStyle}`.trim();
    node.textContent = funcion.label ?? 'variable';
  }
  return node;
}

/** Igual que arriba pero como string HTML, para insertar en el modo fuente. */
export function funcionToCustomCodeTag(funcion, customCodeStyle = '') {
  return funcionToCustomCodeNode(funcion, customCodeStyle).outerHTML;
}

(() => {
  const OBSERVED = ['edicion', 'deletable'];

  class IsFunctionForm extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #mounted = false;
    #funcion = null;
    #clone = null;
    #form;
    #content;
    #extra;
    #fields = [];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = /* html */ `
        <is-form class="form" mode="edit" submit-label="Agregar">
          <div slot="content" class="content-form"></div>
          <div slot="pre-buttons" class="extra"></div>
        </is-form>
      `;
      adoptCss(shadow, import.meta.url);
      this.#form = shadow.querySelector('.form');
      this.#content = shadow.querySelector('.content-form');
      this.#extra = shadow.querySelector('.extra');
    }

    connectedCallback() {
      this.#mounted = true;
      this.#form.addEventListener('is-submit', this.#onSubmit);
      this.#form.addEventListener('is-cancel', this.#onCancel);
      if (!this.#funcion) this.#readInlineJson();
      this.#render();
    }

    disconnectedCallback() {
      this.#mounted = false;
      this.#form.removeEventListener('is-submit', this.#onSubmit);
      this.#form.removeEventListener('is-cancel', this.#onCancel);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    // ---- propiedades ------------------------------------------------------

    get funcion() { return this.#funcion; }
    set funcion(v) {
      this.#funcion = v || null;
      if (this.#mounted) this.#render();
    }

    /** Clon en curso (el que se emitirá al enviar). */
    get valor() { return this.#collect(); }

    get edicion() { return this.hasAttribute('edicion'); }
    set edicion(v) { this.toggleAttribute('edicion', !!v); }

    get deletable() { return this.hasAttribute('deletable'); }
    set deletable(v) { this.toggleAttribute('deletable', !!v); }

    // ---- privados ---------------------------------------------------------

    #readInlineJson() {
      const script = this.querySelector('script[type="application/json"]');
      if (!script) return;
      try { this.#funcion = JSON.parse(script.textContent || 'null'); } catch { this.#funcion = null; }
    }

    #render() {
      this.#content.innerHTML = '';
      this.#extra.innerHTML = '';
      this.#fields = [];
      this.#form.setAttribute('submit-label', this.edicion ? 'Guardar' : 'Agregar');
      if (!this.#funcion) return;

      this.#clone = cloneFuncion(this.#funcion);
      const atributos = this.#clone.atributos ?? [];

      for (const atributo of atributos) {
        const td = tdEnum(atributo.tdatributo, TD_ATRIBUTO);
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const control = this.#buildControl(atributo, td);
        wrap.appendChild(control);
        if (atributo.descripcion) {
          const small = document.createElement('small');
          small.textContent = atributo.descripcion;
          wrap.appendChild(small);
        }
        this.#content.appendChild(wrap);
        this.#fields.push({ iatributo: atributo.iatributo, td, control });
      }

      // El valor por defecto solo aplica a funciones que retornan dato.
      if (tdEnum(this.#clone.tdfuncion, TD_FUNCION) !== TD_FUNCION.script) {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const input = document.createElement('is-input');
        input.setAttribute('label', 'valor por defecto');
        input.setAttribute('value', this.#clone.valorpordefecto ?? '');
        const small = document.createElement('small');
        small.textContent = 'Valor por defecto en caso que la función no retorne dato';
        wrap.append(input, small);
        this.#content.appendChild(wrap);
        this.#fields.push({ iatributo: null, td: 'valorpordefecto', control: input });
      }

      if (this.deletable) {
        const del = document.createElement('is-button');
        del.className = 'btn-eliminar';
        del.setAttribute('color', 'danger');
        del.setAttribute('variant', 'outlined');
        del.textContent = 'Eliminar';
        del.addEventListener('click', this.#onDelete);
        this.#extra.appendChild(del);
      }
    }

    #buildControl(atributo, td) {
      if ((td === TD_ATRIBUTO.opcion || td === TD_ATRIBUTO.multiSelect) && atributo.opciones) {
        const select = document.createElement('is-select');
        select.setAttribute('label', atributo.label ?? atributo.iatributo);
        if (atributo.requerido) select.setAttribute('required', '');
        if (td === TD_ATRIBUTO.multiSelect) select.setAttribute('multiple', '');
        for (const opcion of atributo.opciones) {
          if (!opcion.opcion) continue;
          const option = document.createElement('is-option');
          option.setAttribute('value', opcion.opcion);
          option.textContent = opcion.label || '';
          select.appendChild(option);
        }
        // El valor se asigna por PROPIEDAD tras el upgrade: is-select necesita
        // sus <is-option> ya parseados para resolverlo.
        const valor = atributo.valor ?? '';
        requestAnimationFrame(() => {
          if (td === TD_ATRIBUTO.multiSelect) select.values = valor ? String(valor).split(',') : [];
          else select.value = valor;
        });
        return select;
      }

      const input = document.createElement('is-input');
      input.setAttribute('label', atributo.label ?? atributo.iatributo);
      if (atributo.requerido) input.setAttribute('required', '');
      if (td === TD_ATRIBUTO.numero) input.setAttribute('type', 'number');
      else if (td === TD_ATRIBUTO.fecha) input.setAttribute('type', 'date');
      input.setAttribute('value', atributo.valor ?? '');
      return input;
    }

    /** Vuelca los controles sobre el clon y lo devuelve. */
    #collect() {
      if (!this.#clone) return null;
      for (const field of this.#fields) {
        if (field.td === 'valorpordefecto') {
          this.#clone.valorpordefecto = field.control.value ?? '';
          continue;
        }
        const atributo = (this.#clone.atributos ?? []).find((a) => a.iatributo === field.iatributo);
        if (!atributo) continue;
        if (field.td === TD_ATRIBUTO.multiSelect) {
          const values = field.control.values ?? [];
          atributo.valor = Array.isArray(values) ? values.join(',') : String(values ?? '');
        } else {
          atributo.valor = field.control.value ?? '';
        }
      }
      return this.#clone;
    }

    #emit(name, funcion) {
      this.dispatchEvent(new CustomEvent(name, { detail: { funcion }, bubbles: true, composed: true }));
    }

    #onSubmit = (e) => {
      // `is-submit` de <is-form> es composed: si no se corta, el consumidor
      // recibiría el evento genérico además del específico.
      e.stopPropagation();
      const funcion = this.#collect();
      if (funcion) this.#emit('is-function-submit', funcion);
    };

    #onCancel = (e) => {
      e.stopPropagation();
      this.#emit('is-function-cancel', this.#funcion);
    };

    #onDelete = () => { this.#emit('is-function-delete', this.#funcion); };
  }

  if (!customElements.get('is-function-form')) customElements.define('is-function-form', IsFunctionForm);
})();
