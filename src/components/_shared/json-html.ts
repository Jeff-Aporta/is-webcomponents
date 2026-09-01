/**
 * Codec compacto HTML ↔ JSON (lenguaje de definición del kit).
 *
 * Formato hyperscript:
 *   Node     = string | [tag, attrs?, ...children]
 *   attrs    = { [name]: string | number | boolean }  // true ⇒ attr booleano
 *   Fragment = Node | Node[]
 *
 * Ejemplos:
 *   ["is-input", { name: "nit", label: "NIT", required: true }]
 *   ["div", { slot: "content" },
 *     ["is-switch", { name: "activo" }, "Activo"]]
 *
 * Sin pasar por strings HTML: crea/lee DOM directamente (rápido y seguro).
 */

/**
 * @param {unknown} json
 * @param {ParentNode} [parent]  si se pasa, append y devuelve parent; si no, DocumentFragment
 * @returns {ParentNode}
 */
export function json2html(json: unknown, parent: ParentNode) {
  const target = parent || document.createDocumentFragment();
  appendJson(target, json);
  return target;
}

/**
 * @param {Node|ParentNode|string} node  Element, Fragment, o HTML string
 * @param {{ trim?: boolean, deep?: boolean }} [opts]
 * @returns {unknown} Node JSON (string | array | array de roots)
 */
export function html2json(node: Node|ParentNode|string, opts = {}) {
  const trim = opts.trim !== false;
  if (typeof node === 'string') {
    const t = document.createElement('template');
    t.innerHTML = node;
    return nodesToJson([...t.content.childNodes], trim);
  }
  if (!node) return null;
  if (node.nodeType === 11 /* DocumentFragment */) {
    return nodesToJson([...node.childNodes], trim);
  }
  if (node.nodeType === 3 /* Text */) {
    const t = trim ? node.textContent.replace(/\s+/g, ' ').trim() : node.textContent;
    return t || null;
  }
  if (node.nodeType === 1 /* Element */) {
    return elementToJson(/** @type {Element} */ (node), trim);
  }
  // Host con hijos light DOM (custom element)
  if (typeof node.childNodes !== 'undefined') {
    return nodesToJson([...node.childNodes], trim);
  }
  return null;
}

/** Alias: crea nodos sin padre. */
export function json2dom(json) {
  return json2html(json);
}

/**
 * Vuelca JSON en un host: si el root es el mismo tag que el host, aplica attrs
 * al host y monta solo los hijos (no anida otro host).
 * @param {HTMLElement} host
 * @param {unknown} json
 * @param {{ replace?: boolean }} [opts]
 */
export function applyJsonBody(host: HTMLElement, json: unknown, opts = {}) {
  if (!host || json == null) return host;
  const replace = opts.replace !== false;
  const roots = asList(json);

  if (
    roots.length === 1
    && Array.isArray(roots[0])
    && typeof roots[0][0] === 'string'
    && roots[0][0].toLowerCase() === host.localName
  ) {
    const parsed = parseElementTuple(roots[0]);
    applyAttrs(host, parsed.attrs);
    if (replace) host.replaceChildren();
    for (const child of parsed.children) appendJson(host, child);
    return host;
  }

  if (replace) host.replaceChildren();
  for (const item of roots) appendJson(host, item);
  return host;
}

/**
 * Serializa el light DOM (hijos) de un host. Si `self` es true, incluye el host.
 * @param {HTMLElement} host
 * @param {{ self?: boolean, trim?: boolean }} [opts]
 */
export function hostToJson(host: HTMLElement, opts = {}) {
  if (!host) return null;
  if (opts.self) return elementToJson(host, opts.trim !== false);
  return nodesToJson([...host.childNodes], opts.trim !== false);
}

// ── internals ──────────────────────────────────────────────────────────────

function asList(json) {
  if (json == null) return [];
  // Fragment: varios roots en un array cuyo primer item NO es string tag
  if (Array.isArray(json) && (json.length === 0 || typeof json[0] !== 'string')) {
    return json;
  }
  return [json];
}

