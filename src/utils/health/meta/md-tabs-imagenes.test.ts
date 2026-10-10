/**
 * Guardianes WHAT de los tabs de imágenes del markdown (`md-lite`): entre dos `---`, solo imágenes
 * (2 o más) → un `iswc-tab-group` con una pestaña por imagen y el `alt` como nombre. En markdown
 * plano (GitHub, Obsidian) el mismo texto se lee como separadores con imágenes.
 *   T1 el bloque se vuelve tabs: nombres = alt, en orden; los dos `---` se consumen.
 *   T2 una sola imagen, o texto entre los `---`, NO son tabs (separadores normales).
 *   T3 sin componentes: figuras con su nombre (HTML plano, legible).
 *   T4 anota los tags que necesita (para que md-hydrate los cargue).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { mdToHtml } from '../../../components/helpers/md-lite.ts';

const BLOQUE = '---\n\n![Secuencia](a.svg)\n![Secuencia enriquecida](b.svg "Ruta ilustrada")\n\n---';

Deno.test('md tabs: T1 bloque de imágenes entre --- → tabs con el alt como nombre', () => {
  const html = mdToHtml(`Antes\n\n${BLOQUE}\n\nDespués`);
  assert(html.includes('<iswc-tab-group'), html);
  const nombres = [...html.matchAll(/<iswc-tab slot="nav"[^>]*>([^<]*)<\/iswc-tab>/g)].map((m) => m[1]);
  assertEquals(nombres, ['Secuencia', 'Secuencia enriquecida']);
  assertEquals((html.match(/<iswc-tab-panel/g) ?? []).length, 2);
  assert(!html.includes('iswc-divider'), 'los --- del bloque no se pintan');
});

Deno.test('md tabs: T2 una imagen sola o texto entre --- no son tabs', () => {
  assert(!mdToHtml('---\n\n![Sola](a.svg)\n\n---').includes('iswc-tab-group'));
  assert(!mdToHtml('---\n\n![A](a.svg)\nTexto\n![B](b.svg)\n\n---').includes('iswc-tab-group'));
});

Deno.test('md tabs: T3 sin componentes: figuras con su nombre', () => {
  const html = mdToHtml(BLOQUE, { componentes: false });
  assert(html.includes('<figcaption>Secuencia</figcaption>') && html.includes('<figcaption>Secuencia enriquecida</figcaption>'), html);
});

Deno.test('md tabs: T4 anota los tags del kit que necesita', () => {
  const tags = new Set<string>();
  mdToHtml(BLOQUE, { tags });
  for (const t of ['iswc-tab-group', 'iswc-tab', 'iswc-tab-panel']) assert(tags.has(t), t);
});
