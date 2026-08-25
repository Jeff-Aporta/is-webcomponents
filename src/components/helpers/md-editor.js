import { adoptCss } from '../_shared/adopt-css.js';
import { defineElement } from '../_shared/define.js';
import { emit } from '../_shared/emit.js';
import { ElementBase } from '../_shared/element-base.js';
import { setStringAttr, setOptionalAttr } from '../_shared/reflect.js';
import {
  bodyPreviewHtml,
  bodyToEditorHtml,
  editorHtmlToBody,
  extractPromptVariables,
  surfaceHasRawVarTokens,
  varToneStyleAttr,
} from '../_shared/prompt-md.js';
import {
  apiRequest,
  byteLength,
  formatBytes,
  normalizeDocument,
  parseApiConfig,
} from './md-editor-api.js';
import '../layout/dialog.js';
import '../actions/button.js';
import '../actions/copy-button.js';
import '../forms/switch.js';
import '../media/icon.js';

/**
 * <is-md-editor> — preview MD + diálogo fullscreen (edición / revisión).
 *
 * Toolbar siempre visible; en readonly/!can-edit los comandos van disabled.
 * Footer: meta (chars, bytes, updatedAt, updatedBy) + Descargar (siempre) +
 * Descartar/Guardar si editable. Sin btn Cerrar en footer (usar X del header).
 *
 * Persistencia (elige una):
 *   - `api` / `src` → HTTP via md-editor-api.js
 *   - `.actions` → callbacks custom (load/persist/delete) sin app URL
 * Tipos: `md-editor-api.d.ts`. Preview inline: preferir `<is-md-render>`.
 */

