// app-shell.test.ts — Guardián WHAT de specs/app-shell/spec.md (S-AP1…S-AP19).
//
// Caja negra: la página carga los bundles publicados (dist/cdn) como lo haría una app
// por CDN, y cada caso afirma sobre lo observable — geometría, accesibilidad, eventos,
// red y almacenamiento — a través del contrato público de los tags:
//   <iswc-app-shell>, <iswc-app-nav>, <iswc-login-dropdown>, <iswc-session-menu>.
// Requiere `deno task build` previo (prueba lo que se publica, no la fuente).
//
// Uso: deno run -A --no-check tests/componentes/app-shell.test.ts

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, before, after, lista } = coleccionPruebas({ categoria: 'what', timeoutMs: 60_000 });

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/dist/cdn/core/is-base.min.css">
<style>html,body{margin:0}</style>
</head><body>
<iswc-app-shell id="shell" brand="Mi App" logo="mdi:rocket" brand-href="/inicio" toast="top-end">
  <iswc-app-nav id="nav" slot="nav"></iswc-app-nav>
  <iswc-session-menu id="sesion" slot="actions" modes="password token" name="Ana María Pérez" subtitle="Administradora">
    <iswc-dropdown-item id="perfil" value="perfil">Mi perfil</iswc-dropdown-item>
  </iswc-session-menu>
  <section id="vista" style="height:3000px">Vista larga</section>
  <div slot="footer" id="pie">Pie</div>
</iswc-app-shell>
<script type="module">
  const mods = ['layout/app-shell', 'navigation/app-nav', 'layout/login-dropdown', 'layout/session-menu', 'actions/dropdown-item'];
  await Promise.all(mods.map((m) => import('/dist/cdn/' + m + '.min.js')));
  for (const t of ['iswc-app-shell', 'iswc-app-nav', 'iswc-login-dropdown', 'iswc-session-menu']) await customElements.whenDefined(t);
  window.__eventos = [];
  for (const n of ['iswc-brand-home', 'iswc-nav-select', 'iswc-login-submit', 'iswc-logout', 'iswc-select']) {
    document.addEventListener(n, (e) => window.__eventos.push({ type: n, detail: JSON.parse(JSON.stringify(e.detail, (k, v) => (v instanceof Element ? '#' + v.id : v))) }));
  }
  document.documentElement.dataset.listo = '1';
</script>
</body></html>`;

const FILAS = [
  { id: 'tool', label: 'Herramientas', value: 'chat', tabs: [
    { id: 'chat', label: 'Chat', icon: 'mdi:chat' },
    { id: 'config', label: 'Config', icon: 'mdi:cog' },
    { id: 'oculta', label: 'Oculta', icon: 'mdi:eye-off', hidden: true },
  ] },
  { id: 'chat-pane', parent: 'chat', value: 'conv', tabs: [
    { id: 'conv', label: 'Conversaciones' },
    { id: 'logs', label: 'Logs' },
  ] },
  { id: 'config-pane', parent: 'config', value: 'prompts', tabs: [
    { id: 'prompts', label: 'Prompts' },
    { id: 'sistema', label: 'Sistema' },
  ] },
];

let server: Server;
let base = '';
let browser: Browser;
const peticiones: { url: string; method: string; postData: string | null }[] = [];

async function servir(url: string): Promise<{ tipo: string; cuerpo: Buffer | string } | null> {
  const ruta = decodeURIComponent(url.split('?')[0]!);
  if (ruta === '/__app__.html') return { tipo: TIPOS['.html']!, cuerpo: PAGINA };
  const rel = normalize(ruta).replace(/^[/\\]+/, '');
  if (rel.split(sep).includes('..')) return null;
  const archivo = join(RAIZ, rel);
  if (!(await stat(archivo).catch(() => null))?.isFile()) return null;
  return { tipo: TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream', cuerpo: await readFile(archivo) };
}

/** Chromium de Playwright; si no está descargado, el Chrome o Edge del sistema. */
async function lanzar(): Promise<Browser> {
  let ultimo: unknown;
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try { return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); } catch (e) { ultimo = e; }
  }
  throw ultimo;
}

before(async () => {
  server = createServer(async (req, res) => {
    const r = await servir(req.url ?? '/');
    if (!r) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': r.tipo, 'cache-control': 'no-store' });
    res.end(r.cuerpo);
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const dir = server.address();
  base = `http://127.0.0.1:${typeof dir === 'object' && dir ? dir.port : 0}`;
  browser = await lanzar();
});

