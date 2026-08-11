import { adoptCss } from '../_shared/adopt-css.js';
import '../actions/button.js';
import '../media/icon.js';
import '../layout/dialog.js';
import './text.js';
import './heading.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';

/**
 * <is-modal-verificacion> — port de `src/lib/base/modal/ModalVerificacion.svelte`.
 *
 * Al abrirse ejecuta `controller.actVerificar(record)` y pinta los mensajes
 * devueltos coloreados por severidad. Al cerrarse vacía la lista (igual que el
 * original, que reasignaba un `TMensajesVerificacion` nuevo).
 *
 * NO extiende `ModalBase` directamente: su focus-trap recorre el LIGHT DOM del
 * modal, y aquí el contenido lo genera el componente. La solución es COMPONER
 * un `<is-dialog>` dentro del shadow root y colgar el contenido como light DOM
 * SUYO — así el trap, el Escape, el restore de foco y las animaciones salen
 * gratis y ya no hay ciclo hand-rolled. Mismo patrón que `<is-confirm-delete>`.
 *
 * Propiedades JS (no atributos: llevan funciones/objetos)
 *   controller  objeto tipo `ICtxActionVerificacion`:
 *                 { entrie: string, actVerificar?(record): Promise<TMensajes> }
 *               `TMensajes` = { mensajes: [{ itdmensaje, mensaje }] }. Los
 *               contadores se DERIVAN de `mensajes` (como en ispgen), no se leen.
 *   record      registro a verificar (objeto plano; el ISP usaba `TObject`).
 *   onError     (msg: string) => void — se llama si `actVerificar` lanza.
 *
 * Atributos
 *   open          boolean — visible (reflected)
 *   loading       boolean — se pone solo mientras corre `actVerificar`
 *   entity        string  — `Controller.entrie`; el título usa su minúscula
 *   icon          string  — icono del título (default `mdi:check`)
 *   close-label   string  — texto del botón de cierre (default "Cerrar")
 *   light-dismiss boolean — OPT-IN: cerrar al hacer click en el backdrop.
 *                 Antes cerraba siempre; ahora hay que pedirlo, igual que en
 *                 <is-dialog> / <is-drawer>.
 *
 * Métodos
 *   show() / hide() / verify()  — `verify()` re-ejecuta la verificación
 *
 * Eventos (bubbles + composed)
 *   is-show / is-after-show / is-hide (cancelable) / is-after-hide
 *                          — ciclo estándar, re-emitidos por el <is-dialog>.
 *   is-verificacion        detail: { mensajes, qinfos, qwarning, qerrores }
 *   is-verificacion-error  detail: { message, error }
 *   is-cancel              detail: {} — evento semántico ADICIONAL, acompaña a
 *                          `is-hide` cuando el cierre lo pide el usuario.
 *
 * CSS Parts: ::part(backdrop) ::part(base) ::part(heading) ::part(results)
 *            ::part(stats) ::part(actions)
 */

/**
 * Mapa de severidad → color semántico. Copia EXACTA de `getMsgColor` del
 * original (incluidas las claves en mayúscula, que en un objeto JS son
 * distintas de las minúsculas, y el doble lookup con la cadena sin bajar).
 */
const MSG_COLOR_MAP = {
  1: 'info',
  2: 'warning',
  3: 'danger',
  4: 'success',
  info: 'info',
  warning: 'warning',
  error: 'danger',
  errores: 'danger',
  success: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'danger',
  SUCCESS: 'success',
};

/** @param {unknown} itd @returns {string} color semántico de `<is-text>` */
export function getMsgColor(itd) {
  const key = String(itd).toLowerCase();
  return MSG_COLOR_MAP[key] ?? MSG_COLOR_MAP[String(itd)] ?? 'neutral';
}

/** `lowerCase` de ispgen: null/undefined/'' → '', el resto en minúsculas. */
export function lowerCase(value) {
  if (!value) return '';
  return String(value).toLowerCase();
}

