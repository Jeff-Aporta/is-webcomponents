/**
 * ts-resolve-hook.ts — Deja que Node importe la fuente TypeScript del kit.
 *
 * EL PROBLEMA. Un módulo ES pide siempre `./foo.js`, aunque en disco el fichero
 * sea `foo.ts`: es lo que exige el resolutor de módulos y lo que hace que el
 * mismo import valga en el navegador tras compilar. esbuild y el servidor de
 * desarrollo lo entienden; `node` no, y falla con `Cannot find module`.
 *
 * Eso rompía los tests que importan un componente directamente desde `src/`
 * —31 ficheros de la suite— en cuanto el primer componente pasó a `.ts`.
 *
 * LA SOLUCIÓN. Un hook de resolución que, cuando el `.js` pedido no existe pero
 * su gemelo `.ts` sí, devuelve el `.ts`. Node 22 ya sabe ejecutar TypeScript
 * quitando los tipos, así que no hace falta transpilar nada aquí.
 *
 * No se toca el orden inverso: si existe el `.js`, gana el `.js`. Así un módulo
 * todavía sin migrar sigue resolviéndose como siempre y la migración puede ir
 * fichero a fichero.
 *
 * Uso:
 *   node --import ./scripts/ts-resolve-hook.ts --test tests/*.test.mjs
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-resolve-hook-impl.ts', import.meta.url);

export { pathToFileURL };
