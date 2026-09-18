import { stripIconTokensPlain } from './tk-icon-inline.js';

const HTML_TAG = /(<[^>]+>)/g;

export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Segmento que produce `splitRichTextSegments`. */
export type RichTextSegment = { type: 'html' | 'text'; value: string };

/** Parte una cadena en texto plano y etiquetas HTML (inline o bloque). */
export function splitRichTextSegments(raw: string | null | undefined): RichTextSegment[] {
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
export function richTextInline(raw: string | null | undefined, transformPlain: (text: string) => string): string {
  return splitRichTextSegments(raw)
    .map((seg) => (seg.type === 'html' ? seg.value : transformPlain(seg.value)))
    .join('');
}

/** Texto visible sin markup (tooltips, búsqueda, overlap). */
export function richTextPlain(raw: string | null | undefined): string {
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
