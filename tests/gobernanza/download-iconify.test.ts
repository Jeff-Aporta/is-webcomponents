// download-iconify.test.ts — QUÉ hace la herramienta de íconos de las apps (src/vendor-distributions/client/tools/download-iconify.ts),
// como caja negra: una app en disco + una API de Iconify simulada → los SVG en `assets/iconify/` (SIN mapa).
//   I1 descarga los ids reales que la app usa, más `extra` (lo que el barrido no ve: los del kit).
//   I2 descarta lo que no es un ícono (`node:fs`, set inexistente) y los ejemplos en comentarios.
//   I3 no escribe ningún mapa y retira un `assets/iconify.json` viejo.
//   I4 lo que ya está en disco no se vuelve a pedir.
//   I5 poda los SVG que ya nadie usa.
//   I6 un 429 se reintenta y no se confunde con «no existe»; un nombre que no existe se reporta.
//   I7 sin red no rompe: conserva lo que hay en disco y avisa; `offline` no toca la red.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { descargarIconos } from '../../../vendor-distributions/client/tools/download-iconify.ts';

const SETS: Record<string, Record<string, string>> = {
  mdi: { home: '<path d="H"/>', close: '<path d="C"/>', 'chevron-down': '<path d="V"/>', star: '<path d="S"/>' },
  tabler: { heart: '<path d="T"/>' },
};

/** API de Iconify simulada: `collections` y `<set>.json?icons=`. Cuenta pedidos. */
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

const BASE = {
  'deno.json': JSON.stringify({ name: 'demo-app', iswc: { host: 'https://demo.example/app' } }),
  'src/ap-panel.ts': [
    '/** Ejemplo en la doc: icon="mdi:alert" (no se usa) */',
    "import { x } from 'node:fs';",
    "const i = { icon: 'mdi:home' }; const j = 'nope:thing';",
  ].join('\n'),
  'src/ap-boton.ts': 'html`<iswc-icon icon="tabler:heart"></iswc-icon>`',
};
/** `extra`: los que pintan por dentro los componentes del kit (el aviso «falta en local» los nombra). */
const opciones = (raiz: string, f: typeof fetch) => ({ raiz, roots: ['src'], extra: ['mdi:chevron-down', 'mdi:close'], silencioso: true, fetch: f, api: 'https://api.test/' });
/** Lo que hay en disco, agrupado por set. */
const enDisco = (raiz: string): Record<string, string[]> => {
  const d = join(raiz, 'assets/iconify');
  if (!existsSync(d)) return {};
  return Object.fromEntries(readdirSync(d).sort().map((set) => [set, readdirSync(join(d, set)).map((n) => n.replace(/\.svg$/, '')).sort()]));
};
const TODOS = { mdi: ['chevron-down', 'close', 'home'], tabler: ['heart'] };

Deno.test('download-iconify: I1-I3 lo usado + extra, sin ruido y sin mapa', async () => {
  const raiz = app({ ...BASE, 'assets/iconify.json': '{"v":1}' });
  const r = await descargarIconos(opciones(raiz, apiFalsa().f));
  assertEquals(enDisco(raiz), TODOS, 'I1 propios + extra; sin mdi:alert (comentario), sin node:fs ni nope:thing');
  assertEquals(r.encontrados, 4);
  assertEquals(r.carpeta, 'assets/iconify');
  const svg = Deno.readTextFileSync(join(raiz, 'assets/iconify/mdi/close.svg'));
  assert(svg.startsWith('<svg') && svg.includes('viewBox="0 0 24 24"') && svg.includes('<path d="C"/>'), 'I1 SVG de extra, local');
  assert(!existsSync(join(raiz, 'assets/iconify/mdi/alert.svg')));
  assert(!existsSync(join(raiz, 'assets/iconify.json')), 'I3 sin mapa: el viejo se retira');
});

Deno.test('download-iconify: I4 no re-pide lo que hay; I5 poda lo que ya no se usa', async () => {
  const raiz = app(BASE);
  await descargarIconos(opciones(raiz, apiFalsa().f));
  const api2 = apiFalsa();
  const r2 = await descargarIconos(opciones(raiz, api2.f));
  assertEquals(r2.descargados, [], 'I4 nada nuevo');
  assertEquals(api2.pedidos.filter((p) => p !== '/collections'), [], 'I4 solo se consulta la lista de colecciones');

  writeFileSync(join(raiz, 'src/ap-boton.ts'), 'html`<span></span>`');
  const r3 = await descargarIconos(opciones(raiz, apiFalsa().f));
  assertEquals(r3.podados, ['tabler:heart'], 'I5 poda');
  assert(!existsSync(join(raiz, 'assets/iconify/tabler')), 'I5 carpeta vacía fuera');
  assertEquals(enDisco(raiz).tabler, undefined);
});

Deno.test('download-iconify: I6 429 se reintenta; un nombre inexistente se reporta y no entra al mapa', async () => {
  const raiz = app({ ...BASE, 'src/ap-x.ts': "const a = 'mdi:no-existe';" });
  const r = await descargarIconos(opciones(raiz, apiFalsa({ limitar: 2 }).f));
  assertEquals(r.inexistentes, ['mdi:no-existe'], 'I6 inexistente reportado');
  assert(r.avisos.some((a) => a.includes('mdi:no-existe')));
  assertEquals(enDisco(raiz), TODOS, 'I6 los 429 no se pierden: se reintentó');
});

Deno.test('download-iconify: I7 sin red conserva lo que hay y avisa; offline no toca la red', async () => {
  const raiz = app(BASE);
  await descargarIconos(opciones(raiz, apiFalsa().f));
  const r = await descargarIconos(opciones(raiz, apiFalsa({ caida: true }).f));
  assert(r.avisos.some((a) => /inaccesible/.test(a)), 'I7 aviso');
  assertEquals(r.podados, [], 'I7 sin veredicto completo no se poda');
  assertEquals(enDisco(raiz), TODOS, 'I7 lo que hay en disco se conserva');

  const muda = apiFalsa();
  await descargarIconos({ ...opciones(raiz, muda.f), offline: true });
  assertEquals(muda.pedidos, [], 'I7 offline: cero pedidos');
});

Deno.test('download-iconify: el kit sirve sus íconos en assets/iconify (sin mapa)', () => {
  assert(!existsSync('assets/iconify.json'), 'el mapa ya no existe');
  assert(existsSync('assets/iconify/mdi/close.svg'), 'el kit tiene mdi:close en local (iswc-dialog)');
});