(() => {
  const TEMPLATE = document.createElement('template');
  // ponytail: `tabindex="0"` en <is-button> NO es decorativo — ver la nota en
  // confirm-delete.js. `.results` ya lo tenía (lista scrolleable).
  TEMPLATE.innerHTML = /* html */ `
    <is-dialog class="dlg" exportparts="backdrop, dialog: base">
      <span slot="label" part="heading" class="heading">
        <is-icon class="title-icon" icon="mdi:check" aria-hidden="true"></is-icon>
        <span class="heading-text"></span>
      </span>
      <is-heading level="3" color="neutral" class="results-title">Resultados</is-heading>
      <div part="results" class="results" tabindex="0"></div>
      <footer part="stats" class="stats">
        <div class="stat">
          <is-icon icon="mdi:information-outline" aria-hidden="true"></is-icon>
          <is-text color="success" class="q-infos">0</is-text>
        </div>
        <div class="stat">
          <is-icon icon="mdi:alert-outline" aria-hidden="true"></is-icon>
          <is-text color="warning" class="q-warning">0</is-text>
        </div>
        <div class="stat">
          <is-icon icon="mdi:close-circle-outline" aria-hidden="true"></is-icon>
          <is-text color="danger" class="q-errores">0</is-text>
        </div>
      </footer>
      <div part="actions" class="actions" slot="footer">
        <is-button class="close" color="neutral" variant="outlined"
                   data-dialog="close" tabindex="0">Cerrar</is-button>
      </div>
    </is-dialog>
  `;

  const OBSERVED = ['open', 'loading', 'entity', 'icon', 'close-label', 'light-dismiss'];

  class IsModalVerificacion extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    accent: { prop: '--is-modal-verificacion-accent', onlyColorValues: true },
    };

    static get observedAttributes() { return [...OBSERVED, 'accent']; }

    #dlg;
    #headingText;
    #titleIcon;
    #results;
    #closeBtn;
    #qInfos;
    #qWarning;
    #qErrores;
    /** @type {Array<{itdmensaje: unknown, mensaje: string}>} */
    #mensajes = [];
    #wasOpen = false;

    /** @type {object|null} controlador con `entrie` y `actVerificar`. */
    controller = null;
    /** @type {object|null} registro a verificar. */
    record = null;
    /** @type {(msg: string) => void} */
    onError = (msg) => console.error(msg);

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#dlg = shadow.querySelector('.dlg');
      this.#headingText = shadow.querySelector('.heading-text');
      this.#titleIcon = shadow.querySelector('.title-icon');
      this.#results = shadow.querySelector('.results');
      this.#closeBtn = shadow.querySelector('.close');
      this.#qInfos = shadow.querySelector('.q-infos');
      this.#qWarning = shadow.querySelector('.q-warning');
      this.#qErrores = shadow.querySelector('.q-errores');
    }

    onConnected() {
      this.#dlg.addEventListener('is-hide', this.#onDialogHide);
      this.#dlg.addEventListener('is-after-hide', this.#onDialogAfterHide);
      this.#syncTexts();
      this.#syncLightDismiss();
      this.#renderMensajes();
      if (this.open) this.#showUI();
    }

    onDisconnected() {
      this.#dlg.removeEventListener('is-hide', this.#onDialogHide);
      this.#dlg.removeEventListener('is-after-hide', this.#onDialogAfterHide);
    }

    onAttributeChanged(name, _oldVal, _newVal) {
      if (name === 'open') {
        if (this.open) this.#showUI(); else this.#hideUI();
      } else if (name === 'loading') {
        this.#syncGate();
      } else if (name === 'light-dismiss') {
        this.#syncLightDismiss();
      } else {
        this.#syncTexts();
      }
    }

    // ---- propiedades ------------------------------------------------------

    get open() { return this.hasAttribute('open'); }
    set open(v) { this.toggleAttribute('open', !!v); }

    get loading() { return this.hasAttribute('loading'); }
    set loading(v) { this.toggleAttribute('loading', !!v); }

    get lightDismiss() { return this.hasAttribute('light-dismiss'); }
    set lightDismiss(v) { this.toggleAttribute('light-dismiss', !!v); }

    get entity() { return this.getAttribute('entity') || ''; }
    set entity(v) {
      if (v == null || v === '') this.removeAttribute('entity');
      else this.setAttribute('entity', String(v));
    }

    get icon() { return this.getAttribute('icon') || 'mdi:check'; }
    set icon(v) {
      if (v == null || v === '') this.removeAttribute('icon');
      else this.setAttribute('icon', String(v));
    }

    /** Mensajes actuales (solo lectura para el consumidor). */
    get mensajes() { return this.#mensajes.slice(); }

    /** Contadores derivados, igual que `TMensajesVerificacion` de ispgen. */
    get qerrores() { return this.#mensajes.filter((m) => m.itdmensaje === 'error').length; }
    get qwarning() { return this.#mensajes.filter((m) => m.itdmensaje === 'warning').length; }
    get qinfos() { return this.#mensajes.filter((m) => m.itdmensaje === 'info').length; }

    // ---- API pública ------------------------------------------------------

    show() { this.open = true; }
    hide() { this.open = false; }

    /** Ejecuta `controller.actVerificar` y repinta. Devuelve los mensajes. */
    async verify() {
      this.loading = true;
      try {
        // El original siembra "Verificando..." antes de esperar la promesa.
        this.#mensajes = [{ itdmensaje: 'info', mensaje: 'Verificando...' }];
        this.#renderMensajes();
        const act = this.controller?.actVerificar;
        if (act) {
          const res = await act.call(this.controller, this.record);
          this.#mensajes = Array.isArray(res?.mensajes) ? res.mensajes.slice() : [];
        }
        this.#renderMensajes();
        emit(this, 'is-verificacion', {
          mensajes: this.mensajes,
          qinfos: this.qinfos,
          qwarning: this.qwarning,
          qerrores: this.qerrores,
        });
      } catch (e) {
        const sAdd = e instanceof Error ? `\r\n${e.message}` : '';
        const msg = 'No se pudo completar la verificación.' + sAdd;
        this.onError?.(msg);
        emit(this, 'is-verificacion-error', { message: msg, error: e });
      } finally {
        this.loading = false;
      }
      return this.mensajes;
    }

    // ---- privados ---------------------------------------------------------

    #syncTexts() {
      const entrie = this.entity || this.controller?.entrie;
      // Fidelidad con el original: `lowerCase(entrie) ?? "registros"`. Como
      // `lowerCase` devuelve "" (no null) el fallback nunca entra en juego.
      this.#headingText.textContent = `Verificación de ${lowerCase(entrie)}`;
      this.#titleIcon.setAttribute('icon', this.icon);
      this.#closeBtn.textContent = this.getAttribute('close-label') || 'Cerrar';
    }

    /** `light-dismiss` es opt-in y se delega tal cual al <is-dialog>. */
    #syncLightDismiss() {
      this.#dlg.toggleAttribute('light-dismiss', this.lightDismiss);
    }

    #syncGate() {
      this.#closeBtn.toggleAttribute('loading', this.loading);
      this.#dlg.setAttribute('aria-busy', String(this.loading));
    }

    #renderMensajes() {
      this.#results.textContent = '';
      const list = this.#mensajes.length
        ? this.#mensajes
        : [{ itdmensaje: undefined, mensaje: 'No se han encontrado problemas en la verificación.' }];

      for (const m of list) {
        const block = document.createElement('div');
        block.className = 'msg-block';
        const text = document.createElement('is-text');
        // El bloque vacío del original no pasa `color`: hereda el del contexto.
        if (this.#mensajes.length) text.setAttribute('color', getMsgColor(m.itdmensaje));
        text.textContent = m.mensaje ?? '';
        const hr = document.createElement('hr');
        hr.className = 'msg-hr';
        block.append(text, hr);
        this.#results.appendChild(block);
      }

      this.#qInfos.textContent = String(this.qinfos);
      this.#qWarning.textContent = String(this.qwarning);
      this.#qErrores.textContent = String(this.qerrores);
    }

    /**
     * `is-hide` sólo lo emite ModalBase cuando el cierre lo PIDE el usuario
     * (Escape, backdrop, botón Cerrar): `hide()` programático no pasa por aquí.
     * Es justo la semántica que tenía `is-cancel`.
     */
    #onDialogHide = () => { emit(this, 'is-cancel', {}); };

    #onDialogAfterHide = () => { this.removeAttribute('open'); };

    #showUI() {
      if (this.#wasOpen) return;
      this.#wasOpen = true;
      this.#syncTexts();
      this.#dlg.show();
      void this.verify();
    }

    #hideUI() {
      if (!this.#wasOpen) return;
      this.#wasOpen = false;
      this.#dlg.hide();
      // El original reinicia los mensajes al cerrar.
      this.#mensajes = [];
      this.#renderMensajes();
    }
  }

  defineElement('is-modal-verificacion', IsModalVerificacion, 'IsModalVerificacion');
})();
