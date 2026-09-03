// harness.ts: arranque y utilidades compartidas de los tests E2E de
// is-webcomponents con Stagehand. Port del esquema de
// PatyIA/app/src/utils/health/e2e/lib/harness.ts adaptado a la galeria:
// sin login ni ISS — el "estado" es el tag del componente (deep link ?s=).
// TODO el codigo esta fuertemente tipado (tsc strict).
import { localBrowser, Stagehand } from '@browserbasehq/stagehand';
import type { Page, Locator, StagehandCreateOptions } from '@browserbasehq/stagehand';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENV, e2eDir, faltanRequisitos } from './env.ts';
import { crearGeneradorMiniMax } from './minimax.ts';
import { estadoDe } from './estados.ts';
import { levantarServidor, type ServidorE2E } from './server.ts';
import type {
  CtxE2E, RegistroConsola, RastroCodeMirror, EditorIsCode,
} from './tipos.ts';

export { ENV, e2eDir, faltanRequisitos };
export type { Page, Locator };

// -- servidor controlado -----------------------------------------------------
// Los tests SIEMPRE levantan su propio servidor (puerto indicado por
// E2E_PORT/E2E_HOST, 0 = puerto libre) y lo apagan al cerrar el contexto o al
// salir el proceso: nunca se deja un server vivo ni se colisiona con otros.
let servidor: ServidorE2E | null = null;
let promesaBase: Promise<string> | null = null;
let baseResuelta: string = ENV.baseUrl;

function apagarServidorSync(): void {
  if (servidor) {
    const s = servidor;
    servidor = null;
    void s.cerrar();
  }
}

/** URL base ya resuelta (autoservidor o E2E_BASE_URL externa). */
export function baseUrlResuelta(): string {
  return baseResuelta;
}

/**
 * Garantiza un servidor para la sesion de tests:
 *  - si hay E2E_BASE_URL externa, se usa tal cual (sin levantar nada);
 *  - si no, levanta el autoservidor en E2E_PORT (0 = libre) y lo apaga con
 *    `apagarServidor()` / hooks de proceso. Si el puerto indicado está
 *    ocupado, falla con aviso claro (nunca se apropia del puerto de otro).
 */
export async function asegurarServidor(): Promise<string> {
  if (process.env.E2E_BASE_URL) {
    baseResuelta = ENV.baseUrl;
    return baseResuelta;
  }
  if (promesaBase) return promesaBase;
  promesaBase = (async () => {
    try {
      const sv = await levantarServidor({ puerto: ENV.puerto, host: ENV.host });
      servidor = sv;
      baseResuelta = sv.url;
      const cerrarUnaVez = (codigo: number): void => {
        apagarServidorSync();
        process.exit(codigo);
      };
      process.once('exit', () => apagarServidorSync());
      process.once('SIGINT', () => cerrarUnaVez(130));
      process.once('SIGTERM', () => cerrarUnaVez(143));
      console.log(`[e2e] servidor local levantado en ${sv.url} (E2E_PORT=${ENV.puerto || 'libre'})`);
      return sv.url;
    } catch (e) {
      promesaBase = null;
      const err = e as NodeJS.ErrnoException;
      if (err?.code === 'EADDRINUSE') {
        throw new Error(
          `E2E: el puerto ${ENV.puerto} ya está en uso (otro servicio). ` +
          `Indica otro puerto con E2E_PORT (p. ej. 8450) o apunta a un host ya ` +
          `levantado con E2E_AUTOSERVE=0 E2E_BASE_URL=http://127.0.0.1:<puerto>/index.html`,
        );
      }
      throw e;
    }
  })();
  return promesaBase;
}

/** Apaga el autoservidor si este proceso lo levantó (idempotente). */
export async function apagarServidor(): Promise<void> {
  if (servidor) {
    const s = servidor;
    servidor = null;
    await s.cerrar();
    console.log('[e2e] servidor local apagado');
  }
  promesaBase = null;
}

// -- utilidades --------------------------------------------------------------

export function b64urlDe(objeto: unknown): string {
  const json = JSON.stringify(objeto);
  return Buffer.from(json, 'utf8').toString('base64url');
}

