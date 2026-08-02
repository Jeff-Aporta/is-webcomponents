var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});

// components/_shared/upgrade-properties.js
function upgradeProperties(host, props) {
  for (const a of props) {
    if (!Object.prototype.hasOwnProperty.call(host, a)) continue;
    const v = host[a];
    delete host[a];
    if (v == null || v === false) continue;
    if (v === true) host.setAttribute(a, "");
    else host.setAttribute(a, v);
  }
}

// components/_shared/element-base.js
var _mounted;
var ElementBase = class extends HTMLElement {
  constructor() {
    super(...arguments);
    __privateAdd(this, _mounted, false);
  }
  /** Subclasses pueden sobrescribir este getter para añadir atributos extra. */
  static get observedAttributes() {
    return [];
  }
  // Hooks que las subclases pueden implementar:
  /** Se llama tras connectedCallback una vez que #mounted=true y los
   *  upgrade-properties han corrido. */
  onConnected() {
  }
  /** Se llama desde disconnectedCallback. */
  onDisconnected() {
  }
  /** Se llama desde attributeChangedCallback (después del guard de
   *  `#mounted` y de `oldVal === newVal`). */
  onAttributeChanged(_name, _oldVal, _newVal) {
  }
  /**
   * Inicializa el shadow root y clona el template si está definido.
   * La subclase puede sobrescribir `shadowInit` o `attachShadow` para
   * customizar el modo (e.g. delegatesFocus: true) y luego llamar a
   * `super.connectedCallback()` (o simplemente reusar este método con
   * argumentos).
   *
   * Por defecto hace attachShadow({ mode: 'open' }) y clona
   * this.constructor.TEMPLATE / __TEMPLATE.
   */
  initShadow(options = { mode: "open" }) {
    if (this.shadowRoot) return;
    const shadow = this.attachShadow(options);
    const tpl = this.constructor.TEMPLATE ?? this.constructor.__TEMPLATE;
    if (tpl) {
      shadow.appendChild(tpl.content.cloneNode(true));
    }
  }
  get shadow() {
    return this.shadowRoot;
  }
  get mounted() {
    return __privateGet(this, _mounted);
  }
  connectedCallback() {
    if (__privateGet(this, _mounted)) return;
    __privateSet(this, _mounted, true);
    const observed = this.constructor.observedAttributes || [];
    upgradeProperties(this, observed);
    this.onConnected();
  }
  disconnectedCallback() {
    this.onDisconnected();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!__privateGet(this, _mounted) || oldVal === newVal) return;
    this.onAttributeChanged(name, oldVal, newVal);
  }
  /**
   * Helper para setters booleanos reflejados como atributo. Sin esto,
   * cada componente repite:
   *   set foo(v) { this.toggleAttribute('foo', !!v); }
   *   get foo() { return this.hasAttribute('foo'); }
   *
   * Uso:
   *   set open(v) { this.setBooleanAttr('open', v); }
   *   get open() { return this.hasAttribute('open'); }
   */
  setBooleanAttr(name, value) {
    this.toggleAttribute(name, !!value);
  }
};
_mounted = new WeakMap();

// components/_shared/adopt-css.js
function adoptCss(shadowRoot, moduleUrl) {
  const sibling = new URL(moduleUrl);
  sibling.pathname = sibling.pathname.replace(/\.js$/i, ".css");
  const scroll = document.createElement("link");
  scroll.rel = "stylesheet";
  scroll.href = new URL("./scrollbars.css", import.meta.url).href;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = sibling.href;
  shadowRoot.prepend(scroll, link);
}

// components/_shared/iconify-loader.js
var RELATIVE_BASES = [
  // <base href> del documento (define la raíz del sitio, si la tiene).
  () => document.querySelector("base[href]")?.getAttribute("href") ?? null,
  // Resolución desde la raíz del sitio: si el documento está en
  // http://host/PatyIA/previews/media/is-icon.html y assets está en la raíz del
  // repo, subimos hasta el primer segmento que ya está en el repo.
  () => rootFromBaseURI(),
  // Algunos sitios usan un CDN absoluto del repo en GitHub Pages.
  () => "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/assets/icons/"
];
function rootFromBaseURI() {
  if (typeof location === "undefined") return null;
  const segments = location.pathname.split("/").filter(Boolean);
  segments.pop();
  if (segments.length === 0) return "./";
  return segments.map(() => "..").join("/") + "/";
}
var LOCAL_INDEX_PATH = (prefix) => `${prefix}.json`;
var LOCAL_SVG_PATH = (prefix, name) => `${prefix}/${name}.svg`;
var REMOTE_SVG_URL = (prefix, name) => `https://api.iconify.design/${prefix}/${name}.svg`;
var indexCache = /* @__PURE__ */ new Map();
var baseCache = /* @__PURE__ */ new Map();
var rawCache = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
function candidateBases() {
  const out = [];
  for (const fn of RELATIVE_BASES) {
    try {
      const v = fn();
      if (v) out.push(v.endsWith("/") ? v : v + "/");
    } catch {
    }
  }
  return out;
}
async function fetchIndex(prefix) {
  if (indexCache.has(prefix)) return indexCache.get(prefix);
  if (inflight.has(prefix)) return inflight.get(prefix);
  const promise = (async () => {
    for (const base of candidateBases()) {
      const url = base + "assets/icons/" + LOCAL_INDEX_PATH(prefix);
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) continue;
        const data = await res.json();
        const set = new Set(data.icons || []);
        indexCache.set(prefix, set);
        baseCache.set(prefix, base);
        return set;
      } catch {
      }
    }
    indexCache.set(prefix, null);
    baseCache.set(prefix, null);
    return null;
  })();
  inflight.set(prefix, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(prefix);
  }
}
async function resolveIconRaw(prefix, name, signal) {
  if (!prefix || !name) return null;
  const key = `${prefix}:${name}`;
  if (rawCache.has(key)) return rawCache.get(key);
  const sources = [];
  const set = await fetchIndex(prefix);
  if (set instanceof Set && set.has(name)) {
    const base = baseCache.get(prefix) || "./";
    sources.push(base + "assets/icons/" + LOCAL_SVG_PATH(prefix, name));
  }
  sources.push(`https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/assets/icons/${prefix}/${name}.svg`);
  sources.push(REMOTE_SVG_URL(prefix, name));
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal, cache: "force-cache" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.includes("<svg")) {
        rawCache.set(key, text);
        return text;
      }
    } catch {
    }
  }
  return null;
}
var ICONIFY_SRC = "https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js";
var iconifyReady = null;
function ensureIconify() {
  if (customElements.get("iconify-icon")) return Promise.resolve();
  if (iconifyReady) return iconifyReady;
  iconifyReady = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((s) => s.src.includes("iconify-icon"));
    if (existing) {
      customElements.whenDefined("iconify-icon").then(resolve, reject);
      return;
    }
    const el = document.createElement("script");
    el.src = ICONIFY_SRC;
    el.async = true;
    el.onload = () => customElements.whenDefined("iconify-icon").then(resolve, reject);
    el.onerror = () => reject(new Error("iconify-icon CDN failed"));
    document.head.appendChild(el);
  });
  return iconifyReady;
}
if (typeof requestIdleCallback === "function") {
  ["mdi", "tabler", "lucide", "heroicons", "material-symbols"].forEach((p) => {
    requestIdleCallback(() => fetchIndex(p));
  });
}

// components/media/icon.js
(() => {
  var _ii, _inline, _inlineErrored, _mounted3, _renderGen, _abortCtrl, _IsIcon_instances, render_fn2, mountInlineFromUrl_fn, normalizeInlineSvg_fn;
  const TEMPLATE2 = document.createElement("template");
  TEMPLATE2.innerHTML = /* html */
  `
    <span class="wrap" part="icon">
      <span class="inline" aria-hidden="true" hidden></span>
      <iconify-icon class="ii" aria-hidden="true" hidden></iconify-icon>
    </span>
  `;
  const OBSERVED = ["icon", "name", "library", "label", "src", "fallback"];
  class IsIcon extends HTMLElement {
    constructor() {
      super();
      __privateAdd(this, _IsIcon_instances);
      __privateAdd(this, _ii);
      __privateAdd(this, _inline);
      __privateAdd(this, _inlineErrored, false);
      __privateAdd(this, _mounted3, false);
      __privateAdd(this, _renderGen, 0);
      __privateAdd(this, _abortCtrl, null);
      const shadow = this.attachShadow({ mode: "open" });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE2.content.cloneNode(true));
      __privateSet(this, _inline, shadow.querySelector(".inline"));
      __privateSet(this, _ii, shadow.querySelector(".ii"));
    }
    static get observedAttributes() {
      return OBSERVED;
    }
    connectedCallback() {
      __privateSet(this, _mounted3, true);
      __privateMethod(this, _IsIcon_instances, render_fn2).call(this);
    }
    disconnectedCallback() {
      if (__privateGet(this, _abortCtrl)) {
        try {
          __privateGet(this, _abortCtrl).abort();
        } catch {
        }
        __privateSet(this, _abortCtrl, null);
      }
    }
    attributeChangedCallback(_n, oldVal, newVal) {
      if (!__privateGet(this, _mounted3) || oldVal === newVal) return;
      if (_n === "src" || _n === "icon" || _n === "name" || _n === "library" || _n === "fallback") {
        __privateMethod(this, _IsIcon_instances, render_fn2).call(this);
      }
    }
    /** Iconify id completo: "mdi:home" */
    get icon() {
      const raw = (this.getAttribute("icon") || "").trim();
      if (raw) return raw;
      const name = (this.getAttribute("name") || "").trim();
      if (!name) return "";
      if (name.includes(":")) return name;
      const lib = (this.getAttribute("library") || "mdi").trim() || "mdi";
      return `${lib}:${name}`;
    }
    set icon(v) {
      v == null || v === "" ? this.removeAttribute("icon") : this.setAttribute("icon", v);
    }
    get label() {
      return this.getAttribute("label") ?? "";
    }
    set label(v) {
      v == null || v === "" ? this.removeAttribute("label") : this.setAttribute("label", v);
    }
    get src() {
      return this.getAttribute("src") ?? "";
    }
    set src(v) {
      v == null || v === "" ? this.removeAttribute("src") : this.setAttribute("src", v);
    }
    /**
     * Política de fallback. "iconify" (default) cae a <iconify-icon> en CDN
     * si el SVG local/remoto falla. "none" deja el slot vacío.
     */
    get fallback() {
      return this.getAttribute("fallback") || "iconify";
    }
    set fallback(v) {
      v == null || v === "" ? this.removeAttribute("fallback") : this.setAttribute("fallback", v);
    }
  }
  _ii = new WeakMap();
  _inline = new WeakMap();
  _inlineErrored = new WeakMap();
  _mounted3 = new WeakMap();
  _renderGen = new WeakMap();
  _abortCtrl = new WeakMap();
  _IsIcon_instances = new WeakSet();
  render_fn2 = async function() {
    const gen = ++__privateWrapper(this, _renderGen)._;
    const src = this.src.trim();
    const label = this.label.trim();
    const icon = this.icon;
    if (label) {
      this.removeAttribute("aria-hidden");
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", label);
    } else {
      this.setAttribute("aria-hidden", "true");
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
    }
    if (__privateGet(this, _abortCtrl)) {
      try {
        __privateGet(this, _abortCtrl).abort();
      } catch {
      }
    }
    __privateSet(this, _abortCtrl, new AbortController());
    if (src) {
      __privateGet(this, _ii).setAttribute("hidden", "");
      __privateGet(this, _ii).removeAttribute("icon");
      __privateGet(this, _inline).innerHTML = "";
      __privateSet(this, _inlineErrored, false);
      await __privateMethod(this, _IsIcon_instances, mountInlineFromUrl_fn).call(this, src, gen);
      return;
    }
    __privateGet(this, _inline).innerHTML = "";
    __privateGet(this, _ii).setAttribute("hidden", "");
    __privateGet(this, _ii).removeAttribute("icon");
    if (!icon) return;
    const [prefix, name] = icon.split(":", 2);
    if (!prefix || !name) return;
    try {
      const raw = await resolveIconRaw(prefix, name, __privateGet(this, _abortCtrl).signal);
      if (raw && gen === __privateGet(this, _renderGen)) {
        __privateGet(this, _ii).setAttribute("hidden", "");
        __privateGet(this, _ii).removeAttribute("icon");
        __privateSet(this, _inlineErrored, false);
        __privateGet(this, _inline).innerHTML = raw;
        __privateGet(this, _inline).removeAttribute("hidden");
        __privateMethod(this, _IsIcon_instances, normalizeInlineSvg_fn).call(this);
        return;
      }
    } catch {
    }
    if (gen !== __privateGet(this, _renderGen)) return;
    if (this.fallback === "none") {
      __privateGet(this, _inline).setAttribute("hidden", "");
      return;
    }
    try {
      await ensureIconify();
    } catch {
      __privateGet(this, _inline).setAttribute("hidden", "");
      return;
    }
    if (!__privateGet(this, _mounted3) || gen !== __privateGet(this, _renderGen)) return;
    __privateGet(this, _inline).setAttribute("hidden", "");
    __privateGet(this, _ii).removeAttribute("hidden");
    __privateGet(this, _ii).setAttribute("icon", icon);
    __privateGet(this, _ii).removeAttribute("width");
    __privateGet(this, _ii).removeAttribute("height");
  };
  mountInlineFromUrl_fn = async function(url, gen) {
    try {
      const res = await fetch(url, { signal: __privateGet(this, _abortCtrl).signal });
      if (!res.ok) throw new Error("svg fetch failed");
      const text = await res.text();
      if (gen !== __privateGet(this, _renderGen) || !text.includes("<svg")) return;
      __privateGet(this, _inline).innerHTML = text;
      __privateGet(this, _inline).removeAttribute("hidden");
      __privateMethod(this, _IsIcon_instances, normalizeInlineSvg_fn).call(this);
    } catch {
      __privateGet(this, _inline).setAttribute("hidden", "");
    }
  };
  /**
   * Normaliza el SVG inline para que `currentColor` funcione aunque el
   * icono venga con fill="black" o fill="#000" del CDN. Forzamos
   * fill="currentColor" y stroke="currentColor" en todos los hijos.
   */
  normalizeInlineSvg_fn = function() {
    const svg = __privateGet(this, _inline).querySelector("svg");
    if (!svg) return;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("width", "1em");
    svg.setAttribute("height", "1em");
    svg.setAttribute("focusable", "false");
    svg.style.fill = "currentColor";
    svg.style.stroke = "currentColor";
    for (const el of svg.querySelectorAll("*")) {
      const fill = el.getAttribute("fill");
      const stroke = el.getAttribute("stroke");
      if (fill && fill !== "none") el.style.fill = "currentColor";
      if (stroke && stroke !== "none") el.style.stroke = "currentColor";
    }
  };
  if (!customElements.get("is-icon")) {
    customElements.define("is-icon", IsIcon);
  }
  if (typeof window !== "undefined") window.IsIcon = IsIcon;
})();

