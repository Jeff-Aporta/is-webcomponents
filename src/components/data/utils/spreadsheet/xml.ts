// xml.ts — lector XML mínimo para OOXML: etiquetas, atributos y texto, sin DOM.

/** Nodo XML. El nombre conserva el prefijo solo si no es el espacio por defecto. */
export interface XNode { name: string; attrs: Record<string, string>; children: XNode[]; text: string }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodifica entidades. */
export function unescapeXml(s: string): string {
  if (!s.includes('&')) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e] ?? m;
  });
}

/** Escapa texto para XML. */
export function escapeXml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

const ATTR = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

/** Parsea un documento y devuelve su raíz. */
export function parseXml(xml: string): XNode {
  const root: XNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) break;
    if (lt > i) stack[stack.length - 1].text += unescapeXml(xml.slice(i, lt));
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt);
      stack[stack.length - 1].text += xml.slice(lt + 9, end);
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<!--', lt)) { i = xml.indexOf('-->', lt) + 3; continue; }
    if (xml[lt + 1] === '?' || xml[lt + 1] === '!') { i = xml.indexOf('>', lt) + 1; continue; }
    const gt = xml.indexOf('>', lt);
    if (xml[lt + 1] === '/') {
      if (stack.length > 1) stack.pop();
      i = gt + 1;
      continue;
    }
    const selfClose = xml[gt - 1] === '/';
    const inner = xml.slice(lt + 1, selfClose ? gt - 1 : gt);
    const space = inner.search(/\s/);
    const name = space < 0 ? inner : inner.slice(0, space);
    const node: XNode = { name, attrs: {}, children: [], text: '' };
    if (space >= 0) {
      ATTR.lastIndex = space;
      for (let m = ATTR.exec(inner); m; m = ATTR.exec(inner)) node.attrs[m[1]] = unescapeXml(m[3] ?? m[4] ?? '');
    }
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
    i = gt + 1;
  }
  return root.children[0] ?? root;
}

/** Primer hijo con ese nombre local. */
export function child(n: XNode | undefined, name: string): XNode | undefined {
  return n?.children.find((c) => c.name === name || c.name.endsWith(`:${name}`));
}

/** Hijos con ese nombre local. */
export function children(n: XNode | undefined, name: string): XNode[] {
  return n?.children.filter((c) => c.name === name || c.name.endsWith(`:${name}`)) ?? [];
}
