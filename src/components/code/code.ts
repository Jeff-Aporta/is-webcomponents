/**
 * <is-code> — Editor de código con motor NATIVO (code-highlight, sin
 * CodeMirror): langs, temas JSON, formateo estilo Prettier, marks y API
 * code2json/json2code.
 *
 * Atributos
 *   lang              javascript | typescript | jsx | tsx | html | css | json | python | shell | curl | plaintext
 *   value             texto fuente
 *   document          JSON is-code-doc/v1 (alternativa a value; gana si ambos)
 *   format            JSON opciones tipo Prettier
 *   theme-config      JSON colores del editor
 *   line-numbers      boolean (default true)
 *   wrap              boolean text wrapping
 *   readonly, disabled, autofocus, tab-size
 *   compact           snippet de docs: altura al contenido, sin chrome de IDE
 *   mode              block (default) | inline — inserción en página (flujo de texto vs bloque)
 *   name              form-associated
 *   placeholder
 *   min-height        CSS length → --is-code-min-height
 *
 * Props JS: value, lang, mode, formatConfig, themeConfig, document, marks
 * Métodos: format(), getDocument(), setDocument(), code2json(), json2code(doc),
 *          setMarks(), clearMarks(), focus(), refresh(), registerLanguage (módulo)
 * Eventos: is-ready, is-input, is-change, is-cursor, is-mark-activate
 * Parts: root, editor, tooltip
 */

import { adoptCss, defineElement, emit, upgradeProperties } from '../../core/element.js';
import {
  attachFormInternals, setFormValue, setCustomState,
} from '../_shared/form-associated.js';
import { ElementBase } from '../../core/element-base.js';
import { setStringAttr } from '../_shared/reflect.js';
import {
  listLanguages, registerLanguage, resolveLanguage, inferLanguage,
} from '../_shared/code-langs.js';
import { formatCode, normalizeFormatConfig, DEFAULT_FORMAT } from '../_shared/code-format.js';
import { applyThemeConfig, parseThemeConfig } from '../_shared/code-theme.js';
import { softFormat, softFormatMode } from '../_shared/code-text.js';
import { DIFF_LINE_CLASSES } from '../_shared/code-diff.js';
import {
  code2json, json2code, parseCodeDocument, normalizeMark, rebaseMarks,
} from '../_shared/code-model.js';
import { tokenizeCode, lineToHtml } from '../_shared/code-highlight.js';
import '../feedback/tooltip.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="root" class="root">
    <textarea class="seed" part="seed" aria-hidden="true"></textarea>
    <div class="editor-host" part="editor"></div>
    <is-tooltip part="tooltip" class="doc-tip" trigger="none" placement="top" distance="8"></is-tooltip>
  </div>
