// download-iconify.test.ts — QUÉ hace la herramienta de íconos de las apps (src/cdn/tools/download-iconify.ts),
// como caja negra: una app en disco + una API de Iconify simulada → `assets/iconify.json` y los SVG.
//   I1 descarga solo los ids reales que la app usa; `host` sale de deno.json (`iswc.host`).
//   I2 descarta lo que no es un ícono (`node:fs`, set inexistente) y los ejemplos en comentarios.
//   I3 suma los íconos de los tags ajenos que la app usa (mapa del kit) y no los de los que no usa.
//   I4 lo que ya está en disco no se vuelve a pedir; el mapa es determinista (misma entrada → mismos bytes).
//   I5 poda los SVG que ya nadie usa.
//   I6 un 429 se reintenta y no se confunde con «no existe»; un nombre que no existe se reporta.
//   I7 sin red no rompe: conserva lo que hay en disco y avisa; `offline` no toca la red.
//   I8 `tags` de la app: cada componente lleva sus íconos y los de los tags que pinta.
//   I10 un componente hereda los íconos de los módulos relativos que importa; un archivo que no define
//       su tag no es componente.
//   I9 el mapa incrusta cada SVG (una petición pinta toda la app); `incrustar: false` lo omite.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { descargarIconos, mapaDelKit } from '../../../cdn/tools/download-iconify.ts';

const SETS: Record<string, Record<string, string>> = {
  mdi: { home: '<path d="H"/>', close: '<path d="C"/>', 'chevron-down': '<path d="V"/>', star: '<path d="S"/>' },
  tabler: { heart: '<path d="T"/>' },
};

/** API de Iconify simulada: `collections`, `<set>.json?icons=` y `<set>/<n>.svg`. Cuenta pedidos. */
function apiFalsa(opts: { caida?: boolean; limitar?: number } = {}) {
  const pedidos: string[] = [];
  let limite = opts.limitar ?? 0;
  const f = (async (input: string | URL | Request) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    pedidos.push(url.pathname + url.search);
    if (opts.caida) throw new TypeError('sin red');
    if (limite > 0) {
      limite--;
      return new Response('rate limited', { status: 429 });
    }
    if (url.pathname === '/collections') return Response.json(Object.fromEntries(Object.keys(SETS).map((k) => [k, {}])));
    const lote = url.pathname.match(/^\/([a-z0-9-]+)\.json$/);
    if (lote) {
      const set = SETS[lote[1]!];
      if (!set) return new Response('', { status: 404 });
      const pedidosN = (url.searchParams.get('icons') ?? '').split(',');
      const icons = Object.fromEntries(pedidosN.filter((n) => set[n]).map((n) => [n, { body: set[n] }]));
      return Response.json({ prefix: lote[1], width: 24, height: 24, icons, not_found: pedidosN.filter((n) => !set[n]) });
    }
    return new Response('', { status: 404 });
  }) as typeof fetch;
  return { f, pedidos };
}

function app(archivos: Record<string, string>): string {
  const raiz = Deno.makeTempDirSync({ prefix: 'iconify-app-' });
  for (const [rel, txt] of Object.entries(archivos)) {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true });
    writeFileSync(join(raiz, rel), txt);
  }
  return raiz;
}

const KIT_MAPA = {
  v: 1, app: 'kit', host: 'https://kit.example/', ruta: 'assets/iconify.json', base: 'iconify/',
  icons: { mdi: ['chevron-down', 'close'] },
  tags: { 'iswc-dialog': ['mdi:chevron-down', 'mdi:close'], 'iswc-rating': ['mdi:star'] },
};

