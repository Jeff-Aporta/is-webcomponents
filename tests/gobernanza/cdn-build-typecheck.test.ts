/**
 * Guardián: la superficie de build vendorizable (`src/cdn/build` y su copia
 * publicada `dist/cdn/build`) pasa `deno check` (strict) con 0 errores.
 * Los consumidores is-* (p. ej. el ISW) la copian tal cual y la typecheckean.
 *
 *   B1 src/cdn/build/*.ts sin errores de tipos
 *   B2 dist/cdn/build/*.ts sin errores de tipos
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


function check(dir: string): void {
  const files = readdirSync(dir).filter((n) => n.endsWith('.ts')).map((n) => `${dir}/${n}`);
  const r = new Deno.Command(Deno.execPath(), { args: ['check', '-q', ...files], stdout: 'piped', stderr: 'piped' }).outputSync();
  assert.equal(r.code, 0, new TextDecoder().decode(r.stderr));
}

test('B1 src/cdn/build typecheck', () => check('src/cdn/build'));
test('B2 dist/cdn/build typecheck', () => check('dist/cdn/build'));

export default lista();
