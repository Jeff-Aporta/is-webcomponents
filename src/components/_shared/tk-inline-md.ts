import { replaceIconTokensWeb, splitIconRuns, svgIconGroup } from './tk-icon-inline.js';
import { richTextInline, richTextEsc } from './tk-rich-text.js';
import '../media/icon.js'; // {{iswc-icon}} emite el tag; sin esto el HTML no lo define

function esc(s: string | number | null | undefined): string {
  return richTextEsc(s);
}

function codeChipWeb(text: string): string {
  return `<code class="tk-inline-code">${text}</code>`;
}

function applyInlineMdPlainWeb(plain: string): string {
  let s = esc(plain);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+)`/g, (_m: string, code: string) => codeChipWeb(code));
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="tk-inline-link">$1</a>');
  return s;
}

function applyInlineMdWeb(plain: string): string {
  return replaceIconTokensWeb(plain, applyInlineMdPlainWeb, {});
}

/** Igual que inlineMd, con `<code class="tk-inline-code">` para el driver JSX. */
export function inlineMdWeb(raw: string | null | undefined): string {
  return richTextInline(raw, applyInlineMdWeb);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function numAttr(el: Element, name: string, fallback = 0): number {
  const n = parseFloat(el.getAttribute(name) || '');
  return Number.isFinite(n) ? n : fallback;
}

function approxTextWidth(text: string, fontSize: number): number {
  return [...text].length * fontSize * 0.56;
}

/**
 * Pinta una linea de diagrama. Sin iconos deja el markdown en el <text>.
 * Con {{iswc-icon}} quema el SVG del icono como hermano, no como hijo de <text>.
 */
export function applySvgTextContent(textEl: SVGTextElement, raw: string | null | undefined): void {
  const source = String(raw ?? '');
  const runs = splitIconRuns(source);
  const icons = runs.filter((r) => r.kind === 'icon');
  if (!icons.length) {
    textEl.innerHTML = inlineMdWeb(source);
    return;
  }
  const parent = textEl.parentNode;
  if (!parent) {
    textEl.textContent = source;
    return;
  }
  const x = numAttr(textEl, 'x');
  const y = numAttr(textEl, 'y');
  const anchor = textEl.getAttribute('text-anchor') || 'start';
  const baseline = textEl.getAttribute('dominant-baseline') || '';
  const fill = textEl.getAttribute('fill') || 'currentColor';
  const fontSize = numAttr(textEl, 'font-size', 12);
  const fontFamily = textEl.getAttribute('font-family') || 'Tahoma,Arial,sans-serif';
  const fontWeight = textEl.getAttribute('font-weight') || '';
  const cls = textEl.getAttribute('class') || '';
  const gap = 3;
  const pieces = runs.map((r) => {
    if (r.kind === 'icon') {
      const size = r.token.size ?? Math.round(fontSize * 1.15);
      return { kind: 'icon' as const, token: r.token, w: size };
    }
    return { kind: 'text' as const, text: r.text, w: r.text ? approxTextWidth(r.text, fontSize) : 0 };
  }).filter((p) => p.w > 0 || (p.kind === 'text' && p.text.trim()));
  const gaps = Math.max(0, pieces.length - 1) * gap;
  const total = pieces.reduce((s, p) => s + p.w, 0) + gaps;
  let cursor = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  pieces.forEach((p, i) => {
    if (i > 0) cursor += gap;
    if (p.kind === 'icon') {
      const size = p.w;
      const iy = baseline === 'middle' || baseline === 'central' ? y - size / 2 : y - size + 2;
      parent.insertBefore(svgIconGroup(p.token.iconId, {
        x: cursor, y: iy, size, hue: p.token.hue, color: p.token.color,
      }), textEl);
      cursor += size;
      return;
    }
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(cursor));
    t.setAttribute('y', String(y));
    t.setAttribute('text-anchor', 'start');
    if (baseline) t.setAttribute('dominant-baseline', baseline);
    t.setAttribute('fill', fill);
    t.setAttribute('font-size', String(fontSize));
    t.setAttribute('font-family', fontFamily);
    if (fontWeight) t.setAttribute('font-weight', fontWeight);
    if (cls) t.setAttribute('class', cls);
    t.innerHTML = inlineMdWeb(p.text);
    parent.insertBefore(t, textEl);
    cursor += p.w;
  });
  textEl.remove();
}