/** URL de la galeria para un tag del catalogo (null = home). */
export function urlDeTag(tag: string | null): string {
  return tag ? `${baseResuelta}?s=${estadoDe(tag)}` : baseResuelta;
}

export async function esperarMs(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

interface OpcionesEspera {
  ms?: number;
}

/** Espera a que un selector exista y sea visible. Devuelve false al agotar. */
export async function esperarVisible(
  page: Page,
  selector: string,
  { ms = ENV.esperaMs }: OpcionesEspera = {},
): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      const n = await page.locator(selector).count();
      if (n > 0 && (await page.locator(selector).first().isVisible().catch(() => false))) {
        return true;
      }
    } catch {
      /* reintentar */
    }
    await esperarMs(250);
  }
  return false;
}

/** Espera a que un selector contenga cierto texto (pierce de shadow incluido). */
export async function esperarTexto(
  page: Page,
  selector: string,
  fragmento: string,
  { ms = ENV.esperaMs }: OpcionesEspera = {},
): Promise<boolean> {
  const fin = Date.now() + ms;
  let ultimo = '';
  while (Date.now() < fin) {
    try {
      ultimo = (((await page.locator(selector).innerText().catch(() => '')) ?? '').trim()).normalize('NFC');
      if (ultimo.includes(fragmento)) return true;
    } catch {
      /* reintentar */
    }
    await esperarMs(250);
  }
  return false;
}

/** Texto visible de un selector ('' si no existe). */
export async function texto(page: Page, selector: string): Promise<string> {
  try {
    const n = await page.locator(selector).count();
    if (!n) return '';
    return (((await page.locator(selector).first().innerText().catch(() => '')) ?? '').trim()).normalize('NFC');
  } catch {
    return '';
  }
}

const CLICABLES = 'is-button, button, a[role="tab"], [role="tab"]:not(a), is-dropdown-item, [role="switch"], [role="menuitem"]';

