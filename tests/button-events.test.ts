// button-events.test.ts — los 4 eventos propios de <is-button> existen de verdad.
//
// Nace de un fallo concreto: `is-invalid` estaba documentado en la cabecera de
// button.ts, en button.md y en el video del componente, pero NADIE lo emitia —
// #emit solo se llamaba para focus, blur y click. Un evento prometido y ausente no
// falla en ningun sitio: el consumidor pone su listener y no salta nunca.
//
// Y el segundo: #syncTag() reemplaza el <button> por un <a> cuando aparece `href`.
// Los listeners vivian en el nodo viejo y se iban con el, mientras #wired seguia en
// true, asi que no se volvian a poner. Poner href en caliente dejaba el boton mudo.
//
// Es analisis estatico a proposito: el resto de la bateria tampoco levanta un DOM, y
// para "esta linea sigue estando" no hace falta.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'components', 'actions', 'button.ts'), 'utf8');

const EVENTOS = ['is-focus', 'is-blur', 'is-click', 'is-invalid'];

test('cada evento documentado se emite de verdad', () => {
  for (const ev of EVENTOS) {
    assert.ok(
      // `emit(this, ...)` de core/element.ts sustituyó al antiguo `#emit(...)`
      // privado; se aceptan ambas formas.
      new RegExp(`(?:#emit|emit)\\(\\s*(?:this,\\s*)?["']${ev}["']`).test(src),
      `${ev} aparece en la documentacion pero no hay ningun emit(this, "${ev}")`,
    );
  }
});

test('is-invalid se engancha al evento nativo, no a checkValidity()', () => {
  // ElementInternals dispara `invalid` tanto en la llamada explicita como al enviar
  // el <form>. Envolver solo los metodos dejaria el submit sin avisar.
  assert.ok(
    /addEventListener\(\s*["']invalid["']/.test(src),
    'debe escuchar el evento `invalid` nativo para cubrir tambien el submit',
  );
});

test('#syncTag vuelve a enganchar los listeners al cambiar de <button> a <a>', () => {
  const m = /#syncTag\(\)\s*\{([\s\S]*?)\n    \}/.exec(src);
  assert.ok(m, 'debe existir #syncTag()');
  const cuerpo = m[1];
  assert.ok(/replaceWith\(fresh\)/.test(cuerpo), 'sigue reemplazando el nodo');
  for (const l of ['#boundFocus', '#boundBlur', '#boundClick']) {
    assert.ok(
      cuerpo.includes(l),
      `tras reemplazar el nodo hay que volver a poner ${l}: el listener se fue con el nodo viejo`,
    );
  }
});
