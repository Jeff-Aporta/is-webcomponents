import { adoptCss, defineElement, emit } from '../../core/element.js';
import '../media/icon.js';
import '../actions/button.js';
import '../helpers/format-bytes.js';
import { ElementBase } from '../../core/element-base.js';

/**
 * <is-file-input> — Web Component (vanilla).
 *
 * Dropzone + input file nativo oculto. Lista de archivos con quitar.
 *
 * Atributos
 *   label, hint, name, accept, capture
 *   multiple, disabled, required  (boolean)
 *
 * Propiedad
 *   files  File[]  get/set — reasignar dispara update
 *
 * Slots: label, hint, dropzone
 *
 * Custom states: blank, dragging  (:state / data-state-*)
 *
 * Eventos: change, input, is-change (bubbles, composed)
 *
 * CSS Parts: ::part(base) ::part(label) ::part(hint) ::part(dropzone)
 *            ::part(file-list) ::part(file) ::part(remove-button)
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <label part="label" class="label" id="label">
        <slot name="label"></slot>
      </label>
      <div part="hint" class="hint" id="hint">
        <slot name="hint"></slot>
      </div>
      <div
        part="dropzone"
        class="dropzone"
        tabindex="0"
        role="button"
        aria-labelledby="label"
        aria-describedby="hint"
      >
        <slot name="dropzone">
          <span class="dropzone-default">
            <is-icon icon="mdi:cloud-upload" aria-hidden="true"></is-icon>
            <span class="dropzone-text">Arrastra archivos aquí o haz clic para seleccionar</span>
          </span>
        </slot>
        <input part="input" class="native" type="file" tabindex="-1" aria-hidden="true" />
      </div>
      <ul part="file-list" class="file-list" hidden></ul>
    </div>
  `;

  const OBSERVED = ['label', 'hint', 'name', 'accept', 'capture', 'multiple', 'disabled', 'required'];

  class IsFileInput extends ElementBase {
    static formAssociated = true;
    static get observedAttributes(): string[] { return OBSERVED; }

    #internals: ElementInternals | null = null;
    #dropzone!: HTMLElement;
    #input!: HTMLInputElement;
    #labelEl!: HTMLElement;
    #hintEl!: HTMLElement;
    #list!: HTMLElement;
    #labelSlot!: HTMLSlotElement;
    #hintSlot!: HTMLSlotElement;
    #files: File[] = [];

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#dropzone = shadow.querySelector<HTMLElement>('.dropzone')!;
      this.#input = shadow.querySelector<HTMLInputElement>('.native')!;
      this.#labelEl = shadow.querySelector<HTMLElement>('.label')!;
      this.#hintEl = shadow.querySelector<HTMLElement>('.hint')!;
      this.#list = shadow.querySelector<HTMLElement>('.file-list')!;
      this.#labelSlot = shadow.querySelector<HTMLSlotElement>('slot[name="label"]')!;
      this.#hintSlot = shadow.querySelector<HTMLSlotElement>('slot[name="hint"]')!;

      if ('attachInternals' in this) {
        try { this.#internals = this.attachInternals(); } catch { /* already */ }
      }

      this.#dropzone.addEventListener('click', this.#onZoneClick);
      this.#dropzone.addEventListener('keydown', this.#onZoneKey);
      this.#dropzone.addEventListener('dragenter', this.#onDragEnter);
      this.#dropzone.addEventListener('dragover', this.#onDragOver);
      this.#dropzone.addEventListener('dragleave', this.#onDragLeave);
      this.#dropzone.addEventListener('drop', this.#onDrop);
      this.#input.addEventListener('change', this.#onNativeChange);
      this.#labelSlot.addEventListener('slotchange', () => this.#syncSlots());
      this.#hintSlot.addEventListener('slotchange', () => this.#syncSlots());
    }

    onConnected(): void {
      this.#syncAttrs();
      this.#syncSlots();
      this.#syncDisabled();
      this.#syncRequired();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
    }

    onAttributeChanged(name: string, _oldVal: string | null, _newVal: string | null): void {
      if (name === 'disabled') this.#syncDisabled();
      else if (name === 'required') this.#syncRequired();
      else if (name === 'label' || name === 'hint') this.#syncSlots();
      else this.#syncAttrs();
    }

    get files(): File[] { return this.#files.slice(); }
    set files(list: File[] | unknown) {
      const arr = Array.isArray(list)
        ? (list.filter((f: unknown) => f instanceof File) as File[])
        : [];
      this.#files = arr;
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    get value(): string {
      return this.#files.map((f: File) => f.name).join(', ');
    }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }

    get multiple(): boolean { return this.hasAttribute('multiple'); }
    set multiple(v: boolean) { this.toggleAttribute('multiple', !!v); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(v: boolean) { this.toggleAttribute('required', !!v); }

    formDisabledCallback(disabled: boolean): void {
      this.#syncDisabled(disabled);
    }

    #setState(name: string, on: boolean): void {
      const s = this.#internals?.states;
      if (s) {
        if (on) s.add(name);
        else s.delete(name);
      }
      this.toggleAttribute(`data-state-${name}`, !!on);
    }

    #syncAttrs(): void {
      const map: string[] = ['name', 'accept', 'capture'];
      for (const a of map) {
        const v = this.getAttribute(a);
        if (v == null) this.#input.removeAttribute(a);
        else this.#input.setAttribute(a, v);
      }
      this.#input.toggleAttribute('multiple', this.multiple);
      this.#input.toggleAttribute('required', this.required);
    }

    #syncSlots(): void {
      const labelAttr = (this.getAttribute('label') || '').trim();
      const hintAttr = (this.getAttribute('hint') || '').trim();
      const hasLabelSlot = this.#labelSlot.assignedNodes({ flatten: true }).some(
        (n: Node) => n.nodeType === 1 || (n.nodeType === 3 && !!n.textContent?.trim()),
      );
      const hasHintSlot = this.#hintSlot.assignedNodes({ flatten: true }).some(
        (n: Node) => n.nodeType === 1 || (n.nodeType === 3 && !!n.textContent?.trim()),
      );

      if (!hasLabelSlot) {
        this.#labelSlot.textContent = labelAttr;
      }
      if (!hasHintSlot) {
        this.#hintSlot.textContent = hintAttr;
      }
      this.#labelEl.hidden = !labelAttr && !hasLabelSlot;
      this.#hintEl.hidden = !hintAttr && !hasHintSlot;
    }

    #syncDisabled(formDisabled?: boolean): void {
      const disabled = !!formDisabled || this.disabled;
      this.#input.disabled = disabled;
      this.#dropzone.toggleAttribute('aria-disabled', disabled);
      this.#dropzone.tabIndex = disabled ? -1 : 0;
      this.#setState('disabled', disabled);
    }

    #syncRequired(): void {
      if (!this.#internals) return;
      if (this.required && this.#files.length === 0) {
        this.#internals.setValidity({ valueMissing: true }, 'Selecciona al menos un archivo', this.#input);
      } else {
        this.#internals.setValidity({});
      }
    }

    #onZoneClick = (e: PointerEvent): void => {
      if (this.disabled || this.#input.disabled) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('.remove')) return;
      this.#input.click();
    };

    #onZoneKey = (e: KeyboardEvent): void => {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#input.click();
      }
    };

    #onDragEnter = (e: DragEvent): void => {
      e.preventDefault();
      if (this.disabled) return;
      this.#setState('dragging', true);
    };

    #onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (this.disabled) return;
      this.#setState('dragging', true);
    };

    #onDragLeave = (e: DragEvent): void => {
      const related = e.relatedTarget as Node | null;
      if (!this.#dropzone.contains(related)) {
        this.#setState('dragging', false);
      }
    };

    #onDrop = (e: DragEvent): void => {
      e.preventDefault();
      this.#setState('dragging', false);
      if (this.disabled) return;
      const list = e.dataTransfer?.files;
      if (!list?.length) return;
      this.#applyFileList(list);
    };

    #onNativeChange = (): void => {
      if (this.#input.files?.length) this.#applyFileList(this.#input.files);
    };

    #applyFileList(fileList: FileList): void {
      const incoming = Array.from(fileList);
      if (this.multiple) {
        const key = (f: File): string => `${f.name}:${f.size}:${f.lastModified}`;
        const seen = new Set(this.#files.map(key));
        for (const f of incoming) {
          if (!seen.has(key(f))) {
            this.#files.push(f);
            seen.add(key(f));
          }
        }
      } else {
        this.#files = incoming.slice(0, 1);
      }
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    #syncInputFromFiles(): void {
      try {
        const dt = new DataTransfer();
        for (const f of this.#files) dt.items.add(f);
        this.#input.files = dt.files;
        this.#internals?.setFormValue(
          this.multiple ? (dt.files as unknown as File) : (this.#files[0] || null),
        );
      } catch {
        // DataTransfer may fail in some environments; keep internal list
        this.#internals?.setFormValue(this.#files[0]?.name || '');
      }
    }

    #renderList(): void {
      this.#list.replaceChildren();
      if (!this.#files.length) {
        this.#list.hidden = true;
        return;
      }
      this.#list.hidden = false;
      this.#files.forEach((file: File, index: number) => {
        const li = document.createElement('li');
        li.setAttribute('part', 'file');
        li.className = 'file';

        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = file.name;

        const size = document.createElement('is-format-bytes');
        size.setAttribute('value', String(file.size));
        size.className = 'file-size';

        const remove = document.createElement('is-button') as HTMLElement & { type: string };
        remove.type = 'button';
        remove.className = 'remove';
        remove.setAttribute('part', 'remove-button');
        remove.setAttribute('variant', 'text');
        remove.setAttribute('color', 'neutral');
        remove.setAttribute('aria-label', `Quitar ${file.name}`);
        remove.innerHTML = '<is-icon icon="mdi:close" aria-hidden="true"></is-icon>';
        remove.addEventListener('click', (e) => {
          e.stopPropagation();
          this.#removeAt(index);
        });

        li.append(name, size, remove);
        this.#list.appendChild(li);
      });
    }

    #removeAt(index: number): void {
      this.#files.splice(index, 1);
      this.#syncInputFromFiles();
      this.#renderList();
      this.#setState('blank', this.#files.length === 0);
      this.#syncRequired();
      this.#emitChange();
    }

    #emitChange(): void {
      const detail = { files: this.files };
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      emit(this, 'is-change', detail);
    }
  }

  defineElement('is-file-input', IsFileInput, 'IsFileInput');
})();
