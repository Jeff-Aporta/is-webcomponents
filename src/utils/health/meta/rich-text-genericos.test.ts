/**
 * Guardián WHAT del texto enriquecido de los diagramas: solo las etiquetas HTML de texto conocidas
 * pasan como HTML; un tipo genérico (`Array<Record<string, unknown>>`, `get<T>()`) es texto y se
 * escapa. Antes se insertaba como elemento y el SVG exportado quedaba mal formado (imagen rota).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { richTextEsc, richTextInline, splitRichTextSegments } from '../../../components/_shared/tk-rich-text.ts';

Deno.test('rich text: G1 los genéricos son texto escapado; <b> y <br/> siguen siendo HTML', () => {
  assertEquals(richTextInline('x: Array<Record<string, unknown>>', richTextEsc), 'x: Array&lt;Record&lt;string, unknown&gt;&gt;');
  assertEquals(richTextInline('get<T>(): T', richTextEsc), 'get&lt;T&gt;(): T');
  assertEquals(splitRichTextSegments('a <b>b</b> c').map((s) => s.type), ['text', 'html', 'text', 'html', 'text']);
  assertEquals(splitRichTextSegments('a<br/>b').map((s) => s.type), ['text', 'html', 'text']);
});