after(async () => {
  await browser?.close();
  await new Promise<void>((ok) => server?.close(() => ok()));
});

/** Abre la app de prueba con el ancho pedido y las filas del nav ya asignadas. */
async function abrir(ancho = 1280, alto = 800): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: ancho, height: alto } });
  page.on('request', (r) => peticiones.push({ url: r.url(), method: r.method(), postData: r.postData() }));
  await page.goto(`${base}/__app__.html`);
  await page.waitForFunction(() => document.documentElement.dataset.listo === '1');
  await page.evaluate((filas) => { (document.getElementById('nav') as any).rows = filas; }, FILAS);
  return page;
}

const eventos = (page: Page) => page.evaluate(() => (window as any).__eventos as { type: string; detail: any }[]);
const limpiarEventos = (page: Page) => page.evaluate(() => { (window as any).__eventos.length = 0; });

/** Abre el desplegable de acceso del session-menu (sin sesión). */
async function abrirLogin(page: Page): Promise<void> {
  await page.locator('#sesion').getByRole('button', { name: 'Entrar', exact: true }).first().click();
  await page.waitForFunction(() => {
    const ld = document.getElementById('sesion')!.shadowRoot!.querySelector('iswc-login-dropdown')!;
    return ld.hasAttribute('open');
  });
}

async function escribirCredenciales(page: Page, usuario: string, clave: string): Promise<void> {
  const login = page.locator('#sesion iswc-login-dropdown iswc-login');
  await login.locator('#username input').fill(usuario);
  await login.locator('#password input').fill(clave);
}

/* ── <iswc-app-shell> ─────────────────────────────────────────────── */

test('S-AP1: la vista hace scroll propio y la barra queda visible', async () => {
  const page = await abrir();
  try {
    const r = await page.evaluate(async () => {
      const shell = document.getElementById('shell')!;
      const main = shell.shadowRoot!.querySelector('[part="main"]') as HTMLElement;
      const bar = shell.shadowRoot!.querySelector('[part="bar"]') as HTMLElement;
      main.scrollTop = 1500;
      await new Promise((r) => requestAnimationFrame(r));
      return {
        docScroll: document.scrollingElement!.scrollHeight - innerHeight,
        hostAlto: shell.getBoundingClientRect().height,
        mainScroll: main.scrollTop,
        barTop: bar.getBoundingClientRect().top,
        vh: innerHeight,
      };
    });
    assert.ok(r.docScroll <= 1, `la página no debe scrollear (sobra ${r.docScroll}px)`);
    assert.equal(Math.round(r.hostAlto), r.vh, 'el shell ocupa el alto del viewport');
    assert.ok(r.mainScroll > 1000, `la vista scrollea (${r.mainScroll})`);
    assert.equal(Math.round(r.barTop), 0, 'la barra sigue arriba tras el scroll');
  } finally { await page.close(); }
});

