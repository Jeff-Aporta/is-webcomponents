/**
 * Estado de SPA en la URL (`core/spa-state.ts`), con un navegador simulado
 * (location + history + popstate) para correr en Deno.
 *
 *   S1 base64url ida y vuelta con UTF-8 (tildes, emoji) y sin `+ / =`
 *   S2 arranca desde `?s=`; sin `?s=` usa `initial`; `?s=` corrupto cae a `initial`
 *   S3 cambio de vista = push; cambio dentro de la vista = replace (con debounce)
 *   S4 atrás del navegador relee `?s=` y notifica
 *   S5 `hrefFor` no cambia el estado; `clearQuery` deja la URL sin query
 *   S6 `maxValue` saca de la URL los valores largos, conserva números y booleanos
 *   S7 enlaces SPA: un <a> que solo cambia ?s= navega sin recargar (preventDefault + push);
 *      externos, _blank, modificadores y data-spa="off" no se interceptan
 *   S8 navigate reemplaza el estado completo (no mezcla)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { b64urlDecode, b64urlEncode, createSpaState, recortarPorValor } from '../../../core/spa-state.ts';

type Entrada = { url: string };
function navegador(inicio: string) {
  const pila: Entrada[] = [{ url: inicio }];
  let i = 0;
  const g = globalThis as unknown as Record<string, unknown>;
  const ev = new EventTarget();
  g.location = { get href() { return pila[i].url; }, get search() { return new URL(pila[i].url).search; } };
  g.history = {
    pushState: (_d: unknown, _t: string, u: URL | string) => { pila.splice(i + 1); pila.push({ url: String(u) }); i++; },
    replaceState: (_d: unknown, _t: string, u: URL | string) => { pila[i] = { url: String(u) }; },
  };
  g.addEventListener = ev.addEventListener.bind(ev);
  g.removeEventListener = ev.removeEventListener.bind(ev);
  g.dispatchEvent = ev.dispatchEvent.bind(ev);
  return {
    pila,
    get i() { return i; },
    atras() { i--; ev.dispatchEvent(new Event('popstate')); },
  };
}
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const conS = (s: object) => `http://x.test/docs/index.html?s=${b64urlEncode(JSON.stringify(s))}`;

test('S1 base64url UTF-8', () => {
  const t = 'Visión ñandú 📖 a+b/c=';
  const e = b64urlEncode(t);
  assert.doesNotMatch(e, /[+/=]/);
  assert.equal(b64urlDecode(e), t);
});

test('S2 arranque', () => {
  navegador(conS({ p: 'a.md' }));
  const a = createSpaState({ initial: { p: 'README.md' } });
  assert.deepEqual(a.boot, { p: 'a.md' });
  a.destroy();
  navegador('http://x.test/docs/index.html');
  const b = createSpaState({ initial: { p: 'README.md' } });
  assert.deepEqual(b.get(), { p: 'README.md' });
  b.destroy();
  navegador('http://x.test/docs/index.html?s=%%%');
  const c = createSpaState({ initial: { p: 'README.md' } });
  assert.deepEqual(c.get(), { p: 'README.md' });
  c.destroy();
});

test('S3 push por vista, replace dentro de la vista', async () => {
  const nav = navegador('http://x.test/docs/index.html');
  const s = createSpaState({ initial: { p: 'README.md' }, viewOf: (x) => String(x.p), debounceMs: 10 });
  s.merge({ p: 'b.md' });
  assert.equal(nav.pila.length, 2, 'vista nueva = entrada nueva');
  s.merge({ a: 'seccion' });
  await dormir(30);
  assert.equal(nav.pila.length, 2, 'misma vista = replace');
  assert.deepEqual(JSON.parse(b64urlDecode(new URL(nav.pila[1].url).searchParams.get('s')!)), { p: 'b.md', a: 'seccion' });
  s.destroy();
});

test('S4 atrás relee la URL', () => {
  const nav = navegador('http://x.test/docs/index.html');
  const s = createSpaState({ initial: { p: 'README.md' }, viewOf: (x) => String(x.p) });
  const vistos: string[] = [];
  s.subscribe((x) => vistos.push(String(x.p)));
  s.merge({ p: 'c.md' });
  nav.atras();
  assert.deepEqual(vistos, ['c.md', 'README.md']);
  s.destroy();
});

test('S5 hrefFor y clearQuery', () => {
  const nav = navegador(conS({ p: 'd.md' }));
  const s = createSpaState({ initial: { p: 'README.md' }, viewOf: (x) => String(x.p) });
  const href = s.hrefFor({ p: 'e.md' });
  assert.equal(s.get().p, 'd.md', 'hrefFor no cambia el estado');
  assert.equal(JSON.parse(b64urlDecode(new URL(href).searchParams.get('s')!)).p, 'e.md');
  s.clearQuery();
  assert.equal(new URL(nav.pila[nav.i].url).search, '');
  s.destroy();
});

test('S6 maxValue', () => {
  assert.deepEqual(recortarPorValor({ a: 'x'.repeat(10), b: 'corto', n: 123456789, f: true, z: null }, 5), { b: 'corto', n: 123456789, f: true });
});

/** Clic simulado sobre un enlace (con `composedPath`, como uno real que atraviesa shadow DOM). */
function clic(href: string, attrs: Record<string, string> = {}, mod: Partial<MouseEvent> = {}) {
  const a = { tagName: 'A', href, getAttribute: (k: string) => attrs[k] ?? null, hasAttribute: (k: string) => k in attrs };
  let prevenido = false;
  const ev = Object.assign(new Event('click'), { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mod, composedPath: () => [a], preventDefault: () => { prevenido = true; } });
  dispatchEvent(ev);
  return prevenido;
}

test('S7 enlaces SPA', () => {
  const nav = navegador('http://x.test/docs/index.html');
  const s = createSpaState({ initial: { p: 'README.md' }, viewOf: (x) => String(x.p) });
  const vistos: string[] = [];
  s.subscribe((x) => vistos.push(String(x.p)));
  assert.equal(clic(conS({ p: 'z.md', a: 'sec' })), true, 'interceptado');
  assert.deepEqual(s.get(), { p: 'z.md', a: 'sec' });
  assert.equal(nav.pila.length, 2, 'entra al historial sin recargar');
  assert.equal(clic('http://x.test/docs/index.html'), true, 'la portada (sin ?s=) también');
  assert.equal(s.get().p, 'README.md');
  assert.equal(clic('https://otro.test/x'), false, 'externo: no');
  assert.equal(clic(conS({ p: 'q.md' }), { target: '_blank' }), false, '_blank: no');
  assert.equal(clic(conS({ p: 'q.md' }), { 'data-spa': 'off' }), false, 'data-spa=off: no');
  assert.equal(clic(conS({ p: 'q.md' }), {}, { ctrlKey: true }), false, 'ctrl+clic: no');
  assert.equal(clic('http://x.test/otra.html?s=abc'), false, 'otra página: no');
  assert.deepEqual(vistos, ['z.md', 'README.md']);
  s.destroy();
});

test('S8 navigate reemplaza', () => {
  navegador(conS({ p: 'a.md', a: 'x' }));
  const s = createSpaState({ initial: { p: 'README.md' }, viewOf: (x) => String(x.p) });
  s.navigate({ p: 'b.md' });
  assert.deepEqual(s.get(), { p: 'b.md' });
  s.destroy();
});