(() => {
  const TOOLS = [
    { cmd: 'undo', icon: 'mdi:undo', title: 'Deshacer (Ctrl+Z)' },
    { cmd: 'redo', icon: 'mdi:redo', title: 'Rehacer (Ctrl+Y)' },
    { sep: true },
    { cmd: 'bold', icon: 'mdi:format-bold', title: 'Negrita' },
    { cmd: 'italic', icon: 'mdi:format-italic', title: 'Cursiva' },
    { cmd: 'strike', icon: 'mdi:format-strikethrough', title: 'Tachado' },
    { cmd: 'code', icon: 'mdi:code-tags', title: 'Código inline' },
    { sep: true },
    { cmd: 'h1', icon: 'mdi:format-header-1', title: 'Título 1' },
    { cmd: 'h2', icon: 'mdi:format-header-2', title: 'Título 2' },
    { cmd: 'h3', icon: 'mdi:format-header-3', title: 'Título 3' },
    { sep: true },
    { cmd: 'ul', icon: 'mdi:format-list-bulleted', title: 'Lista' },
    { cmd: 'ol', icon: 'mdi:format-list-numbered', title: 'Lista numerada' },
    { cmd: 'quote', icon: 'mdi:format-quote-close', title: 'Cita' },
    { cmd: 'hr', icon: 'mdi:minus', title: 'Línea horizontal' },
    { cmd: 'link', icon: 'mdi:link-variant', title: 'Enlace' },
  ];

  function buildToolbarHtml() {
    let html = '';
    for (const t of TOOLS) {
      if (t.sep) {
        html += '<span class="tb-sep" aria-hidden="true"></span>';
        continue;
      }
      html += `<is-button class="tb-btn" part="toolbar-button" data-cmd="${t.cmd}" variant="text" color="neutral" title="${t.title}"><is-icon icon="${t.icon}"></is-icon></is-button>`;
    }
    html += '<span class="tb-flex"></span>';
    html += '<is-switch class="tb-plain" part="plain-switch">Texto plano</is-switch>';
    return html;
  }

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div class="preview" part="preview" tabindex="0" role="button">
      <div class="preview-body prompt-md-preview" part="preview-body"></div>
      <p class="preview-empty" part="preview-empty" hidden></p>
      <is-copy-button class="copy" part="copy" tooltip="full" copy-label="Copiar" success-label="Copiado"></is-copy-button>
    </div>
    <is-dialog class="dlg" part="dialog" light-dismiss backdrop-variant="basic">
      <div slot="label" class="dlg-label-wrap">
        <span class="dlg-label" part="dialog-label"></span>
        <span class="dlg-filename" part="dialog-filename"></span>
      </div>
      <div class="toolbar" part="toolbar" role="toolbar">${buildToolbarHtml()}</div>
      <div class="vars" part="vars" hidden>
        <span class="vars-label" part="vars-label">Variables:</span>
        <span class="vars-list" part="vars-list"></span>
      </div>
      <div class="surface prompt-md-preview" part="surface" spellcheck="false" role="textbox" aria-multiline="true" tabindex="0" autofocus></div>
      <textarea class="plain" part="plain" spellcheck="false" hidden placeholder="Markdown y {{variables}} en texto plano…"></textarea>
      <div slot="footer" class="footer" part="footer">
        <div class="ft-meta" part="footer-meta" aria-live="polite"></div>
        <div class="ft-actions">
          <is-button class="ft-btn" part="footer-download" data-action="download" variant="outlined" color="neutral">
            <is-icon slot="start" icon="mdi:download"></is-icon>Descargar
          </is-button>
          <is-button class="ft-btn" part="footer-discard" data-action="discard" variant="text" color="neutral">Descartar</is-button>
          <is-button class="ft-btn" part="footer-save" data-action="save" variant="filled" color="brand">Guardar</is-button>
        </div>
      </div>
    </is-dialog>
  `;

  const OBSERVED = [
    'value', 'can-edit', 'readonly', 'label', 'placeholder', 'edit-block-reason', 'open',
    'fullscreen-scope', 'src', 'api', 'filename',
  ];
  const MAX_UNDO = 80;

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

  function saveSurfaceCaret(root) {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !root) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return null;
    return getCaretOffset(root, range.startContainer, range.startOffset);
  }

  function restoreSurfaceCaret(root, offset) {
    if (offset == null || !root) return;
    requestAnimationFrame(() => setCaretOffset(root, offset));
  }

  function formatWhen(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  }

  class IsMdEditor extends ElementBase {
    /** Personalización por atributo (ver `_shared/style-attrs.js`). */
    static styleAttrs = {
    'preview-max-height': '--is-md-editor-preview-max-height',
    };

    static get observedAttributes() { return [...OBSERVED, 'preview-max-height']; }

    #preview;
    #previewBody;
    #previewEmpty;
    #copyBtn;
    #dlg;
    #dlgLabel;
    #dlgFilename;
    #toolbar;
    #undoBtn;
    #redoBtn;
    #plainSwitch;
    #varsWrap;
    #varsList;
    #surface;
    #plainTextarea;
    #ftMeta;
    #ftDownload;
    #ftDiscard;
    #ftSave;

    #draft = '';
    #plain = false;
    #history = { past: [], future: [] };
    #scopeAnchor = null;
    /** @type {import('./md-editor-api.d.ts').IsMdEditorDocument} */
    #document = { content: '' };
    /** @type {import('./md-editor-api.d.ts').IsMdEditorApiConfig|null} */
    #api = null;
    /** @type {import('./md-editor-api.d.ts').IsMdEditorActions|null} */
    #actions = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#preview = shadow.querySelector('.preview');
      this.#previewBody = shadow.querySelector('.preview-body');
      this.#previewEmpty = shadow.querySelector('.preview-empty');
      this.#copyBtn = shadow.querySelector('.copy');
      this.#dlg = shadow.querySelector('.dlg');
      this.#dlg.style.setProperty('--width', 'min(96vw, 56rem)');
      this.#dlgLabel = shadow.querySelector('.dlg-label');
      this.#dlgFilename = shadow.querySelector('.dlg-filename');
      this.#toolbar = shadow.querySelector('.toolbar');
      this.#undoBtn = shadow.querySelector('[data-cmd="undo"]');
      this.#redoBtn = shadow.querySelector('[data-cmd="redo"]');
      this.#plainSwitch = shadow.querySelector('.tb-plain');
      this.#varsWrap = shadow.querySelector('.vars');
      this.#varsList = shadow.querySelector('.vars-list');
      this.#surface = shadow.querySelector('.surface');
      this.#plainTextarea = shadow.querySelector('.plain');
      this.#ftMeta = shadow.querySelector('.ft-meta');
      this.#ftDownload = shadow.querySelector('[data-action="download"]');
      this.#ftDiscard = shadow.querySelector('[data-action="discard"]');
      this.#ftSave = shadow.querySelector('[data-action="save"]');

      this.#preview.addEventListener('click', (e) => this.#onPreviewActivate(e));
      this.#preview.addEventListener('dblclick', (e) => this.#onPreviewActivate(e));
      this.#preview.addEventListener('keydown', (e) => {
        if (e.target !== this.#preview) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.open(); }
      });

      this.#dlg.addEventListener('is-show', () => this.#buildEditorState());
      this.#dlg.addEventListener('is-after-show', () => {
        if (!this.hasAttribute('open')) this.setAttribute('open', '');
        emit(this, 'is-open', {});
      });
      this.#dlg.addEventListener('is-hide', () => this.#commitIfEditable());
      this.#dlg.addEventListener('is-after-hide', () => {
        if (this.hasAttribute('open')) this.removeAttribute('open');
        this.#leaveTopLayer();
        emit(this, 'is-close', {});
      });

      this.#toolbar.addEventListener('mousedown', (e) => {
        if (e.target.closest('is-button[data-cmd]')) e.preventDefault();
      });
      this.#toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('is-button[data-cmd]');
        if (btn && !btn.disabled) this.#runCommand(btn.dataset.cmd);
      });
      this.#plainSwitch.addEventListener('is-change', (e) => {
        if (!this.canEdit) {
          this.#plainSwitch.checked = false;
          return;
        }
        this.#setPlainMode(!!e.detail?.checked);
      });

      this.#surface.addEventListener('input', () => this.#onSurfaceInput());
      this.#surface.addEventListener('keydown', (e) => this.#onEditorKeyDown(e));
      this.#plainTextarea.addEventListener('input', () => this.#onPlainInput());
      this.#plainTextarea.addEventListener('keydown', (e) => this.#onEditorKeyDown(e));

      this.#ftDownload.addEventListener('click', () => this.download());
      this.#ftDiscard.addEventListener('click', () => this.#dlg.hide());
      this.#ftSave.addEventListener('click', () => void this.#save());
    }

    onConnected() {
      this.#api = parseApiConfig(this.getAttribute('api')) || this.#api;
      this.#hydrateValueFromChild();
      this.#syncDocumentFromValue();
      this.#renderPreview();
      this.#syncDialogLabel();
      this.#applyFullscreenScope();
      if (this.hasAttribute('open')) this.#syncOpenAttr();
      if (this.#actions?.load || this.src || this.#api?.endpoints?.get) void this.load();
    }

    onDisconnected() {
      this.#releaseScopeAnchor();
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

    onAttributeChanged(name) {
      if (name === 'value' || name === 'placeholder') {
        if (name === 'value') this.#syncDocumentFromValue();
        this.#renderPreview();
        if (this.#dlg.open) this.#syncFooterMeta();
      }
      if (name === 'can-edit' || name === 'readonly') {
        this.#renderPreview();
        if (this.#dlg.open) this.#syncCanEditUi();
      }
      if (name === 'label' || name === 'filename') this.#syncDialogLabel();
      if (name === 'open') this.#syncOpenAttr();
      if (name === 'fullscreen-scope') this.#applyFullscreenScope();
      if (name === 'api') this.#api = parseApiConfig(this.getAttribute('api'));
      if (name === 'src' && this.isConnected) void this.load();
    }

    // ---- public properties ----

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { setOptionalAttr(this, 'value', v); }

    get canEdit() { return this.hasAttribute('can-edit') && !this.hasAttribute('readonly'); }
    set canEdit(v) { this.toggleAttribute('can-edit', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    get label() { return this.getAttribute('label') ?? ''; }
    set label(v) { setStringAttr(this, 'label', v); }

    get filename() {
      return this.getAttribute('filename') || this.#document.filename || '';
    }
    set filename(v) {
      setOptionalAttr(this, 'filename', v);
      if (v) this.#document.filename = String(v);
      this.#syncDialogLabel();
    }

    get placeholder() { return this.getAttribute('placeholder') ?? ''; }
    set placeholder(v) { setStringAttr(this, 'placeholder', v); }

    get editBlockReason() { return this.getAttribute('edit-block-reason') ?? ''; }
    set editBlockReason(v) { setStringAttr(this, 'edit-block-reason', v); }

    get fullscreenScope() {
      return this.getAttribute('fullscreen-scope') === 'local' ? 'local' : 'global';
    }
    set fullscreenScope(v) {
      setStringAttr(this, 'fullscreen-scope', v === 'local' ? 'local' : null);
    }

    get src() { return this.getAttribute('src') || ''; }
    set src(v) { setOptionalAttr(this, 'src', v); }

    get api() { return this.#api; }
    set api(v) {
      this.#api = parseApiConfig(v);
      if (this.#api) this.setAttribute('api', JSON.stringify({
        baseUrl: this.#api.baseUrl,
        endpoints: this.#api.endpoints,
      }));
      else this.removeAttribute('api');
    }

    /**
     * Callbacks custom (JS only). Prioridad sobre `api`/`src`.
     * @type {import('./md-editor-api.d.ts').IsMdEditorActions|null}
     */
    get actions() { return this.#actions; }
    set actions(v) {
      this.#actions = v && typeof v === 'object' ? v : null;
    }

    /** Documento canónico (meta + content). */
    get document() {
      return {
        ...this.#document,
        content: this.value,
        sizeBytes: byteLength(this.value),
        filename: this.filename || this.#document.filename,
      };
    }
    set document(doc) {
      this.setDocument(doc);
    }

    // ---- public methods ----

    open() {
      if (this.#dlg.open) return;
      this.#enterTopLayer();
      this.#dlg.show();
    }

    close() {
      if (!this.#dlg.open) return;
      if (this.canEdit) this.#commitDraft('is-change');
      this.#dlg.hide();
      this.#leaveTopLayer();
    }

    /**
     * @param {import('./md-editor-api.d.ts').IsMdEditorDocument|string} doc
     */
    setDocument(doc) {
      const normalized = normalizeDocument(doc, this.#api || {});
      this.#document = normalized;
      this.value = normalized.content || '';
      if (normalized.filename) this.setAttribute('filename', normalized.filename);
      this.#syncDialogLabel();
      this.#renderPreview();
      if (this.#dlg.open) {
        this.#draft = this.value;
        this.#renderVars();
        this.#renderSurfaceFromDraft();
        this.#syncFooterMeta();
      }
      return this;
    }

    /**
     * Carga: `actions.load` → `src` / `api.endpoints.get`.
     * Sin ninguna fuente remota → no-op (`null`).
     */
    async load() {
      try {
        if (typeof this.#actions?.load === 'function') {
          const raw = await this.#actions.load();
          this.setDocument(raw);
          emit(this, 'is-load', { document: this.document });
          return this.document;
        }
        const cfg = this.#resolveApiForGet();
        if (!cfg) return null;
        const doc = await apiRequest(cfg, 'get');
        this.setDocument(doc);
        emit(this, 'is-load', { document: this.document });
        return this.document;
      } catch (err) {
        emit(this, 'is-error', { action: 'load', error: String(err?.message || err) });
        throw err;
      }
    }

    /**
     * Persiste: `actions.persist` → PUT/POST de `api.endpoints`.
     * Sin handler remoto lanza (el guardado local ya emitió `is-persist` en `#save`).
     */
    async persistRemote() {
      const doc = this.document;
      try {
        if (typeof this.#actions?.persist === 'function') {
          const saved = await this.#actions.persist(doc);
          if (saved) {
            const normalized = normalizeDocument(saved, this.#api || {});
            this.setDocument({ ...doc, ...normalized, content: normalized.content || doc.content });
          }
          emit(this, 'is-persist', { value: this.value, document: this.document });
          return this.document;
        }
        const cfg = this.#api;
        if (!cfg?.endpoints?.put && !cfg?.endpoints?.post) {
          throw new Error('Sin actions.persist ni endpoints put/post');
        }
        const method = cfg.endpoints.put ? 'put' : 'post';
        const saved = await apiRequest(cfg, method, doc);
        if (saved) this.setDocument({ ...doc, ...saved, content: saved.content ?? doc.content });
        emit(this, 'is-persist', { value: this.value, document: this.document });
        return this.document;
      } catch (err) {
        emit(this, 'is-error', { action: 'persist', error: String(err?.message || err) });
        throw err;
      }
    }

    async removeRemote() {
      try {
        if (typeof this.#actions?.delete === 'function') {
          await this.#actions.delete(this.document);
          emit(this, 'is-delete', { document: this.document });
          return;
        }
        const cfg = this.#api;
        if (!cfg?.endpoints?.delete) throw new Error('Sin actions.delete ni endpoint delete');
        await apiRequest(cfg, 'delete', this.document);
        emit(this, 'is-delete', { document: this.document });
      } catch (err) {
        emit(this, 'is-error', { action: 'delete', error: String(err?.message || err) });
        throw err;
      }
    }

    #hasRemotePersist() {
      return typeof this.#actions?.persist === 'function'
        || !!(this.#api?.endpoints?.put || this.#api?.endpoints?.post);
    }

    /** Descarga el markdown actual (siempre disponible). */
    download() {
      const text = this.#dlg.open ? this.#draft : this.value;
      const name = (this.filename || this.label || 'documento').replace(/[^\w.\-áéíóúñü]+/gi, '_');
      const filename = /\.md$/i.test(name) ? name : `${name}.md`;
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      emit(this, 'is-download', { filename, bytes: byteLength(text) });
    }

    // ---- private helpers ----

    #resolveApiForGet() {
      if (this.#api?.endpoints?.get) return this.#api;
      if (this.src) {
        return {
          ...(this.#api || {}),
          endpoints: { ...(this.#api?.endpoints || {}), get: this.src },
        };
      }
      return null;
    }

    #syncDocumentFromValue() {
      this.#document = {
        ...this.#document,
        content: this.value,
        sizeBytes: byteLength(this.value),
        filename: this.getAttribute('filename') || this.#document.filename,
      };
    }

    #onPreviewActivate(e) {
      if (e.target.closest('is-copy-button')) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && this.#previewBody.contains(sel.anchorNode)) return;
      this.open();
    }

    #renderPreview() {
      const value = this.value;
      const html = bodyPreviewHtml(value);
      this.#copyBtn.value = value;
      const hasContent = !!html;
      this.#previewBody.hidden = !hasContent;
      this.#previewEmpty.hidden = hasContent;
      if (hasContent) this.#previewBody.innerHTML = html;
      else this.#previewEmpty.textContent = this.placeholder || 'Sin contenido. Haz clic para editar…';
      this.#preview.title = this.canEdit
        ? 'Clic o doble clic para editar'
        : (this.editBlockReason || 'Clic para revisar');
    }

    #syncOpenAttr() {
      const want = this.hasAttribute('open');
      if (want && !this.#dlg.open) this.open();
      else if (!want && this.#dlg.open) this.close();
    }

    #syncDialogLabel() {
      this.#dlgLabel.textContent = this.label || this.getAttribute('title') || 'Documento';
      const fn = this.filename;
      this.#dlgFilename.textContent = fn || '';
    }

    #applyFullscreenScope() {
      const local = this.fullscreenScope === 'local';
      this.#dlg.style.position = local ? 'absolute' : '';
      this.#releaseScopeAnchor();
      if (!local) return;
      this.#leaveTopLayer();
      const scope = this.closest('[data-md-editor-scope]');
      if (scope) this.#claimScopeAnchor(scope);
      else if (getComputedStyle(this).position === 'static') {
        this.style.position = 'relative';
        this.dataset.mdEditorAutoRelative = '1';
      }
    }

    /** Top layer escapa containing blocks (overflow/filter/transform en padres). */
    #enterTopLayer() {
      if (this.fullscreenScope === 'local') return;
      if (typeof this.#dlg.showPopover !== 'function') return;
      try {
        if (!this.#dlg.hasAttribute('popover')) this.#dlg.setAttribute('popover', 'manual');
        if (!this.#dlg.matches(':popover-open')) this.#dlg.showPopover();
      } catch { /* popover no disponible o ya abierto */ }
    }

    #leaveTopLayer() {
      if (typeof this.#dlg.hidePopover !== 'function') return;
      try {
        if (this.#dlg.matches(':popover-open')) this.#dlg.hidePopover();
      } catch { /* ignore */ }
      this.#dlg.removeAttribute('popover');
    }

    #claimScopeAnchor(scope) {
      if (this.#scopeAnchor === scope) return;
      if (getComputedStyle(scope).position === 'static') {
        scope.style.position = 'relative';
        scope.dataset.mdEditorAutoRelative = '1';
      }
      this.#scopeAnchor = scope;
    }

    #releaseScopeAnchor() {
      if (this.#scopeAnchor?.dataset.mdEditorAutoRelative) {
        this.#scopeAnchor.style.position = '';
        delete this.#scopeAnchor.dataset.mdEditorAutoRelative;
      }
      this.#scopeAnchor = null;
      if (this.dataset.mdEditorAutoRelative) {
        this.style.position = '';
        delete this.dataset.mdEditorAutoRelative;
      }
    }

    #commitIfEditable() {
      if (this.canEdit) this.#commitDraft('is-change');
    }

    #commitDraft(eventType) {
      const value = this.#draft;
      this.value = value;
      this.#syncDocumentFromValue();
      emit(this, eventType, { value, document: this.document });
    }

    async #save() {
      if (!this.#dlg.open || !this.canEdit) return;
      const value = this.#draft;
      this.value = value;
      this.#syncDocumentFromValue();
      if (this.#hasRemotePersist()) {
        try { await this.persistRemote(); } catch { /* is-error ya emitido */ }
      } else {
        emit(this, 'is-persist', { value, document: this.document });
      }
      this.#dlg.hide();
    }

    #buildEditorState() {
      this.#draft = this.value;
      this.#history = { past: [], future: [] };
      this.#plain = false;
      this.#syncDialogLabel();
      this.#renderVars();
      this.#syncCanEditUi();
      this.#syncHistoryButtons();
      this.#syncFooterMeta();
    }

    /** Toolbar siempre visible; botones disabled si !canEdit. */
    #syncCanEditUi() {
      const canEdit = this.canEdit;
      this.#toolbar.hidden = false;
      for (const btn of this.#toolbar.querySelectorAll('is-button[data-cmd]')) {
        const cmd = btn.dataset.cmd;
        if (cmd === 'undo' || cmd === 'redo') continue;
        btn.toggleAttribute('disabled', !canEdit);
      }
      this.#plainSwitch.toggleAttribute('disabled', !canEdit);
      this.#ftSave.hidden = !canEdit;
      this.#ftDiscard.hidden = !canEdit;
      this.#ftSave.toggleAttribute('disabled', !canEdit);
      this.#ftDownload.toggleAttribute('disabled', false);
      if (!canEdit && this.#plain) this.#setPlainMode(false);
      this.#plainSwitch.checked = this.#plain;
      this.#renderSurfaceFromDraft();
      this.#syncHistoryButtons();
    }

    #syncFooterMeta() {
      const text = this.#dlg.open ? this.#draft : this.value;
      const chars = [...text].length;
      const bytes = this.#document.sizeBytes ?? byteLength(text);
      const parts = [
        `<span class="ft-meta-item"><strong>${chars}</strong> caracteres</span>`,
        `<span class="ft-meta-item"><strong>${formatBytes(bytes)}</strong></span>`,
      ];
      if (this.#document.updatedAt) {
        parts.push(`<span class="ft-meta-item">Editado <strong>${formatWhen(this.#document.updatedAt)}</strong></span>`);
      }
      if (this.#document.updatedBy) {
        parts.push(`<span class="ft-meta-item">por <strong>${escapeText(this.#document.updatedBy)}</strong></span>`);
      }
      this.#ftMeta.innerHTML = parts.join('');
    }

    #renderVars() {
      const vars = extractPromptVariables(this.#draft);
      this.#varsWrap.hidden = vars.length === 0;
      this.#varsList.innerHTML = vars
        .map((name) => `<span class="prompt-var-chip prompt-var-chip--static" style="${varToneStyleAttr(name)}">{{${name}}}</span>`)
        .join('');
    }

    #renderSurfaceFromDraft() {
      const canEdit = this.canEdit;
      if (canEdit && this.#plain) {
        this.#surface.hidden = true;
        this.#plainTextarea.hidden = false;
        this.#plainTextarea.value = this.#draft;
        return;
      }
      this.#surface.hidden = false;
      this.#plainTextarea.hidden = true;
      this.#surface.contentEditable = canEdit ? 'true' : 'false';
      this.#surface.innerHTML = canEdit
        ? bodyToEditorHtml(this.#draft)
        : (bodyPreviewHtml(this.#draft) || '<p></p>');
    }

    #setPlainMode(on) {
      if (on === this.#plain) return;
      if (on) this.#draft = editorHtmlToBody(this.#surface);
      this.#plain = on && this.canEdit;
      this.#plainSwitch.checked = this.#plain;
      this.#renderSurfaceFromDraft();
      this.#syncFooterMeta();
    }

    #onSurfaceInput() {
      const next = editorHtmlToBody(this.#surface);
      this.#pushHistory(this.#draft);
      this.#draft = next;
      this.#renderVars();
      this.#syncFooterMeta();
      if (surfaceHasRawVarTokens(this.#surface)) {
        const caret = saveSurfaceCaret(this.#surface);
        this.#surface.innerHTML = bodyToEditorHtml(next);
        restoreSurfaceCaret(this.#surface, caret);
      }
      this.#syncHistoryButtons();
    }

    #onPlainInput() {
      this.#pushHistory(this.#draft);
      this.#draft = this.#plainTextarea.value;
      this.#renderVars();
      this.#syncFooterMeta();
      this.#syncHistoryButtons();
    }

    #onEditorKeyDown(e) {
      if (!this.canEdit) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); this.#undo(); }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); this.#redo(); }
      else if (key === 'b') { e.preventDefault(); this.#runCommand('bold'); }
      else if (key === 'i') { e.preventDefault(); this.#runCommand('italic'); }
    }

    #runCommand(cmd) {
      if (cmd === 'undo') { this.#undo(); return; }
      if (cmd === 'redo') { this.#redo(); return; }
      if (!this.canEdit || this.#plain) return;
      this.#surface.focus();
      if (cmd === 'bold') document.execCommand('bold');
      else if (cmd === 'italic') document.execCommand('italic');
      else if (cmd === 'strike') document.execCommand('strikeThrough');
      else if (cmd === 'code') this.#wrapInline('code');
      else if (cmd === 'h1') document.execCommand('formatBlock', false, 'h1');
      else if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
      else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'ol') document.execCommand('insertOrderedList');
      else if (cmd === 'quote') document.execCommand('formatBlock', false, 'blockquote');
      else if (cmd === 'hr') document.execCommand('insertHorizontalRule');
      else if (cmd === 'link') {
        const url = window.prompt('URL del enlace', 'https://');
        if (url) document.execCommand('createLink', false, url);
      }
      this.#onSurfaceInput();
    }

    #wrapInline(tag) {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      document.execCommand('insertHTML', false, `<${tag}>${sel.toString() || 'código'}</${tag}>`);
    }

    #pushHistory(prev) {
      this.#history.past.push(prev);
      if (this.#history.past.length > MAX_UNDO) this.#history.past.shift();
      this.#history.future = [];
    }

    #undo() {
      if (!this.canEdit) return;
      const { past } = this.#history;
      if (!past.length) return;
      this.#history.future.push(this.#draft);
      this.#draft = past.pop();
      this.#renderVars();
      this.#renderSurfaceFromDraft();
      this.#syncHistoryButtons();
      this.#syncFooterMeta();
    }

    #redo() {
      if (!this.canEdit) return;
      const { future } = this.#history;
      if (!future.length) return;
      this.#history.past.push(this.#draft);
      this.#draft = future.pop();
      this.#renderVars();
      this.#renderSurfaceFromDraft();
      this.#syncHistoryButtons();
      this.#syncFooterMeta();
    }

    #syncHistoryButtons() {
      const canEdit = this.canEdit;
      this.#undoBtn?.toggleAttribute('disabled', !canEdit || this.#history.past.length === 0);
      this.#redoBtn?.toggleAttribute('disabled', !canEdit || this.#history.future.length === 0);
    }
  }

  function escapeText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  defineElement('is-md-editor', IsMdEditor, 'IsMdEditor');
})();