test('S-AP2: la marca emite iswc-brand-home cancelable y es accesible sin href', async () => {
  const page = await abrir();
  try {
    await page.evaluate(() => document.addEventListener('iswc-brand-home', (e) => e.preventDefault(), { once: true }));
    await page.locator('#shell').locator('[part="brand"]').click();
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-brand-home');
    assert.equal(ev.length, 1, 'un iswc-brand-home por clic');
    assert.equal(ev[0]!.detail.href, '/inicio');
    assert.ok(page.url().endsWith('/__app__.html'), 'preventDefault() evita la navegación');

    await page.evaluate(() => document.getElementById('shell')!.removeAttribute('brand-href'));
    const sinHref = await page.evaluate(() => {
      const b = document.getElementById('shell')!.shadowRoot!.querySelector('[part="brand"]') as HTMLElement;
      return { role: b.getAttribute('role'), tab: b.tabIndex, nombre: b.getAttribute('aria-label') };
    });
    assert.equal(sinHref.role, 'button');
    assert.equal(sinHref.tab, 0, 'sin href la marca sigue siendo enfocable');
    assert.match(sinHref.nombre ?? '', /Mi App/);
    await limpiarEventos(page);
    await page.locator('#shell').locator('[part="brand"]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await eventos(page)).filter((e) => e.type === 'iswc-brand-home').length, 1, 'Enter activa la marca');
  } finally { await page.close(); }
});

test('S-AP3: en pantalla estrecha el texto de la marca se oculta y el nombre accesible queda', async () => {
  const page = await abrir(360, 700);
  try {
    const r = await page.evaluate(() => {
      const sr = document.getElementById('shell')!.shadowRoot!;
      const texto = sr.querySelector('[part="brand-text"]') as HTMLElement;
      return { visible: texto.getBoundingClientRect().width > 0, nombre: sr.querySelector('[part="brand"]')!.getAttribute('aria-label') };
    });
    assert.equal(r.visible, false, 'texto de marca oculto < 40rem con logo');
    assert.match(r.nombre ?? '', /Mi App/);
    const ancho = await page.evaluate(() => document.scrollingElement!.scrollWidth);
    assert.ok(ancho <= 360, `sin scroll horizontal (${ancho}px)`);
  } finally { await page.close(); }
});

test('S-AP4: la barra lateral se ve al lado en ancho y pasa a un cajón con botón en estrecho', async () => {
  for (const [ancho, esperado] of [[1280, 'aside'], [360, 'drawer']] as const) {
    const page = await abrir(ancho, 700);
    try {
      await page.evaluate(() => {
        const nav = document.createElement('nav');
        nav.slot = 'sidebar';
        nav.id = 'lateral';
        nav.textContent = 'Lateral';
        document.getElementById('shell')!.append(nav);
      });
      await page.waitForTimeout(50);
      const r = await page.evaluate(() => {
        const enVista = (el: Element) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.right > 0 && b.left < innerWidth && getComputedStyle(el).visibility !== 'hidden';
        };
        const sr = document.getElementById('shell')!.shadowRoot!;
        const boton = sr.querySelector('[part="menu-button"]') as HTMLElement;
        return {
          lateralVisible: enVista(document.getElementById('lateral')!),
          botonVisible: boton.getBoundingClientRect().width > 0,
        };
      });
      if (esperado === 'aside') {
        assert.equal(r.lateralVisible, true, 'en ancho la barra lateral se ve');
        assert.equal(r.botonVisible, false, 'en ancho no hay botón de menú');
      } else {
        assert.equal(r.lateralVisible, false, 'en estrecho la barra lateral no ocupa la vista');
        assert.equal(r.botonVisible, true, 'en estrecho aparece el botón de menú');
        await page.locator('#shell').locator('[part="menu-button"]').click();
        await page.waitForFunction(() => {
          const b = document.getElementById('lateral')!.getBoundingClientRect();
          return b.width > 0 && b.left >= 0 && b.right <= innerWidth;
        });
      }
    } finally { await page.close(); }
  }
});

test('S-AP5: con atributo toast, shell.toast() muestra el aviso', async () => {
  const page = await abrir();
  try {
    await page.evaluate(() => (document.getElementById('shell') as any).toast('Guardado'));
    await page.waitForFunction(() => {
      const t = document.getElementById('shell')!.shadowRoot!.querySelector('iswc-toast');
      return !!t && (t.textContent ?? '').includes('Guardado');
    });
  } finally { await page.close(); }
});

/* ── <iswc-app-nav> ───────────────────────────────────────────────── */

const pestanas = (page: Page) => page.evaluate(() => {
  const sr = document.getElementById('nav')!.shadowRoot!;
  return Array.from(sr.querySelectorAll('[role="tablist"]')).map((fila) => ({
    visible: (fila as HTMLElement).getBoundingClientRect().height > 0,
    tabs: Array.from(fila.querySelectorAll('[role="tab"]')).map((t) => ({
      nombre: (t.textContent ?? '').trim() || t.getAttribute('aria-label'),
      seleccionada: t.getAttribute('aria-selected'),
      tabindex: (t as HTMLElement).tabIndex,
      visible: (t as HTMLElement).getBoundingClientRect().width > 0,
    })),
  }));
});