`;

const OBSERVED = [
  'lang', 'value', 'document', 'format', 'theme-config',
  'line-numbers', 'wrap', 'readonly', 'disabled', 'autofocus', 'compact',
  'mode', 'tab-size', 'name', 'placeholder', 'min-height',
];

const PROP_UPGRADE = [
  'lang', 'value', 'document', 'format-config', 'theme-config',
  'line-numbers', 'wrap', 'readonly', 'disabled', 'autofocus', 'compact',
  'mode', 'tab-size', 'name', 'placeholder', 'min-height', 'marks',
];

class IsCode extends ElementBase {
  static styleAttrs = {
    radius: '--is-code-radius',
    'border-color': { prop: '--is-code-border', onlyColorValues: true },
    bg: { prop: '--is-code-bg', onlyColorValues: true },
    'text-color': { prop: '--is-code-fg', onlyColorValues: true },
    'min-height': '--is-code-min-height',
  };

  static formAssociated = true;
  static get observedAttributes(): string[] {
    return [...OBSERVED, ...IsCode.styleAttrNames];
  }

  #internals = null;
  #textarea = null;
  #host = null;
  #tooltip = null;
  #cm = null;           // legacy: siempre null (motor propio desde la migración)
  #native = false;
  #nativeRoot = null;
  #nativeText = null;
  #editing = false;
  #ta = null;
  #activeLine = -1;
  #ready = false;
  #marks = [];
  /** @type {Map<string, object>} */
  #cmMarks = new Map();
  #formatConfig = { ...DEFAULT_FORMAT };
  #themeConfig = null;
  #pendingValue = null;
  #booting = false;
  #onThemeChange = () => this.#syncThemeFromPage();
  #hideTipTimer = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#textarea = shadow.querySelector<HTMLElement>('.seed')!;
    this.#host = shadow.querySelector<HTMLElement>('.editor-host')!;
    this.#tooltip = shadow.querySelector<HTMLElement>('is-tooltip')!;
    this.#internals = attachFormInternals(this);
  }

  onConnected() {
    upgradeProperties(this, PROP_UPGRADE);
    this.#syncThemeFromPage();
    this.#syncLayoutDom();
    if (this.#themeConfig) applyThemeConfig(this, this.#themeConfig, this.#pageTheme());
    document.addEventListener('is-theme-change', this.#onThemeChange);
    if (!this.#cm && !this.#booting) this.#bootstrap();
    else requestAnimationFrame(() => this.#cm?.refresh());
  }

  onDisconnected() {
    document.removeEventListener('is-theme-change', this.#onThemeChange);
    clearTimeout(this.#hideTipTimer);
    this.#tooltip.open = false;
    // Conservar instancia al mover en el DOM; destruir solo si el documento
    // ya no contiene el nodo (descarte real).
    queueMicrotask(() => {
      if (!this.isConnected) {
        if (this.#cm) this.#destroyCm();
        if (this.#native) this.#destroyNative();
      }
    });
  }

  onAttributeChanged(name, _old, value) {
    if (!this.isConnected) return;
    switch (name) {
      case 'value':
        if (!this.hasAttribute('document')) this.#setValue(value ?? '', false);
        break;
      case 'document':
        if (value != null) this.setDocument(value);
        break;
      case 'lang':
        this.#applyLang();
        break;
      case 'format':
        this.#formatConfig = normalizeFormatConfig(this.#parseJsonAttr(value));
        break;
      case 'theme-config':
        this.#themeConfig = parseThemeConfig(value);
        applyThemeConfig(this, this.#themeConfig, this.#pageTheme());
        break;
      case 'line-numbers':
      case 'wrap':
      case 'readonly':
      case 'disabled':
      case 'compact':
      case 'mode':
      case 'tab-size':
      case 'placeholder':
        this.#applyOptions();
        break;
      case 'min-height':
        if (value) this.style.setProperty('--is-code-min-height', value);
        else this.style.removeProperty('--is-code-min-height');
        this.refresh();
        break;
      case 'name':
        setFormValue(this.#internals, this.value);
        break;
      default:
        break;
    }
  }

  // —— public API ——

  get ready() { return this.#ready; }
  get cm() { return this.#cm; }

  get value() {
    if (this.#native) return this.#nativeText ?? '';
    if (this.#cm) {
      const live = this.#cm.getValue();
      if (live) return live;
      // CM montado vacío por carrera con demo-code: no ignorar value/data-src.
      const seed = this.#pendingValue ?? this.getAttribute('value')
        ?? this.dataset.cmSource ?? this.dataset.src ?? '';
      return seed;
    }
    return this.#pendingValue ?? this.getAttribute('value')
      ?? this.dataset.cmSource ?? this.dataset.src ?? '';
  }
  set value(v) {
    this.#setValue(v == null ? '' : String(v), true);
  }

  get lang() { return this.getAttribute('lang') || 'javascript'; }
  set lang(v) { setStringAttr(this, 'lang', v || 'javascript'); }

  get lineNumbers() {
    // Inline / compact (snippets de docs): sin números salvo petición explícita.
    if (this.mode === 'inline' || this.compact) {
      if (!this.hasAttribute('line-numbers')) return false;
      return this.getAttribute('line-numbers') !== 'false';
    }
    return this.getAttribute('line-numbers') !== 'false';
  }
  set lineNumbers(v) {
    if (v === false || v === 'false') this.setAttribute('line-numbers', 'false');
    else this.removeAttribute('line-numbers');
  }

  get wrap() { return this.hasAttribute('wrap'); }
  set wrap(v) { this.toggleAttribute('wrap', !!v); }

  get readonly() { return this.hasAttribute('readonly'); }
  set readonly(v) { this.toggleAttribute('readonly', !!v); }

  get compact() { return this.hasAttribute('compact'); }
  set compact(v) { this.toggleAttribute('compact', !!v); }

  /** `block` (default) | `inline` — modo de inserción en la página. */
  get mode() {
    const m = (this.getAttribute('mode') || 'block').toLowerCase();
    return m === 'inline' ? 'inline' : 'block';
  }
  set mode(v) {
    const next = String(v || 'block').toLowerCase() === 'inline' ? 'inline' : 'block';
    if (next === 'block') this.removeAttribute('mode');
    else this.setAttribute('mode', 'inline');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }

  get autofocus() { return this.hasAttribute('autofocus'); }
  set autofocus(v) { this.toggleAttribute('autofocus', !!v); }

  get tabSize() {
    const n = parseInt(this.getAttribute('tab-size') || '2', 10);
    return Number.isFinite(n) && n > 0 ? n : 2;
  }
  set tabSize(v) { setStringAttr(this, 'tab-size', String(v)); }

  get name() { return this.getAttribute('name') || ''; }
  set name(v) { setStringAttr(this, 'name', v); }

  get placeholder() { return this.getAttribute('placeholder') || ''; }
  set placeholder(v) { setStringAttr(this, 'placeholder', v); }

  get formatConfig() { return { ...this.#formatConfig }; }
  set formatConfig(v) {
    this.#formatConfig = normalizeFormatConfig(v);
    if (v != null) this.setAttribute('format', JSON.stringify(this.#formatConfig));
    else this.removeAttribute('format');
  }

  get themeConfig() { return this.#themeConfig ? { ...this.#themeConfig } : null; }
  set themeConfig(v) {
    this.#themeConfig = parseThemeConfig(v);
    applyThemeConfig(this, this.#themeConfig, this.#pageTheme());
    if (this.#themeConfig) this.setAttribute('theme-config', JSON.stringify(this.#themeConfig));
    else this.removeAttribute('theme-config');
  }

  get marks() { return this.#marks.map((m) => ({ ...m })); }
  set marks(list) { this.setMarks(list); }

  get document() { return this.getDocument(); }
  set document(doc) { this.setDocument(doc); }

  /** Lista idiomas registrados (built-in + plugins). */
  static listLanguages() { return listLanguages(); }
  static registerLanguage(def) { return registerLanguage(def); }

  code2json(opts = {}) {
    return code2json(this.value, {
      lang: this.lang,
      marks: this.#marks,
      format: this.#formatConfig,
      theme: this.#themeConfig || undefined,
      ...opts,
    });
  }

  json2code(doc) { return json2code(doc); }

  getDocument() {
    return this.code2json();
  }

  setDocument(raw) {
    const doc = parseCodeDocument(raw);
    if (!doc) return;
    if (doc.lang) this.lang = doc.lang;
    if (doc.format) this.formatConfig = doc.format;
    if (doc.theme) this.themeConfig = doc.theme;
    this.#setValue(doc.value, true);
    this.setMarks(doc.marks || []);
    if (raw && typeof raw === 'object') {
      /* no reflejar objeto gigante al atributo */
    } else if (typeof raw === 'string') {
      this.setAttribute('document', raw);
    }
  }

  setMarks(list) {
    this.#marks = (Array.isArray(list) ? list : []).map(normalizeMark).filter(Boolean);
    this.#paintMarks();
  }

  clearMarks() {
    this.#marks = [];
    this.#paintMarks();
  }

  format() {
    const lang = resolveLanguage(this.lang)?.id || this.lang;
    const next = formatCode(this.value, lang, this.#formatConfig);
    this.#setValue(next, true);
    emit(this, 'is-change', { value: next, formatted: true });
    return next;
  }

  focus() {
    if (this.#editing) {
      this.#ta?.focus();
      return;
    }
    if (this.#native) return; // readonly nativo: sin caret editable
    this.#cm?.focus();
  }

  refresh() {
    if (this.#native) {
      // Sin scrollIntoView ni mediciones de CM: solo resincroniza el
      // transform del <pre> (por si cambió fuente/tamaño del contenedor).
      if (this.#editing) this.#onEditScroll();
      return;
    }
    this.#withOuterScroll(() => this.#cm?.refresh());
  }

  // —— private ——

  /**
   * CodeMirror (setValue / fromTextArea / refresh) hace scrollIntoView del
   * cursor y mueve el `is-main` ancestro → en F5 el docs acaba al final.
   */
  #withOuterScroll(fn) {
    const scroller = this.closest?.('is-main, .main');
    const top = scroller ? scroller.scrollTop : null;
    const left = scroller ? scroller.scrollLeft : null;
    try {
      return fn();
    } finally {
      if (scroller && top != null) {
        scroller.scrollTop = top;
        if (left != null) scroller.scrollLeft = left;
      }
    }
  }

  #pageTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  #syncThemeFromPage() {
    if (this.#themeConfig) {
      applyThemeConfig(this, this.#themeConfig, this.#pageTheme());
      return;
    }
    applyThemeConfig(this, null, this.#pageTheme());
  }

  #parseJsonAttr(value) {
    if (value == null || value === '') return null;
    try { return JSON.parse(value); } catch { return null; }
  }

  /** Texto semilla: attribute, dataset del highlighter o demo-code. */
  #readSeedText() {
    const docAttr = this.getAttribute('document');
    if (docAttr) {
      const doc = parseCodeDocument(docAttr);
      if (doc?.value != null) return String(doc.value);
    }
    const attr = this.getAttribute('value');
    if (attr != null && attr !== '') return attr;
    const fromData = this.dataset.cmSource || this.dataset.src;
    if (fromData) return fromData;
    return this.textContent?.trim() || '';
  }

  async #bootstrap() {
    if (this.#booting || this.#cm || this.#native) return;
    this.#booting = true;
    try {
      // Semilla: document attr > value attr > dataset > light DOM text
      const docAttr = this.getAttribute('document');
      if (docAttr) {
        const doc = parseCodeDocument(docAttr);
        if (doc) {
          if (doc.lang && !this.hasAttribute('lang')) this.setAttribute('lang', doc.lang);
          if (doc.format) this.#formatConfig = normalizeFormatConfig(doc.format);
          if (doc.theme) {
            this.#themeConfig = doc.theme;
            applyThemeConfig(this, this.#themeConfig, this.#pageTheme());
          }
          this.#pendingValue = doc.value;
          this.#marks = (doc.marks || []).map(normalizeMark).filter(Boolean);
        }
      } else {
        this.#pendingValue = this.#readSeedText();
      }

      const fmtAttr = this.#parseJsonAttr(this.getAttribute('format'));
      if (fmtAttr) this.#formatConfig = normalizeFormatConfig(fmtAttr);
      const themeAttr = parseThemeConfig(this.getAttribute('theme-config'));
      if (themeAttr) {
        this.#themeConfig = themeAttr;
        applyThemeConfig(this, themeAttr, this.#pageTheme());
      }

      // Snippets de demos suelen omitir lang → HTML se pintaba como JS.
      if (!this.hasAttribute('lang') && this.#pendingValue != null) {
        this.setAttribute('lang', inferLanguage(this.#pendingValue));
      }

      // Re-leer la semilla tardía (demo-code pudo llegar mientras cargaba).
      if (!docAttr) {
        const late = this.#readSeedText();
        if (late) this.#pendingValue = late;
      }
      // Vista docs: pretty ligero antes de montar (saltos + indent).
      if (this.compact && this.readonly && this.#pendingValue != null) {
        this.#pendingValue = softFormat(this.#pendingValue, softFormatMode(this.lang));
        this.setAttribute('value', this.#pendingValue);
      }

      // Motor PROPIO (code-highlight) en todos los modos: CodeMirror ya no se
      // carga ni se monta. readonly/disabled → vista estática; si no, editor
      // nativo con textarea + resaltado sincronizado.
      if (this.readonly || this.disabled) {
        this.#bootNative();
      } else {
        this.#bootEditable();
      }
      return;

      emit(this, 'is-ready', { lang: this.lang, value: this.value });
    } catch (err) {
      console.error('[is-code] bootstrap', err);
      emit(this, 'is-error', { error: String(err?.message || err) });
    } finally {
      this.#booting = false;
    }
  }

  #destroyCm() {
    if (!this.#cm) return;
    try {
      this.#cm.toTextArea();
    } catch { /* ignore */ }
    this.#cm = null;
    this.#ready = false;
    this.#cmMarks.clear();
  }

  /* ── Ruta nativa (readonly) — motor code-highlight, sin CodeMirror ── */

  #bootNative() {
    this.#native = true;
    this.#nativeText = this.#nativeText != null
      ? this.#nativeText
      : (this.#pendingValue ?? this.#readSeedText() ?? '');
    this.#pendingValue = null;
    this.#textarea.value = this.#nativeText;
    this.#renderNative();
    this.#syncReadonlyDom();
    this.#syncLayoutDom();
    this.#ready = true;
    setFormValue(this.#internals, this.#nativeText);
    setCustomState(this.#internals, 'blank', !this.#nativeText);
    emit(this, 'is-ready', { lang: this.lang, value: this.value });
  }

  /** Pinta `text` (tokenizado) dentro de un <pre> y devuelve las líneas. */
  #paintLines(pre, text, withNumbers) {
    const { lines } = tokenizeCode(text, this.lang, null);
    let html = '';
    for (const ln of lines) {
      const cls = ln.lineClass ? `ic-line ${ln.lineClass}` : 'ic-line';
      html += `<div class="${cls}">${lineToHtml(ln.tokens)}</div>`;
    }
    pre.innerHTML = html;
    return { lines, html, withNumbers };
  }

  /** Construye (o reconstruye) el gutter de números para `count` líneas. */
  #buildGutter(container, lines) {
    const withNumbers = this.lineNumbers && this.mode !== 'inline';
    const old = container.querySelector<HTMLElement>('.ic-gutter');
    old?.remove();
    if (!withNumbers) return;
    const gutter = document.createElement('div');
    gutter.className = 'ic-gutter';
    gutter.setAttribute('aria-hidden', 'true');
    gutter.innerHTML = lines.map((_, i) => `<span class="ic-ln">${i + 1}</span>`).join('');
    container.prepend(gutter);
  }

  /** Pinta el contenido nativo (readonly): gutter (opcional) + líneas. */
  #renderNative() {
    if (!this.#native) return;
    const text = this.#nativeText ?? '';
    const scroll = document.createElement('div');
    scroll.className = 'ic-scroll';
    const pre = document.createElement('pre');
    pre.className = 'ic-native';
    pre.setAttribute('aria-label', 'Código');
    const { lines } = this.#paintLines(pre, text, true);
    scroll.append(pre);
    this.#buildGutter(scroll, lines);
    this.#host.innerHTML = '';
    this.#host.append(scroll);
    this.#nativeRoot = pre;
  }

  #destroyNative() {
    this.#native = false;
    this.#editing = false;
    this.#nativeRoot = null;
    this.#nativeText = null;
    this.#ta = null;
  }

  /* ── Editor editable nativo (textarea + resaltado sincronizado) ── */

  #onEditInput = () => {
    const v = this.#ta?.value ?? '';
    if (v === this.#nativeText) { this.#emitCursor(); return; }
    this.#nativeText = v;
    this.setAttribute('value', v);
    setFormValue(this.#internals, v);
    setCustomState(this.#internals, 'blank', !v);
    this.#paintEdit();
    emit(this, 'is-input', { value: v });
    emit(this, 'is-change', { value: v });
    this.#emitCursor();
  };

  #onEditScroll = () => {
    const ta = this.#ta;
    const pre = this.#nativeRoot;
    if (!ta || !pre) return;
    pre.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
  };

  #onEditSelect = () => this.#emitCursor();

  #onEditKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const ta = this.#ta!;
      const indent = ' '.repeat(this.tabSize);
      ta.setRangeText(indent, ta.selectionStart, ta.selectionEnd, 'end');
      this.#onEditInput();
    }
  };

  #emitCursor() {
    const ta = this.#ta;
    if (!ta) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length - 1;
    const lineStart = before.lastIndexOf('\n') + 1;
    emit(this, 'is-cursor', { line, ch: before.length - lineStart, index: ta.selectionStart });
    this.#paintActiveLine(line);
  }

  #paintActiveLine(line: number) {
    const pre = this.#nativeRoot;
    if (!pre || this.mode === 'inline') return;
    const lines = pre.querySelectorAll<HTMLElement>('.ic-line');
    if (this.#activeLine >= 0 && this.#activeLine < lines.length) {
      lines[this.#activeLine].classList.remove('ic-line--active');
    }
    const host = this.shadowRoot;
    host?.querySelectorAll<HTMLElement>('.ic-ln--active').forEach((n) => n.classList.remove('ic-ln--active'));
    if (line >= 0 && line < lines.length) {
      lines[line].classList.add('ic-line--active');
      host?.querySelectorAll<HTMLElement>('.ic-ln')[line]?.classList.add('ic-ln--active');
    }
    this.#activeLine = line;
  }

  /** Re-resalta el <pre> del editor (sin tocar el textarea). */
  #paintEdit() {
    const pre = this.#nativeRoot;
    const ta = this.#ta;
    if (!pre || !ta) return;
    const scroll = this.#host.querySelector<HTMLElement>('.ic-scroll') ?? pre.parentElement;
    const { lines } = this.#paintLines(pre, this.#nativeText ?? '', true);
    if (scroll) this.#buildGutter(scroll, lines);
    this.#paintActiveLine(-1);
    this.#onEditScroll();
    this.#paintActiveLine(ta.value.slice(0, ta.selectionStart).split('\n').length - 1);
  }

  #bootEditable() {
    this.#native = true;
    this.#editing = true;
    this.#nativeText = this.#nativeText != null
      ? this.#nativeText
      : (this.#pendingValue ?? this.#readSeedText() ?? '');
    this.#pendingValue = null;
    this.#textarea.value = this.#nativeText;

    const scroll = document.createElement('div');
    scroll.className = 'ic-scroll';
    const edit = document.createElement('div');
    edit.className = 'ic-edit';
    const pre = document.createElement('pre');
    pre.className = 'ic-native';
    pre.setAttribute('aria-label', 'Código');
    pre.setAttribute('aria-hidden', 'true');
    const ta = document.createElement('textarea');
    ta.className = 'ic-input';
    ta.spellcheck = false;
    ta.autocapitalize = 'off';
    ta.autocomplete = 'off';
    ta.wrap = this.wrap || this.mode === 'inline' ? 'soft' : 'off';
    ta.placeholder = this.placeholder || '';
    ta.value = this.#nativeText;
    edit.append(pre, ta);
    scroll.append(edit);

    const { lines } = this.#paintLines(pre, this.#nativeText, true);
    this.#buildGutter(scroll, lines);

    ta.addEventListener('input', this.#onEditInput);
    ta.addEventListener('scroll', this.#onEditScroll, { passive: true });
    ta.addEventListener('keyup', this.#onEditSelect);
    ta.addEventListener('click', this.#onEditSelect);
    ta.addEventListener('keydown', this.#onEditKeydown);

    this.#host.innerHTML = '';
    this.#host.append(scroll);
    this.#nativeRoot = pre;
    this.#ta = ta;

    this.#syncReadonlyDom();
    this.#syncLayoutDom();
    this.#ready = true;
    setFormValue(this.#internals, this.#nativeText);
    setCustomState(this.#internals, 'blank', !this.#nativeText);
    if (this.autofocus) ta.focus();
    requestAnimationFrame(() => this.#paintActiveLine(0));
    emit(this, 'is-ready', { lang: this.lang, value: this.value });
  }

  #setValue(text: string, reflect) {
    const next = String(text);
    if (this.#native) {
      if (this.#nativeText === next) {
        if (reflect) this.setAttribute('value', next);
        return;
      }
      this.#nativeText = next;
      if (this.#ta) {
        this.#ta.value = next;
        this.#paintEdit();
      } else {
        this.#renderNative();
      }
    } else if (this.#cm) {
      this.#cm.setValue(next);
    } else {
      this.#pendingValue = next;
      if (this.#textarea) this.#textarea.value = next;
    }
    if (reflect) this.setAttribute('value', next);
    setFormValue(this.#internals, next);
    setCustomState(this.#internals, 'blank', !next);
  }

  #applyLang() {
    if (this.#native) {
      if (this.#editing) this.#paintEdit();
      else this.#renderNative();
      return;
    }
  }

  #applyOptions() {
    if (this.#native) {
      const wantsReadonly = this.readonly || this.disabled;
      if (wantsReadonly !== !this.#editing) {
        // cambio de modo en caliente: reconstruir la vista conservando el texto
        if (wantsReadonly) {
          this.#editing = false;
          this.#bootNative();
        } else {
          this.#editing = true;
          this.#bootEditable();
        }
        return;
      }
      if (this.#editing) {
        this.#ta!.wrap = this.wrap || this.mode === 'inline' ? 'soft' : 'off';
        this.#ta!.placeholder = this.placeholder || '';
        this.#paintEdit();
      } else {
        this.#renderNative();
      }
      this.#syncLayoutDom();
      this.#syncReadonlyDom();
      return;
    }
    if (!this.#cm) {
      this.#syncReadonlyDom();
      this.#syncLayoutDom();
      return;
    }
    this.#cm.setOption('lineNumbers', this.lineNumbers);
    this.#cm.setOption('lineWrapping', this.wrap || this.mode === 'inline');
    this.#cm.setOption('readOnly', this.disabled ? 'nocursor' : this.readonly);
    this.#cm.setOption('cursorBlinkRate', this.readonly || this.disabled ? -1 : 530);
    this.#cm.setOption(
      'styleActiveLine',
      this.mode === 'inline' ? false : (!this.readonly && !this.disabled),
    );
    this.#cm.setOption('autoCloseBrackets', !this.readonly && !this.disabled);
    this.#cm.setOption('tabSize', this.tabSize);
    this.#cm.setOption('indentUnit', this.#formatConfig.tabWidth || this.tabSize);
    this.#cm.setOption('indentWithTabs', !!this.#formatConfig.useTabs);
    this.#cm.setOption('scrollbarStyle', this.mode === 'inline' ? 'null' : 'native');
    if (this.placeholder) this.#cm.setOption('placeholder', this.placeholder);
    this.#syncReadonlyDom();
    this.#syncLayoutDom();
    requestAnimationFrame(() => this.#cm?.refresh());
  }

  #syncLayoutDom() {
    const inline = this.mode === 'inline';
    this.toggleAttribute('data-inline', inline);
    this.setAttribute('data-mode', this.mode);
    setCustomState(this.#internals, 'inline', inline);
  }

  #syncReadonlyDom() {
    setCustomState(this.#internals, 'disabled', this.disabled);
    setCustomState(this.#internals, 'readonly', this.readonly);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readonly);
    this.setAttribute('aria-readonly', this.readonly ? 'true' : 'false');
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  /**
   * Pinta la banda de fondo de cada línea para los lenguajes que la piden
   * (`CodeLangDef.lineClass`). El motor nativo ya colorea la banda por línea
   * (tokenizeCode devuelve lineClass); este helper queda solo como respaldo
   * legacy para instancias CM que ya no se crean.
   */
  #syncLineClasses() {
    const cm = this.#cm;
    if (!cm) return;
    const lineClass = resolveLanguage(this.lang)?.lineClass;
    cm.operation(() => {
      cm.eachLine((handle) => {
        for (const cls of DIFF_LINE_CLASSES) cm.removeLineClass(handle, 'background', cls);
        const cls = lineClass ? lineClass(handle.text) : null;
        if (cls) cm.addLineClass(handle, 'background', cls);
      });
    });
  }

  #onCursor() {
    if (!this.#cm) return;
    const pos = this.#cm.getCursor();
    const index = this.#cm.indexFromPos(pos);
    emit(this, 'is-cursor', { line: pos.line, ch: pos.ch, index });
  }

  #paintMarks() {
    if (!this.#cm) return;
    for (const handle of this.#cmMarks.values()) {
      try { handle.clear(); } catch { /* ignore */ }
    }
    this.#cmMarks.clear();

    for (const mark of this.#marks) {
      const from = this.#cm.posFromIndex(mark.from);
      const to = this.#cm.posFromIndex(mark.to);
      const tone = mark.tone || 'neutral';
      const cls = [
        'is-code-mark',
        `is-code-mark--${mark.kind}`,
        `is-code-mark--${tone}`,
        mark.className || '',
      ].filter(Boolean).join(' ');

      const handle = this.#cm.markText(from, to, {
        className: cls,
        attributes: {
          'data-mark-id': mark.id,
          'data-mark-kind': mark.kind,
          title: mark.message || mark.title || '',
        },
        inclusiveLeft: false,
        inclusiveRight: false,
      });
      this.#cmMarks.set(mark.id, handle);
    }
  }

  #markFromEvent(e) {
    const el = e.target?.closest?.('[data-mark-id]');
    if (!el) return null;
    const id = el.getAttribute('data-mark-id');
    return this.#marks.find((m) => m.id === id) || null;
  }

  #onMarkHover(e) {
    const mark = this.#markFromEvent(e);
    if (!mark) return;
    if (mark.kind !== 'tooltip' && mark.kind !== 'message' && !mark.message && !mark.body) {
      return;
    }
    clearTimeout(this.#hideTipTimer);
    const title = mark.title || (mark.tone && mark.tone !== 'neutral' ? mark.tone : '');
    const body = mark.body || mark.message || '';
    this.#tooltip.innerHTML = '';
    if (title) {
      const strong = document.createElement('strong');
      strong.textContent = title;
      this.#tooltip.append(strong);
      if (body) this.#tooltip.append(document.createElement('br'));
    }
    if (body) {
      const span = document.createElement('span');
      span.textContent = body;
      this.#tooltip.append(span);
    }
    // Anclar al target hover
    const target = e.target.closest('[data-mark-id]') || e.target;
    if (!target.id) target.id = `is-code-mark-${mark.id}`;
    this.#tooltip.setAttribute('for', target.id);
    this.#tooltip.open = true;
    emit(this, 'is-mark-activate', { mark: { ...mark }, phase: 'enter' });
  }

  #onMarkOut(e) {
    const mark = this.#markFromEvent(e);
    if (!mark) return;
    clearTimeout(this.#hideTipTimer);
    this.#hideTipTimer = window.setTimeout(() => {
      this.#tooltip.open = false;
    }, 120);
    emit(this, 'is-mark-activate', { mark: { ...mark }, phase: 'leave' });
  }
}

defineElement('is-code', IsCode, 'IsCode');

export {
  IsCode,
  registerLanguage,
  listLanguages,
  inferLanguage,
  code2json,
  json2code,
  formatCode,
  normalizeFormatConfig,
  applyThemeConfig,
};
export default IsCode;
