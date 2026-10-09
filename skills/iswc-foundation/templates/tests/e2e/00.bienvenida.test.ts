// 00.bienvenida.test.ts — caso base e2e (Stagehand DETERMINISTA, sin LLM): la app arranca, muestra la
// bienvenida y el modal se abre y se cierra como lo haría un usuario. Caja negra: solo lo que se ve.
//
//   W-PLAT-12  la app arranca sin errores de consola y queda marcada como lista
//   W-CAT-02   el título dice «Hola mundo» y hay 4 tarjetas
//   W-CAT-03   «Ver cómo está hecha» abre el modal y lo avisa; «Entendido» lo cierra y lo avisa
import { definirPruebas } from '../../src/vendor/iswc-root/tools/pruebas.ts';
import { abrir, enSombra, esperar } from '../../scripts/gate/e2e/harness.ts';

let s: Awaited<ReturnType<typeof abrir>>;
const HOLA = ['__PREFIJO__-app', '__PREFIJO__-hola'];
const modalAbierto = () => !!document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot?.querySelector('#modal[open]');

export default definirPruebas([
  {
    nombre: 'bienvenida W-PLAT-12 la app arranca lista y sin errores de consola',
    categoria: 'what',
    async correr({ expect }) {
      expect('marcada como lista', await s.page.evaluate(() => document.documentElement.hasAttribute('data-app-ready'), undefined));
      expect('shell montado', (await enSombra(s.page, ['__PREFIJO__-app', '.barra'])) === true);
      expect('sin errores de consola', s.errores().length === 0, s.errores().join(' | '));
    },
  },
  {
    nombre: 'bienvenida W-CAT-02 título «Hola mundo» y cuatro tarjetas',
    categoria: 'what',
    async correr({ eq }) {
      await esperar(s.page, () => !!document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot?.querySelector('#titulo')?.shadowRoot?.querySelector('h1'));
      eq('título', await enSombra(s.page, [...HOLA, '#titulo', 'h1'], 'text'), 'Hola mundo');
      eq('tarjetas', await s.page.evaluate(() => document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot?.querySelectorAll('.tarjetas iswc-card').length, undefined), 4);
    },
  },
  {
    nombre: 'bienvenida W-CAT-03 el botón abre el modal y Entendido lo cierra',
    categoria: 'what',
    async correr({ eq, expect }) {
      await s.page.evaluate(() => {
        const g = globalThis as { __modal?: boolean[] };
        g.__modal = [];
        document.addEventListener('__PREFIJO__-hola-modal', (e) => g.__modal!.push((e as CustomEvent<{ abierto: boolean }>).detail.abierto));
      }, undefined);
      expect('cerrado al empezar', !(await s.page.evaluate(modalAbierto, undefined)));
      // Un usuario pulsa el <button> interno del iswc-button (el host no dispara iswc-click).
      await enSombra(s.page, [...HOLA, '#abrir-modal', 'button'], 'click');
      await esperar(s.page, modalAbierto);
      expect('abierto', true);
      await enSombra(s.page, [...HOLA, '#cerrar-modal', 'button'], 'click');
      await esperar(s.page, () => !document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot?.querySelector('#modal[open]'));
      eq('avisó abrir y cerrar', await s.page.evaluate(() => (globalThis as { __modal?: boolean[] }).__modal, undefined), [true, false]);
    },
  },
], {
  antes: async () => { s = await abrir('index.html'); },
  despues: async () => { await s?.cerrar(); },
});
