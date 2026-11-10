// @contexto INDICE.md · tests/_shared/README.md
// deno-test.ts — adapta la forma `Deno.test(...)` al registrador común (`coleccionPruebas`).
//
//   const { test, lista } = coleccionPruebas({ categoria: 'what' });
//   const denoTest = denoTestCon(test);
//   denoTest({ name: 'x', ignore: !chromium, fn() { … } });
//   export default lista();
//
// category: "how"
import type { CuerpoT, OpcionesT } from '../../src/vendor-distributions/shared/schemas.ts';

type Registrar = (nombre: string, a?: OpcionesT | CuerpoT, b?: CuerpoT) => void;
/** `timeout` (ms) es propio del registrador común (no de Deno.test): el de la prueba, en vez del del archivo. */
type DenoDef = { name: string; fn: CuerpoT; ignore?: boolean; timeout?: number; sanitizeOps?: boolean; sanitizeResources?: boolean; sanitizeExit?: boolean };

export function denoTestCon(test: Registrar) {
  return (a: string | DenoDef, b?: CuerpoT | { ignore?: boolean }, c?: CuerpoT): void => {
    if (typeof a !== 'string') {
      if (a.ignore) test(a.name, { skip: 'ignore' }, a.fn);
      else test(a.name, a.timeout ? { timeout: a.timeout } : {}, a.fn);
      return;
    }
    if (typeof b === 'function') {
      test(a, b);
      return;
    }
    if (b?.ignore) test(a, { skip: 'ignore' }, c);
    else test(a, c);
  };
}
