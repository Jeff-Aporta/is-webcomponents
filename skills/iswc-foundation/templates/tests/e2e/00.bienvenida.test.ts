// 00.bienvenida.test.ts — caso base e2e (Stagehand DETERMINISTA, sin LLM): la app arranca, muestra la
// bienvenida y el modal se abre y se cierra como lo haría un usuario. Caja negra: solo lo que se ve.
//
//   W-PLAT-12  la app arranca sin errores de consola y queda marcada como lista
//   W-CAT-02   el título dice «Hola mundo» y hay 4 tarjetas
//   W-CAT-03   «Ver cómo está hecha» abre el modal y lo avisa; «Entendido» lo cierra y lo avisa
//   W-ICO-04   los íconos de la bienvenida se piden a la carpeta local de la app, no a la API de Iconify
import { definirPruebas } from '../../src/vendor/iswc-root/tools/ISPruebas.ts';
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
  {
    nombre: 'bienvenida W-ICO-04 los íconos salen de la carpeta local de la app, no de la API',
    categoria: 'what',
    async correr({ expect, saltar }) {
      const conCadena = await s.page.evaluate(() => !!(globalThis as { __ISWC_ICONS__?: { oyentes?: unknown } }).__ISWC_ICONS__?.oyentes, undefined);
      if (!conCadena) saltar('el kit pineado aún no trae el mapa local de íconos (registerIcons): sube el pin');
      await esperar(s.page, () => {
        const hola = document.querySelector('__PREFIJO__-app')?.shadowRoot?.querySelector('__PREFIJO__-hola')?.shadowRoot;
        const iconos = [...(hola?.querySelectorAll('.tarjetas iswc-icon') ?? [])];
        return iconos.length === 4 && iconos.every((i) => !!i.shadowRoot?.querySelector('svg'));
      });
      const red = await s.page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name), undefined);
      expect('pidió el mapa de la app', red.some((u: string) => /\/assets\/iconify\.json\?v=/.test(u)), red.join(' '));
      expect('íconos desde la carpeta local', red.some((u: string) => /\/assets\/iconify\/mdi\/[^/]+\.svg$/.test(u)), red.join(' '));
      expect('ningún ícono a la API', !red.some((u: string) => u.includes('api.iconify.design')), red.filter((u: string) => u.includes('iconify')).join(' '));
    },
  },
], {
  antes: async () => { s = await abrir('index.html'); },
  despues: async () => { await s?.cerrar(); },
});
