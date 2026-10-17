// login.test.ts — Guardián del contrato de <iswc-login>.
//
// Verifica que el componente cumple el estándar del kit (4 hermanos), que el
// preview declara demo + controls, que la doc tiene las 6 secciones y que
// reutiliza los componentes obligatorios en lugar de reinventarlos.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });
const RAIZ = join(new URL('../../', import.meta.url).pathname.replace(/^\//, ''));
const BASE = join(RAIZ, 'src', 'components', 'layout');
const leer = (ruta) => readFileSync(ruta, 'utf8');

test('login: existen los 4 hermanos del componente', () => {
  for (const ext of ['ts', 'scss', 'md', 'json']) {
    const ruta = join(BASE, 'login.' + ext);
    assert.ok(existsSync(ruta), 'falta ' + ruta);
  }
});

test('login: preview JSON declara demo con controls', () => {
  const json = JSON.parse(leer(join(BASE, 'login.json')));
  assert.equal(json['$schema'], 'iswc-preview/v1');
  assert.equal(json.tag, 'iswc-login');
  assert.equal(json.category, 'layout');
  const bloques = (json.sections ?? []).flatMap((s) => s.blocks ?? []);
  const demos = bloques.filter((b) => b.kind === 'demo');
  assert.ok(demos.length >= 1, 'debe haber al menos un bloque demo');
  assert.ok(demos.every((d) => Array.isArray(d.controls) && d.controls.length > 0), 'cada demo necesita controls');
});

test('login: la doc tiene las 6 secciones', () => {
  const md = leer(join(BASE, 'login.md'));
  for (const titulo of ['## Propósito', '## Cuándo usarlo', '## Cuándo no usarlo', '## Importación', '## Ejemplo mínimo', '## API']) {
    assert.ok(md.includes(titulo), 'falta la sección ' + titulo);
  }
});

test('login: está registrado en el manifest', () => {
  const manifest = leer(join(RAIZ, 'src', 'manifest.ts'));
  assert.ok(manifest.includes("tag: 'iswc-login'"), 'falta la entrada en src/manifest.ts');
  assert.ok(manifest.includes('components/layout/login.js'), 'el script del manifest no apunta a login.js');
});

test('login: reutiliza los componentes obligatorios', () => {
  const ts = leer(join(BASE, 'login.ts'));
  for (const dep of [
    '../forms/input.js',
    '../forms/select.js',
    '../forms/checkbox.js',
    '../actions/button.js',
    '../media/avatar.js',
    '../layout/dialog.js',
    '../layout/callout.js',
    '../feedback/toast.js',
    '../feedback/tooltip.js',
  ]) {
    assert.ok(ts.includes(dep), 'login.ts debe importar ' + dep);
  }
});

test('login: el preview carga el script compilado', () => {
  const html = leer(join(RAIZ, 'previews', 'layout', 'iswc-login.html'));
  assert.ok(html.includes('components/layout/login.js'), 'el preview no carga login.js');
  assert.ok(html.includes('iswc-login'), 'el preview no instancia el componente');
});

export default lista();