function appendJson(parent, json) {
  if (json == null || json === false) return;
  if (typeof json === 'string' || typeof json === 'number') {
    parent.appendChild(document.createTextNode(String(json)));
    return;
  }
  if (Array.isArray(json)) {
    // Fragment de siblings: [[...],[...]] o ["tag", ...]
    if (json.length === 0) return;
    if (typeof json[0] === 'string') {
      parent.appendChild(createElementFromTuple(json));
      return;
    }
    for (const item of json) appendJson(parent, item);
    return;
  }
  if (typeof json === 'object' && json.t) {
    // Forma verbose opcional: { t, a, c }
    const tuple = [json.t, json.a || {}, ...(json.c || [])];
    appendJson(parent, tuple);
  }
}

function parseElementTuple(tuple: string) {
  const tag = String(tuple[0]).toLowerCase();
  let attrs = null;
  let start = 1;
  if (
    tuple.length > 1
    && tuple[1] != null
    && typeof tuple[1] === 'object'
    && !Array.isArray(tuple[1])
  ) {
    attrs = tuple[1];
    start = 2;
  }
  return { tag, attrs, children: tuple.slice(start) };
}

function createElementFromTuple(tuple) {
  const { tag, attrs, children } = parseElementTuple(tuple);
  const el = tag.includes('-') || tag === 'svg' || tag === 'path'
    ? document.createElement(tag)
    : document.createElement(tag);
  applyAttrs(el, attrs);
  for (const child of children) appendJson(el, child);
  return el;
}

function applyAttrs(el: HTMLElement, attrs) {
  if (!attrs) return;
  for (const [key, val] of Object.entries(attrs)) {
    if (val == null || val === false) continue;
    if (key === 'style' && val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(el.style, val);
      continue;
    }
    if (key === 'dataset' && val && typeof val === 'object') {
      Object.assign(el.dataset, val);
      continue;
    }
    if (key === 'className' || key === 'class') {
      el.className = String(val);
      continue;
    }
    if (val === true) {
      el.setAttribute(key, '');
      continue;
    }
    el.setAttribute(key, String(val));
  }
}

function elementToJson(el, trim) {
  const tag = el.localName;
  const attrs = attrsToObject(el);
  /** @type {unknown[]} */
  const kids = [];
  for (const n of el.childNodes) {
    if (n.nodeType === 3) {
      let t = n.textContent ?? '';
      if (trim) {
        t = t.replace(/\s+/g, ' ').trim();
        if (!t) continue;
      }
      if (t) kids.push(t);
      continue;
    }
    if (n.nodeType === 1) kids.push(elementToJson(/** @type {Element} */ (n), trim));
  }
  const out = [tag];
  if (attrs && Object.keys(attrs).length) out.push(attrs);
  out.push(...kids);
  return out;
}

function nodesToJson(nodes, trim) {
  /** @type {unknown[]} */
  const out = [];
  for (const n of nodes) {
    if (n.nodeType === 3) {
      let t = n.textContent ?? '';
      if (trim) {
        t = t.replace(/\s+/g, ' ').trim();
        if (!t) continue;
      }
      if (t) out.push(t);
      continue;
    }
    if (n.nodeType === 1) out.push(elementToJson(/** @type {Element} */ (n), trim));
  }
  if (out.length === 0) return [];
  if (out.length === 1) return out[0];
  return out;
}

function attrsToObject(el) {
  if (!el.hasAttributes()) return null;
  /** @type {Record<string, string|boolean>} */
  const obj = {};
  for (const attr of el.attributes) {
    const name = attr.name;
    if ((name === 'class' || name === 'style') && !attr.value) continue;
    if (attr.value === '') {
      obj[name] = true;
      continue;
    }
    obj[name] = attr.value;
  }
  return Object.keys(obj).length ? obj : null;
}

/** CDN / demos */
if (typeof window !== 'undefined') {
  Object.assign(window, { json2html, html2json, json2dom, applyJsonBody, hostToJson });
}
