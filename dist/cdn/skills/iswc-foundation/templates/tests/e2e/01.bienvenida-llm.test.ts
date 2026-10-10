// 01.bienvenida-llm.test.ts — el mismo flujo del modal pero dicho en lenguaje natural con Stagehand
// `act()` (modelo MiniMax). Muestra cómo se usa el LLM cuando un paso es difícil de localizar; el gate
// no depende de él: sin `dev-token.json` (ignorado por git; formato en dev-token.example.json) se salta.
//
//   W-CAT-03   el usuario pide abrir la explicación y el modal se abre
import { definirPruebas } from '../../src/vendor/iswc-root/tools/pruebas.ts';
import { abrir, esperar } from '../../scripts/gate/e2e/harness.ts';
import { credencialesMiniMax } from '../../scripts/gate/e2e/minimax.ts';

const llm = credencialesMiniMax();

export default definirPruebas([
  {
    nombre: 'bienvenida W-CAT-03 act() abre el modal en lenguaje natural',
    categoria: 'what',
    timeoutMs: 120_000,
    ...(llm ? {} : { saltar: 'sin dev-token.json con la clave de MiniMax (ver dev-token.example.json)' }),
    async correr({ expect }) {
      const s = await abrir('index.html', { llm: llm! });
      try {
        await s.stagehand.act('Haz clic en el botón «Ver cómo está hecha»');
        await esperar(s.page, () => !!document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot?.querySelector('#modal[open]'), 30_000);
        expect('modal abierto', true);
      } finally {
        await s.cerrar();
      }
    },
  },
]);