test('S-AP6: cada fila es un tablist con aria-selected y una sola parada de Tab', async () => {
  const page = await abrir();
  try {
    const filas = await pestanas(page);
    assert.equal(filas.length, 3, 'las tres filas existen');
    const primaria = filas[0]!;
    assert.deepEqual(primaria.tabs.filter((t) => t.seleccionada === 'true').map((t) => t.nombre), ['Chat']);
    assert.equal(primaria.tabs.filter((t) => t.visible && t.tabindex === 0).length, 1, 'una sola pestaña con tabindex 0');
    assert.equal(primaria.tabs.find((t) => t.nombre === 'Oculta')!.visible, false, 'hidden oculta la pestaña');
  } finally { await page.close(); }
});

test('S-AP7: flechas mueven el foco sin seleccionar; Enter selecciona y emite', async () => {
  const page = await abrir();
  try {
    await page.locator('#nav').getByRole('tab', { name: 'Chat' }).focus();
    await page.keyboard.press('ArrowRight');
    const foco = await page.evaluate(() => document.getElementById('nav')!.shadowRoot!.activeElement?.textContent?.trim());
    assert.equal(foco, 'Config', 'ArrowRight lleva el foco a la siguiente visible');
    assert.equal((await eventos(page)).filter((e) => e.type === 'iswc-nav-select').length, 0, 'mover el foco no selecciona');
    await page.keyboard.press('ArrowRight');
    const vuelta = await page.evaluate(() => document.getElementById('nav')!.shadowRoot!.activeElement?.textContent?.trim());
    assert.equal(vuelta, 'Chat', 'salta las pestañas ocultas y da la vuelta');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-nav-select');
    assert.deepEqual(ev.map((e) => [e.detail.row, e.detail.id]), [['tool', 'config']]);
  } finally { await page.close(); }
});

test('S-AP8: click emite iswc-nav-select; preventDefault deja la selección como estaba', async () => {
  const page = await abrir();
  try {
    await page.locator('#nav').getByRole('tab', { name: 'Config' }).click();
    let filas = await pestanas(page);
    assert.equal(filas[0]!.tabs.find((t) => t.nombre === 'Config')!.seleccionada, 'true', 'sin preventDefault queda activa');
    await page.evaluate(() => document.addEventListener('iswc-nav-select', (e) => e.preventDefault(), { once: true }));
    await page.locator('#nav').getByRole('tab', { name: 'Chat' }).click();
    filas = await pestanas(page);
    assert.equal(filas[0]!.tabs.find((t) => t.nombre === 'Config')!.seleccionada, 'true', 'con preventDefault no cambia');
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-nav-select');
    assert.deepEqual(ev.map((e) => e.detail.id), ['config', 'chat']);
  } finally { await page.close(); }
});

test('S-AP9: una fila secundaria con parent solo se ve con ese valor en la primaria', async () => {
  const page = await abrir();
  try {
    let filas = await pestanas(page);
    assert.deepEqual(filas.map((f) => f.visible), [true, true, false], 'con chat: solo la sub-fila de chat');
    await page.locator('#nav').getByRole('tab', { name: 'Config' }).click();
    filas = await pestanas(page);
    assert.deepEqual(filas.map((f) => f.visible), [true, false, true], 'con config: solo la sub-fila de config');
  } finally { await page.close(); }
});

test('S-AP10: reasignar rows con la misma estructura no recrea pestañas ni iconos', async () => {
  const page = await abrir();
  try {
    const iguales = await page.evaluate((filas) => {
      const nav = document.getElementById('nav') as any;
      const antes = Array.from(nav.shadowRoot.querySelectorAll('[role="tab"], iswc-icon'));
      const otra = JSON.parse(JSON.stringify(filas));
      otra[0].value = 'config';
      otra[0].tabs[1].hidden = true;
      nav.rows = otra;
      const despues = Array.from(nav.shadowRoot.querySelectorAll('[role="tab"], iswc-icon'));
      return antes.length === despues.length && antes.every((n, i) => n === despues[i]);
    }, FILAS);
    assert.equal(iguales, true, 'mismos nodos tras cambiar activo y visibilidad');
  } finally { await page.close(); }
});

