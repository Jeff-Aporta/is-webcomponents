import { placementHaciaCentro } from '@jeff-aporta/iswc-base/core/position.js';
import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import type { Validez } from '@jeff-aporta/iswc-base/core/schemas/iswc-form-control.schemas.js';
import './option.js';
import css from 'iswc:css';
import { prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import { createPopupDismiss } from '@jeff-aporta/iswc-base/core/position.js';

/**
 * <iswc-combobox> — Input + listbox filtrable.
 *
 * El listbox vive en un <dialog modal> (top layer) para no perderse por
 * overflow/visibility de ancestros. Clic en el backdrop del dialog cierra.
 *
 * Atributos: label, hint, error, error-text, name, value, placeholder, disabled,
 *            required, open, clearable, variant (outlined|filled|underlined),
 *            no-results (texto de lista vacía, por defecto "Sin resultados")
 * Slots: default — <iswc-option> o <option>
 * Events: iswc-change, iswc-input, iswc-show, iswc-hide
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="form-control" class="form-control">
      <label part="label" class="label" for="cb-input" hidden></label>
      <div part="base" class="base">
        <input part="input" class="input" id="cb-input" type="text" role="combobox"
          autocomplete="off" aria-autocomplete="list" aria-expanded="false"
          aria-haspopup="listbox" aria-controls="listbox" />
        <iswc-button
          type="button"
          part="clear"
          class="clear"
          variant="text"
          color="text"
          tabindex="-1"
          hidden
        >
          <iswc-icon icon="mdi:close" aria-hidden="true"></iswc-icon>
        </iswc-button>
        <iswc-button
          type="button"
          part="trigger"
          class="trigger"
          variant="text"
          color="text"
          tabindex="-1"
        >
          <iswc-icon icon="mdi:chevron-down" aria-hidden="true"></iswc-icon>
        </iswc-button>
      </div>
      <div part="hint" class="hint" id="cb-hint" hidden></div>
      <div part="error-text" class="error-text" id="cb-error" hidden></div>
    </div>
    <dialog part="dialog" class="popup" tabindex="-1">
      <div part="listbox" class="listbox" id="listbox" role="listbox"></div>
    </dialog>
    <slot hidden></slot>
  `;

  // open y clearable los declara su `@prop`; label, hint, name, disabled, required, error y error-text, `IswcFormControl`.
  registrarTerminos('es', { abrir: 'Abrir', seleccioneValor: 'Seleccione un valor' });

  const OBSERVED = ['value', 'placeholder'];

  class IswcCombobox extends IswcFormControl {
    static tag = 'iswc-combobox';
    static css = css;
    static shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
    static deps = ['iswc-icon', 'iswc-button'];

    static observed = [...OBSERVED, 'radius', 'border-color', 'bg', 'text-color', 'focus-color'];

    #input!: HTMLInputElement;
    /** Capa en la pila de core/position.ts mientras la lista está abierta: un modal de abajo no se lleva su Escape. */
    #capa = createPopupDismiss(this, {});
    #dialog!: HTMLDialogElement;
    #listbox!: HTMLElement;
    #base!: HTMLElement;
    #labelEl!: HTMLElement;
    #hintEl!: HTMLElement;
    #errorEl!: HTMLElement;
    #clearBtn!: HTMLElement;
    #trigger!: HTMLElement;
    #slot!: HTMLSlotElement;
    #activeIndex = -1;
    #options: { value: string; label: string; disabled: boolean; el: HTMLElement }[] = [];
    #filter = '';
    #wasOpen = false;
    #ignoreFocusOpen = false;

    constructor() {
      super();
      const shadow = this.shadowRoot!;
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#input = shadow.querySelector<HTMLInputElement>('.input')!;
      this.#dialog = shadow.querySelector<HTMLDialogElement>('.popup')!;
      this.#listbox = shadow.querySelector<HTMLElement>('.listbox')!;
      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#errorEl = shadow.querySelector<HTMLElement>('.error-text')!;
      this.#clearBtn = shadow.querySelector<HTMLElement>('.clear')!;
      this.#trigger = shadow.querySelector<HTMLElement>('.trigger')!;
      this.#slot = shadow.querySelector<HTMLSlotElement>('slot')!;

      this.#input.addEventListener('input', this.#onInput);
      this.#input.addEventListener('keydown', this.#onKeydown);
      this.#input.addEventListener('focus', this.#onInputFocus);
      this.#clearBtn.addEventListener('click', this.#onClear);
      this.#trigger.addEventListener('click', this.#onTrigger);
      this.#listbox.addEventListener('mousedown', this.#onListMouseDown as EventListener);
      this.#dialog.addEventListener('click', this.#onDialogClick);
      this.#dialog.addEventListener('cancel', this.#onDialogCancel);
      this.#dialog.addEventListener('keydown', this.#onKeydown);
      this.#slot.addEventListener('slotchange', () => this.#collectOptions());
    }

    /** Textos internos en el idioma heredado (repinta al cambiar `lang`). */
    override actualizado(): void {
      super.actualizado();
      this.#clearBtn.setAttribute('aria-label', this.t('limpiar'));
      this.#trigger.setAttribute('aria-label', this.t('abrir'));
    }

    onConnected(): void {
      this.#syncMeta();
      this.#collectOptions();
      this.#syncValueToInput(false);
      this.#syncOpen();
      this.#syncDisabled();
      this.sincronizarFormulario();
      addEventListener('resize', this.#onReposition, { passive: true });
      addEventListener('scroll', this.#onReposition, true);
    }

    onDisconnected(): void {
      removeEventListener('resize', this.#onReposition);
      removeEventListener('scroll', this.#onReposition, true);
      if (this.#dialog.open) this.#dialog.close();
      this.#capa.detach();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null): void {
      if (name === 'open') this.#syncOpen();
      else if (name === 'disabled') this.#syncDisabled();
      else if (name === 'value') {
        this.#syncValueToInput(false);
        this.sincronizarFormulario();
        this.#renderList();
      } else if (name === 'clearable') this.#syncClear();
      else this.#syncMeta();
      if (name === 'required') this.sincronizarFormulario();
    }

    get value(): string { return this.getAttribute('value') ?? ''; }
    set value(v: string | null) {
      if (v == null || v === '') this.removeAttribute('value');
      else this.setAttribute('value', String(v));
    }

    @prop({ type: 'bool' }) accessor open: boolean = false;

    @prop({ type: 'bool' }) accessor clearable: boolean = false;

    /** El value elegido (no el texto del filtro) es lo que entra en FormData. */
    override valorFormulario(): string | null { return this.value || null; }

    override validar(): Validez {
      const [flags, mensaje] = super.validar();
      return flags.valueMissing ? [flags, this.t('seleccioneValor')] : [flags, mensaje];
    }

    override restablecer(): void {
      this.value = this.getAttribute('value') ?? '';
      this.#filter = '';
      this.#syncValueToInput(false);
    }

    override formDisabledCallback(disabled: boolean): void {
      super.formDisabledCallback(disabled);
      this.#syncDisabled();
    }

    #syncMeta(): void {
      const label = this.getAttribute('label');
      this.#labelEl.hidden = !label;
      this.#labelEl.textContent = label || '';
      const hint = this.getAttribute('hint');
      const errorText = this.hasAttribute('error') ? (this.getAttribute('error-text') || '') : '';
      this.#errorEl.hidden = !errorText;
      this.#errorEl.textContent = errorText;
      this.#hintEl.hidden = !hint || !!errorText;
      this.#hintEl.textContent = hint || '';
      this.#input.toggleAttribute('aria-invalid', this.hasAttribute('error'));
      this.#input.placeholder = this.getAttribute('placeholder') || '';
      this.#input.required = this.required;
      // aria-label: priorizar el atributo `label` del host para que los
      // lectores de pantalla anuncien algo cuando el icono visual es lo único.
      if (label) this.setAttribute('aria-label', label);
      else this.removeAttribute('aria-label');
      // aria-describedby: apunta al slot del hint cuando hay contenido.
      if (errorText) this.#input.setAttribute('aria-describedby', 'cb-error');
      else if (hint) this.#input.setAttribute('aria-describedby', 'cb-hint');
      else this.#input.removeAttribute('aria-describedby');
      // aria-required + aria-disabled reflejados en el input.
      if (this.required) this.#input.setAttribute('aria-required', 'true');
      else this.#input.removeAttribute('aria-required');
      if (this.disabled) this.#input.setAttribute('aria-disabled', 'true');
      else this.#input.removeAttribute('aria-disabled');
      this.#syncClear();
    }

    #syncClear(): void {
      this.#clearBtn.hidden = !(this.clearable && !!this.value && !this.disabled);
    }

    #syncDisabled(): void {
      const disabled = this.inhabilitado;
      this.#input.disabled = disabled;
      this.#trigger.toggleAttribute('disabled', disabled);
      this.#clearBtn.toggleAttribute('disabled', disabled);
      this.estado('disabled', disabled);
      if (disabled) this.open = false;
    }

    #positionList(): void {
      const rect = this.#base.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = placementHaciaCentro(rect).startsWith('top');
      const em = parseFloat(getComputedStyle(this).fontSize) || 16;
      const maxH = Math.min(14 * em, Math.max(7.5 * em, openUp ? rect.top - 8 : spaceBelow));
      Object.assign(this.#listbox.style, {
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 10)}px`,
        maxHeight: `${maxH}px`,
        top: openUp ? 'auto' : `${rect.bottom + 0.25 * em}px`,
        bottom: openUp ? `${window.innerHeight - rect.top + 0.25 * em}px` : 'auto',
      });
    }

    #syncOpen(): void {
      const open = this.open && !this.disabled;
      this.#input.setAttribute('aria-expanded', String(open));
      this.estado('open', open);

      if (open) {
        // Abrir sobre un valor ya elegido lista todas las opciones; solo filtra lo tecleado.
        const elegido = this.#options.find((o) => o.value === this.value);
        this.#filter = elegido && elegido.label === this.#input.value ? '' : this.#input.value;
        this.#renderList();
        this.#positionList();
        if (!this.#dialog.open) {
          this.#dialog.showModal();
          this.#capa.attach();
        } else {
          this.#positionList();
        }
        // El modal atrapa foco: enfocamos el dialog y manejamos teclas ahí
        queueMicrotask(() => {
          try { this.#dialog.focus({ preventScroll: true }); } catch { /* noop */ }
        });
        if (!this.#wasOpen) emit(this, 'iswc-show', {});
      } else {
        this.#activeIndex = -1;
        this.#syncActiveDescendant();
        if (this.#dialog.open) this.#dialog.close();
        this.#capa.detach();
        if (this.#wasOpen) emit(this, 'iswc-hide', {});
      }
      this.#wasOpen = open;
    }

    #syncValueToInput(fromUser: boolean): void {
      const val = this.value;
      const opt = this.#options.find((o) => o.value === val);
      const display = opt ? opt.label : val;
      if (!fromUser || this.#input.value !== display) {
        if (!this.open || !fromUser) this.#input.value = display;
      }
      this.#syncClear();
    }

    #collectOptions(): void {
      const nodes = this.#slot.assignedElements({ flatten: true });
      this.#options = [];
      const push = (el: Element) => {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'iswc-option' && tag !== 'option') return;
        this.#options.push({
          value: el.hasAttribute('value') ? (el.getAttribute('value') ?? '') : (el.textContent || '').trim(),
          label: (el.textContent || '').trim(),
          disabled: el.hasAttribute('disabled'),
          el: el as HTMLElement,
        });
      };
      for (const el of nodes) push(el);
      if (!this.#options.length) {
        for (const el of Array.from(this.children)) push(el);
      }
      this.#renderList();
    }

    #filtered(): { value: string; label: string; disabled: boolean; el: HTMLElement }[] {
      const q = (this.#filter || '').trim().toLowerCase();
      if (!q) return this.#options.filter((o) => !o.disabled);
      return this.#options.filter((o) => !o.disabled && o.label.toLowerCase().includes(q));
    }

    #renderList(): void {
      const items = this.#filtered();
      const baseId = this.id || this.localName;
      this.#listbox.replaceChildren();
      if (!items.length) {
        const vacio = document.createElement('div');
        vacio.className = 'empty';
        vacio.textContent = this.getAttribute('no-results') || this.t('sinResultados');
        this.#listbox.appendChild(vacio);
      }
      items.forEach((opt, i) => {
        const btn = document.createElement('div');
        btn.className = 'option';
        btn.setAttribute('part', 'option');
        btn.setAttribute('role', 'option');
        btn.setAttribute('id', `${baseId}-opt-${i}`);
        btn.setAttribute('data-value', opt.value);
        btn.setAttribute('aria-selected', String(opt.value === this.value));
        if (i === this.#activeIndex) btn.setAttribute('data-active', '');
        btn.textContent = opt.label;
        this.#listbox.appendChild(btn);
      });
      if (this.#activeIndex >= items.length) this.#activeIndex = items.length - 1;
      this.#syncActiveDescendant();
    }

    /** Sincroniza aria-activedescendant del input con la option activa. */
    #syncActiveDescendant(): void {
      const items = this.#filtered();
      const idx = this.#activeIndex;
      if (idx < 0 || idx >= items.length) {
        this.#input.removeAttribute('aria-activedescendant');
        return;
      }
      const baseId = this.id || this.localName;
      this.#input.setAttribute('aria-activedescendant', `${baseId}-opt-${idx}`);
    }

    #selectIndex(i: number): void {
      const items = this.#filtered();
      if (i < 0 || i >= items.length) return;
      const opt = items[i];
      this.#commit(opt.value, opt.label);
    }

    #commit(value: string, label?: string): void {
      const prev = this.value;
      this.setAttribute('value', value);
      this.#input.value = label ?? value;
      this.#filter = '';
      this.open = false;
      this.sincronizarFormulario();
      this.#syncClear();
      emit(this, 'iswc-input', { value });
      if (prev !== value) {
        this.interactuado = true;
        emit(this, 'iswc-change', { value });
      }
      this.#ignoreFocusOpen = true;
      this.#input.focus();
      queueMicrotask(() => { this.#ignoreFocusOpen = false; });
    }

    #onReposition = (): void => {
      if (this.open) this.#positionList();
    };

    #onInputFocus = (): void => {
      if (this.disabled || this.#ignoreFocusOpen) return;
      this.open = true;
    };

    #onInput = (): void => {
      this.#filter = this.#input.value;
      this.#activeIndex = 0;
      if (!this.open) this.open = true;
      else this.#renderList();
      emit(this, 'iswc-input', { value: this.#input.value });
    };

    #onKeydown = (e: KeyboardEvent) => {
      const items = this.#filtered();

      // Si el foco está en el dialog, tipografía actualiza el filtro + input
      if (e.target === this.#dialog && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.#filter = (this.#filter || '') + e.key;
        this.#input.value = this.#filter;
        this.#activeIndex = 0;
        if (!this.open) this.open = true;
        else this.#renderList();
        emit(this, 'iswc-input', { value: this.#input.value });
        return;
      }
      if (e.target === this.#dialog && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        this.#filter = (this.#filter || '').slice(0, -1);
        this.#input.value = this.#filter;
        this.#activeIndex = 0;
        this.#renderList();
        emit(this, 'iswc-input', { value: this.#input.value });
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          this.#activeIndex = Math.min(this.#activeIndex + 1, items.length - 1);
          this.#renderList();
          this.#scrollActive();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          this.#activeIndex = Math.max(this.#activeIndex - 1, 0);
          this.#renderList();
          this.#scrollActive();
          break;
        case 'Home':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          if (items.length === 0) return;
          this.#activeIndex = 0;
          this.#renderList();
          this.#scrollActive();
          break;
        case 'End':
          e.preventDefault();
          if (!this.open) { this.open = true; return; }
          if (items.length === 0) return;
          this.#activeIndex = items.length - 1;
          this.#renderList();
          this.#scrollActive();
          break;
        case 'Enter':
          if (this.open && this.#activeIndex >= 0) {
            e.preventDefault();
            this.#selectIndex(this.#activeIndex);
          }
          break;
        case 'Escape':
          if (this.open) {
            e.preventDefault();
            this.open = false;
            this.#syncValueToInput(false);
            this.#ignoreFocusOpen = true;
            this.#input.focus();
            queueMicrotask(() => { this.#ignoreFocusOpen = false; });
          }
          break;
      }
    };

    #scrollActive(): void {
      const el = this.#listbox.querySelector<HTMLElement>('[data-active]');
      el?.scrollIntoView({ block: 'nearest' });
    }

    #onListMouseDown = (e: PointerEvent): void => {
      const target = e.target as Element | null;
      const opt = target?.closest('[role="option"]');
      if (!opt) return;
      e.preventDefault();
      const value = opt.getAttribute('data-value') ?? '';
      const found = this.#options.find((o) => o.value === value);
      this.#commit(value, found?.label);
    };

    #onDialogClick = (e: PointerEvent): void => {
      if (e.target !== this.#dialog) return;
      const base = this.#base.getBoundingClientRect();
      const overControl =
        e.clientX >= base.left && e.clientX <= base.right &&
        e.clientY >= base.top && e.clientY <= base.bottom;
      // Clic sobre el control (bajo el dialog transparente): no cerrar
      if (overControl) return;
      this.open = false;
      this.#syncValueToInput(false);
    };

    #onDialogCancel = (e: Event): void => {
      e.preventDefault();
      this.open = false;
      this.#syncValueToInput(false);
    };

    #onClear = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      const prev = this.value;
      this.removeAttribute('value');
      this.#input.value = '';
      this.#filter = '';
      this.sincronizarFormulario();
      this.#syncClear();
      emit(this, 'iswc-input', { value: '' });
      if (prev) {
        this.interactuado = true;
        emit(this, 'iswc-change', { value: '' });
      }
      this.#input.focus();
      this.open = true;
    };

    #onTrigger = (e: Event): void => {
      e.preventDefault();
      if (this.disabled) return;
      this.open = !this.open;
      if (this.open) this.#dialog.focus({ preventScroll: true });
      else this.#input.focus();
    };
  }

  define(IswcCombobox, 'IswcCombobox');
})();
