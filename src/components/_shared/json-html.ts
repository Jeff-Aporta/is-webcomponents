/**
 * Codec compacto HTML ↔ JSON (lenguaje de definición del kit).
 *
 * Formato hyperscript:
 *   Node     = string | [tag, attrs?, ...children]
 *   attrs    = { [name]: string | number | boolean }  // true ⇒ attr booleano
 *   Fragment = Node | Node[]
 *
 * Ejemplos:
 *   ["iswc-input", { name: "nit", label: "NIT", required: true }]
 *   ["div", { slot: "content" },
 *     ["iswc-switch", { name: "activo" }, "Activo"]]
 *
 * Forma tag-objeto (json2xml), equivalente al elemento:
 *   { "iswc-text": { "color": "#abcabc", "content": ["Ac"] } }
 *   → <iswc-text color="#abcabc">Ac</iswc-text>
 * `content` son los hijos. El resto de claves son atributos.
 *
 * Sin pasar por strings HTML: crea/lee DOM directamente (rápido y seguro).
 */

/**
 * @param json Estructura JSON a renderizar.
 * @param parent Si se pasa, append y devuelve parent; si no, DocumentFragment.
 */
import type { Html2JsonOpts, ApplyJsonBodyOpts, HostToJsonOpts, JsonAttrs, VerboseNode, ElementTuple } from "./json-html.schemas.js";
export function json2html(json: unknown, parent?: ParentNode): ParentNode {
  const target = parent || document.createDocumentFragment();
  appendJson(target, json);
  return target;
}

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

/** Mismo codec. La forma `{ tag: { ...attrs, content } }` es la de xml. */
export const json2xml = json2html;

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

/** Forma verbose opcional: `{ t: tag, a: attrs, c: children }`. */

/** Tupla que produce `parseElementTuple`: `[tag, attrs?, ...children]`. */

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
  if (typeof json === 'object' && json) {
    const tagged = asTagObject(json);
    if (tagged) {
      appendJson(parent, tagged);
      return;
    }
    if ((json as VerboseNode).t) {
      const v = json as VerboseNode;
      appendJson(parent, [v.t, v.a || {}, ...(v.c || [])]);
    }
  }
}

/** `{ "iswc-text": { color, content } }` → tupla del codec. */
function asTagObject(json: object): unknown[] | null {
  if ('t' in json && typeof (json as VerboseNode).t === 'string') return null;
  const keys = Object.keys(json);
  if (keys.length !== 1 || !/^[A-Za-z][\w:-]*$/.test(keys[0])) return null;
  const tag = keys[0];
  const body = (json as Record<string, unknown>)[tag];
  if (body == null || typeof body === 'string' || typeof body === 'number') return [tag, body];
  if (typeof body !== 'object' || Array.isArray(body)) return null;
  const rec = { ...(body as Record<string, unknown>) };
  const content = rec.content;
  delete rec.content;
  const kids = content == null ? [] : Array.isArray(content) ? content : [content];
  return [tag, rec, ...kids];
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
  Object.assign(window, { json2html, json2xml, html2json, json2dom, applyJsonBody, hostToJson });
}
