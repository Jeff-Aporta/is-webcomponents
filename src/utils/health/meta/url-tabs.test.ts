/**
 * Guardianes WHAT del estado de pestañas en la URL (`?s=` → `{ tabs: { [id]: índice } }`).
 *   N1 guardar una pestaña la deja en `?s=` sin perder lo demás del estado; leerla la devuelve.
 *   N2 sin `push` el cambio reemplaza la entrada (no ensucia atrás/adelante); con `push`, entra al
 *      historial.
 *   N3 valores inválidos (id vacío, índice negativo) no escriben nada.
 *   N4 los tabs de imágenes del markdown tienen id estable por documento y recuerdan su estado.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { b64urlDecode, b64urlEncode, readUrlTabs, writeUrlTab } from '../../../components/_shared/url-nav.ts';
import { mdToHtml } from '../../../components/helpers/md-lite.ts';

function navegador(inicial: Record<string, unknown>) {
  const g = globalThis as unknown as { location: { href: string }; history: unknown };
  const prev = { location: g.location, history: g.history };
  const entradas: string[] = [];
  let href = `http://x/docs/index.html?s=${b64urlEncode(JSON.stringify(inicial))}`;
  g.location = { get href() { return href; } } as { href: string };
  g.history = {
    state: null,
    pushState: (_s: unknown, _t: string, u: URL) => { entradas.push('push'); href = String(u); },
    replaceState: (_s: unknown, _t: string, u: URL) => { entradas.push('replace'); href = String(u); },
  };
  const estado = () => JSON.parse(b64urlDecode(new URL(href).searchParams.get('s')!));
  return { entradas, estado, restaurar: () => Object.assign(g, prev) };
}

Deno.test('url tabs: N1-N3 guarda la pestaña, conserva el estado y decide historial', () => {
  const nav = navegador({ p: 'README.md' });
  try {
    writeUrlTab('md-tabs-1', 1);
    assertEquals(nav.estado(), { p: 'README.md', tabs: { 'md-tabs-1': 1 } });
    assertEquals(readUrlTabs(), { 'md-tabs-1': 1 });
    assertEquals(nav.entradas, ['replace'], 'sin push: reemplaza');
    writeUrlTab('vista', 2, true);
    assertEquals(nav.entradas.at(-1), 'push', 'con push: entra al historial');
    assertEquals(readUrlTabs(), { 'md-tabs-1': 1, vista: 2 });
    writeUrlTab('', 1); writeUrlTab('x', -1);
    assertEquals(nav.entradas.length, 2, 'inválidos no escriben');
  } finally { nav.restaurar(); }
});

Deno.test('url tabs: N4 los tabs del markdown tienen id estable por documento y state', () => {
  const md = '---\n\n![A](a.svg)\n![B](b.svg)\n\n---\n\n---\n\n![C](c.svg)\n![D](d.svg)\n\n---';
  const a = mdToHtml(md);
  const b = mdToHtml(md);
  const ids = (h: string) => [...h.matchAll(/<iswc-tab-group[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assertEquals(ids(a), ['md-tabs-1', 'md-tabs-2']);
  assertEquals(ids(b), ids(a), 'mismo documento, mismos ids (sobreviven a F5)');
  assert(/<iswc-tab-group[^>]*\bstate\b/.test(a), 'recuerdan su pestaña');
});
