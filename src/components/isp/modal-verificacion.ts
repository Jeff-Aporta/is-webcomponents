import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../actions/button.js';
import '../media/icon.js';
import '../layout/dialog.js';
import './text.js';
import './heading.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <iswc-modal-verificacion> — port de `src/lib/base/modal/ModalVerificacion.svelte`.
 *
 * Al abrirse ejecuta `controller.actVerificar(record)` y pinta los mensajes
 * devueltos coloreados por severidad. Al cerrarse vacía la lista (igual que el
 * original, que reasignaba un `TMensajesVerificacion` nuevo).
 *
 * NO extiende `ModalBase` directamente: su focus-trap recorre el LIGHT DOM del
 * modal, y aquí el contenido lo genera el componente. La solución es COMPONER
 * un `<iswc-dialog>` dentro del shadow root y colgar el contenido como light DOM
 * SUYO — así el trap, el Escape, el restore de foco y las animaciones salen
 * gratis y ya no hay ciclo hand-rolled. Mismo patrón que `<iswc-confirm-delete>`.
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
 *                 <iswc-dialog> / <iswc-drawer>.
 *
 * Métodos
 *   show() / hide() / verify()  — `verify()` re-ejecuta la verificación
 *
 * Eventos (bubbles + composed)
 *   iswc-show / iswc-after-show / iswc-hide (cancelable) / iswc-after-hide
 *                          — ciclo estándar, re-emitidos por el <iswc-dialog>.
 *   iswc-verificacion        detail: { mensajes, qinfos, qwarning, qerrores }
 *   iswc-verificacion-error  detail: { message, error }
 *   iswc-cancel              detail: {} — evento semántico ADICIONAL, acompaña a
 *                          `iswc-hide` cuando el cierre lo pide el usuario.
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

/** @param {unknown} itd @returns {string} color semántico de `<iswc-text>` */
export function getMsgColor(itd: unknown): string {
  const raw = String(itd);
  const key = raw.toLowerCase();
  return (MSG_COLOR_MAP as Record<string, string>)[key]
    ?? (MSG_COLOR_MAP as Record<string, string>)[raw]
    ?? 'neutral';
}

/** `lowerCase` de ispgen: null/undefined/'' → '', el resto en minúsculas. */
export function lowerCase(value: string) {
  if (!value) return '';
  return String(value).toLowerCase();
}

