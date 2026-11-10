// @contexto INDICE.md · tests/core/README.md
// f8b.test.ts — las piezas opt-in del nucleo (F8b).
//
// Cada una vive en su modulo para que solo la paguen quien la usa:
//
//   ranuras    — ranuras reactivas (static ranuras + ranura())
//   reemitir   — reemitir un evento nativo como evento del componente
//   animar     — show / hide / pulse
//   anunciar   — el anunciador vivo (una sola region aria-live)
//   intl       — Intl.ListFormat e Intl.PluralRules con respaldo
//
// Las pruebas usan dobles: no necesitan navegador.
import assert from 'node:assert/strict';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { ranurasDe, ranura } from '../../src/core/ranuras.ts';
import { reemitir } from '../../src/core/reemitir.ts';
import { animar, DURACION, KEYFRAMES } from '../../src/core/animar.ts';
import { anunciar, regionViva } from '../../src/core/anunciar.ts';
import { lista, plural } from '../../src/core/intl.ts';

const { test, lista: listaPruebas } = coleccionPruebas({ categoria: 'how' });

/** Un componente falso con su sombra y sus slots (conserva su clase: importan los estaticos). */
function componenteFalso(clase: new () => object, slots: Record<string, unknown> = {}) {
  const raiz = {
    querySelector(sel: string) {
      const nombre = sel.match(/slot\[name="([^"]+)"\]/)?.[1] ?? (sel.includes(':not([name])') ? 'default' : null);
      return nombre && nombre in slots ? slots[nombre] : null;
    },
  };
  const c = new clase() as { shadowRoot?: unknown };
  c.shadowRoot = raiz;
  return c;
}

test('f8b: ranuras — el componente declara sus slots reactivos', () => {
  class ConRanuras { static ranuras = ['cuerpo', 'pie']; }
  class SinRanuras {}
  assert.deepEqual(ranurasDe(componenteFalso(ConRanuras) as unknown as HTMLElement), ['cuerpo', 'pie']);
  assert.deepEqual(ranurasDe(componenteFalso(SinRanuras) as unknown as HTMLElement), []);
});

test('f8b: ranuras — ranura() encuentra el slot pedido', () => {
  const slot = { nombre: 'cuerpo' };
  class ConRanuras { static ranuras = ['cuerpo']; }
  const c = componenteFalso(ConRanuras, { cuerpo: slot });
  const encontrado = ranura(c as unknown as HTMLElement, 'cuerpo');
  assert.equal(encontrado, slot);
  assert.equal(ranura(c as unknown as HTMLElement, 'otro'), null);
});

test('f8b: reemitir — el evento nativo sale como evento del componente', () => {
  const emitidos: Event[] = [];
  const objetivo = {
    dispatchEvent(e: Event) { emitidos.push(e); return true; },
  };
  const nativo = new CustomEvent('change', { detail: { valor: 3 } });
  Object.defineProperty(nativo, 'target', { value: objetivo });
  const ok = reemitir(nativo);
  assert.equal(ok, true);
  assert.equal(emitidos.length, 1);
  assert.equal(emitidos[0]!.type, 'change');
  assert.equal((emitidos[0] as CustomEvent).detail.valor, 3);
  assert.equal(emitidos[0]!.bubbles, true);
  assert.equal(emitidos[0]!.composed, true);
});

test('f8b: animar — hay una animacion por tipo, con su duracion', () => {
  assert.deepEqual(Object.keys(KEYFRAMES).sort(), ['hide', 'pulse', 'show']);
  for (const t of ['show', 'hide', 'pulse'] as const) {
    assert.ok(DURACION[t] > 0, 'cada animacion dura algo');
    assert.ok(Array.isArray(KEYFRAMES[t]) && KEYFRAMES[t].length >= 2, 'cada animacion tiene keyframes');
  }
});

test('f8b: animar — sin Web Animations no rompe', async () => {
  await animar({ animate: undefined } as unknown as HTMLElement, 'show');
});

test('f8b: anunciar — sin documento no rompe', () => {
  assert.equal(regionViva(), null);
  anunciar('hola');
});

test('f8b: intl — lista y plural con Intl y con el respaldo', () => {
  assert.equal(lista(['uno']), 'uno');
  assert.ok(lista(['uno', 'dos', 'tres']).includes('tres'));
  assert.equal(lista([]), '');
  assert.equal(plural(1, ['un archivo', 'varios archivos']), 'un archivo');
  assert.equal(plural(3, ['un archivo', 'varios archivos']), 'varios archivos');
  assert.equal(plural(0, ['un archivo', 'varios archivos', 'ningun archivo']), 'ningun archivo');
});

export default listaPruebas();
