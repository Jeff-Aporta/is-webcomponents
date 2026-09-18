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
 * @param json Estructura JSON a renderizar.
 * @param parent Si se pasa, append y devuelve parent; si no, DocumentFragment.
 */
export function json2html(json: unknown, parent?: ParentNode): ParentNode {
  const target = parent || document.createDocumentFragment();
  appendJson(target, json);
  return target;
}

export type Html2JsonOpts = { trim?: boolean; deep?: boolean };

/**
 * @param node Element, Fragment, o HTML string.
 * @param opts Opciones de serialización.
 */
export function html2json(node: Node | ParentNode | string | null | undefined, opts: Html2JsonOpts = {}): unknown {
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
    const raw = node.textContent ?? '';
    const t = trim ? raw.replace(/\s+/g, ' ').trim() : raw;
    return t || null;
  }
  if (node.nodeType === 1 /* Element */) {
    return elementToJson(node as Element, trim);
  }
  // Host con hijos light DOM (custom element)
  if (typeof (node as Node).childNodes !== 'undefined') {
    return nodesToJson([...node.childNodes], trim);
  }
  return null;
}

/** Alias: crea nodos sin padre. */
export function json2dom(json: unknown): ParentNode {
  return json2html(json);
}

export type ApplyJsonBodyOpts = { replace?: boolean };

/**
 * Vuelca JSON en un host: si el root es el mismo tag que el host, aplica attrs
 * al host y monta solo los hijos (no anida otro host).
 */
export function applyJsonBody(host: HTMLElement, json: unknown, opts: ApplyJsonBodyOpts = {}): HTMLElement {
  if (!host || json == null) return host;
  const replace = opts.replace !== false;
  const roots = asList(json);

  if (
    roots.length === 1
    && Array.isArray(roots[0])
    && typeof (roots[0] as unknown[])[0] === 'string'
    && ((roots[0] as unknown[])[0] as string).toLowerCase() === host.localName
  ) {
    const parsed = parseElementTuple(roots[0] as ElementTuple);
    applyAttrs(host, parsed.attrs);
    if (replace) host.replaceChildren();
    for (const child of parsed.children) appendJson(host, child);
    return host;
  }

  if (replace) host.replaceChildren();
  for (const item of roots) appendJson(host, item);
  return host;
}

export type HostToJsonOpts = { self?: boolean; trim?: boolean };

/**
 * Serializa el light DOM (hijos) de un host. Si `self` es true, incluye el host.
 */
export function hostToJson(host: HTMLElement | null | undefined, opts: HostToJsonOpts = {}): unknown {
  if (!host) return null;
  const trim = opts.trim !== false;
  if (opts.self) return elementToJson(host, trim);
  return nodesToJson([...host.childNodes], trim);
}

// ── internals ──────────────────────────────────────────────────────────────

/** Atributos que admite `json2html`: booleanos, numéricos, strings. */
type JsonAttrs = Record<string, string | number | boolean | { [k: string]: string } | null | undefined>;

/** Forma verbose opcional: `{ t: tag, a: attrs, c: children }`. */
type VerboseNode = { t: string; a?: JsonAttrs; c?: unknown[] };

/** Tupla que produce `parseElementTuple`: `[tag, attrs?, ...children]`. */
type ElementTuple = [string, JsonAttrs?, ...unknown[]];

function asList(json: unknown): unknown[] {
  if (json == null) return [];
  // Fragment: varios roots en un array cuyo primer item NO es string tag
  if (Array.isArray(json) && (json.length === 0 || typeof json[0] !== 'string')) {
    return json as unknown[];
  }
  return [json];
}

function appendJson(parent: ParentNode, json: unknown): void {
  if (json == null || json === false) return;
  if (typeof json === 'string' || typeof json === 'number') {
    parent.appendChild(document.createTextNode(String(json)));
    return;
  }
  if (Array.isArray(json)) {
    // Fragment de siblings: [[...],[...]] o ["tag", ...]
    if (json.length === 0) return;
    if (typeof json[0] === 'string') {
      parent.appendChild(createElementFromTuple(json as ElementTuple));
      return;
    }
    for (const item of json) appendJson(parent, item);
    return;
  }
  if (typeof json === 'object' && json && (json as VerboseNode).t) {
    // Forma verbose opcional: { t, a, c }
    const v = json as VerboseNode;
    const tuple: unknown[] = [v.t, v.a || {}, ...(v.c || [])];
    appendJson(parent, tuple);
  }
}

function parseElementTuple(tuple: ElementTuple): { tag: string; attrs: JsonAttrs | null; children: unknown[] } {
  const tag = String(tuple[0]).toLowerCase();
  let attrs: JsonAttrs | null = null;
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
  return { tag, attrs, children: tuple.slice(start) as unknown[] };
}

function createElementFromTuple(tuple: ElementTuple): HTMLElement {
  const { tag, attrs, children } = parseElementTuple(tuple);
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  for (const child of children) appendJson(el, child);
  return el;
}

function applyAttrs(el: HTMLElement, attrs: JsonAttrs | null): void {
  if (!attrs) return;
  for (const [key, val] of Object.entries(attrs)) {
    if (val == null || val === false) continue;
    if (key === 'style' && val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(el.style, val as Partial<CSSStyleDeclaration>);
      continue;
    }
    if (key === 'dataset' && val && typeof val === 'object') {
      Object.assign(el.dataset, val as DOMStringMap);
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

function elementToJson(el: Element, trim: boolean): unknown[] {
  const tag = el.localName;
  const attrs = attrsToObject(el);
  const kids: unknown[] = [];
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
    if (n.nodeType === 1) kids.push(elementToJson(n as Element, trim));
  }
  const out: unknown[] = [tag];
  if (attrs && Object.keys(attrs).length) out.push(attrs);
  out.push(...kids);
  return out;
}

function nodesToJson(nodes: readonly ChildNode[], trim: boolean): unknown {
  const out: unknown[] = [];
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
    if (n.nodeType === 1) out.push(elementToJson(n as Element, trim));
  }
  if (out.length === 0) return [];
  if (out.length === 1) return out[0];
  return out;
}

function attrsToObject(el: Element): Record<string, string | boolean> | null {
  if (!el.hasAttributes()) return null;
  const obj: Record<string, string | boolean> = {};
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
