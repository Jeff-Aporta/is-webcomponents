// tests/main-scroll.test.mjs
//
// Contrato del scroll de <is-main>, ejecutado de verdad: el módulo se carga
// sobre un DOM mínimo simulado (sin jsdom) para poder afirmar sobre el
// comportamiento y no sobre el texto del fuente.
//
// Reglas vigiladas:
//   1. Navegación fresca → arranca en top.
//   2. F5 / atrás sobre la misma vista → restaura el top guardado, aun si el
//      contenido tarda en tener altura.
//   3. Cambiar storage-key (= cambiar de componente) → reset a top y olvida la
//      lectura previa de esa vista.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { setTimeout as wait } from 'node:timers/promises';

const ROOT_KEY = 'is-components';

/** localStorage de juguete. */
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

/** HTMLElement mínimo: atributos, listeners, scroll con clamp y upgrade. */
class FakeElement {
  #attrs = new Map();
  #listeners = new Map();

  constructor() {
    this.scrollHeight = 0;
    this.clientHeight = 500;
    this._scrollTop = 0;
  }

  get scrollTop() { return this._scrollTop; }
  set scrollTop(v) {
    const max = Math.max(0, this.scrollHeight - this.clientHeight);
    const next = Math.max(0, Math.min(max, Number(v) || 0));
    if (next === this._scrollTop) return;
    this._scrollTop = next;
    this.dispatchEvent({ type: 'scroll' });
  }

  scrollTo({ top = 0 } = {}) { this.scrollTop = top; }

  getAttribute(name) { return this.#attrs.has(name) ? this.#attrs.get(name) : null; }
  hasAttribute(name) { return this.#attrs.has(name); }

  setAttribute(name, value) {
    const prev = this.getAttribute(name);
    this.#attrs.set(name, String(value));
    this.#notify(name, prev, String(value));
  }

  removeAttribute(name) {
    const prev = this.getAttribute(name);
    this.#attrs.delete(name);
    this.#notify(name, prev, null);
  }

  toggleAttribute(name, force) {
    if (force) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }

  addEventListener(type, fn) {
    if (!this.#listeners.has(type)) this.#listeners.set(type, new Set());
    this.#listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) { this.#listeners.get(type)?.delete(fn); }

  dispatchEvent(evt) {
    for (const fn of this.#listeners.get(evt.type) ?? []) fn(evt);
    return true;
  }

  #notify(name, prev, next) {
    const observed = this.constructor.observedAttributes ?? [];
    if (observed.includes(name)) this.attributeChangedCallback?.(name, prev, next);
  }
}

/** Carga is-main con el entorno pedido y devuelve un main ya conectado. */
async function mountMain({ navType, saved }) {
  globalThis.HTMLElement = FakeElement;
  globalThis.localStorage = fakeStorage();
  globalThis.customElements = { get: () => undefined, define: () => {} };
  globalThis.window = globalThis;
  globalThis.performance.getEntriesByType = (kind) =>
    (kind === 'navigation' ? [{ type: navType }] : []);
  if (saved) localStorage.setItem(ROOT_KEY, JSON.stringify({ 'is-main': saved }));

  // cache-buster: cada caso necesita su propia evaluación del IIFE.
  await import(`../src/components/layout/main.js?case=${navType}-${Math.random()}`);
  const main = new globalThis.IsMain();
  main.setAttribute('remember-scroll', '');
  main.connectedCallback();
  return main;
}

const readPrefs = (key) =>
  JSON.parse(localStorage.getItem(ROOT_KEY) || '{}')['is-main']?.[key] ?? null;

test('navegación fresca arranca en top aunque haya lectura guardada', async () => {
  const main = await mountMain({
    navType: 'navigate',
    saved: { 'docs-is-button': { top: 900, savedAt: Date.now() } },
  });
  main.scrollHeight = 5000;
  main.setAttribute('storage-key', 'docs-is-button');
  await wait(200);
  assert.equal(main.scrollTop, 0);
});

test('F5 restaura la lectura aunque el contenido llegue después', async () => {
  const main = await mountMain({
    navType: 'reload',
    saved: { 'docs-is-button': { top: 900, savedAt: Date.now() } },
  });
  // storage-key llega antes que el markup: sin altura no se puede restaurar.
  main.setAttribute('storage-key', 'docs-is-button');
  assert.equal(main.scrollTop, 0, 'sin altura no debe inventar posición');
  main.scrollHeight = 5000;
  await wait(300);
  assert.equal(main.scrollTop, 900);
  assert.equal(readPrefs('docs-is-button').top, 900, 'reintentar no debe pisar la memoria');
});

test('F5 no restaura una lectura vencida por TTL', async () => {
  const main = await mountMain({
    navType: 'reload',
    saved: { 'docs-is-button': { top: 900, savedAt: Date.now() - 7_200_000 } },
  });
  main.scrollHeight = 5000;
  main.setAttribute('storage-key', 'docs-is-button');
  await wait(300);
  assert.equal(main.scrollTop, 0);
});

test('cambiar de componente resetea a top y olvida la lectura de esa vista', async () => {
  const main = await mountMain({
    navType: 'reload',
    saved: { 'docs-is-button': { top: 900, savedAt: Date.now() } },
  });
  main.scrollHeight = 5000;
  main.setAttribute('storage-key', 'docs-is-button');
  await wait(300);
  assert.equal(main.scrollTop, 900, 'precondición: venimos de una lectura');

  main.setAttribute('storage-key', 'docs-is-tooltip');
  assert.equal(main.scrollTop, 0, 'otra vista arranca arriba');
  assert.equal(readPrefs('docs-is-tooltip').top, 0, 'un F5 inmediato debe quedarse arriba');

  main.scrollTop = 400;
  await wait(300);
  assert.equal(readPrefs('docs-is-tooltip').top, 400, 'la lectura nueva sí se guarda');
});

test('el gesto del usuario aborta la restauración pendiente', async () => {
  const main = await mountMain({
    navType: 'reload',
    saved: { 'docs-is-button': { top: 900, savedAt: Date.now() } },
  });
  main.setAttribute('storage-key', 'docs-is-button');
  main.dispatchEvent({ type: 'wheel' });
  main.scrollHeight = 5000;
  await wait(300);
  assert.equal(main.scrollTop, 0, 'no debe saltar bajo el dedo del usuario');
});