const BASE = {
  'deno.json': JSON.stringify({ name: 'demo-app', iswc: { host: 'https://demo.example/app' } }),
  'kit.json': JSON.stringify(KIT_MAPA),
  'src/ap-panel.ts': [
    '/** Ejemplo en la doc: icon="mdi:alert" (no se usa) */',
    "import { x } from 'node:fs';",
    "const i = { icon: 'mdi:home' }; const j = 'nope:thing';",
    "root.innerHTML = '<iswc-dialog><ap-boton></ap-boton></iswc-dialog>';",
    "define('ap-panel', Panel);",
  ].join('\n'),
  'src/ap-boton.ts': "import { forma } from './_forma.js';\nhtml`<iswc-icon icon=\"tabler:heart\"></iswc-icon>`; define('ap-boton', B);",
  'src/_forma.ts': "export const forma = { icono: 'mdi:star' };",
  'src/utilidades-varias.ts': "export const x = 'mdi:home';",
};
const opciones = (raiz: string, f: typeof fetch) => ({ raiz, roots: ['src'], mapas: ['kit.json'], silencioso: true, fetch: f, api: 'https://api.test/' });
const leerMapa = (raiz: string) => JSON.parse(readFileSync(join(raiz, 'assets/iconify.json'), 'utf8'));

Deno.test('download-iconify: I1-I3 descarga lo usado (propio + tags ajenos usados), host de deno.json, sin ruido', async () => {
  const raiz = app(BASE);
  const { f } = apiFalsa();
  const r = await descargarIconos(opciones(raiz, f));
  const m = leerMapa(raiz);
  assertEquals(m.host, 'https://demo.example/app/', 'I1 host de deno.json (con / final)');
  assertEquals(m.app, 'demo-app');
  assertEquals(m.ruta, 'assets/iconify.json');
  assertEquals(m.base, 'iconify/');
  assertEquals(m.icons, { mdi: ['chevron-down', 'close', 'home', 'star'], tabler: ['heart'] }, 'I1/I3 propio + iswc-dialog; sin mdi:alert (comentario), sin node:fs ni nope:thing');
  assertEquals(r.encontrados, 5);
  const svg = readFileSync(join(raiz, 'assets/iconify/mdi/home.svg'), 'utf8');
  assert(svg.startsWith('<svg') && svg.includes('viewBox="0 0 24 24"') && svg.includes('<path d="H"/>'), 'I1 SVG suelto válido');
  assert(!existsSync(join(raiz, 'assets/iconify/mdi/alert.svg')));
});

Deno.test('download-iconify: I4 no re-pide lo que hay y el mapa es determinista; I5 poda lo que ya no se usa', async () => {
  const raiz = app(BASE);
  await descargarIconos(opciones(raiz, apiFalsa().f));
  const antes = readFileSync(join(raiz, 'assets/iconify.json'), 'utf8');
  const api2 = apiFalsa();
  const r2 = await descargarIconos(opciones(raiz, api2.f));
  assertEquals(r2.descargados, [], 'I4 nada nuevo');
  assertEquals(api2.pedidos.filter((p) => p !== '/collections'), [], 'I4 solo se consulta la lista de colecciones');
  assertEquals(readFileSync(join(raiz, 'assets/iconify.json'), 'utf8'), antes, 'I4 mismos bytes');

  writeFileSync(join(raiz, 'src/ap-boton.ts'), "html`<span></span>`; define('ap-boton', B);");
  const r3 = await descargarIconos(opciones(raiz, apiFalsa().f));
  assertEquals(r3.podados, ['tabler:heart'], 'I5 poda');
  assert(!existsSync(join(raiz, 'assets/iconify/tabler')), 'I5 carpeta vacía fuera');
  assertEquals(leerMapa(raiz).icons.tabler, undefined);
});

Deno.test('download-iconify: I6 429 se reintenta; un nombre inexistente se reporta y no entra al mapa', async () => {
  const raiz = app({ ...BASE, 'src/ap-x.ts': "const a = 'mdi:no-existe';" });
  const { f } = apiFalsa({ limitar: 2 });
  const r = await descargarIconos(opciones(raiz, f));
  assertEquals(r.inexistentes, ['mdi:no-existe'], 'I6 inexistente reportado');
  assert(r.avisos.some((a) => a.includes('mdi:no-existe')));
  assertEquals(leerMapa(raiz).icons.mdi, ['chevron-down', 'close', 'home', 'star'], 'I6 los 429 no se pierden: se reintentó');
});

