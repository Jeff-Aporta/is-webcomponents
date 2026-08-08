import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { setOptionalAttr, setStringAttr } from '../_shared/reflect.js';
import {
  bodyPreviewHtml,
  bodyToEditorHtml,
  editorHtmlToBody,
  surfaceHasRawVarTokens,
} from '../_shared/prompt-md.js';

/**
 * <is-md-render> — render inline de markdown/HTML + chips {{var}}.
 * Sin toolbar, diálogo ni API. Con `can-edit` edita in-place (contenteditable).
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="body prompt-md-preview" part="body" spellcheck="false"></div>
    <p class="empty" part="empty" hidden></p>
  `;

  const OBSERVED = ['value', 'can-edit', 'readonly', 'placeholder'];

  function getCaretOffset(root, targetNode, targetOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node = walker.nextNode();
    while (node) {
      if (node === targetNode) return offset + targetOffset;
      offset += node.textContent?.length ?? 0;
      node = walker.nextNode();
    }
    return offset;
  }

  function setCaretOffset(root, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remain = Math.max(0, offset ?? 0);
    let node = walker.nextNode();
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (remain <= len) {
        const range = document.createRange();
        range.setStart(node, remain);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      }
      remain -= len;
      node = walker.nextNode();
    }
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function saveCaret(root) {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !root) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return null;
    return getCaretOffset(root, range.startContainer, range.startOffset);
  }

  function restoreCaret(root, offset) {
    if (offset == null || !root) return;
    requestAnimationFrame(() => setCaretOffset(root, offset));
  }

  class IsMdRender extends ElementBase {
    static get observedAttributes() { return OBSERVED; }

    #body;
    #empty;
    #dirty = false;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#body = shadow.querySelector('.body');
      this.#empty = shadow.querySelector('.empty');

      this.#body.addEventListener('input', () => this.#onInput());
      this.#body.addEventListener('blur', () => this.#onBlur());
      this.#body.addEventListener('keydown', (e) => this.#onKeyDown(e));
    }

    onConnected() {
      this.#hydrateValueFromChild();
      this.#render();
    }

    onAttributeChanged(name) {
      if (name === 'value' && this.#dirty) return;
      this.#render();
    }

    #hydrateValueFromChild() {
      if (this.hasAttribute('value')) return;
      const area = this.querySelector(':scope > textarea[data-md-source]');
      if (area) {
        const body = String(area.value ?? area.textContent ?? '').replace(/^\n/, '');
        if (body) this.value = body;
        return;
      }
      const script = [...this.children].find((c) => {
        if (c.tagName !== 'SCRIPT') return false;
        const t = (c.getAttribute('type') || '').toLowerCase();
        return t === 'text/markdown' || t === 'text/plain' || t === 'text/md';
      });
      if (!script) return;
      const body = String(script.textContent ?? '').replace(/^\n/, '');
      if (body) this.value = body;
    }

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) {
      this.#dirty = false;
      setOptionalAttr(this, 'value', v);
    }

    get canEdit() { return this.hasAttribute('can-edit') && !this.hasAttribute('readonly'); }
    set canEdit(v) { this.toggleAttribute('can-edit', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get placeholder() { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v) { setStringAttr(this, 'placeholder', v); }

    /** Fuerza re-render desde `value` (útil tras mutaciones externas). */
    refresh() {
      this.#dirty = false;
      this.#render();
    }

    #render() {
      const canEdit = this.canEdit;
      const value = this.value;
      this.toggleAttribute('editable', canEdit);
      this.#body.contentEditable = canEdit ? 'true' : 'false';
      this.#body.setAttribute('role', canEdit ? 'textbox' : 'article');
      if (canEdit) this.#body.setAttribute('aria-multiline', 'true');
      else this.#body.removeAttribute('aria-multiline');

      if (canEdit) {
        this.#body.hidden = false;
        this.#empty.hidden = true;
        this.#body.innerHTML = bodyToEditorHtml(value) || '<p><br></p>';
        return;
      }

      const html = bodyPreviewHtml(value);
      const hasContent = !!html;
      this.#body.hidden = !hasContent;
      this.#empty.hidden = hasContent;
      if (hasContent) this.#body.innerHTML = html;
      else this.#empty.textContent = this.placeholder || 'Sin contenido';
    }

    #onInput() {
      if (!this.canEdit) return;
      this.#dirty = true;
      const next = editorHtmlToBody(this.#body);
      if (surfaceHasRawVarTokens(this.#body)) {
        const caret = saveCaret(this.#body);
        this.#body.innerHTML = bodyToEditorHtml(next);
        restoreCaret(this.#body, caret);
      }
      emit(this, 'is-input', { value: next });
    }

    #onBlur() {
      if (!this.canEdit || !this.#dirty) return;
      const next = editorHtmlToBody(this.#body);
      this.#dirty = false;
      if (next === this.value) return;
      setOptionalAttr(this, 'value', next);
      emit(this, 'is-change', { value: next });
    }

    #onKeyDown(e) {
      if (!this.canEdit) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'b') { e.preventDefault(); document.execCommand('bold'); this.#onInput(); }
      else if (key === 'i') { e.preventDefault(); document.execCommand('italic'); this.#onInput(); }
      else if (key === 's') {
        e.preventDefault();
        this.#commitPersist();
      }
    }

    #commitPersist() {
      if (!this.canEdit) return;
      const next = editorHtmlToBody(this.#body);
      this.#dirty = false;
      setOptionalAttr(this, 'value', next);
      emit(this, 'is-change', { value: next });
      emit(this, 'is-persist', { value: next });
    }
  }

  defineElement('is-md-render', IsMdRender, 'IsMdRender');
})();