test('S-AP11: en estrecho la fila primaria queda en iconos y conserva el nombre accesible', async () => {
  const page = await abrir(360, 700);
  try {
    const r = await page.evaluate(() => {
      const tab = Array.from(document.getElementById('nav')!.shadowRoot!.querySelectorAll('[role="tab"]'))[0] as HTMLElement;
      const label = tab.querySelector('[part="label"]') as HTMLElement;
      return { anchoLabel: label.getBoundingClientRect().width, texto: tab.textContent?.trim() };
    });
    assert.ok(r.anchoLabel <= 1, `label visualmente oculto (${r.anchoLabel}px)`);
    await page.locator('#nav').getByRole('tab', { name: 'Chat' }).waitFor();
  } finally { await page.close(); }
});

/* ── <iswc-login-dropdown> (vía <iswc-session-menu> sin sesión) ───── */

test('S-AP12: enviar usuario y contraseña emite un único iswc-login-submit', async () => {
  const page = await abrir();
  try {
    await abrirLogin(page);
    await escribirCredenciales(page, 'ana', 'secreta-123');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-login-submit');
    assert.equal(ev.length, 1, 'un solo evento por envío');
    assert.equal(ev[0]!.detail.mode, 'password');
    assert.equal(ev[0]!.detail.username, 'ana');
    assert.equal(ev[0]!.detail.password, 'secreta-123');
    assert.equal(typeof ev[0]!.detail.remember, 'boolean');
  } finally { await page.close(); }
});

test('S-AP13: el modo token valida vacío y emite el token pegado', async () => {
  const page = await abrir();
  try {
    await abrirLogin(page);
    const ld = page.locator('#sesion iswc-login-dropdown');
    await ld.getByRole('tab', { name: 'Token' }).click();
    await ld.locator('.token-submit').click();
    assert.equal((await eventos(page)).filter((e) => e.type === 'iswc-login-submit').length, 0, 'vacío no emite');
    await ld.getByRole('alert').filter({ hasText: /token/i }).waitFor();
    await ld.locator('textarea').fill('  aaa.bbb.ccc \n');
    await ld.locator('.token-submit').click();
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-login-submit');
    assert.equal(ev.length, 1);
    assert.equal(ev[0]!.detail.mode, 'token');
    assert.equal(ev[0]!.detail.token, 'aaa.bbb.ccc', 'sin espacios');
  } finally { await page.close(); }
});

test('S-AP14: con choices se elige una opción y el envío la incluye con las credenciales', async () => {
  const page = await abrir();
  try {
    await abrirLogin(page);
    await escribirCredenciales(page, 'ana', 'secreta-123');
    await page.keyboard.press('Enter');
    await page.evaluate(() => { (document.getElementById('sesion') as any).choices = [{ id: 'e1', label: 'Empresa Uno' }, { id: 'e2', label: 'Empresa Dos' }]; });
    const ld = page.locator('#sesion iswc-login-dropdown');
    await ld.getByText('Empresa Dos').click();
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-login-submit');
    assert.equal(ev.length, 2);
    assert.deepEqual([ev[1]!.detail.username, ev[1]!.detail.password, ev[1]!.detail.choice], ['ana', 'secreta-123', 'e2']);
    await ld.getByText('Volver').click();
    await ld.locator('iswc-login').waitFor({ state: 'visible' });
  } finally { await page.close(); }
});

test('S-AP15: loading bloquea el reenvío, error se ve y reset() vuelve al inicio', async () => {
  const page = await abrir();
  try {
    await abrirLogin(page);
    await escribirCredenciales(page, 'ana', 'secreta-123');
    await page.evaluate(() => { (document.getElementById('sesion') as any).loading = true; });
    await page.keyboard.press('Enter');
    assert.equal((await eventos(page)).filter((e) => e.type === 'iswc-login-submit').length, 0, 'loading no reenvía');
    await page.evaluate(() => {
      const s = document.getElementById('sesion') as any;
      s.loading = false;
      s.error = 'Credenciales inválidas';
    });
    await page.locator('#sesion iswc-login-dropdown').getByText('Credenciales inválidas').filter({ visible: true }).waitFor();
    await page.evaluate(() => (document.getElementById('sesion') as any).reset());
    const r = await page.evaluate(() => {
      const ld = document.getElementById('sesion')!.shadowRoot!.querySelector('iswc-login-dropdown') as any;
      const clave = ld.shadowRoot.querySelector('iswc-login').shadowRoot.querySelector('#password');
      return { abierto: ld.hasAttribute('open'), error: ld.error, clave: clave.value };
    });
    assert.deepEqual(r, { abierto: false, error: '', clave: '' });
  } finally { await page.close(); }
});