Deno.test('download-iconify: I7 sin red conserva lo que hay y avisa; offline no toca la red', async () => {
  const raiz = app(BASE);
  await descargarIconos(opciones(raiz, apiFalsa().f));
  const caida = apiFalsa({ caida: true });
  const r = await descargarIconos({ ...opciones(raiz, caida.f), mapas: ['kit.json'] });
  assert(r.avisos.some((a) => /inaccesible/.test(a)), 'I7 aviso');
  assertEquals(r.podados, [], 'I7 sin veredicto completo no se poda');
  assertEquals(leerMapa(raiz).icons, { mdi: ['chevron-down', 'close', 'home', 'star'], tabler: ['heart'] }, 'I7 mapa con lo que hay en disco');

  const muda = apiFalsa();
  await descargarIconos({ ...opciones(raiz, muda.f), offline: true, mapas: ['https://kit.example/assets/iconify.json'] });
  assertEquals(muda.pedidos, [], 'I7 offline: cero pedidos');
});

Deno.test('download-iconify: I8 tags de la app cierran por los tags que pintan (propios y del kit)', async () => {
  const raiz = app(BASE);
  const r = await descargarIconos(opciones(raiz, apiFalsa().f));
  assertEquals(r.mapa.tags?.['ap-boton'], ['mdi:star', 'tabler:heart'], 'I10 hereda el ícono del módulo que importa');
  assertEquals(r.mapa.tags?.['ap-panel'], ['mdi:chevron-down', 'mdi:close', 'mdi:home', 'mdi:star', 'tabler:heart'], 'I8 propio + iswc-dialog + ap-boton');
  assertEquals(Object.keys(r.mapa.tags ?? {}).sort(), ['ap-boton', 'ap-panel'], 'I10 utilidades-varias no define su tag: no es componente');
});

Deno.test('download-iconify: el mapa del kit por defecto es el del mismo SHA que la herramienta', () => {
  const sha = 'a'.repeat(40);
  assertEquals(
    mapaDelKit(`https://raw.githubusercontent.com/o/iswc-root/${sha}/src/cdn/tools/download-iconify.ts`),
    `https://raw.githubusercontent.com/o/iswc-root/${sha}/assets/iconify.json`,
  );
  assertEquals(mapaDelKit('file:///c/kit/src/cdn/tools/download-iconify.ts'), 'file:///c/kit/assets/iconify.json', 'checkout local: el del mismo checkout');
  assertEquals(mapaDelKit('https://example.com/otra/cosa.ts'), null);
});

Deno.test('download-iconify: el kit publica su mapa con tags para que las apps reusen sus íconos', () => {
  const m = JSON.parse(readFileSync('assets/iconify.json', 'utf8'));
  assertEquals(m.v, 1);
  assert(typeof m.host === 'string' && m.host.startsWith('https://'), 'host del kit');
  assert(m.tags['iswc-dialog']?.includes('mdi:close'), 'iswc-dialog declara su ícono de cerrar');
  for (const [set, nombres] of Object.entries(m.icons as Record<string, string[]>)) {
    for (const n of nombres) assert(existsSync(join('assets/iconify', set, `${n}.svg`)), `${set}:${n} en disco`);
  }
});

Deno.test('download-iconify: I9 el mapa incrusta los SVG descargados; incrustar:false los omite', async () => {
  const raiz = app(BASE);
  const r = await descargarIconos(opciones(raiz, apiFalsa().f));
  assertEquals(r.mapa.svg?.mdi?.home, readFileSync(join(raiz, 'assets/iconify/mdi/home.svg'), 'utf8').trim(), 'I9 mismo SVG que el archivo');
  assertEquals(Object.keys(r.mapa.svg ?? {}).sort(), Object.keys(r.mapa.icons).sort());
  const r2 = await descargarIconos({ ...opciones(raiz, apiFalsa().f), incrustar: false });
  assertEquals(r2.mapa.svg, undefined, 'I9 sin incrustar');
});