// components/data/datagrid-core/types.js
var ColumnType = Object.freeze({
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  BOOLEAN: "boolean"
});
var AggFunc = Object.freeze({
  SUM: "sum",
  AVG: "avg",
  MIN: "min",
  MAX: "max",
  COUNT: "count",
  FIRST: "first",
  LAST: "last"
});
var SortDir = Object.freeze({
  ASC: "asc",
  DESC: "desc"
});
var PinSide = Object.freeze({
  LEFT: "left",
  RIGHT: "right"
});
var Align = Object.freeze({
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right"
});
var Density = Object.freeze({
  COMPACT: "compact",
  NORMAL: "normal",
  COMFORTABLE: "comfortable"
});
var SelectionMode = Object.freeze({
  NONE: "none",
  SINGLE: "single",
  MULTIPLE: "multiple"
});
var FilterType = Object.freeze({
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  SET: "set"
});
var HeaderCheckboxState = Object.freeze({
  ALL: "all",
  NONE: "none",
  SOME: "some"
});
var DEFAULT_COL_WIDTH = 160;
var DEFAULT_MIN_WIDTH = 60;
var DEFAULT_MAX_WIDTH = 2e3;
var DEFAULT_HEADER_HEIGHT = 44;
var DEFAULT_PAGE_SIZE = 50;
var DENSITY_ROW_HEIGHT = Object.freeze({
  [Density.COMPACT]: 32,
  [Density.NORMAL]: 40,
  [Density.COMFORTABLE]: 52
});