(() => {
  const TEMPLATE = document.createElement('template');
  // ponytail: `tabindex="0"` en <iswc-button> NO es decorativo — ver la nota en
  // confirm-delete.js. `.results` ya lo tenía (lista scrolleable).
  TEMPLATE.innerHTML = /* html */ `
    <iswc-dialog class="dlg" exportparts="backdrop, dialog: base">
      <span slot="label" part="heading" class="heading">
        <iswc-icon class="title-icon" icon="mdi:check" aria-hidden="true"></iswc-icon>
        <span class="heading-text"></span>
      </span>
      <iswc-heading level="3" color="neutral" class="results-title">Resultados</iswc-heading>
      <div part="results" class="results" tabindex="0"
           aria-live="polite" aria-relevant="additions text" aria-atomic="false"></div>
      <p class="sr-status" aria-live="polite" aria-atomic="true"></p>
      <footer part="stats" class="stats">
        <div class="stat">
          <iswc-icon icon="mdi:information-outline" aria-hidden="true"></iswc-icon>
          <iswc-text color="success" class="q-infos">0</iswc-text>
        </div>
        <div class="stat">
          <iswc-icon icon="mdi:alert-outline" aria-hidden="true"></iswc-icon>
          <iswc-text color="warning" class="q-warning">0</iswc-text>
        </div>
        <div class="stat">
          <iswc-icon icon="mdi:close-circle-outline" aria-hidden="true"></iswc-icon>
          <iswc-text color="danger" class="q-errores">0</iswc-text>
        </div>
      </footer>
      <div part="actions" class="actions" slot="footer">
        <iswc-button class="close" color="text" variant="outlined"
                   data-dialog="close" tabindex="0">Cerrar</iswc-button>
      </div>
    </iswc-dialog>
  `;

  const OBSERVED = ['open', 'loading', 'entity', 'icon', 'close-label', 'light-dismiss'];

  class IswcModalVerificacion extends ElementBase {

    static get observedAttributes(): string[] { return [...OBSERVED, 'accent']; }

    #dlg!: HTMLElement & { show(): void; hide(): void };
    #headingText!: HTMLElement;
    #titleIcon!: HTMLElement;
    #results!: HTMLElement;
    #srStatus!: HTMLElement;
    #closeBtn!: HTMLElement;
    #qInfos!: HTMLElement;
    #qWarning!: HTMLElement;
    #qErrores!: HTMLElement;
    #mensajes: { itdmensaje: unknown; mensaje?: string }[] = [];
    #wasOpen = false;

    /** Controlador con `entrie` y `actVerificar`. */
    controller: {
      entrie?: string;
      actVerificar?: (record: unknown) => Promise<{ mensajes?: { itdmensaje: unknown; mensaje?: string }[] }>;
    } | null = null;
    /** Registro a verificar. */
    record: unknown = null;
    onError: (msg: string) => void = (msg) => console.error(msg);

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      adoptCss(shadow, import.meta.url);

      this.#dlg = shadow.querySelector<HTMLElement>('.dlg') as HTMLElement & { show(): void; hide(): void };
      this.#headingText = shadow.querySelector<HTMLElement>('.heading-text')!;
      this.#titleIcon = shadow.querySelector<HTMLElement>('.title-icon')!;
      this.#results = shadow.querySelector<HTMLElement>('.results')!;
      this.#srStatus = shadow.querySelector<HTMLElement>('.sr-status')!;
      this.#closeBtn = shadow.querySelector<HTMLElement>('.close')!;
      this.#qInfos = shadow.querySelector<HTMLElement>('.q-infos')!;
      this.#qWarning = shadow.querySelector<HTMLElement>('.q-warning')!;
      this.#qErrores = shadow.querySelector<HTMLElement>('.q-errores')!;
    }

    onConnected() {
      this.#dlg.addEventListener('iswc-hide', this.#onDialogHide);
      this.#dlg.addEventListener('iswc-after-hide', this.#onDialogAfterHide);
      this.#syncTexts();
      this.#syncLightDismiss();
      this.#renderMensajes();
      if (this.open) this.#showUI();
    }

    onDisconnected() {
      this.#dlg.removeEventListener('iswc-hide', this.#onDialogHide);
      this.#dlg.removeEventListener('iswc-after-hide', this.#onDialogAfterHide);
    }

    onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
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
    get mensajes(): { itdmensaje: unknown; mensaje?: string }[] { return this.#mensajes.slice(); }

    /** Contadores derivados, igual que `TMensajesVerificacion` de ispgen. */
    get qerrores(): number { return this.#mensajes.filter((m) => m.itdmensaje === 'error').length; }
    get qwarning(): number { return this.#mensajes.filter((m) => m.itdmensaje === 'warning').length; }
    get qinfos(): number { return this.#mensajes.filter((m) => m.itdmensaje === 'info').length; }

    // ---- API pública ------------------------------------------------------

    show(): void { this.open = true; }
    hide(): void { this.open = false; }

    /** Ejecuta `controller.actVerificar` y repinta. Devuelve los mensajes. */
    async verify(): Promise<{ itdmensaje: unknown; mensaje?: string }[]> {
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
        emit(this, 'iswc-verificacion', {
          mensajes: this.mensajes,
          qinfos: this.qinfos,
          qwarning: this.qwarning,
          qerrores: this.qerrores,
        });
      } catch (e) {
        const sAdd = e instanceof Error ? `\r\n${e.message}` : '';
        const msg = 'No se pudo completar la verificación.' + sAdd;
        this.onError?.(msg);
        emit(this, 'iswc-verificacion-error', { message: msg, error: e });
      } finally {
        this.loading = false;
      }
      return this.mensajes;
    }

    // ---- privados ---------------------------------------------------------

    #syncTexts(): void {
      const entrie: string = this.entity || (this.controller?.entrie ?? '');
      // Fidelidad con el original: `lowerCase(entrie) ?? "registros"`. Como
      // `lowerCase` devuelve "" (no null) el fallback nunca entra en juego.
      this.#headingText.textContent = `Verificación de ${lowerCase(entrie)}`;
      this.#titleIcon.setAttribute('icon', this.icon);
      this.#closeBtn.textContent = this.getAttribute('close-label') || 'Cerrar';
    }

    /** `light-dismiss` es opt-in y se delega tal cual al <iswc-dialog>. */
    #syncLightDismiss(): void {
      this.#dlg.toggleAttribute('light-dismiss', this.lightDismiss);
    }

    #syncGate(): void {
      this.#closeBtn.toggleAttribute('loading', this.loading);
      this.#dlg.setAttribute('aria-busy', String(this.loading));
    }

    #renderMensajes(): void {
      this.#results.textContent = '';
      const list = this.#mensajes.length
        ? this.#mensajes
        : [{ itdmensaje: undefined, mensaje: 'No se han encontrado problemas en la verificación.' }];

      for (const m of list) {
        const block = document.createElement('div');
        block.className = 'msg-block';
        const text = document.createElement('iswc-text');
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

      // Region aria-live separada: anuncia el RESUMEN a screen readers
      // (cuántos infos/warnings/errores), evitando que se lea cada mensaje
      // completo cuando la lista es larga (proposal g10 modal-verificacion
      // #4: ARIA live para mensajes, pero de forma resumida).
      const qi = this.qinfos;
      const qw = this.qwarning;
      const qe = this.qerrores;
      const total = qi + qw + qe;
      if (this.#srStatus) {
        if (total === 0) {
          this.#srStatus.textContent = 'Verificación completada sin observaciones.';
        } else {
          const parts: string[] = [];
          if (qi) parts.push(`${qi} ${qi === 1 ? 'información' : 'informaciones'}`);
          if (qw) parts.push(`${qw} ${qw === 1 ? 'advertencia' : 'advertencias'}`);
          if (qe) parts.push(`${qe} ${qe === 1 ? 'error' : 'errores'}`);
          this.#srStatus.textContent = `Verificación completada: ${parts.join(', ')}.`;
        }
      }
    }

    /**
     * `iswc-hide` sólo lo emite ModalBase cuando el cierre lo PIDE el usuario
     * (Escape, backdrop, botón Cerrar): `hide()` programático no pasa por aquí.
     * Es justo la semántica que tenía `iswc-cancel`.
     */
    #onDialogHide = (): void => { emit(this, 'iswc-cancel', {}); };

    #onDialogAfterHide = (): void => { this.removeAttribute('open'); };

    #showUI(): void {
      if (this.#wasOpen) return;
      this.#wasOpen = true;
      this.#syncTexts();
      this.#dlg.show();
      void this.verify();
    }

    #hideUI(): void {
      if (!this.#wasOpen) return;
      this.#wasOpen = false;
      this.#dlg.hide();
      // El original reinicia los mensajes al cerrar.
      this.#mensajes = [];
      this.#renderMensajes();
    }
  }

  defineElement('iswc-modal-verificacion', IswcModalVerificacion, 'IswcModalVerificacion');
})();
