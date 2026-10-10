/**
 * harness.ts — Stagehand estándar de las apps iswc (UI como caja negra, DETERMINISTA).
 *
 * El gate no usa `act()`/`extract()` (LLM): opera la página con utilidades que atraviesan shadow
 * roots, porque el locator de Stagehand no los atraviesa. Lo que no es UI (API, datos) se verifica
 * con los controladores de cliente de la app, nunca con `fetch` a mano.
 *
 * Uso en `tests/e2e/<NN>.<tema>.test.ts`:
 *
 *   import { definirPruebas } from '../../src/vendor/iswc-root/tools/pruebas.ts';
 *   import { abrir, enSombra } from '../../scripts/gate/e2e/harness.ts';
 *   let s: Awaited<ReturnType<typeof abrir>>;
 *   export default definirPruebas([
 *     { nombre: 'bienvenida W-CAT-02 título', categoria: 'what', async correr({ expect }) {
 *       expect('título', (await enSombra(s.page, ['__PREFIJO__-app', '__PREFIJO__-hola', '#titulo', 'h1'], 'text')) === 'Hola mundo');
 *       expect('sin errores de consola', s.errores().length === 0, s.errores().join(' | '));
 *     } },
 *   ], { antes: async () => { s = await abrir('index.html'); }, despues: async () => { await s?.cerrar(); } });
 *
 * Reglas: cada prueba afirma algo o se salta con motivo (nunca un verde vacío); se limpia lo que se
 * crea; credenciales fuera del repo (falta = salto con motivo).
 */
import { localBrowser, Stagehand } from '@browserbasehq/stagehand';
import { type CredencialesMiniMax, crearGeneradorMiniMax } from './minimax.ts';

type Pagina = {
  goto(url: string, o?: { waitUntil?: string }): Promise<unknown>;
  evaluate<T, A>(fn: (a: A) => T, arg: A): Promise<T>;
  on(evento: string, fn: (m: { type(): string; text(): string }) => void): void;
};

/**
 * Abre la ruta (relativa a la raíz de la app) y espera a que el arranque marque `data-app-ready`.
 * `llm`: credenciales de `credencialesMiniMax()` para usar `stagehand.act()`/`extract()` (fuera del gate).
 */
export async function abrir(ruta = 'index.html', opciones: { llm?: CredencialesMiniMax } = {}) {
  const base = Deno.env.get('E2E_BASE_URL') ?? 'http://127.0.0.1:8851/';
  const browser = await localBrowser.launch({ headless: Deno.env.get('E2E_HEADLESS') !== 'false' });
  // Stagehand 4.1 exige adjuntar el navegador antes de usar su contexto. Sin modelo por defecto: el gate
  // no usa act()/extract(); con `llm`, el modelo es MiniMax con la clave de dev-token.json.
  const stagehand = await Stagehand.create({
    browser,
    ...(opciones.llm ? { model: { generate: crearGeneradorMiniMax(opciones.llm) }, domSettleTimeoutMs: 600 } : {}),
  } as Parameters<typeof Stagehand.create>[0]);
  const [page] = (await browser.context.pages()) as unknown as Pagina[];
  if (!page) throw new Error('harness: el navegador no abrió página');
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(new URL(ruta, base).href, { waitUntil: 'load' });
  // La app marca `data-app-ready` al terminar el arranque (o a los 6 s por su watchdog).
  await esperar(page, () => document.documentElement.hasAttribute('data-app-ready'), 15_000);
  return {
    page,
    stagehand,
    errores: () => [...errores],
    cerrar: async () => {
      await stagehand.close?.().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/** Sondea `cond` en la página hasta que sea verdadera (timeout en ms). */
export async function esperar(page: Pagina, cond: () => boolean, timeoutMs = 10_000): Promise<void> {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    if (await page.evaluate((c: string) => Boolean(new Function(`return (${c})()`)()), cond.toString())) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`harness: no se cumplió en ${timeoutMs} ms: ${cond.toString().slice(0, 120)}`);
}

/**
 * Atraviesa shadow roots: `ruta` = selectores encadenados (cada uno dentro del shadow del anterior).
 * `que`: 'text' (textContent recortado) | 'existe' | 'click' (dispara click en el elemento).
 */
export function enSombra(page: Pagina, ruta: string[], que: 'text' | 'existe' | 'click' = 'existe'): Promise<string | boolean | null> {
  return page.evaluate(({ ruta, que }) => {
    let nodo: Element | null = null;
    let raiz: ParentNode = document;
    for (const sel of ruta) {
      nodo = raiz.querySelector(sel);
      if (!nodo) return que === 'existe' ? false : null;
      raiz = (nodo as Element & { shadowRoot: ShadowRoot | null }).shadowRoot ?? nodo;
    }
    if (que === 'click') {
      (nodo as HTMLElement).click();
      return true;
    }
    return que === 'text' ? (nodo?.textContent ?? '').trim() : true;
  }, { ruta, que });
}