// components/data/datagrid-core/value-formatter.js
function getCellValue(col, node) {
  const def = col.def;
  if (typeof def.valueGetter === "function") return def.valueGetter(node.data);
  return node.data?.[col.field];
}
function formatCellValue(col, value, node) {
  const def = col.def;
  if (typeof def.valueFormatter === "function") return def.valueFormatter(value, node.data);
  if (value == null || value === "") return "";
  if (col.type === ColumnType.NUMBER && typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (col.type === ColumnType.BOOLEAN) return value ? "\u2713" : "";
  if (col.type === ColumnType.DATE) {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}
function cellText(col, node) {
  return formatCellValue(col, getCellValue(col, node), node);
}
function formatValue(col, value) {
  const def = col.def;
  if (typeof def.valueFormatter === "function") {
    return def.valueFormatter(value, {});
  }
  if (value == null || value === "") return "";
  if (col.type === ColumnType.BOOLEAN) return value ? "\u2713" : "\u2014";
  if (col.type === ColumnType.DATE) {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}

// components/data/datagrid-core/column-state.js
var clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function defaultFilterFor(def) {
  if (def.type === ColumnType.NUMBER) return FilterType.NUMBER;
  if (def.type === ColumnType.DATE) return FilterType.DATE;
  return FilterType.TEXT;
}
function filterTypeOf(def) {
  if (def.filter === false || def.filter == null) {
    return def.filter === void 0 ? defaultFilterFor(def) : null;
  }
  if (def.filter === true) return defaultFilterFor(def) ?? FilterType.TEXT;
  return def.filter;
}
function resolveColumns(defs, defaultColWidth = DEFAULT_COL_WIDTH) {
  return (defs ?? []).map((def, i) => ({
    colId: def.colId ?? def.field ?? `col-${i}`,
    field: def.field,
    headerName: def.headerName ?? def.field,
    type: def.type ?? ColumnType.TEXT,
    width: def.width ?? defaultColWidth,
    minWidth: def.minWidth ?? DEFAULT_MIN_WIDTH,
    maxWidth: def.maxWidth ?? DEFAULT_MAX_WIDTH,
    flex: def.flex,
    sortable: def.sortable !== false,
    resizable: def.resizable !== false,
    filterType: def.filter === false ? null : filterTypeOf(def),
    pinned: def.pinned ?? null,
    hide: def.hide === true,
    align: def.align ?? (def.type === ColumnType.NUMBER ? "right" : "left"),
    enableRowGroup: def.enableRowGroup !== false,
    aggFunc: def.aggFunc ?? null,
    checkboxSelection: def.checkboxSelection === true,
    def
  }));
}
function setColumnWidth(cols, colId, width) {
  return cols.map(
    (c) => c.colId === colId ? { ...c, width: clamp(Math.round(width), c.minWidth, c.maxWidth), flex: void 0 } : c
  );
}
function setColumnPinned(cols, colId, pinned) {
  return cols.map((c) => c.colId === colId ? { ...c, pinned } : c);
}
function setColumnHidden(cols, colId, hide) {
  return cols.map((c) => c.colId === colId ? { ...c, hide } : c);
}
function moveColumn(cols, colId, toIndex) {
  const from = cols.findIndex((c) => c.colId === colId);
  if (from < 0) return cols;
  const next = cols.slice();
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(clamp(toIndex, 0, next.length), 0, moved);
  return next;
}
function autosizeColumn(cols, colId, rows, charPx = 7.4, padding = 28) {
  const col = cols.find((c) => c.colId === colId);
  if (!col) return cols;
  let max = col.headerName.length;
  for (const node of rows) max = Math.max(max, cellText(col, node).length);
  const width = clamp(Math.round(max * charPx + padding), col.minWidth, col.maxWidth);
  return setColumnWidth(cols, colId, width);
}
function orderedForLayout(cols) {
  const visible = cols.filter((c) => !c.hide);
  return {
    left: visible.filter((c) => c.pinned === PinSide.LEFT),
    center: visible.filter((c) => !c.pinned),
    right: visible.filter((c) => c.pinned === PinSide.RIGHT)
  };
}

// components/data/datagrid-core/viewport.js
function rowWindow(rowCount, rowHeight, scrollTop, viewportHeight, overscan = 6) {
  const totalHeight = rowCount * rowHeight;
  if (rowCount === 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: 0, topPad: 0, totalHeight };
  }
  const first = Math.floor(scrollTop / rowHeight);
  const visible = Math.ceil(viewportHeight / rowHeight);
  const startIndex = Math.max(0, first - overscan);
  const endIndex = Math.min(rowCount, first + visible + overscan);
  return { startIndex, endIndex, topPad: startIndex * rowHeight, totalHeight };
}
function applyFlex(cols, availableWidth) {
  const flexCols = cols.filter((c) => !c.hide && c.flex && c.flex > 0);
  if (!flexCols.length) return cols;
  const fixed = cols.filter((c) => !c.hide && !(c.flex && c.flex > 0)).reduce((s, c) => s + c.width, 0);
  const totalFlex = flexCols.reduce((s, c) => s + (c.flex ?? 0), 0);
  const remaining = Math.max(0, availableWidth - fixed);
  return cols.map((c) => {
    if (!c.flex || c.flex <= 0 || c.hide) return c;
    const w = Math.max(
      c.minWidth,
      Math.min(c.maxWidth, Math.round(remaining * c.flex / totalFlex))
    );
    return { ...c, width: w };
  });
}

// components/data/datagrid-core/selection.js
function toggleRowSelection(selection, rowId, mode, opts = {}) {
  if (mode === SelectionMode.NONE) return selection;
  if (mode === SelectionMode.SINGLE) {
    const next2 = /* @__PURE__ */ new Set();
    if (!selection.has(rowId)) next2.add(rowId);
    return next2;
  }
  const next = new Set(selection);
  if (opts.range && opts.rangeFrom && opts.orderedIds) {
    const a = opts.orderedIds.indexOf(opts.rangeFrom);
    const b = opts.orderedIds.indexOf(rowId);
    if (a >= 0 && b >= 0) {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i++) {
        const id = opts.orderedIds[i];
        if (id) next.add(id);
      }
      return next;
    }
  }
  if (!opts.additive && !opts.range) {
    if (next.has(rowId) && next.size === 1) {
      next.delete(rowId);
      return next;
    }
    next.clear();
    next.add(rowId);
    return next;
  }
  if (next.has(rowId)) next.delete(rowId);
  else next.add(rowId);
  return next;
}
function selectAll(rows) {
  return new Set(rows.map((r) => r.id));
}
function clearSelection() {
  return /* @__PURE__ */ new Set();
}
function headerCheckboxState(selection, rows) {
  if (!rows.length) return HeaderCheckboxState.NONE;
  let sel = 0;
  for (const r of rows) if (selection.has(r.id)) sel++;
  if (sel === 0) return HeaderCheckboxState.NONE;
  if (sel === rows.length) return HeaderCheckboxState.ALL;
  return HeaderCheckboxState.SOME;
}

// components/data/datagrid-core/pipeline-filtering.js
function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toTime(v) {
  if (v == null || v === "") return null;
  const t = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
  return Number.isNaN(t) ? null : t;
}
function matchText(raw, f) {
  const hay = raw.toLowerCase();
  const needle = (f.value ?? "").toLowerCase();
  switch (f.op) {
    case "contains":
      return hay.includes(needle);
    case "notContains":
      return !hay.includes(needle);
    case "equals":
      return hay === needle;
    case "notEqual":
      return hay !== needle;
    case "startsWith":
      return hay.startsWith(needle);
    case "endsWith":
      return hay.endsWith(needle);
    case "blank":
      return raw.trim() === "";
    case "notBlank":
      return raw.trim() !== "";
    default:
      return true;
  }
}
function matchNumber(value, f) {
  const n = toNum(value);
  if (f.op === "blank") return n === null;
  if (f.op === "notBlank") return n !== null;
  if (n === null) return false;
  const a = f.value ?? null;
  if (a === null && f.op !== "inRange") return true;
  switch (f.op) {
    case "eq":
      return n === a;
    case "neq":
      return n !== a;
    case "gt":
      return a !== null && n > a;
    case "gte":
      return a !== null && n >= a;
    case "lt":
      return a !== null && n < a;
    case "lte":
      return a !== null && n <= a;
    case "inRange":
      return (a === null || n >= a) && (f.to == null || n <= f.to);
    default:
      return true;
  }
}
function matchDate(value, f) {
  const t = toTime(value);
  if (t === null) return false;
  const a = toTime(f.value);
  switch (f.op) {
    case "eq":
      return a !== null && new Date(t).toISOString().slice(0, 10) === new Date(a).toISOString().slice(0, 10);
    case "before":
      return a !== null && t < a;
    case "after":
      return a !== null && t > a;
    case "inRange": {
      const b = toTime(f.to ?? "");
      return (a === null || t >= a) && (b === null || t <= b);
    }
    default:
      return true;
  }
}
function matchOne(col, node, f) {
  if (f.type === "set") return f.values.length === 0 || f.values.includes(cellText(col, node));
  if (f.type === "text") return matchText(cellText(col, node), f);
  if (f.type === "number") return matchNumber(getCellValue(col, node), f);
  if (f.type === "date") return matchDate(getCellValue(col, node), f);
  return true;
}
function filterRows(rows, filterModel, quickFilter, columns, colById) {
  const entries = Object.entries(filterModel);
  const q = quickFilter.trim().toLowerCase();
  if (!entries.length && !q) return rows;
  const visibleCols = columns.filter((c) => !c.hide);
  return rows.filter((node) => {
    for (const [colId, f] of entries) {
      const col = colById.get(colId);
      if (col && !matchOne(col, node, f)) return false;
    }
    if (q) {
      const hit = visibleCols.some((c) => cellText(c, node).toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

// components/data/datagrid-core/pipeline-sorting.js
function defaultCompare(a, b, type) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (type === ColumnType.NUMBER) return Number(a) - Number(b);
  if (type === ColumnType.BOOLEAN) return (a ? 1 : 0) - (b ? 1 : 0);
  if (type === ColumnType.DATE) {
    const ta = a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
  }
  return String(a).localeCompare(String(b), void 0, { numeric: true, sensitivity: "base" });
}
function sortRows(rows, sortModel, colById) {
  if (!sortModel.length) return rows;
  const active = sortModel.map((s) => ({ col: colById.get(s.colId), dir: s.dir })).filter((s) => Boolean(s.col));
  if (!active.length) return rows;
  const indexed = rows.map((node, i) => ({ node, i }));
  indexed.sort((x, y) => {
    for (const { col, dir } of active) {
      const va = getCellValue(col, x.node);
      const vb = getCellValue(col, y.node);
      const c = typeof col.def.comparator === "function" ? col.def.comparator(va, vb, x.node.data, y.node.data) : defaultCompare(va, vb, col.type);
      if (c !== 0) return dir === "asc" ? c : -c;
    }
    return x.i - y.i;
  });
  return indexed.map((e) => e.node);
}
function cycleSort(model, colId, additive) {
  const existing = model.find((s) => s.colId === colId);
  const next = additive ? model.filter((s) => s.colId !== colId) : [];
  if (!existing) return [...next, { colId, dir: "asc" }];
  if (existing.dir === "asc") return [...next, { colId, dir: "desc" }];
  return next;
}

// components/data/datagrid-core/pipeline-grouping.js
function applyAgg(fn, values) {
  if (fn === AggFunc.COUNT) return values.length;
  if (fn === AggFunc.FIRST) return values.length ? values[0] : null;
  if (fn === AggFunc.LAST) return values.length ? values[values.length - 1] : null;
  const nums = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;
  if (fn === AggFunc.SUM) return nums.reduce((a, b) => a + b, 0);
  if (fn === AggFunc.AVG) return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (fn === AggFunc.MIN) return Math.min(...nums);
  if (fn === AggFunc.MAX) return Math.max(...nums);
  return null;
}
function aggregateGroup(leaves, colById) {
  const agg = {};
  for (const col of colById.values()) {
    if (!col.aggFunc) continue;
    agg[col.colId] = applyAgg(col.aggFunc, leaves.map((n) => getCellValue(col, n)));
  }
  return agg;
}
function groupLevel(leaves, col) {
  const map = /* @__PURE__ */ new Map();
  for (const node of leaves) {
    const value = getCellValue(col, node);
    const key = String(value ?? "");
    let g = map.get(key);
    if (!g) {
      g = { value, label: formatValue(col, value) || "(vac\xEDo)", leaves: [] };
      map.set(key, g);
    }
    g.leaves.push(node);
  }
  return [...map.values()];
}
function buildDisplayRows(leaves, rowGroupCols, colById, expandedGroups) {
  if (!rowGroupCols.length) {
    return leaves.map((node) => ({ kind: "leaf", level: 0, node }));
  }
  const out = [];
  const walk = (rows, depth, prefix) => {
    const colId = rowGroupCols[depth];
    const col = colById.get(colId);
    if (!col) return;
    for (const g of groupLevel(rows, col)) {
      const id = prefix ? `${prefix}|${colId}=${String(g.value ?? "")}` : `${colId}=${String(g.value ?? "")}`;
      const expanded = expandedGroups.has(id);
      out.push({
        kind: "group",
        id,
        colId,
        field: col.field,
        value: g.value,
        label: g.label,
        level: depth,
        count: g.leaves.length,
        expanded,
        agg: aggregateGroup(g.leaves, colById),
        leafIds: g.leaves.map((n) => n.id)
      });
      if (!expanded) continue;
      if (depth + 1 < rowGroupCols.length) walk(g.leaves, depth + 1, id);
      else for (const node of g.leaves) out.push({ kind: "leaf", level: depth + 1, node });
    }
  };
  walk(leaves, 0, "");
  return out;
}
function collectGroupIds(leaves, rowGroupCols, colById) {
  if (!rowGroupCols.length) return [];
  const ids = [];
  const walk = (rows, depth, prefix) => {
    const col = colById.get(rowGroupCols[depth]);
    if (!col) return;
    for (const g of groupLevel(rows, col)) {
      const id = prefix ? `${prefix}|${col.colId}=${String(g.value ?? "")}` : `${col.colId}=${String(g.value ?? "")}`;
      ids.push(id);
      if (depth + 1 < rowGroupCols.length) walk(g.leaves, depth + 1, id);
    }
  };
  walk(leaves, 0, "");
  return ids;
}

// components/data/datagrid-core/csv-export.js
function escapeCsv(value, sep) {
  if (value.includes(sep) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function rowsToCsv(columns, rows, opts = {}) {
  const sep = opts.separator ?? ",";
  const cols = columns.filter((c) => !c.hide);
  const src = opts.onlySelected && opts.selection ? rows.filter((r) => opts.selection.has(r.id)) : rows;
  const head = cols.map((c) => escapeCsv(c.headerName, sep)).join(sep);
  const body = src.map(
    (node) => cols.map((c) => escapeCsv(cellText2(c, node), sep)).join(sep)
  );
  return [head, ...body].join("\r\n");
}
function cellText2(col, node) {
  const def = col.def;
  if (typeof def.valueFormatter === "function") {
    return def.valueFormatter(getCellValue2(col, node), node.data);
  }
  if (col.type === "number") {
    const v2 = getCellValue2(col, node);
    return typeof v2 === "number" && Number.isFinite(v2) ? String(v2) : "";
  }
  if (col.type === "boolean") return getCellValue2(col, node) ? "\u2713" : "";
  if (col.type === "date") {
    const v2 = getCellValue2(col, node);
    const d = v2 instanceof Date ? v2 : new Date(String(v2 ?? ""));
    return Number.isNaN(d.getTime()) ? String(v2 ?? "") : d.toISOString().slice(0, 10);
  }
  const v = getCellValue2(col, node);
  return v == null ? "" : String(v);
}
function getCellValue2(col, node) {
  const def = col.def;
  if (typeof def.valueGetter === "function") return def.valueGetter(node.data);
  return node.data?.[col.field];
}

// components/data/datagrid-core/grid-model.js
function createGridModel(options) {
  const getRowId = options.getRowId ?? ((_row, i) => `row-${i}`);
  const s = {
    rawRows: options.rows ?? [],
    nodes: [],
    columns: resolveColumns(options.columns ?? [], options.defaultColWidth),
    sortModel: [],
    filterModel: {},
    quickFilter: options.quickFilter ?? "",
    selection: /* @__PURE__ */ new Set(),
    density: options.density ?? Density.NORMAL,
    pagination: options.pagination ?? false,
    page: 0,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    rowGroupCols: options.rowGroupCols ?? [],
    expandedGroups: /* @__PURE__ */ new Set(),
    getRowId
  };
  const groupDefaultExpanded = options.groupDefaultExpanded ?? 0;
  function rebuildNodes() {
    s.nodes = s.rawRows.map((data, index) => ({ id: s.getRowId(data, index), index, data }));
  }
  function colById() {
    return new Map(s.columns.map((c) => [c.colId, c]));
  }
  function compute() {
    const byId = colById();
    const filtered = filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId);
    const sorted = sortRows(filtered, s.sortModel, byId);
    const totalRows = sorted.length;
    const grouped = s.rowGroupCols.filter((c) => byId.has(c));
    const displayRows = buildDisplayRows(sorted, grouped, byId, s.expandedGroups);
    let page = s.page;
    let pageRows = sorted;
    let pageDisplayRows = displayRows;
    if (s.pagination) {
      const pages = Math.max(1, Math.ceil(displayRows.length / s.pageSize));
      page = Math.min(s.page, pages - 1);
      pageDisplayRows = displayRows.slice(page * s.pageSize, page * s.pageSize + s.pageSize);
      pageRows = sorted.slice(page * s.pageSize, page * s.pageSize + s.pageSize);
    }
    return {
      columns: s.columns,
      sortModel: s.sortModel,
      filterModel: s.filterModel,
      quickFilter: s.quickFilter,
      selection: s.selection,
      density: s.density,
      pagination: s.pagination,
      page,
      pageSize: s.pageSize,
      displayedRows: sorted,
      pageRows,
      rowGroupCols: grouped,
      expandedGroups: s.expandedGroups,
      displayRows,
      pageDisplayRows,
      totalRows
    };
  }
  function reseedExpansion() {
    if (groupDefaultExpanded === -1 && s.rowGroupCols.length) {
      const byId = colById();
      const sorted = sortRows(
        filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId),
        s.sortModel,
        byId
      );
      s.expandedGroups = new Set(collectGroupIds(sorted, s.rowGroupCols, byId));
    }
  }
  rebuildNodes();
  reseedExpansion();
  const listeners = /* @__PURE__ */ new Set();
  let cache = null;
  function notify() {
    cache = compute();
    for (const fn of listeners) {
      try {
        fn(cache);
      } catch {
      }
    }
  }
  const api = {
    getState() {
      return cache ?? (cache = compute());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    setRows(rows) {
      s.rawRows = rows ?? [];
      rebuildNodes();
      notify();
    },
    setColumnDefs(defs) {
      s.columns = resolveColumns(defs ?? [], options.defaultColWidth);
      notify();
    },
    setSortModel(model) {
      s.sortModel = model;
      notify();
    },
    toggleSort(colId, additive = false) {
      s.sortModel = cycleSort(s.sortModel, colId, additive);
      notify();
    },
    setFilter(colId, filter) {
      const next = { ...s.filterModel };
      if (filter == null) delete next[colId];
      else next[colId] = filter;
      s.filterModel = next;
      s.page = 0;
      notify();
    },
    setQuickFilter(text) {
      s.quickFilter = text ?? "";
      s.page = 0;
      notify();
    },
    setSelection(ids) {
      s.selection = ids;
      notify();
    },
    setDensity(d) {
      s.density = d;
      notify();
    },
    setPage(page) {
      s.page = Math.max(0, page);
      notify();
    },
    setPageSize(size) {
      s.pageSize = Math.max(1, size);
      s.page = 0;
      notify();
    },
    resizeColumn(colId, width) {
      s.columns = setColumnWidth(s.columns, colId, width);
      notify();
    },
    pinColumn(colId, side) {
      s.columns = setColumnPinned(s.columns, colId, side);
      notify();
    },
    hideColumn(colId, hide) {
      s.columns = setColumnHidden(s.columns, colId, hide);
      notify();
    },
    reorderColumn(colId, toIndex) {
      s.columns = moveColumn(s.columns, colId, toIndex);
      notify();
    },
    autosizeColumn(colId) {
      s.columns = autosizeColumn(s.columns, colId, s.nodes);
      notify();
    },
    setRowGroupCols(colIds) {
      s.rowGroupCols = [...colIds];
      s.page = 0;
      reseedExpansion();
      notify();
    },
    addRowGroupCol(colId, index) {
      if (s.rowGroupCols.includes(colId)) return;
      const next = s.rowGroupCols.slice();
      next.splice(
        index == null ? next.length : Math.max(0, Math.min(index, next.length)),
        0,
        colId
      );
      s.rowGroupCols = next;
      s.page = 0;
      reseedExpansion();
      notify();
    },
    removeRowGroupCol(colId) {
      s.rowGroupCols = s.rowGroupCols.filter((c) => c !== colId);
      s.page = 0;
      reseedExpansion();
      notify();
    },
    toggleGroup(groupId) {
      const next = new Set(s.expandedGroups);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      s.expandedGroups = next;
      notify();
    },
    expandAllGroups() {
      const byId = colById();
      const sorted = sortRows(
        filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId),
        s.sortModel,
        byId
      );
      s.expandedGroups = new Set(collectGroupIds(sorted, s.rowGroupCols, byId));
      notify();
    },
    collapseAllGroups() {
      s.expandedGroups = /* @__PURE__ */ new Set();
      notify();
    },
    getColumns() {
      return s.columns;
    },
    getDisplayedRows() {
      return api.getState().displayedRows;
    },
    getAllRows() {
      return s.nodes;
    },
    serializeState() {
      return JSON.stringify({
        columns: s.columns,
        sortModel: s.sortModel,
        filterModel: s.filterModel,
        quickFilter: s.quickFilter,
        page: s.page,
        pageSize: s.pageSize,
        rowGroupCols: s.rowGroupCols,
        expandedGroups: [...s.expandedGroups]
      });
    },
    loadState(json) {
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        if (Array.isArray(parsed.columns)) s.columns = parsed.columns;
        if (Array.isArray(parsed.sortModel)) s.sortModel = parsed.sortModel;
        if (parsed.filterModel && typeof parsed.filterModel === "object") s.filterModel = parsed.filterModel;
        if (typeof parsed.quickFilter === "string") s.quickFilter = parsed.quickFilter;
        if (typeof parsed.page === "number") s.page = parsed.page;
        if (typeof parsed.pageSize === "number") s.pageSize = parsed.pageSize;
        if (Array.isArray(parsed.rowGroupCols)) s.rowGroupCols = parsed.rowGroupCols;
        if (Array.isArray(parsed.expandedGroups)) s.expandedGroups = new Set(parsed.expandedGroups);
        notify();
      } catch {
      }
    }
  };
  cache = compute();
  return api;
}

// components/data/ag-grid.js
var TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = /* html */
`
  <style>
    :host { display: block; }
  </style>
  <div class="mim-dg" part="root" data-density="normal">
    <header class="mim-dg__toolbar" part="toolbar" role="toolbar">
      <slot name="header-extra"></slot>
      <span class="mim-dg__toolbar-spacer"></span>
      <label class="mim-dg__quick">
        <is-icon icon="mdi:magnify"></is-icon>
        <input class="mim-dg__quick-input" type="search" placeholder="Buscar\u2026" aria-label="B\xFAsqueda r\xE1pida" />
      </label>
      <div class="mim-dg__density" role="group" aria-label="Densidad">
        <button class="mim-dg__density-btn" data-density="compact" type="button" title="Compacta" aria-label="Compacta">
          <is-icon icon="mdi:view-headline"></is-icon>
        </button>
        <button class="mim-dg__density-btn is-active" data-density="normal" type="button" title="Normal" aria-label="Normal">
          <is-icon icon="mdi:view-sequential"></is-icon>
        </button>
        <button class="mim-dg__density-btn" data-density="comfortable" type="button" title="C\xF3moda" aria-label="C\xF3moda">
          <is-icon icon="mdi:view-stream"></is-icon>
        </button>
      </div>
      <button class="mim-dg__tool-btn mim-dg__export-btn" type="button" title="Exportar CSV">
        <is-icon icon="mdi:file-delimited-outline"></is-icon>
        <span class="mim-dg__tool-btn-label">CSV</span>
      </button>
    </header>

    <div class="mim-dg__group-panel" part="group-panel">
      <span class="mim-dg__group-panel-label">Agrupar:</span>
      <span class="mim-dg__group-chips"></span>
      <span class="mim-dg__group-hint">arrastra una columna aqu\xED</span>
      <div class="mim-dg__group-panel-actions">
        <button class="mim-dg__group-panel-btn" data-action="expand-all" type="button" title="Expandir todos" aria-label="Expandir todos">
          <is-icon icon="mdi:unfold-more-horizontal"></is-icon>
        </button>
        <button class="mim-dg__group-panel-btn" data-action="collapse-all" type="button" title="Plegar todos" aria-label="Plegar todos">
          <is-icon icon="mdi:unfold-less-horizontal"></is-icon>
        </button>
      </div>
    </div>

    <div class="mim-dg__viewport" part="viewport" role="grid" tabindex="0">
      <div class="mim-dg__header-row" part="header"></div>
      <div class="mim-dg__body" part="body"></div>
    </div>

    <footer class="mim-dg__footer" part="footer">
      <span class="mim-dg__count" part="count"></span>
      <span class="mim-dg__footer-spacer"></span>
      <label class="mim-dg__page-size">
        Filas:
        <select class="mim-dg__page-size-select" aria-label="Filas por p\xE1gina">
          <option>25</option><option>50</option><option>100</option><option>200</option>
        </select>
      </label>
      <button class="mim-dg__pager-btn" data-action="page-prev" type="button" aria-label="Anterior">
        <is-icon icon="mdi:chevron-left"></is-icon>
      </button>
      <span class="mim-dg__pager-info"></span>
      <button class="mim-dg__pager-btn" data-action="page-next" type="button" aria-label="Siguiente">
        <is-icon icon="mdi:chevron-right"></is-icon>
      </button>
    </footer>
  </div>
`;
var LEGACY_OP_MAP = {
  contains: "contains",
  eq: "equals",
  neq: "notEqual",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  starts: "startsWith",
  ends: "endsWith"
};
var TEXT_OP_LABELS = {
  contains: "Contiene",
  notContains: "No contiene",
  equals: "Igual a",
  notEqual: "Distinto de",
  startsWith: "Empieza con",
  endsWith: "Termina con",
  blank: "Vac\xEDo",
  notBlank: "No vac\xEDo"
};
var NUM_OP_LABELS = {
  eq: "=",
  neq: "\u2260",
  gt: ">",
  gte: "\u2265",
  lt: "<",
  lte: "\u2264",
  inRange: "Entre",
  blank: "Vac\xEDo",
  notBlank: "No vac\xEDo"
};
var DATE_OP_LABELS = {
  eq: "Igual a",
  before: "Antes de",
  after: "Despu\xE9s de",
  inRange: "Entre"
};
var HEADER_MENU_ICONS = {
  sortAsc: "mdi:sort-ascending",
  sortDesc: "mdi:sort-descending",
  sortRemove: "mdi:sort-variant-remove",
  filter: "mdi:filter-outline",
  pinLeft: "mdi:pin",
  pinRight: "mdi:pin",
  unpin: "mdi:pin-off-outline",
  autosize: "mdi:arrow-expand-horizontal",
  group: "mdi:group",
  ungroup: "mdi:ungroup",
  hide: "mdi:eye-off-outline"
};
var _api, _rawRows, _rawColumns, _getRowId, _pageSize, _pageSizeOptions, _showToolbar, _rememberState, _storageKey, _density, _mounted2, _isPaginated, _page, _currentFilter, _currentSelectionMode, _viewport, _headerRow, _body, _countEl, _pagerInfo, _pageSizeSelect, _densityBtns, _toolbar, _groupPanel, _groupChips, _headerMenuEl, _filterPopoverEl, _scrollTop, _lastRangeFrom, _focusRow, _ro, _unsubscribe, _stateLoaded, _IsAgGrid_instances, cacheRefs_fn, bindStaticEvents_fn, syncAttrs_fn, syncStatePersistence_fn, defaultStorageKey_fn, readData_fn, syncPageSize_fn, syncSelectionMode_fn, initModel_fn, getAttrList_fn, resolveRowGroupCols_fn, bindModelSubscription_fn, render_fn, renderHeader_fn, renderBody_fn, renderCellContent_fn, renderFooter_fn, renderDensity_fn, renderGroupPanel_fn, renderHeaderMenu_fn, openHeaderMenu_fn, menuItem_fn, menuSep_fn, _menuCallbacks, _menuCbCounter, registerMenuCallback_fn, wireMenuItemHandlers_fn, _closeHeaderMenu, _closeOnOutside, _closeOnEscape, openFilterPopover_fn, filterPopoverHTML_fn, buildFilterFromPopover_fn, closeFilterPopover_fn, _closePopoverOutside, _closePopoverEscape, setSort_fn, clearSort_fn, pinColumn_fn, hideColumn_fn, goToPage_fn, onViewportClick_fn, onKeyDown_fn, rowHeight_fn, headerHeight_fn;
var _IsAgGrid = class _IsAgGrid extends ElementBase {
  constructor() {
    super();
    __privateAdd(this, _IsAgGrid_instances);
    __privateAdd(this, _api, null);
    __privateAdd(this, _rawRows, []);
    __privateAdd(this, _rawColumns, []);
    __privateAdd(this, _getRowId, null);
    __privateAdd(this, _pageSize, DEFAULT_PAGE_SIZE);
    __privateAdd(this, _pageSizeOptions, [25, 50, 100, 200]);
    __privateAdd(this, _showToolbar, true);
    __privateAdd(this, _rememberState, false);
    __privateAdd(this, _storageKey, "");
    __privateAdd(this, _density, Density.NORMAL);
    __privateAdd(this, _mounted2, false);
    __privateAdd(this, _isPaginated, false);
    __privateAdd(this, _page, 0);
    __privateAdd(this, _currentFilter, null);
    // { colId, op, value } (legacy)
    __privateAdd(this, _currentSelectionMode, SelectionMode.NONE);
    __privateAdd(this, _viewport);
    __privateAdd(this, _headerRow);
    __privateAdd(this, _body);
    __privateAdd(this, _countEl);
    __privateAdd(this, _pagerInfo);
    __privateAdd(this, _pageSizeSelect);
    __privateAdd(this, _densityBtns);
    __privateAdd(this, _toolbar);
    __privateAdd(this, _groupPanel);
    __privateAdd(this, _groupChips);
    __privateAdd(this, _headerMenuEl);
    __privateAdd(this, _filterPopoverEl);
    __privateAdd(this, _scrollTop, 0);
    __privateAdd(this, _lastRangeFrom, null);
    __privateAdd(this, _focusRow, -1);
    __privateAdd(this, _ro);
    __privateAdd(this, _unsubscribe, null);
    __privateAdd(this, _stateLoaded, false);
    __privateAdd(this, _menuCallbacks, /* @__PURE__ */ new Map());
    __privateAdd(this, _menuCbCounter, 0);
    __privateAdd(this, _closeHeaderMenu, () => {
      __privateGet(this, _headerMenuEl)?.remove();
      __privateSet(this, _headerMenuEl, null);
      document.removeEventListener("mousedown", __privateGet(this, _closeOnOutside), true);
      document.removeEventListener("keydown", __privateGet(this, _closeOnEscape), true);
    });
    __privateAdd(this, _closeOnOutside, (e) => {
      if (!__privateGet(this, _headerMenuEl)) return;
      if (__privateGet(this, _headerMenuEl).contains(e.target)) return;
      if (e.target.closest(".mim-dg__head-menu-btn")) return;
      __privateGet(this, _closeHeaderMenu).call(this);
    });
    __privateAdd(this, _closeOnEscape, (e) => {
      if (e.key === "Escape") __privateGet(this, _closeHeaderMenu).call(this);
    });
    __privateAdd(this, _closePopoverOutside, (e) => {
      if (!__privateGet(this, _filterPopoverEl)) return;
      if (__privateGet(this, _filterPopoverEl).contains(e.target)) return;
      __privateMethod(this, _IsAgGrid_instances, closeFilterPopover_fn).call(this);
    });
    __privateAdd(this, _closePopoverEscape, (e) => {
      if (e.key === "Escape") __privateMethod(this, _IsAgGrid_instances, closeFilterPopover_fn).call(this);
    });
    this.initShadow();
    adoptCss(this.shadowRoot, import.meta.url);
    __privateMethod(this, _IsAgGrid_instances, cacheRefs_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, bindStaticEvents_fn).call(this);
  }
  static get observedAttributes() {
    return [
      "rows",
      "columns",
      "get-row-id",
      "page-size",
      "page-size-options",
      "pagination",
      "row-selection",
      "selectable",
      "density",
      "quick-filter",
      "group-by",
      "remember-state",
      "storage-key",
      "toolbar",
      "theme"
    ];
  }
  async onConnected() {
    __privateSet(this, _mounted2, true);
    upgradeProperties(this, _IsAgGrid.observedAttributes);
    await __privateMethod(this, _IsAgGrid_instances, readData_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, syncPageSize_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, syncAttrs_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, initModel_fn).call(this);
    __privateSet(this, _stateLoaded, false);
    if (__privateGet(this, _rememberState)) {
      const key = __privateGet(this, _storageKey) || __privateMethod(this, _IsAgGrid_instances, defaultStorageKey_fn).call(this);
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) __privateGet(this, _api).loadState(raw);
      } catch {
      }
    }
    __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, bindModelSubscription_fn).call(this);
  }
  onDisconnected() {
    var _a;
    __privateGet(this, _ro)?.disconnect();
    (_a = __privateGet(this, _unsubscribe)) == null ? void 0 : _a.call(this);
  }
  async onAttributeChanged(name, _oldVal, newVal) {
    if (!__privateGet(this, _mounted2)) return;
    if (name === "rows" || name === "columns" || name === "get-row-id") {
      await __privateMethod(this, _IsAgGrid_instances, readData_fn).call(this);
      __privateMethod(this, _IsAgGrid_instances, initModel_fn).call(this);
      __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    } else if (name === "page-size-options") {
      __privateMethod(this, _IsAgGrid_instances, syncPageSize_fn).call(this);
      __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    } else if (name === "page-size") {
      __privateSet(this, _pageSize, Number(newVal) || DEFAULT_PAGE_SIZE);
      __privateGet(this, _api).setPageSize(__privateGet(this, _pageSize));
    } else if (name === "pagination") {
      __privateSet(this, _isPaginated, this.hasAttribute("pagination"));
      __privateGet(this, _api).getState();
      __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    } else if (name === "density") {
      __privateSet(this, _density, newVal || Density.NORMAL);
      __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    } else if (name === "quick-filter") {
      __privateGet(this, _api).setQuickFilter(newVal || "");
    } else if (name === "group-by") {
      const cols = (newVal || "").split(",").map((s) => s.trim()).filter(Boolean);
      __privateGet(this, _api).setRowGroupCols(cols);
    } else if (name === "row-selection" || name === "selectable") {
      __privateMethod(this, _IsAgGrid_instances, syncSelectionMode_fn).call(this);
      __privateMethod(this, _IsAgGrid_instances, render_fn).call(this);
    } else if (name === "toolbar") {
      __privateSet(this, _showToolbar, newVal !== "false");
      __privateGet(this, _toolbar).style.display = __privateGet(this, _showToolbar) ? "" : "none";
    } else if (name === "remember-state" || name === "storage-key") {
      __privateMethod(this, _IsAgGrid_instances, syncStatePersistence_fn).call(this);
    }
  }
  /* ── Public API ───────────────────────────────────────────────────────── */
  get rows() {
    return __privateGet(this, _rawRows).slice();
  }
  get columns() {
    return __privateGet(this, _rawColumns).slice();
  }
  get api() {
    const self = this;
    return {
      getState: () => __privateGet(self, _api).getState(),
      setRows: (rows) => {
        __privateSet(self, _rawRows, Array.isArray(rows) ? rows : []);
        __privateGet(self, _api).setRows(__privateGet(self, _rawRows));
      },
      setColumns: (defs) => {
        __privateSet(self, _rawColumns, Array.isArray(defs) ? defs : []);
        __privateGet(self, _api).setColumnDefs(__privateGet(self, _rawColumns));
      },
      getRows: () => __privateGet(self, _api).getAllRows().map((n) => n.data),
      getAllRows: () => __privateGet(self, _api).getAllRows().map((n) => n.data),
      getDisplayedRows: () => __privateGet(self, _api).getDisplayedRows().map((n) => n.data),
      goToPage: (n) => {
        var _a;
        return __privateMethod(_a = self, _IsAgGrid_instances, goToPage_fn).call(_a, n - 1);
      },
      // legacy 1-based
      setPage: (n) => __privateGet(self, _api).setPage(n),
      setPageSize: (n) => __privateGet(self, _api).setPageSize(n),
      setQuickFilter: (s) => {
        const v = String(s ?? "");
        self.shadowRoot.querySelector(".mim-dg__quick-input").value = v;
        __privateGet(self, _api).setQuickFilter(v);
      },
      /** Legacy: (field, op, value) where op ∈ { contains, eq, neq, gt, gte, lt, lte, starts, ends }.
       *  New: (colId, filter | null). Se detecta por el tipo del segundo arg. */
      setFilter: (colIdOrField, opOrFilter, valueMaybe) => {
        const colId = colIdOrField;
        if (opOrFilter === null || opOrFilter === void 0 || typeof opOrFilter === "object") {
          __privateGet(self, _api).setFilter(colId, opOrFilter ?? null);
          return;
        }
        const normOp = LEGACY_OP_MAP[opOrFilter] || opOrFilter;
        if (valueMaybe === void 0 || valueMaybe === null || valueMaybe === "") {
          __privateGet(self, _api).setFilter(colId, null);
        } else {
          __privateGet(self, _api).setFilter(colId, { type: "text", op: normOp, value: String(valueMaybe) });
        }
      },
      /** Nueva: (colId, filter | null). */
      setFilterModel: (model) => {
        for (const [colId, f] of Object.entries(model || {})) __privateGet(self, _api).setFilter(colId, f);
      },
      clearFilter: (field) => __privateGet(self, _api).setFilter(field, null),
      setSortModel: (model) => __privateGet(self, _api).setSortModel(model),
      toggleSort: (colId, additive) => __privateGet(self, _api).toggleSort(colId, additive),
      pinColumn: (colId, side) => __privateGet(self, _api).pinColumn(colId, side),
      hideColumn: (colId, hide = true) => __privateGet(self, _api).hideColumn(colId, hide),
      resizeColumn: (colId, width) => __privateGet(self, _api).resizeColumn(colId, width),
      autosizeColumn: (colId) => __privateGet(self, _api).autosizeColumn(colId),
      reorderColumn: (colId, toIndex) => __privateGet(self, _api).reorderColumn(colId, toIndex),
      setRowGroupCols: (colIds) => __privateGet(self, _api).setRowGroupCols(colIds),
      addRowGroupCol: (colId) => __privateGet(self, _api).addRowGroupCol(colId),
      removeRowGroupCol: (colId) => __privateGet(self, _api).removeRowGroupCol(colId),
      toggleGroup: (groupId) => __privateGet(self, _api).toggleGroup(groupId),
      expandAllGroups: () => __privateGet(self, _api).expandAllGroups(),
      collapseAllGroups: () => __privateGet(self, _api).collapseAllGroups(),
      getSelectedRows: () => {
        const sel = __privateGet(self, _api).getState().selection;
        return __privateGet(self, _api).getAllRows().filter((n) => sel.has(n.id)).map((n) => n.data);
      },
      selectAll: () => {
        if (__privateGet(self, _currentSelectionMode) !== SelectionMode.MULTIPLE) return;
        __privateGet(self, _api).setSelection(selectAll(__privateGet(self, _api).getDisplayedRows()));
      },
      clearSelection: () => __privateGet(self, _api).setSelection(clearSelection()),
      setSelection: (ids) => __privateGet(self, _api).setSelection(new Set(ids)),
      setDensity: (d) => {
        if (Object.values(Density).includes(d)) self.setAttribute("density", d);
      },
      exportCSV: (filename = "grid.csv", opts = {}) => {
        const state = __privateGet(self, _api).getState();
        const sep = opts.separator || ",";
        const onlySelected = opts.onlySelected ?? state.selection.size > 0;
        const csv = rowsToCsv(state.columns, state.displayedRows, {
          separator: sep,
          onlySelected,
          selection: state.selection
        });
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      serializeState: () => __privateGet(self, _api).serializeState(),
      loadState: (json) => {
        __privateGet(self, _api).loadState(json);
        self.dispatchEvent(new CustomEvent("is-state-loaded", {
          bubbles: true,
          composed: true,
          detail: __privateGet(self, _api).getState()
        }));
      },
      refresh: () => __privateGet(self, _api).setRows([...__privateGet(self, _rawRows)])
    };
  }
  /* ── Attribute setters/getters (boolean) ──────────────────────────────── */
  get density() {
    return __privateGet(this, _density);
  }
  set density(v) {
    if (Object.values(Density).includes(v)) this.setAttribute("density", v);
    else this.removeAttribute("density");
  }
  get pagination() {
    return __privateGet(this, _isPaginated);
  }
  set pagination(v) {
    this.setBooleanAttr("pagination", v);
  }
  get selectable() {
    return this.hasAttribute("selectable");
  }
  set selectable(v) {
    this.setBooleanAttr("selectable", v);
  }
  get toolbar() {
    return __privateGet(this, _showToolbar);
  }
  set toolbar(v) {
    this.setBooleanAttr("toolbar", v);
  }
  get rememberState() {
    return __privateGet(this, _rememberState);
  }
  set rememberState(v) {
    this.setBooleanAttr("remember-state", v);
  }
};
_api = new WeakMap();
_rawRows = new WeakMap();
_rawColumns = new WeakMap();
_getRowId = new WeakMap();
_pageSize = new WeakMap();
_pageSizeOptions = new WeakMap();
_showToolbar = new WeakMap();
_rememberState = new WeakMap();
_storageKey = new WeakMap();
_density = new WeakMap();
_mounted2 = new WeakMap();
_isPaginated = new WeakMap();
_page = new WeakMap();
_currentFilter = new WeakMap();
_currentSelectionMode = new WeakMap();
_viewport = new WeakMap();
_headerRow = new WeakMap();
_body = new WeakMap();
_countEl = new WeakMap();
_pagerInfo = new WeakMap();
_pageSizeSelect = new WeakMap();
_densityBtns = new WeakMap();
_toolbar = new WeakMap();
_groupPanel = new WeakMap();
_groupChips = new WeakMap();
_headerMenuEl = new WeakMap();
_filterPopoverEl = new WeakMap();
_scrollTop = new WeakMap();
_lastRangeFrom = new WeakMap();
_focusRow = new WeakMap();
_ro = new WeakMap();
_unsubscribe = new WeakMap();
_stateLoaded = new WeakMap();
_IsAgGrid_instances = new WeakSet();
cacheRefs_fn = function() {
  const root = this.shadowRoot;
  __privateSet(this, _viewport, root.querySelector(".mim-dg__viewport"));
  __privateSet(this, _headerRow, root.querySelector(".mim-dg__header-row"));
  __privateSet(this, _body, root.querySelector(".mim-dg__body"));
  __privateSet(this, _countEl, root.querySelector(".mim-dg__count"));
  __privateSet(this, _pagerInfo, root.querySelector(".mim-dg__pager-info"));
  __privateSet(this, _pageSizeSelect, root.querySelector(".mim-dg__page-size-select"));
  __privateSet(this, _densityBtns, root.querySelectorAll(".mim-dg__density-btn"));
  __privateSet(this, _toolbar, root.querySelector(".mim-dg__toolbar"));
  __privateSet(this, _groupPanel, root.querySelector(".mim-dg__group-panel"));
  __privateSet(this, _groupChips, root.querySelector(".mim-dg__group-chips"));
};
bindStaticEvents_fn = function() {
  const qf = this.shadowRoot.querySelector(".mim-dg__quick-input");
  qf.addEventListener("input", () => {
    __privateGet(this, _api).setQuickFilter(qf.value);
    this.dispatchEvent(new CustomEvent("is-quick-filter", {
      bubbles: true,
      composed: true,
      detail: { value: qf.value }
    }));
  });
  __privateGet(this, _densityBtns).forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.density;
      if (d) this.setAttribute("density", d);
    });
  });
  this.shadowRoot.querySelector(".mim-dg__export-btn").addEventListener("click", () => {
    this.api.exportCSV();
  });
  this.shadowRoot.querySelector(".mim-dg__footer").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "page-prev") __privateMethod(this, _IsAgGrid_instances, goToPage_fn).call(this, __privateGet(this, _page) - 1);
    if (action === "page-next") __privateMethod(this, _IsAgGrid_instances, goToPage_fn).call(this, __privateGet(this, _page) + 1);
  });
  __privateGet(this, _pageSizeSelect).addEventListener("change", () => {
    __privateGet(this, _api).setPageSize(Number(__privateGet(this, _pageSizeSelect).value));
  });
  __privateGet(this, _viewport).addEventListener("scroll", () => {
    __privateSet(this, _scrollTop, __privateGet(this, _viewport).scrollTop);
    __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this);
  });
  __privateGet(this, _viewport).addEventListener("keydown", (e) => __privateMethod(this, _IsAgGrid_instances, onKeyDown_fn).call(this, e));
  __privateGet(this, _viewport).addEventListener("click", (e) => __privateMethod(this, _IsAgGrid_instances, onViewportClick_fn).call(this, e));
  __privateGet(this, _groupPanel).addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.action === "expand-all") __privateGet(this, _api).expandAllGroups();
    if (btn.dataset.action === "collapse-all") __privateGet(this, _api).collapseAllGroups();
  });
  let dropActive = false;
  __privateGet(this, _groupPanel).addEventListener("dragover", (e) => {
    e.preventDefault();
    __privateGet(this, _groupPanel).classList.add("is-over");
  });
  __privateGet(this, _groupPanel).addEventListener("dragleave", () => {
    __privateGet(this, _groupPanel).classList.remove("is-over");
  });
  __privateGet(this, _groupPanel).addEventListener("drop", (e) => {
    e.preventDefault();
    __privateGet(this, _groupPanel).classList.remove("is-over");
    const colId = e.dataTransfer?.getData("application/x-is-col-id");
    if (colId) __privateGet(this, _api).addRowGroupCol(colId);
  });
  __privateSet(this, _ro, new ResizeObserver(() => __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this)));
  __privateGet(this, _ro).observe(__privateGet(this, _viewport));
  __privateGet(this, _headerRow).addEventListener("pointerdown", (e) => {
    const resizer = e.target.closest(".mim-dg__resizer");
    if (!resizer) return;
    e.preventDefault();
    e.stopPropagation();
    const colId = resizer.dataset.colId;
    const col = __privateGet(this, _api).getColumns().find((c) => c.colId === colId);
    if (!col) return;
    const startX = e.clientX;
    const startW = col.width;
    const onMove = (ev) => {
      __privateGet(this, _api).resizeColumn(colId, startW + (ev.clientX - startX));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.dispatchEvent(new CustomEvent("is-column-resize", {
        bubbles: true,
        composed: true,
        detail: { colId, width: __privateGet(this, _api).getColumns().find((c) => c.colId === colId).width }
      }));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
  __privateGet(this, _headerRow).addEventListener("dragstart", (e) => {
    const head = e.target.closest(".mim-dg__head-cell");
    if (!head) return;
    const colId = head.dataset.colId;
    if (!colId) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-is-col-id", colId);
    e.dataTransfer.setData("text/plain", colId);
  });
  __privateGet(this, _headerRow).addEventListener("dragover", (e) => {
    const head = e.target.closest(".mim-dg__head-cell");
    if (!head) return;
    if (!e.dataTransfer.types.includes("application/x-is-col-id")) return;
    e.preventDefault();
  });
  __privateGet(this, _headerRow).addEventListener("drop", (e) => {
    const head = e.target.closest(".mim-dg__head-cell");
    if (!head) return;
    const sourceColId = e.dataTransfer.getData("application/x-is-col-id");
    const targetColId = head.dataset.colId;
    if (!sourceColId || !targetColId || sourceColId === targetColId) return;
    e.preventDefault();
    const cols = __privateGet(this, _api).getColumns();
    const toIndex = cols.findIndex((c) => c.colId === targetColId);
    if (toIndex >= 0) __privateGet(this, _api).reorderColumn(sourceColId, toIndex);
    this.dispatchEvent(new CustomEvent("is-column-reorder", {
      bubbles: true,
      composed: true,
      detail: { colId: sourceColId, toIndex }
    }));
  });
};
syncAttrs_fn = function() {
  const mode = this.getAttribute("row-selection");
  if (mode === "single") __privateSet(this, _currentSelectionMode, SelectionMode.SINGLE);
  else if (mode === "multiple") __privateSet(this, _currentSelectionMode, SelectionMode.MULTIPLE);
  else if (this.hasAttribute("selectable")) __privateSet(this, _currentSelectionMode, SelectionMode.MULTIPLE);
  else __privateSet(this, _currentSelectionMode, SelectionMode.NONE);
  __privateSet(this, _isPaginated, this.hasAttribute("pagination"));
  __privateSet(this, _showToolbar, this.getAttribute("toolbar") !== "false");
  __privateSet(this, _density, this.getAttribute("density") || Density.NORMAL);
  __privateSet(this, _rememberState, this.hasAttribute("remember-state"));
  __privateSet(this, _storageKey, this.getAttribute("storage-key") || "");
  __privateGet(this, _toolbar).style.display = __privateGet(this, _showToolbar) ? "" : "none";
  __privateMethod(this, _IsAgGrid_instances, syncStatePersistence_fn).call(this);
};
syncStatePersistence_fn = function() {
  __privateSet(this, _rememberState, this.hasAttribute("remember-state"));
  __privateSet(this, _storageKey, this.getAttribute("storage-key") || "");
};
defaultStorageKey_fn = function() {
  return `is-ag-grid:${this.id || this.getAttribute("name") || "session"}`;
};
readData_fn = async function() {
  const scripts = [...this.children].filter((c) => c.tagName === "SCRIPT" && /json/i.test(c.type || ""));
  const rowsAttr = this.getAttribute("rows");
  const colsAttr = this.getAttribute("columns");
  const fetchScript = async (s) => {
    if (!s) return null;
    if (s.src) {
      try {
        const res = await fetch(s.src);
        return await res.json();
      } catch {
        return null;
      }
    }
    try {
      return JSON.parse(s.textContent);
    } catch {
      return null;
    }
  };
  const parsedCols = colsAttr ? JSON.parse(colsAttr) : scripts[0] && !scripts[0].src ? JSON.parse(scripts[0].textContent) : null;
  const parsedRows = rowsAttr ? JSON.parse(rowsAttr) : scripts[1] ? await fetchScript(scripts[1]) : scripts[0] ? await fetchScript(scripts[0]) : null;
  const looksLikeColDef = (x) => x && typeof x === "object" && "field" in x && !("id" in x);
  const looksLikeRow = (x) => x && typeof x === "object" && ("id" in x || !("field" in x));
  __privateSet(this, _rawColumns, Array.isArray(parsedCols) && parsedCols.every(looksLikeColDef) ? parsedCols : []);
  if (!__privateGet(this, _rawColumns).length && Array.isArray(parsedCols) && parsedCols.every(looksLikeRow)) {
    __privateSet(this, _rawColumns, []);
  }
  const rowsArr = Array.isArray(parsedRows) ? parsedRows : [];
  __privateSet(this, _rawRows, rowsArr.filter((r) => r && typeof r === "object" && !("field" in r)));
  if (!__privateGet(this, _rawRows).length && rowsArr.length) __privateSet(this, _rawRows, rowsArr);
  __privateSet(this, _getRowId, this.getAttribute("get-row-id"));
};
syncPageSize_fn = function() {
  const opts = (this.getAttribute("page-size-options") || __privateGet(this, _pageSizeOptions).join(",")).split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  __privateSet(this, _pageSizeOptions, opts.length ? opts : [DEFAULT_PAGE_SIZE]);
  __privateGet(this, _pageSizeSelect).innerHTML = __privateGet(this, _pageSizeOptions).map((o) => `<option value="${o}">${o}</option>`).join("");
  const ps = Number(this.getAttribute("page-size")) || DEFAULT_PAGE_SIZE;
  __privateSet(this, _pageSize, __privateGet(this, _pageSizeOptions).includes(ps) ? ps : __privateGet(this, _pageSizeOptions)[0]);
  __privateGet(this, _pageSizeSelect).value = String(__privateGet(this, _pageSize));
};
syncSelectionMode_fn = function() {
  const mode = this.getAttribute("row-selection");
  if (mode === "single") __privateSet(this, _currentSelectionMode, SelectionMode.SINGLE);
  else if (mode === "multiple") __privateSet(this, _currentSelectionMode, SelectionMode.MULTIPLE);
  else if (this.hasAttribute("selectable")) __privateSet(this, _currentSelectionMode, SelectionMode.MULTIPLE);
  else __privateSet(this, _currentSelectionMode, SelectionMode.NONE);
};
initModel_fn = function() {
  __privateGet(this, _api)?.getState();
  __privateSet(this, _api, createGridModel({
    rows: __privateGet(this, _rawRows),
    columns: __privateGet(this, _rawColumns),
    getRowId: __privateGet(this, _getRowId) ? (row) => row?.[__privateGet(this, _getRowId)] : void 0,
    pagination: __privateGet(this, _isPaginated),
    pageSize: __privateGet(this, _pageSize),
    density: __privateGet(this, _density),
    rowGroupCols: __privateMethod(this, _IsAgGrid_instances, resolveRowGroupCols_fn).call(this),
    selectionMode: __privateGet(this, _currentSelectionMode)
  }));
};
getAttrList_fn = function(attr) {
  const v = this.getAttribute(attr);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};
/**
 * Prioridad para agrupar al cargar:
 *   1. atributo group-by="col1,col2"
 *   2. columnas con `rowGroup: true` en los defs
 */
resolveRowGroupCols_fn = function() {
  const attr = __privateMethod(this, _IsAgGrid_instances, getAttrList_fn).call(this, "group-by");
  if (attr.length) return attr;
  return __privateGet(this, _rawColumns).filter((c) => c && c.rowGroup === true).map((c) => c.field).filter(Boolean);
};
bindModelSubscription_fn = function() {
  var _a;
  (_a = __privateGet(this, _unsubscribe)) == null ? void 0 : _a.call(this);
  __privateSet(this, _unsubscribe, __privateGet(this, _api).subscribe(() => {
    __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, renderHeader_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, renderHeaderMenu_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, renderFooter_fn).call(this);
    __privateMethod(this, _IsAgGrid_instances, renderGroupPanel_fn).call(this);
    if (__privateGet(this, _rememberState)) {
      try {
        const key = __privateGet(this, _storageKey) || __privateMethod(this, _IsAgGrid_instances, defaultStorageKey_fn).call(this);
        sessionStorage.setItem(key, __privateGet(this, _api).serializeState());
      } catch {
      }
    }
  }));
};
/* ── Render ───────────────────────────────────────────────────────────── */
render_fn = function() {
  __privateMethod(this, _IsAgGrid_instances, renderHeader_fn).call(this);
  __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this);
  __privateMethod(this, _IsAgGrid_instances, renderFooter_fn).call(this);
  __privateMethod(this, _IsAgGrid_instances, renderGroupPanel_fn).call(this);
  __privateMethod(this, _IsAgGrid_instances, renderDensity_fn).call(this);
};
renderHeader_fn = function() {
  const state = __privateGet(this, _api).getState();
  const layout = orderedForLayout(state.columns);
  const flat = [...layout.left, ...layout.center, ...layout.right];
  const check = __privateGet(this, _currentSelectionMode) !== SelectionMode.NONE;
  const checkWidth = check ? 44 : 0;
  const available = Math.max(0, __privateGet(this, _viewport).clientWidth - checkWidth);
  const withFlex = applyFlex(flat, available);
  const totalWidth = withFlex.reduce((s, c) => s + c.width, 0) + checkWidth;
  const headerH = __privateMethod(this, _IsAgGrid_instances, headerHeight_fn).call(this);
  const showSelected = __privateGet(this, _currentSelectionMode) !== SelectionMode.NONE;
  const checks = state.displayRows.length === 0 ? HeaderCheckboxState.NONE : headerCheckboxState(state.selection, state.pageRows);
  const html = [];
  if (showSelected) {
    html.push(`<div class="mim-dg__head-cell mim-dg__cell--check is-pinned is-pinned-left" role="columnheader" style="width:44px;flex:0 0 44px;position:sticky;left:0;z-index:4;height:${headerH}px">`);
    if (__privateGet(this, _currentSelectionMode) === SelectionMode.MULTIPLE) {
      const icon = checks === HeaderCheckboxState.ALL ? "mdi:checkbox-marked" : checks === HeaderCheckboxState.SOME ? "mdi:minus-box" : "mdi:checkbox-blank-outline";
      html.push(`<button class="mim-dg__checkbox mim-dg__checkbox--${checks}" type="button" aria-label="Seleccionar todo" data-act="toggle-all"><is-icon icon="${icon}"></is-icon></button>`);
    }
    html.push("</div>");
  }
  let leftX = checkWidth;
  let rightX = 0;
  for (const c of [...withFlex].reverse()) {
    if (c.pinned === PinSide.RIGHT) {
      rightX += c.width;
      c.__stickRight = `${rightX}px`;
    }
  }
  let tempLeft = checkWidth;
  for (const c of withFlex) {
    if (c.pinned === PinSide.LEFT) {
      c.__stickLeft = `${tempLeft}px`;
      tempLeft += c.width;
    }
  }
  for (const col of withFlex) {
    const idx = state.sortModel.findIndex((s) => s.colId === col.colId);
    const dir = idx >= 0 ? state.sortModel[idx].dir : null;
    const sortIdx = idx >= 0 ? idx + 1 : null;
    const isFiltered = state.filterModel[col.colId] != null;
    const isGrouped = state.rowGroupCols.includes(col.colId);
    const pinnedCls = col.pinned === "left" ? " is-pinned is-pinned-left" : col.pinned === "right" ? " is-pinned is-pinned-right" : "";
    const sortCls = col.sortable ? " is-sortable" : "";
    const sortedCls = dir ? " is-sorted" : "";
    const stickStyle = col.__stickLeft ? `position:sticky;left:${col.__stickLeft};z-index:3;` : col.__stickRight ? `position:sticky;right:${col.__stickRight};z-index:3;` : "";
    const icon = dir === "asc" ? "mdi:arrow-up" : dir === "desc" ? "mdi:arrow-down" : null;
    html.push(`<div class="mim-dg__head-cell mim-dg__cell--${col.align}${sortCls}${sortedCls}${pinnedCls}" role="columnheader" data-col-id="${col.colId}" draggable="${col.sortable !== false ? "true" : "false"}" style="width:${col.width}px;height:${headerH}px;${stickStyle}" aria-sort="${dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}">
        <span class="mim-dg__head-label">${escapeHtml(col.headerName)}</span>
        ${isFiltered ? '<is-icon icon="mdi:filter" class="mim-dg__filter-icon"></is-icon>' : ""}
        ${icon ? `<is-icon icon="${icon}" class="mim-dg__sort-icon"></is-icon>` : ""}
        ${sortIdx != null && state.sortModel.length > 1 ? `<span class="mim-dg__sort-order">${sortIdx}</span>` : ""}
        <button class="mim-dg__head-menu-btn" type="button" aria-label="Men\xFA de columna" data-act="header-menu" data-col-id="${col.colId}">
          <is-icon icon="mdi:dots-vertical"></is-icon>
        </button>
        ${col.resizable ? `<span class="mim-dg__resizer" role="separator" aria-orientation="vertical" data-col-id="${col.colId}"></span>` : ""}
      </div>`);
  }
  __privateGet(this, _headerRow).style.width = `${totalWidth}px`;
  __privateGet(this, _headerRow).style.height = `${headerH}px`;
  __privateGet(this, _headerRow).innerHTML = html.join("");
};
renderBody_fn = function() {
  const state = __privateGet(this, _api).getState();
  const layout = orderedForLayout(state.columns);
  const flat = [...layout.left, ...layout.center, ...layout.right];
  const check = __privateGet(this, _currentSelectionMode) !== SelectionMode.NONE;
  const checkWidth = check ? 44 : 0;
  const available = Math.max(0, __privateGet(this, _viewport).clientWidth - checkWidth);
  const withFlex = applyFlex(flat, available);
  const totalWidth = withFlex.reduce((s, c) => s + c.width, 0) + checkWidth;
  const rowH = __privateMethod(this, _IsAgGrid_instances, rowHeight_fn).call(this);
  const headerH = __privateMethod(this, _IsAgGrid_instances, headerHeight_fn).call(this);
  const viewportH = Math.max(0, __privateGet(this, _viewport).clientHeight - headerH);
  const dataRows = __privateGet(this, _isPaginated) ? state.pageDisplayRows : state.displayRows;
  const win = rowWindow(dataRows.length, rowH, __privateGet(this, _scrollTop), viewportH);
  const visible = dataRows.slice(win.startIndex, win.endIndex);
  const html = [];
  html.push(`<div class="mim-dg__rows" style="transform:translateY(${win.topPad}px);width:${totalWidth}px">`);
  for (let i = 0; i < visible.length; i++) {
    const dr = visible[i];
    const absIdx = win.startIndex + i;
    if (dr.kind === "group") {
      const aggCols = withFlex.filter((c) => c.aggFunc && !c.hide);
      const aggFrag = aggCols.map((c) => {
        const v = dr.agg[c.colId];
        if (v == null) return "";
        return `<span class="mim-dg__group-agg"><b>${escapeHtml(c.headerName)}:</b> ${escapeHtml(formatValueSafe(c, v))}</span>`;
      }).join("");
      html.push(`<div class="mim-dg__row mim-dg__group-row" role="row" data-row-id="${escapeHtml(dr.id)}" data-row-kind="group" data-row-index="${absIdx}" style="height:${rowH}px">
          <div class="mim-dg__group-cell" style="padding-left:${8 + dr.level * 18}px">
            <is-icon icon="${dr.expanded ? "mdi:chevron-down" : "mdi:chevron-right"}" class="mim-dg__group-chevron"></is-icon>
            <span class="mim-dg__group-label">${escapeHtml(dr.label)}</span>
            <span class="mim-dg__group-count">(${dr.count.toLocaleString()})</span>
            ${aggFrag}
          </div>
        </div>`);
    } else {
      const node = dr.node;
      const selected = state.selection.has(node.id);
      const focused = __privateGet(this, _focusRow) === absIdx;
      const cells = [];
      if (check) {
        const icon = selected ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline";
        cells.push(`<div class="mim-dg__cell mim-dg__cell--check is-pinned is-pinned-left" role="gridcell" style="width:44px;flex:0 0 44px;position:sticky;left:0;z-index:2"><span class="mim-dg__checkbox mim-dg__checkbox--${selected ? "all" : "none"}"><is-icon icon="${icon}"></is-icon></span></div>`);
      }
      let tempLeft = checkWidth;
      let rightX = 0;
      for (const c of [...withFlex].reverse()) {
        if (c.pinned === PinSide.RIGHT) {
          rightX += c.width;
          c.__stickRight = `${rightX}px`;
        }
      }
      for (const c of withFlex) {
        if (c.pinned === PinSide.LEFT) {
          c.__stickLeft = `${tempLeft}px`;
          tempLeft += c.width;
        }
      }
      for (const col of withFlex) {
        const stickStyle = col.__stickLeft ? `position:sticky;left:${col.__stickLeft};z-index:1;` : col.__stickRight ? `position:sticky;right:${col.__stickRight};z-index:1;` : "";
        const inner = __privateMethod(this, _IsAgGrid_instances, renderCellContent_fn).call(this, col, node.data);
        const style = col.cellStyle ? cellStyleToString(col.cellStyle) : "";
        const cls = col.align === "right" ? "mim-dg__cell--right" : col.align === "center" ? "mim-dg__cell--center" : "";
        cells.push(`<div class="mim-dg__cell ${cls}" role="gridcell" data-col-id="${col.colId}" data-row-id="${escapeHtml(node.id)}" style="width:${col.width}px;${stickStyle}${style}">${inner}</div>`);
      }
      const rowCls = `${selected ? "is-selected" : ""}${focused ? " is-focused" : ""}${node.index % 2 ? " is-odd" : ""}`;
      html.push(`<div class="mim-dg__row ${rowCls}" role="row" data-row-id="${escapeHtml(node.id)}" data-row-kind="leaf" data-row-index="${absIdx}" style="height:${rowH}px" aria-selected="${selected}">${cells.join("")}</div>`);
    }
  }
  html.push("</div>");
  __privateGet(this, _body).style.height = `${win.totalHeight}px`;
  __privateGet(this, _body).style.width = `${totalWidth}px`;
  __privateGet(this, _body).innerHTML = html.join("");
};
renderCellContent_fn = function(col, row) {
  const value = getCellValue(col, { data: row, id: row?.id, index: row?.index ?? 0 });
  const t = col.type;
  if (t === ColumnType.BOOLEAN) {
    return `<span class="mim-dg-bool mim-dg-bool--${value ? "on" : "off"}" aria-checked="${!!value}">${value ? "\u2713" : ""}</span>`;
  }
  if (t === "date") {
    return escapeHtml(formatDate(value, col));
  }
  if (t === "number") {
    return escapeHtml(formatNumber(value, col));
  }
  if (t === "currency") {
    return escapeHtml(formatCurrency(value, col));
  }
  if (t === "link" && value) {
    return `<a class="mim-dg-link" href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`;
  }
  if (t === "enum" || t === "badge") {
    const c = col.def.enumColors?.[value];
    const color = c || "var(--is-accent)";
    return `<span class="mim-dg-tag" style="--c:${escapeHtml(color)}">${escapeHtml(value ?? "")}</span>`;
  }
  if (t === "tags" && Array.isArray(value)) {
    return value.map((v) => `<span class="mim-dg-pill">${escapeHtml(v)}</span>`).join("");
  }
  if (t === "actions") {
    const acts = col.def.actions || [];
    return acts.map((a) => `<button class="mim-dg__action" type="button" data-action="${escapeHtml(a.value)}" title="${escapeHtml(a.label || a.value)}"><is-icon icon="${escapeHtml(a.icon || "mdi:dots-horizontal")}"></is-icon></button>`).join("");
  }
  return escapeHtml(value == null ? "" : String(value));
};
renderFooter_fn = function() {
  const state = __privateGet(this, _api).getState();
  const total = state.totalRows;
  const sel = state.selection.size;
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  const usePaging = __privateGet(this, _isPaginated) || total > state.pageSize;
  const from = usePaging ? state.page * state.pageSize + 1 : 1;
  const to = usePaging ? Math.min(total, (state.page + 1) * state.pageSize) : total;
  __privateGet(this, _countEl).innerHTML = `${formatNumberRaw(from)}\u2013${formatNumberRaw(to)} de ${formatNumberRaw(total)}${sel > 0 ? ` <span class="mim-dg__count-sel">\xB7 ${formatNumberRaw(sel)} seleccionadas</span>` : ""}`;
  __privateGet(this, _pagerInfo).textContent = `${state.page + 1} / ${pageCount}`;
  const prev = this.shadowRoot.querySelector('[data-action="page-prev"]');
  const next = this.shadowRoot.querySelector('[data-action="page-next"]');
  if (prev) prev.disabled = state.page <= 0;
  if (next) next.disabled = state.page >= pageCount - 1;
  __privateSet(this, _page, state.page);
};
renderDensity_fn = function() {
  this.shadowRoot.querySelectorAll(".mim-dg__density-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.density === __privateGet(this, _density));
  });
  this.shadowRoot.querySelector(".mim-dg").dataset.density = __privateGet(this, _density);
};
renderGroupPanel_fn = function() {
  const state = __privateGet(this, _api).getState();
  const cols = __privateGet(this, _api).getColumns();
  const chips = state.rowGroupCols.map((colId) => {
    const col = cols.find((c) => c.colId === colId);
    if (!col) return "";
    return `<span class="mim-dg__group-chip" data-col-id="${colId}"><is-icon icon="mdi:drag" class="mim-dg__group-chip-grip"></is-icon><span class="mim-dg__group-chip-label">${escapeHtml(col.headerName)}</span><button class="mim-dg__group-chip-x" type="button" data-act="ungroup" data-col-id="${colId}" aria-label="Quitar agrupaci\xF3n"><is-icon icon="mdi:close"></is-icon></button></span>`;
  });
  const arrows = state.rowGroupCols.map(() => '<span class="mim-dg__group-chip-arrow">\u203A</span>');
  const interleaved = [];
  for (let i = 0; i < chips.length; i++) {
    if (i > 0) interleaved.push(arrows[i - 1] || "");
    interleaved.push(chips[i]);
  }
  __privateGet(this, _groupChips).innerHTML = interleaved.join("");
  __privateGet(this, _groupPanel).querySelector(".mim-dg__group-hint").style.display = state.rowGroupCols.length ? "none" : "";
};
/* ── Header menu (1 menú por columna, posicionado absoluto) ───────────── */
renderHeaderMenu_fn = function() {
  __privateGet(this, _headerMenuEl)?.remove();
  __privateSet(this, _headerMenuEl, null);
};
openHeaderMenu_fn = function(col, buttonEl) {
  __privateGet(this, _closeHeaderMenu).call(this);
  const state = __privateGet(this, _api).getState();
  const idx = state.sortModel.findIndex((s) => s.colId === col.colId);
  const dir = idx >= 0 ? state.sortModel[idx].dir : null;
  const isGrouped = state.rowGroupCols.includes(col.colId);
  const r = buttonEl.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "mim-dg__menu";
  menu.setAttribute("role", "menu");
  menu.style.left = `${r.left}px`;
  menu.style.top = `${r.bottom}px`;
  const items = [];
  if (col.sortable) {
    items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Ordenar ascendente", HEADER_MENU_ICONS.sortAsc, () => __privateMethod(this, _IsAgGrid_instances, setSort_fn).call(this, col.colId, "asc")));
    items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Ordenar descendente", HEADER_MENU_ICONS.sortDesc, () => __privateMethod(this, _IsAgGrid_instances, setSort_fn).call(this, col.colId, "desc")));
    if (dir) items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Quitar orden", HEADER_MENU_ICONS.sortRemove, () => __privateMethod(this, _IsAgGrid_instances, clearSort_fn).call(this, col.colId)));
    items.push(__privateMethod(this, _IsAgGrid_instances, menuSep_fn).call(this));
  }
  if (col.filterType) {
    items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Filtrar\u2026", HEADER_MENU_ICONS.filter, () => __privateMethod(this, _IsAgGrid_instances, openFilterPopover_fn).call(this, col, buttonEl)));
    items.push(__privateMethod(this, _IsAgGrid_instances, menuSep_fn).call(this));
  }
  if (col.pinned !== "left") items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Fijar a la izquierda", HEADER_MENU_ICONS.pinLeft, () => __privateMethod(this, _IsAgGrid_instances, pinColumn_fn).call(this, col.colId, "left")));
  if (col.pinned !== "right") items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Fijar a la derecha", HEADER_MENU_ICONS.pinRight, () => __privateMethod(this, _IsAgGrid_instances, pinColumn_fn).call(this, col.colId, "right")));
  if (col.pinned) items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "No fijar", HEADER_MENU_ICONS.unpin, () => __privateMethod(this, _IsAgGrid_instances, pinColumn_fn).call(this, col.colId, null)));
  items.push(__privateMethod(this, _IsAgGrid_instances, menuSep_fn).call(this));
  items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Autoajustar ancho", HEADER_MENU_ICONS.autosize, () => __privateGet(this, _api).autosizeColumn(col.colId)));
  if (col.enableRowGroup) {
    items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, isGrouped ? "Quitar agrupaci\xF3n" : "Agrupar por esta columna", isGrouped ? HEADER_MENU_ICONS.ungroup : HEADER_MENU_ICONS.group, () => {
      if (isGrouped) __privateGet(this, _api).removeRowGroupCol(col.colId);
      else __privateGet(this, _api).addRowGroupCol(col.colId);
    }));
  }
  items.push(__privateMethod(this, _IsAgGrid_instances, menuItem_fn).call(this, "Ocultar columna", HEADER_MENU_ICONS.hide, () => __privateMethod(this, _IsAgGrid_instances, hideColumn_fn).call(this, col.colId)));
  menu.innerHTML = items.join("");
  __privateMethod(this, _IsAgGrid_instances, wireMenuItemHandlers_fn).call(this, menu);
  document.body.appendChild(menu);
  __privateSet(this, _headerMenuEl, menu);
  requestAnimationFrame(() => {
    document.addEventListener("mousedown", __privateGet(this, _closeOnOutside), true);
    document.addEventListener("keydown", __privateGet(this, _closeOnEscape), true);
  });
};
menuItem_fn = function(label, icon, onClick) {
  return `<button class="mim-dg__menu-item" type="button" role="menuitem" data-act="menu-item" data-cb="${__privateMethod(this, _IsAgGrid_instances, registerMenuCallback_fn).call(this, onClick)}"><is-icon icon="${icon}"></is-icon>${escapeHtml(label)}</button>`;
};
menuSep_fn = function() {
  return '<div class="mim-dg__menu-sep"></div>';
};
_menuCallbacks = new WeakMap();
_menuCbCounter = new WeakMap();
registerMenuCallback_fn = function(fn) {
  const id = `cb${__privateWrapper(this, _menuCbCounter)._++}`;
  __privateGet(this, _menuCallbacks).set(id, fn);
  return id;
};
wireMenuItemHandlers_fn = function(menuEl) {
  menuEl.querySelectorAll("[data-cb]").forEach((el) => {
    const fn = __privateGet(this, _menuCallbacks).get(el.dataset.cb);
    if (fn) el.addEventListener("click", fn);
  });
};
_closeHeaderMenu = new WeakMap();
_closeOnOutside = new WeakMap();
_closeOnEscape = new WeakMap();
/* ── Filter popover ───────────────────────────────────────────────────── */
openFilterPopover_fn = function(col, buttonEl) {
  __privateGet(this, _closeHeaderMenu).call(this);
  __privateMethod(this, _IsAgGrid_instances, closeFilterPopover_fn).call(this);
  const state = __privateGet(this, _api).getState();
  const existing = state.filterModel[col.colId] || null;
  const r = buttonEl.getBoundingClientRect();
  const pop = document.createElement("div");
  pop.className = "mim-dg__filter";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", `Filtrar ${col.headerName}`);
  pop.style.left = `${r.left}px`;
  pop.style.top = `${r.bottom}px`;
  const ft = col.filterType || "text";
  pop.innerHTML = __privateMethod(this, _IsAgGrid_instances, filterPopoverHTML_fn).call(this, col, ft, existing);
  document.body.appendChild(pop);
  __privateSet(this, _filterPopoverEl, pop);
  const opSel = pop.querySelector('[data-role="op"]');
  const valInput = pop.querySelector('[data-role="val"]');
  const valTo = pop.querySelector('[data-role="val-to"]');
  const setSel = pop.querySelector('[data-role="set"]');
  const setSearch = pop.querySelector('[data-role="set-search"]');
  const applyBtn = pop.querySelector('[data-act="apply"]');
  const clearBtn = pop.querySelector('[data-act="clear"]');
  if (setSearch) {
    setSearch.addEventListener("input", () => {
      const q = setSearch.value.toLowerCase();
      pop.querySelectorAll("[data-set-val]").forEach((el) => {
        el.style.display = el.dataset.setVal.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }
  if (setSel) {
    setSel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-set-val]");
      if (!btn) return;
      const v = btn.dataset.setVal;
      if (v === "__all__") {
        pop.querySelectorAll("[data-set-checkbox]").forEach((el) => el.dataset.checked = "true");
      } else if (v === "__none__") {
        pop.querySelectorAll("[data-set-checkbox]").forEach((el) => el.dataset.checked = "false");
      } else {
        const cb = btn.querySelector("[data-set-checkbox]");
        cb.dataset.checked = cb.dataset.checked === "true" ? "false" : "true";
        const icon = cb.querySelector("is-icon");
        icon.setAttribute("icon", cb.dataset.checked === "true" ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline");
      }
    });
  }
  const apply = () => {
    const filter = __privateMethod(this, _IsAgGrid_instances, buildFilterFromPopover_fn).call(this, col, pop);
    if (filter) __privateGet(this, _api).setFilter(col.colId, filter);
    else __privateGet(this, _api).setFilter(col.colId, null);
    this.dispatchEvent(new CustomEvent("is-filter-change", {
      bubbles: true,
      composed: true,
      detail: { column: col.colId, op: filter?.op, value: filter?.value }
    }));
    __privateMethod(this, _IsAgGrid_instances, closeFilterPopover_fn).call(this);
  };
  const clear = () => {
    __privateGet(this, _api).setFilter(col.colId, null);
    this.dispatchEvent(new CustomEvent("is-filter-change", {
      bubbles: true,
      composed: true,
      detail: { column: col.colId, op: null, value: null }
    }));
    __privateMethod(this, _IsAgGrid_instances, closeFilterPopover_fn).call(this);
  };
  if (applyBtn) applyBtn.addEventListener("click", apply);
  if (clearBtn) clearBtn.addEventListener("click", clear);
  [valInput, valTo].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") apply();
    });
  });
  requestAnimationFrame(() => {
    document.addEventListener("mousedown", __privateGet(this, _closePopoverOutside), true);
    document.addEventListener("keydown", __privateGet(this, _closePopoverEscape), true);
  });
  valInput?.focus();
};
filterPopoverHTML_fn = function(col, ft, existing) {
  if (ft === "text") {
    const op = existing?.type === "text" ? existing.op : "contains";
    const val = existing?.type === "text" ? existing.value : "";
    return `
        <select class="mim-dg__filter-field" data-role="op">
          ${Object.entries(TEXT_OP_LABELS).map(([v, t]) => `<option value="${v}" ${v === op ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <input class="mim-dg__filter-field" data-role="val" placeholder="Valor\u2026" value="${escapeHtml(val)}" />
        <div class="mim-dg__filter-actions">
          <button class="mim-dg__filter-btn" data-act="clear" type="button">Limpiar</button>
          <button class="mim-dg__filter-btn is-primary" data-act="apply" type="button">Aplicar</button>
        </div>`;
  }
  if (ft === "number") {
    const nf = existing?.type === "number" ? existing : null;
    const op = nf?.op || "eq";
    const val = nf?.value != null ? String(nf.value) : "";
    const to = nf?.to != null ? String(nf.to) : "";
    return `
        <select class="mim-dg__filter-field" data-role="op">
          ${Object.entries(NUM_OP_LABELS).map(([v, t]) => `<option value="${v}" ${v === op ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <input class="mim-dg__filter-field" data-role="val" type="number" placeholder="Valor\u2026" value="${escapeHtml(val)}" />
        ${op === "inRange" ? `<input class="mim-dg__filter-field" data-role="val-to" type="number" placeholder="Hasta\u2026" value="${escapeHtml(to)}" />` : ""}
        <div class="mim-dg__filter-actions">
          <button class="mim-dg__filter-btn" data-act="clear" type="button">Limpiar</button>
          <button class="mim-dg__filter-btn is-primary" data-act="apply" type="button">Aplicar</button>
        </div>`;
  }
  if (ft === "date") {
    const df = existing?.type === "date" ? existing : null;
    const op = df?.op || "eq";
    const val = df?.value || "";
    const to = df?.to || "";
    return `
        <select class="mim-dg__filter-field" data-role="op">
          ${Object.entries(DATE_OP_LABELS).map(([v, t]) => `<option value="${v}" ${v === op ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <input class="mim-dg__filter-field" data-role="val" type="date" value="${escapeHtml(val)}" />
        ${op === "inRange" ? `<input class="mim-dg__filter-field" data-role="val-to" type="date" value="${escapeHtml(to)}" />` : ""}
        <div class="mim-dg__filter-actions">
          <button class="mim-dg__filter-btn" data-act="clear" type="button">Limpiar</button>
          <button class="mim-dg__filter-btn is-primary" data-act="apply" type="button">Aplicar</button>
        </div>`;
  }
  if (ft === "set") {
    const sf = existing?.type === "set" ? existing.values : null;
    const allValues = uniqueValuesSafe(__privateGet(this, _api).getAllRows(), col);
    const selected = sf ? new Set(sf) : new Set(allValues);
    return `
        <input class="mim-dg__filter-field" data-role="set-search" placeholder="Buscar valores\u2026" />
        <div class="mim-dg__filter-actions-row">
          <button class="mim-dg__filter-link" data-set-val="__all__" type="button">Todo</button>
          <button class="mim-dg__filter-link" data-set-val="__none__" type="button">Nada</button>
        </div>
        <div class="mim-dg__filter-set" data-role="set">
          ${allValues.map((v) => `<label class="mim-dg__filter-set-item" data-set-val="${escapeHtml(v)}"><button type="button" class="mim-dg__checkbox mim-dg__checkbox--${selected.has(v) ? "all" : "none"}" data-set-checkbox data-checked="${selected.has(v)}"><is-icon icon="${selected.has(v) ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"}"></is-icon></button><span>${escapeHtml(v || "(vac\xEDo)")}</span></label>`).join("")}
        </div>
        <div class="mim-dg__filter-actions">
          <button class="mim-dg__filter-btn" data-act="clear" type="button">Limpiar</button>
          <button class="mim-dg__filter-btn is-primary" data-act="apply" type="button">Aplicar</button>
        </div>`;
  }
  return "";
};
buildFilterFromPopover_fn = function(col, pop) {
  const op = pop.querySelector('[data-role="op"]')?.value;
  const val = pop.querySelector('[data-role="val"]')?.value;
  const valTo = pop.querySelector('[data-role="val-to"]')?.value;
  const ft = col.filterType || "text";
  if (ft === "text") {
    if (!val && op !== "blank" && op !== "notBlank") return null;
    return { type: "text", op, value: val || "" };
  }
  if (ft === "number") {
    if (op === "blank" || op === "notBlank") return { type: "number", op, value: null };
    const num = val === "" ? null : Number(val);
    if (num === null && op !== "inRange") return null;
    const to = valTo === "" ? null : Number(valTo);
    return { type: "number", op, value: num, to };
  }
  if (ft === "date") {
    if (!val && op !== "inRange") return null;
    return { type: "date", op, value: val || "", to: valTo || "" };
  }
  if (ft === "set") {
    const allValues = uniqueValuesSafe(__privateGet(this, _api).getAllRows(), col);
    const selected = [...pop.querySelectorAll("[data-set-checkbox]")].filter((cb) => cb.dataset.checked === "true").map((cb) => cb.closest("[data-set-val]").dataset.setVal);
    if (selected.length === allValues.length) return null;
    return { type: "set", values: selected };
  }
  return null;
};
closeFilterPopover_fn = function() {
  __privateGet(this, _filterPopoverEl)?.remove();
  __privateSet(this, _filterPopoverEl, null);
  document.removeEventListener("mousedown", __privateGet(this, _closePopoverOutside), true);
  document.removeEventListener("keydown", __privateGet(this, _closePopoverEscape), true);
};
_closePopoverOutside = new WeakMap();
_closePopoverEscape = new WeakMap();
setSort_fn = function(colId, dir) {
  const others = __privateGet(this, _api).getState().sortModel.filter((s) => s.colId !== colId);
  __privateGet(this, _api).setSortModel(dir ? [...others, { colId, dir }] : others);
  this.dispatchEvent(new CustomEvent("is-sort-change", {
    bubbles: true,
    composed: true,
    detail: { column: colId, direction: dir }
  }));
};
clearSort_fn = function(colId) {
  const others = __privateGet(this, _api).getState().sortModel.filter((s) => s.colId !== colId);
  __privateGet(this, _api).setSortModel(others);
  this.dispatchEvent(new CustomEvent("is-sort-change", {
    bubbles: true,
    composed: true,
    detail: { column: colId, direction: null }
  }));
};
pinColumn_fn = function(colId, side) {
  __privateGet(this, _api).pinColumn(colId, side);
  this.dispatchEvent(new CustomEvent("is-column-pin", {
    bubbles: true,
    composed: true,
    detail: { colId, side }
  }));
};
hideColumn_fn = function(colId) {
  __privateGet(this, _api).hideColumn(colId, true);
  this.dispatchEvent(new CustomEvent("is-column-hide", {
    bubbles: true,
    composed: true,
    detail: { colId }
  }));
};
goToPage_fn = function(p) {
  __privateGet(this, _api).setPage(p);
  this.dispatchEvent(new CustomEvent("is-page-change", {
    bubbles: true,
    composed: true,
    detail: { page: __privateGet(this, _api).getState().page + 1, pageSize: __privateGet(this, _api).getState().pageSize }
  }));
};
/* ── Event handlers ───────────────────────────────────────────────────── */
onViewportClick_fn = function(e) {
  const state = __privateGet(this, _api).getState();
  const allRows = __privateGet(this, _isPaginated) ? state.pageDisplayRows : state.displayRows;
  const menuBtn = e.target.closest('[data-act="header-menu"]');
  if (menuBtn) {
    e.stopPropagation();
    const colId = menuBtn.dataset.colId;
    const col = __privateGet(this, _api).getColumns().find((c) => c.colId === colId);
    if (col) __privateMethod(this, _IsAgGrid_instances, openHeaderMenu_fn).call(this, col, menuBtn);
    return;
  }
  const toggleAll = e.target.closest('[data-act="toggle-all"]');
  if (toggleAll) {
    e.stopPropagation();
    const s = state;
    const all = headerCheckboxState(s.selection, s.pageRows);
    const next = all === HeaderCheckboxState.ALL ? clearSelection() : selectAll(s.pageRows);
    __privateGet(this, _api).setSelection(next);
    this.dispatchEvent(new CustomEvent("is-row-select", {
      bubbles: true,
      composed: true,
      detail: { rows: this.api.getSelectedRows() }
    }));
    return;
  }
  const head = e.target.closest(".mim-dg__head-cell");
  if (head && !e.target.closest(".mim-dg__head-menu-btn, .mim-dg__resizer")) {
    const colId = head.dataset.colId;
    const col = __privateGet(this, _api).getColumns().find((c) => c.colId === colId);
    if (col && col.sortable) {
      const additive = (e.ctrlKey || e.metaKey || e.shiftKey) && __privateGet(this, _currentSelectionMode) === SelectionMode.MULTIPLE;
      __privateGet(this, _api).toggleSort(colId, additive);
      const dir = __privateGet(this, _api).getState().sortModel.find((s) => s.colId === colId)?.dir || null;
      this.dispatchEvent(new CustomEvent("is-sort-change", {
        bubbles: true,
        composed: true,
        detail: { column: colId, direction: dir }
      }));
    }
    return;
  }
  const groupRow = e.target.closest(".mim-dg__group-row");
  if (groupRow) {
    const id = groupRow.dataset.rowId;
    __privateGet(this, _api).toggleGroup(id);
    return;
  }
  const chipX = e.target.closest('[data-act="ungroup"]');
  if (chipX) {
    __privateGet(this, _api).removeRowGroupCol(chipX.dataset.colId);
    return;
  }
  const row = e.target.closest('.mim-dg__row[data-row-kind="leaf"]');
  if (row) {
    const rowId = row.dataset.rowId;
    const node = __privateGet(this, _api).getAllRows().find((n) => n.id === rowId);
    if (!node) return;
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const colId = __privateGet(this, _api).getColumns().find((c) => c.def.actions?.some((a) => a.value === actionBtn.dataset.action))?.colId;
      const col = __privateGet(this, _api).getColumns().find((c) => c.colId === colId);
      const act = col?.def.actions?.find((a) => a.value === actionBtn.dataset.action);
      this.dispatchEvent(new CustomEvent("is-action", {
        bubbles: true,
        composed: true,
        detail: { row: node.data, column: col, action: act?.value }
      }));
      return;
    }
    if (__privateGet(this, _currentSelectionMode) !== SelectionMode.NONE) {
      const orderedIds = __privateGet(this, _api).getDisplayedRows().map((n) => n.id);
      const next = toggleRowSelection(
        state.selection,
        node.id,
        __privateGet(this, _currentSelectionMode),
        {
          additive: e.ctrlKey || e.metaKey,
          range: e.shiftKey,
          rangeFrom: __privateGet(this, _lastRangeFrom) || void 0,
          orderedIds
        }
      );
      if (!e.shiftKey) __privateSet(this, _lastRangeFrom, node.id);
      __privateGet(this, _api).setSelection(next);
      this.dispatchEvent(new CustomEvent("is-row-select", {
        bubbles: true,
        composed: true,
        detail: { rows: this.api.getSelectedRows() }
      }));
    }
    const cell = e.target.closest(".mim-dg__cell[data-col-id]");
    if (cell) {
      const colId = cell.dataset.colId;
      const col = __privateGet(this, _api).getColumns().find((c) => c.colId === colId);
      const value = node.data?.[colId];
      if (col?.def.editable) {
        const oldValue = value;
        const newValue = window.prompt(`Editar ${col.headerName}`, oldValue ?? "");
        if (newValue != null && String(newValue) !== String(oldValue ?? "")) {
          const parsed = parseMaybeNumber(newValue, col);
          node.data[colId] = parsed;
          this.dispatchEvent(new CustomEvent("is-cell-edit", {
            bubbles: true,
            composed: true,
            detail: { row: node.data, column: col, oldValue, newValue: parsed }
          }));
          __privateGet(this, _api).setRows([...__privateGet(this, _rawRows)]);
        }
      }
      this.dispatchEvent(new CustomEvent("is-cell-click", {
        bubbles: true,
        composed: true,
        detail: { row: node.data, column: col, value }
      }));
    }
  }
};
onKeyDown_fn = function(e) {
  const state = __privateGet(this, _api).getState();
  const dataRows = __privateGet(this, _isPaginated) ? state.pageDisplayRows : state.displayRows;
  const leafRows = __privateGet(this, _isPaginated) ? state.pageRows : state.displayedRows;
  const last = dataRows.length - 1;
  const rowH = __privateMethod(this, _IsAgGrid_instances, rowHeight_fn).call(this);
  const viewportH = Math.max(0, __privateGet(this, _viewport).clientHeight - __privateMethod(this, _IsAgGrid_instances, headerHeight_fn).call(this));
  const move = (idx) => {
    const c = Math.max(0, Math.min(last, idx));
    __privateSet(this, _focusRow, c);
    const top = c * rowH;
    const bottom = top + rowH;
    if (top < __privateGet(this, _scrollTop)) __privateGet(this, _viewport).scrollTop = top;
    else if (bottom > __privateGet(this, _scrollTop) + viewportH) __privateGet(this, _viewport).scrollTop = bottom - viewportH;
    __privateMethod(this, _IsAgGrid_instances, renderBody_fn).call(this);
    e.preventDefault();
  };
  const pageStep = Math.max(1, Math.floor(viewportH / rowH) - 1);
  if (e.key === "ArrowDown") move(__privateGet(this, _focusRow) + 1);
  else if (e.key === "ArrowUp") move(__privateGet(this, _focusRow) < 0 ? 0 : __privateGet(this, _focusRow) - 1);
  else if (e.key === "Home") move(0);
  else if (e.key === "End") move(last);
  else if (e.key === "PageDown") move(__privateGet(this, _focusRow) + pageStep);
  else if (e.key === "PageUp") move(__privateGet(this, _focusRow) - pageStep);
  else if ((e.key === " " || e.key === "Enter") && __privateGet(this, _focusRow) >= 0) {
    const dr = dataRows[__privateGet(this, _focusRow)];
    if (dr?.kind === "group") __privateGet(this, _api).toggleGroup(dr.id);
    else if (dr?.kind === "leaf" && __privateGet(this, _currentSelectionMode) !== SelectionMode.NONE) {
      __privateSet(this, _lastRangeFrom, dr.node.id);
      const orderedIds = leafRows.map((n) => n.id);
      const next = toggleRowSelection(state.selection, dr.node.id, __privateGet(this, _currentSelectionMode), { additive: true, orderedIds });
      __privateGet(this, _api).setSelection(next);
      this.dispatchEvent(new CustomEvent("is-row-select", {
        bubbles: true,
        composed: true,
        detail: { rows: this.api.getSelectedRows() }
      }));
    }
    e.preventDefault();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && __privateGet(this, _currentSelectionMode) === SelectionMode.MULTIPLE) {
    __privateGet(this, _api).setSelection(selectAll(leafRows));
    this.dispatchEvent(new CustomEvent("is-row-select", {
      bubbles: true,
      composed: true,
      detail: { rows: this.api.getSelectedRows() }
    }));
    e.preventDefault();
  } else if (e.key === "Escape" && state.selection.size) {
    __privateGet(this, _api).setSelection(clearSelection());
    this.dispatchEvent(new CustomEvent("is-row-select", {
      bubbles: true,
      composed: true,
      detail: { rows: [] }
    }));
  }
};
/* ── Helpers ──────────────────────────────────────────────────────────── */
rowHeight_fn = function() {
  const v = getComputedStyle(this).getPropertyValue("--is-grid-row-h");
  const parsed = parseFloat(v);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DENSITY_ROW_HEIGHT[__privateGet(this, _density)] ?? DENSITY_ROW_HEIGHT[Density.NORMAL];
};
headerHeight_fn = function() {
  const v = getComputedStyle(this).getPropertyValue("--is-grid-header-h");
  const parsed = parseFloat(v);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HEADER_HEIGHT;
};
__publicField(_IsAgGrid, "TEMPLATE", TEMPLATE);
var IsAgGrid = _IsAgGrid;
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function formatNumberRaw(n) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}
function formatValueSafe(col, value) {
  if (value == null || value === "") return "";
  if (col.type === "number") return Number.isFinite(value) ? String(value) : "";
  if (col.type === "boolean") return value ? "\u2713" : "";
  if (col.type === "date") {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}
function formatDate(value, col) {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const locale = col.def.format || "es-CO";
  const style = col.def.dateFormat || "medium";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
function formatNumber(value, col) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const decimals = col.def.decimals ?? 2;
  const locale = col.def.format || "es-CO";
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n);
  } catch {
    return n.toFixed(decimals);
  }
}
function formatCurrency(value, col) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const locale = col.def.format || "es-CO";
  const currency = col.def.currency || "COP";
  const decimals = col.def.decimals ?? 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(decimals)}`;
  }
}
function parseMaybeNumber(value, col) {
  if (col?.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}
function cellStyleToString(style) {
  if (!style || typeof style !== "object") return "";
  return Object.entries(style).map(([k, v]) => `${k}:${v}`).join(";");
}
function uniqueValuesSafe(rows, col) {
  const set = /* @__PURE__ */ new Set();
  for (const n of rows) set.add(cellText(col, n));
  return [...set].sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
}
if (!customElements.get("is-ag-grid")) {
  customElements.define("is-ag-grid", IsAgGrid);
}
if (typeof window !== "undefined") window.IsAgGrid = IsAgGrid;
export {
  IsAgGrid
};