function escCssAtributo(fragmento: string): string {
  return String(fragmento).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function clicSeguro(locator: Locator): Promise<boolean> {
  let ultimo: unknown = null;
  for (let i = 1; i <= 3; i++) {
    try {
      await locator.click();
      return true;
    } catch (e) {
      ultimo = e;
      await esperarMs(1200 * i);
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
}

function selectorAtributo(fragmento: string): string {
  const f = escCssAtributo(fragmento);
  return `[title*="${f}"], [aria-label*="${f}"]`;
}

export interface BotonVisible {
  i: number;
  texto: string;
}

/** Botones/pestanas (con su texto visible); penetra shadow roots. */
export async function botones(page: Page, contenedor: string | null = null): Promise<BotonVisible[]> {
  const sel = contenedor ? `${contenedor} ${CLICABLES}` : CLICABLES;
  const total = await page.locator(sel).count().catch(() => 0);
  const out: BotonVisible[] = [];
  for (let i = 0; i < total; i++) {
    const l = page.locator(sel).nth(i);
    let t = '';
    try {
      t = (((await l.innerText().catch(() => '')) ?? '').trim()).normalize('NFC');
    } catch {
      /* siguiente */
    }
    out.push({ i, texto: t });
  }
  return out;
}

export async function hayBotonConTexto(
  page: Page,
  etiqueta: string,
  { exacto = false, contenedor = null }: { exacto?: boolean; contenedor?: string | null } = {},
): Promise<boolean> {
  const sel = contenedor ? `${contenedor} ${CLICABLES}` : CLICABLES;
  const total = await page.locator(sel).count().catch(() => 0);
  for (let i = 0; i < total; i++) {
    const l = page.locator(sel).nth(i);
    const t = (((await l.innerText().catch(() => '')) ?? '').trim()).normalize('NFC');
    if (exacto ? t === etiqueta : t.includes(etiqueta)) return true;
  }
  const porAtributo = await page.locator(selectorAtributo(etiqueta)).count().catch(() => 0);
  return porAtributo > 0;
}

/** Busca entre los elementos clicables el primero cuyo texto coincida y hace clic. */
export async function clicBotonConTexto(
  page: Page,
  contenedor: string | null,
  etiqueta: string,
  { exacto = false }: { exacto?: boolean } = {},
): Promise<boolean> {
  const sel = contenedor ? `${contenedor} ${CLICABLES}` : CLICABLES;
  const total = await page.locator(sel).count().catch(() => 0);
  for (let i = 0; i < total; i++) {
    const l = page.locator(sel).nth(i);
    const t = (((await l.innerText().catch(() => '')) ?? '').trim()).normalize('NFC');
    if (exacto ? t === etiqueta : t.includes(etiqueta)) {
      await clicSeguro(l);
      return true;
    }
  }
  const porAtributo = page.locator(selectorAtributo(etiqueta));
  const n = await porAtributo.count().catch(() => 0);
  if (n > 0) {
    await clicSeguro(porAtributo.first());
    return true;
  }
  return false;
}

/** Clic en un item del nav de la galeria (boton con data-tag). */
export async function clicTagNav(page: Page, tag: string): Promise<boolean> {
  const l = page.locator(`#shellNav .shell-nav__item[data-tag="${tag}"]`);
  const n = await l.count().catch(() => 0);
  if (!n) return false;
  await clicSeguro(l.first());
  return true;
}

// -- consola y rastro --------------------------------------------------------

/** Registra la consola del navegador (evento `console` de Stagehand, CDP). */
export async function vigilarConsola(page: Page): Promise<RegistroConsola[]> {
  const eventos: RegistroConsola[] = [];
  await page.on('console', (ev: unknown) => {
    eventos.push({
      tipo: String((ev as { params?: { type?: unknown } })?.params?.type ?? 'log'),
      texto: resumirConsola(ev),
    });
  });
  return eventos;
}

function resumirConsola(ev: unknown): string {
  try {
    const p = (ev as { params?: { type?: string; args?: Array<{ value?: unknown; description?: string }> } })?.params ?? {};
    const args = (p.args ?? []).map((a) => {
      if (a.value !== undefined) return JSON.stringify(a.value).slice(0, 260);
      if (a.description) return String(a.description).slice(0, 260);
      return JSON.stringify(a).slice(0, 140);
    });
    return `[${p.type ?? ''}] ${args.join(' ')}`.slice(0, 600);
  } catch {
    return JSON.stringify(ev).slice(0, 400);
  }
}

/** Errores de consola (type error) de los registros capturados. */
export function problemasDeConsola(eventos: RegistroConsola[]): RegistroConsola[] {
  return eventos.filter((ev) => ev.tipo === 'error');
}

/**
 * Rastro de CodeMirror en la pagina cargada (el "ataque" de la migracion
 * nativa): nodos .CodeMirror/cm-s-*, global CodeMirror, y recursos cargados
 * (performance resource entries + tags link/script) que apunten a codemirror.
 * Stagehand v4 no expone peticiones de red (solo console); el rastro por DOM
 * y resource entries cubre la afirmacion sin red.
 */
export async function rastroCodeMirror(page: Page): Promise<RastroCodeMirror> {
  return (await page.evaluate(() => {
    const esCM = (u: unknown): boolean => /codemirror|runmode|material-darker\.min\.css|mdn-like/.test(String(u ?? ''));
    const recursos: string[] = performance.getEntriesByType('resource')
      .map((e) => e.name)
      .filter(esCM);
    const tags: string[] = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
      .map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
      .filter(esCM);
    const nodos = [...document.querySelectorAll('*')]
      .filter((el) => /(^|\s)(CodeMirror|cm-s-|cm-editor)(\s|$)/.test(String((el as HTMLElement).className))).length;
    const cmGlobal = typeof (globalThis as unknown as Record<string, unknown>).CodeMirror;
    return { nodos, global: cmGlobal, recursos, tags, total: nodos + recursos.length + tags.length };
  })) as RastroCodeMirror;
}

export function guardarArtefacto(nombre: string, bytes: Uint8Array): string {
  mkdirSync(ENV.artefactos, { recursive: true });
  const p = path.join(ENV.artefactos, nombre);
  writeFileSync(p, bytes);
  return p;
}

/** Texto plano del arbol de accesibilidad (penetra todos los shadow roots). */
export async function arbolTexto(page: Page): Promise<string> {
  const s = await (page as unknown as { snapshot?: (o?: object) => Promise<{ formattedTree?: string } | null> })
    .snapshot?.({ includeIframes: true }).catch(() => null);
  return (s?.formattedTree ?? '').normalize('NFC');
}

/** Evidencia: captura PNG + arbol, devuelve rutas. */
export async function evidencia(page: Page, nombre: string): Promise<{ png: string; arbol: string }> {
  const bytes = await (page as unknown as { screenshot?: (o?: object) => Promise<Uint8Array> })
    .screenshot?.().catch(() => new Uint8Array()) ?? new Uint8Array();
  const ruta = guardarArtefacto(`${nombre}.png`, bytes);
  const arbol = await arbolTexto(page);
  guardarArtefacto(`${nombre}.arbol.txt`, Buffer.from(arbol, 'utf8'));
  return { png: ruta, arbol };
}

// -- galeria: contenido ------------------------------------------------------

/**
 * ¿La galeria tiene contenido montado para el preview actual? El preview de
 * un componente controlado monta en light DOM dentro de #previewHost
 * (is-split-panel.page > is-main.main > section.section ...). El home monta
 * su propia pagina (idem). Un host vacio o con solo el placeholder = no listo.
 */
export async function contenidoCargado(page: Page): Promise<boolean> {
  try {
    const r = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      if (!host || host.hidden) return false;
      const main = host.querySelector('is-main.main');
      const seccion = host.querySelector('section.section, [data-section]');
      const largo = (host.textContent ?? '').trim().length;
      return !!((main || seccion) && largo > 60);
    });
    return !!r;
  } catch {
    return false;
  }
}

/** Espera a que el preview del tag este montado (o el home si tag es null). */
export async function esperarContenido(page: Page, { ms = ENV.esperaMs }: OpcionesEspera = {}): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await contenidoCargado(page)) return true;
    await esperarMs(300);
  }
  return false;
}

