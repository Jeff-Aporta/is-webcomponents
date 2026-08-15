import { richTextPlain } from './tk-rich-text.js';

/**
 * Ancho mínimo que necesita la cabecera de un diagrama (título + subtítulo).
 *
 * El título y el subtítulo se pintan centrados en `width / 2`, así que cuando
 * el contenido del diagrama es más estrecho que el texto, la cabecera se sale
 * del lienzo por los dos lados y el PNG exportado sale con las frases cortadas.
 * Esto pasó de verdad con varios diagramas del proyecto is-tkts.
 *
 * El cálculo es una estimación por número de caracteres — el mismo criterio
 * que ya usan los specs para medir etiquetas — con los pesos reales del
 * render: el título va a 13px en negrita y el subtítulo a 11px.
 */
const TITULO_CHAR_W = 7.4;
const SUBTITULO_CHAR_W = 5.9;

export function diagramHeaderWidth(title, subtitle, { padding = 32 } = {}) {
  const t = richTextPlain(title ?? '').length * TITULO_CHAR_W;
  const s = richTextPlain(subtitle ?? '').length * SUBTITULO_CHAR_W;
  const texto = Math.max(t, s);
  return texto ? Math.ceil(texto + padding * 2) : 0;
}
