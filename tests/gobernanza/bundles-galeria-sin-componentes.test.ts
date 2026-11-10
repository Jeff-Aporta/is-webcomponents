/**
 * Guardián WHAT: un bundle de galería no lleva componentes dentro. Dentro de dist/scripts, dist/pages o dist/previews
 * el componente sería una SEGUNDA copia de su clase que registra el tag primero, y el bundle del CDN ya no puede
 * pisarlo: menú sin panel, <dialog> del navegador, velo sin blur, estado partido entre dos clases.
 *   G1 ningún bundle de galería registra un `iswc-*`; los importa de `dist/cdn` (`componentes-externos` en bundle-scripts.mjs).
 */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const DIST = join(import.meta.dirname, '..', '..', 'dist');
/**
 * Forma minificada de un registro: `defineElement('iswc-x', Clase, 'IswcX')` o el `static tag = 'iswc-x'` del molde
 * IswcElement (esbuild lo baja a `__publicField(Clase, "tag", "iswc-x")` o lo deja como `static (?:override )?tag="iswc-x"`).
 */
const REGISTRO = /"iswc-[a-z0-9-]+",[\w$]+,"Iswc[A-Za-z0-9]*"|[\w$]+\([\w$]+,"tag","iswc-[a-z0-9-]+"\)|static (?:override )?tag="iswc-[a-z0-9-]+"/g;

test('galeria: G1 ningún bundle de galería registra un componente', async () => {
  const culpables: string[] = [];
  for (const carpeta of ['scripts', 'pages', 'previews']) {
    const dir = join(DIST, carpeta);
    for (const nombre of await readdir(dir, { recursive: true })) {
      if (!nombre.endsWith('.min.js')) continue;
      const hallados = (await readFile(join(dir, nombre), 'utf8')).match(REGISTRO);
      if (hallados) culpables.push(`${carpeta}/${nombre}: ${hallados.join(' ')}`);
    }
  }
  assert.deepEqual(culpables, []);
});

export default lista();
