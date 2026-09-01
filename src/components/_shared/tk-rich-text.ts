import { stripIconTokensPlain } from './tk-icon-inline.js';

const HTML_TAG = /(<[^>]+>)/g;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parte una cadena en texto plano y etiquetas HTML (inline o bloque). */
export function splitRichTextSegments(raw) {
  const text = String(raw ?? '');
  if (!text) return [];
  return text
    .split(HTML_TAG)
    .filter((part) => part.length > 0)
    .map((part: string) => ({
      type: part.startsWith('<') && part.endsWith('>') ? 'html' : 'text',
      value: part,
    }));
}

/** Aplica transformación MD/HTML solo en segmentos de texto plano. */
export function richTextInline(raw, transformPlain) {
  return splitRichTextSegments(raw)
    .map((seg) => (seg.type === 'html' ? seg.value : transformPlain(seg.value)))
    .join('');
}

/** Texto visible sin markup (tooltips, búsqueda, overlap). */
export function richTextPlain(raw) {
  return splitRichTextSegments(raw)
    .map((seg) => {
      if (seg.type === 'html') {
        return seg.value.replace(/<[^>]+>/g, ' ');
      }
      return stripIconTokensPlain(
        seg.value
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      );
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { esc as richTextEsc };
