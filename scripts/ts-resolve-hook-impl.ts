/**
 * Implementación del hook. Corre en el hilo de carga de módulos, así que no
 * puede importar nada del proyecto: solo `node:*`.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (err) {
    // Solo se interviene cuando el fallo es «no existe» y el destino es un
    // `.js` del proyecto con gemelo `.ts`. Cualquier otro error se propaga.
    if (err?.code !== 'ERR_MODULE_NOT_FOUND' || !especificador.endsWith('.js')) throw err;
    const base = contexto.parentURL ?? pathToFileURL(process.cwd() + '/').href;
    const destino = new URL(especificador, base);
    if (destino.protocol !== 'file:') throw err;
    const ts = fileURLToPath(destino).replace(/\.js$/, '.ts');
    if (!existsSync(ts)) throw err;
    return { url: pathToFileURL(ts).href, shortCircuit: true, format: 'module-typescript' };
  }
}