test('S-AP16: ningún componente hace peticiones ni guarda credenciales al enviar', async () => {
  const page = await abrir();
  try {
    await abrirLogin(page);
    await escribirCredenciales(page, 'ana', 'clave-unica-987');
    const desde = peticiones.length;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const nuevas = peticiones.slice(desde).filter((p) => !/\.(svg|js|css|json)(\?|$)/.test(p.url) || p.method !== 'GET');
    assert.deepEqual(nuevas, [], 'el envío no genera peticiones de datos');
    const fuga = peticiones.some((p) => p.url.includes('clave-unica-987') || (p.postData ?? '').includes('clave-unica-987'));
    assert.equal(fuga, false, 'la clave no viaja en ninguna petición');
    const almacenada = await page.evaluate(() => {
      const todo = [localStorage, sessionStorage].flatMap((s) => Object.keys(s).map((k) => k + '=' + s.getItem(k)));
      return todo.join('\n') + document.cookie;
    });
    assert.ok(!almacenada.includes('clave-unica-987'), 'la clave no queda en storage ni cookies');
  } finally { await page.close(); }
});

/* ── <iswc-session-menu> ─────────────────────────────────────────── */

test('S-AP17: sin logged se ofrece el acceso y su envío llega al documento', async () => {
  const page = await abrir();
  try {
    const visible = await page.locator('#sesion iswc-login-dropdown').isVisible();
    assert.equal(visible, true, 'sin sesión se ve el acceso');
    await abrirLogin(page);
    await escribirCredenciales(page, 'ana', 'x');
    await page.keyboard.press('Enter');
    const ev = (await eventos(page)).filter((e) => e.type === 'iswc-login-submit');
    assert.equal(ev.length, 1, 'el submit burbujea fuera del session-menu una sola vez');
  } finally { await page.close(); }
});

test('S-AP18: con logged muestra avatar y primer nombre; el menú, nombre completo y subtítulo', async () => {
  const page = await abrir();
  try {
    await page.evaluate(() => document.getElementById('sesion')!.setAttribute('logged', ''));
    const sm = page.locator('#sesion');
    assert.equal(await sm.locator('iswc-login-dropdown').isVisible(), false, 'con sesión no se ve el acceso');
    await sm.locator('[part="name"]').filter({ hasText: /^Ana$/ }).waitFor();
    await sm.getByRole('button', { name: /Sesión de Ana/ }).click();
    await sm.getByText('Ana María Pérez').waitFor();
    await sm.getByText('Administradora').waitFor();
    await page.getByText('Mi perfil').waitFor();
  } finally { await page.close(); }
});

test('S-AP19: "Cerrar sesión" emite iswc-logout y un item propio emite iswc-select', async () => {
  const page = await abrir();
  try {
    await page.evaluate(() => document.getElementById('sesion')!.setAttribute('logged', ''));
    const sm = page.locator('#sesion');
    await sm.getByRole('button', { name: /Sesión de Ana/ }).click();
    await page.getByText('Mi perfil').click();
    await sm.getByRole('button', { name: /Sesión de Ana/ }).click();
    await sm.getByText('Cerrar sesión').click();
    const ev = await eventos(page);
    assert.deepEqual(ev.filter((e) => e.type === 'iswc-select').map((e) => e.detail.item), ['#perfil']);
    assert.equal(ev.filter((e) => e.type === 'iswc-logout').length, 1);
    assert.equal(ev.filter((e) => e.type === 'iswc-select' && e.detail.item !== '#perfil').length, 0, 'la salida no se filtra como iswc-select');
  } finally { await page.close(); }
});

export default lista();
