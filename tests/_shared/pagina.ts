// @contexto INDICE.md · tests/_shared/README.md
// pagina.ts — corre un módulo del kit en Edge headless y devuelve lo que publique en `globalThis.__casos`.
//
// La entrada (TS de tests/_shared/paginas/) se empaqueta con esbuild igual que el build (alias del kit + `iswc:css`),
// se inyecta en una página en blanco y cada caso es una función async que devuelve `true` o un texto con el fallo.
// Sin servidor: todo va en un único `<script type="module">`.

import { join } from 'node:path';
import * as esbuild from 'esbuild';
import { aliasKit } from '../../src/cdn/build/alias.ts';
import { cssVirtual } from '../../src/cdn/build/css-virtual.ts';
import { cerrarChromium, lanzarChromium } from './navegador.ts';

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');

/** Resultado de un caso: `true` si pasó, o el motivo del fallo. */
type ResultadoCaso = true | string;

/** Empaqueta `entrada` (relativa a la raíz del kit) y corre sus casos en Edge headless. */
export async function correrCasos(entrada: string, html = '<!doctype html><html lang="es"><body></body></html>'): Promise<Record<string, ResultadoCaso>> {
  const salida = await esbuild.build({
    entryPoints: [join(RAIZ, entrada)],
    bundle: true,
    // `package.json#sideEffects` solo lista dist/: sin esto esbuild descarta los `import '…/x.js'` de efecto sobre src/
    // y los tags de la página quedan sin registrar (la prueba pasaría en vacío).
    ignoreAnnotations: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    plugins: [aliasKit(), cssVirtual()],
    logLevel: 'silent',
  });
  const codigo = salida.outputFiles[0]!.text;
  const navegador = await lanzarChromium();
  try {
    const pagina = await navegador.newPage();
    const errores: string[] = [];
    pagina.on('pageerror', (e) => errores.push(String(e.message)));
    await pagina.setContent(html);
    await pagina.addScriptTag({ content: codigo, type: 'module' });
    await pagina.waitForFunction(() => (globalThis as { __casos?: unknown }).__casos, null, { timeout: 30_000 });
    const res = await pagina.evaluate(async () => {
      const casos = (globalThis as unknown as { __casos: Record<string, () => Promise<true | string>> }).__casos;
      const out: Record<string, true | string> = {};
      for (const [nombre, caso] of Object.entries(casos)) {
        try {
          out[nombre] = await caso();
        } catch (e) {
          out[nombre] = `lanzó: ${(e as Error)?.stack ?? e}`;
        }
      }
      return out;
    });
    if (errores.length) res['(errores de página)'] = errores.join('\n');
    return res;
  } finally {
    await cerrarChromium(navegador);
  }
}
