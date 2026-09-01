// tests/theme-toggle-icon.test.ts
//
// Verifica que el componente <is-theme-toggle> sincroniza correctamente
// el icono del <is-check-icon-button> interno cuando cambia el tema.
//
// Bug original: el icono quedaba "pegado" al estado anterior porque
//   1. `is-check-icon-button.set checked(...)` usa `toggleAttribute()`,
//      que no dispara `attributeChangedCallback` si el atributo ya
//      estaba en el mismo valor. El icono del <is-icon> interno nunca
//      se actualizaba.
//   2. theme-toggle hacia `this.dark = next === 'dark'` en #onChange,
//      pero el atributo `checked` ya habia sido puesto por el handler
//      de click del check-icon-button, asique el #render posterior era
//      un no-op.
//
// Fix:
//   - theme-toggle ya no re-asigna `dark` en #onChange (redundante +
//     rompe la cadena de attributeChangedCallback).
//   - theme-toggle.#render() fuerza SIEMPRE el flujo removiendo y
//     re-añadiendo el atributo `checked` si ya estaba en el valor
//     deseado, garantizando que el icono cambie.
//   - Se expone un metodo publico `forceSync()` para re-sincronizar
//     desde fuera (p.ej. cuando llega un postMessage `is-context` y
//     data-theme ya estaba en el mismo valor, sin disparar el observer).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const themeToggleSrc = readFileSync(
  join(root, 'src/components/feedback/theme-toggle.ts'),
  'utf8',
);

test('theme-toggle elimina la re-asignacion redundante de `dark` en #onChange', () => {
  // Debe haber al menos un `this.#render()` al final de #onChange para
  // forzar la sincronizacion del icono.
  const m = /#onChange\s*=\s*\(e\)\s*=>\s*\{[\s\S]*?this\.#render\(\)/.exec(themeToggleSrc);
  assert.ok(m, '#onChange debe llamar a this.#render() al final');

  // NO debe re-asignar `this.dark = next === 'dark'` (eso era el bug).
  const onChangeMatch = /#onChange\s*=\s*\(e\)\s*=>\s*\{[\s\S]*?\n\s*\};/m.exec(themeToggleSrc);
  assert.ok(onChangeMatch, '#onChange definido');
  assert.ok(
    !/this\.dark\s*=\s*next\s*===\s*['"]dark['"]/.test(onChangeMatch[0]),
    '#onChange no debe re-asignar `this.dark = next === "dark"` (eso era redundante y rompia la propagacion del check-icon-button)',
  );
});

test('theme-toggle.#render() fuerza el flujo attributeChangedCallback', () => {
  // Debe detectar el caso "mismo estado" y forzar la re-asignacion.
  // Buscar el método privado `#render() {` (NO 'attributeChangedCallback' ni 'disconnectedCallback').
  const re = /(^|\n)\s*#render\s*\(\s*\)\s*\{/m;
  const m = re.exec(themeToggleSrc);
  assert.ok(m, '#render() existe');
  const start = themeToggleSrc.indexOf('{', m.index);
  // Contar profundidad de {} a partir de start+1
  let depth = 1;
  let j = start + 1;
  while (j < themeToggleSrc.length && depth > 0) {
    const c = themeToggleSrc[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  const block = themeToggleSrc.slice(start, j);

  assert.ok(
    /btn\.hasAttribute\(['"]checked['"]\)/.test(block),
    '#render() debe inspeccionar hasAttribute(checked)',
  );
  assert.ok(
    /removeAttribute\(['"]checked['"]\)/.test(block),
    '#render() debe poder removeAttribute(checked) para forzar el flujo',
  );
  assert.ok(
    /setAttribute\(['"]checked['"]\s*,\s*['"]['"]\)/.test(block),
    '#render() debe re-añadir `checked` con setAttribute() para forzar el flujo',
  );
});

test('theme-toggle expone forceSync() publico para re-sincronizar desde fuera', () => {
  assert.ok(
    /forceSync\s*\(\s*\)\s*\{[\s\S]*?this\.#render\(\)/.test(themeToggleSrc),
    'debe existir un metodo publico forceSync() que llame a #render()',
  );
  // Ademas forceSync debe leer el tema del container (no del atributo
  // dark) porque en sincronizaciones externas `dark` puede no haber
  // cambiado formalmente.
  const fs = /forceSync\s*\(\s*\)\s*\{[\s\S]*?\n\s*\}/m.exec(themeToggleSrc);
  assert.ok(fs && /readTheme\(/.test(fs[0]),
    'forceSync() debe releer el tema del container via readTheme()');
});

// El evento ya no se dispara a mano sobre `document`: `emit()` sale con
// bubbles + composed, así que un solo `is-theme-change` desde el host llega
// igual a los listeners globales. Disparar los dos los invocaba dos veces.
test('theme-toggle emite `is-theme-change` y llega a document', () => {
  assert.ok(
    /emit\(this, ['"]is-theme-change['"]/.test(themeToggleSrc),
    'el toggle debe emitir is-theme-change',
  );
  assert.ok(
    !/document\.dispatchEvent\(new CustomEvent\(['"]is-theme-change['"]/.test(themeToggleSrc),
    'no debe además dispararlo a mano en document: llegaría duplicado',
  );
});

test('preview-chrome ya no re-asigna toggle.dark en applyTheme (rompia la cadena)', () => {
  const previewSrc = readFileSync(
    join(root, 'scripts/preview-chrome.js'),
    'utf8',
  );
  // El applyTheme no debe contener `toggle.dark = ...` como codigo
  // ejecutable (puede aparecer en comentarios si lo explicamos).
  // Usamos el mismo truco de balance de {} del test anterior para
  // quedarnos SOLO con el cuerpo de la funcion applyTheme.
  const idx = previewSrc.indexOf('const applyTheme');
  assert.ok(idx > -1, 'const applyTheme existe en preview-chrome.js');
  const start = previewSrc.indexOf('{', idx);
  let depth = 1;
  let j = start + 1;
  while (j < previewSrc.length && depth > 0) {
    const c = previewSrc[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    j++;
  }
  const block = previewSrc.slice(start, j);

  // Eliminar lineas de comentario para no contar menciones en comentarios.
  const code = block
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  assert.ok(
    !/\btoggle\.dark\s*=/.test(code),
    'applyTheme() no debe asignar `toggle.dark = ...` en su cuerpo (rompe la propagacion del icono)',
  );
  // En su lugar debe llamar a forceSync() para forzar el re-render.
  assert.ok(
    /toggle\.forceSync\(\)/.test(code),
    'applyTheme() debe llamar a toggle.forceSync() en su lugar',
  );
});