// -- ciclo de vida -----------------------------------------------------------

export async function arrancar({ etiqueta = 'e2e' }: { etiqueta?: string } = {}): Promise<CtxE2E> {
  const faltan = faltanRequisitos();
  if (faltan.length) {
    throw new Error(
      `Faltan variables E2E (copia src/utils/health/e2e/.env.example a .env): ${faltan.join(', ')}`,
    );
  }
  // Servidor controlado primero: url base resuelta antes de navegar y fallo
  // temprano si el puerto indicado está ocupado.
  await asegurarServidor();
  const browser = await localBrowser.launch({
    headless: ENV.headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const generar = crearGeneradorMiniMax({
    apiKey: ENV.minimaxKey,
    model: ENV.minimaxModelo,
    baseUrl: ENV.minimaxUrl,
  });
  // El contrato de modelo de Stagehand es un zod muy estricto; el generador
  // MiniMax cumple el contrato JSON de act/extract/observe (como en PatyIA).
  const model: NonNullable<StagehandCreateOptions['model']> = { generate: generar } as unknown as NonNullable<StagehandCreateOptions['model']>;
  const stagehand = await Stagehand.create({
    browser,
    model,
    domSettleTimeoutMs: 600,
  });
  const [page] = await browser.context.pages();
  const consola = await vigilarConsola(page);

  const cerrar = async (): Promise<void> => {
    try {
      await stagehand.close?.();
    } catch {
      /* ignore */
    }
    try {
      await browser.close();
    } catch {
      /* ignore */
    }
    // Siempre apagar el servidor que este proceso levantó (idempotente).
    await apagarServidor();
  };

  return { browser, stagehand, page, consola, cerrar, etiqueta };
}

/**
 * Abre la galeria en el docs de un tag (o el home si tag es null) y espera a
 * que el contenido del preview este montado.
 */
export async function abrirGaleria(
  page: Page,
  tag: string | null,
  { ms = ENV.asentarseMs, espera = 30000 }: { ms?: number; espera?: number } = {},
): Promise<boolean> {
  await page.goto(urlDeTag(tag), { waitUntil: 'domcontentloaded' });
  const listo = await esperarVisible(page, 'html[data-kit-shell]', { ms: espera });
  if (!listo) throw new Error('La galeria no llego a data-kit-shell');
  await esperarMs(ms);
  const conContenido = await esperarContenido(page, { ms: espera });
  if (!conContenido) throw new Error(`El preview de ${tag ?? 'home'} no monto contenido`);
  return conContenido;
}

/** Tipos utilitarios re-exportados para los tests (evaluate con editor is-code). */
export type { EditorIsCode };
