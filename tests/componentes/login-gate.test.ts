// login-gate.test.ts — Guardián del contrato de <iswc-login-gate>.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });
const RAIZ = join(new URL('../../', import.meta.url).pathname.replace(/^\//, ''));
const BASE = join(RAIZ, 'src', 'components', 'layout');
const leer = (ruta: string) => readFileSync(ruta, 'utf8');

test('login-gate: existen los 4 hermanos del componente', () => {
  for (const ext of ['ts', 'scss', 'md', 'json']) {
    const ruta = join(BASE, 'login-gate.' + ext);
    assert.ok(existsSync(ruta), 'falta ' + ruta);
  }
});

test('login-gate: preview JSON declara demo con controls', () => {
  const json = JSON.parse(leer(join(BASE, 'login-gate.json')));
  assert.equal(json['$schema'], 'iswc-preview/v1');
  assert.equal(json.tag, 'iswc-login-gate');
  assert.equal(json.category, 'layout');
  const bloques = (json.sections ?? []).flatMap((s: any) => s.blocks ?? []);
  const demos = bloques.filter((b: any) => b.kind === 'demo');
  assert.ok(demos.length >= 1, 'debe haber al menos un bloque demo');
  assert.ok(demos.every((d: any) => Array.isArray(d.controls) && d.controls.length > 0), 'cada demo necesita controls');
});

test('login-gate: la doc tiene las 6 secciones', () => {
  const md = leer(join(BASE, 'login-gate.md'));
  for (const titulo of ['## Propósito', '## Cuándo usarlo', '## Cuándo no usarlo', '## Importación', '## Ejemplo mínimo', '## API']) {
    assert.ok(md.includes(titulo), 'falta la sección ' + titulo);
  }
});

test('login-gate: está registrado en el manifest', () => {
  const manifest = leer(join(RAIZ, 'src', 'manifest.ts'));
  assert.ok(manifest.includes("tag: 'iswc-login-gate'"), 'falta la entrada en src/manifest.ts');
  assert.ok(manifest.includes('components/layout/login-gate.js'), 'el script del manifest no apunta a login-gate.js');
});

test('login-gate: reutiliza <iswc-login>', () => {
  const ts = leer(join(BASE, 'login-gate.ts'));
  assert.ok(ts.includes("import './login.js'"), 'debe importar <iswc-login> (reuso, no reinventar)');
  assert.ok(ts.includes('<iswc-login id="login"'), 'debe montar <iswc-login> en la cortina');
});

test('login-gate: conmuta cortina/protegido por logged', () => {
  const ts = leer(join(BASE, 'login-gate.ts'));
  assert.ok(ts.includes("get logged"), 'debe exponer la propiedad logged');
  assert.ok(ts.includes('this.#curtain.hidden = logged'), 'cortina oculta con logged');
  assert.ok(ts.includes('this.#protected.hidden = !logged'), 'protegido revelado con logged');
});

export default lista;
