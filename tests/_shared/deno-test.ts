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
type DenoDef = { name: string; fn: CuerpoT; ignore?: boolean; sanitizeOps?: boolean; sanitizeResources?: boolean; sanitizeExit?: boolean };

export function denoTestCon(test: Registrar) {
  return (a: string | DenoDef, b?: CuerpoT | { ignore?: boolean }, c?: CuerpoT): void => {
    if (typeof a !== 'string') {
      if (a.ignore) test(a.name, { skip: 'ignore' }, a.fn);
      else test(a.name, a.fn);
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
