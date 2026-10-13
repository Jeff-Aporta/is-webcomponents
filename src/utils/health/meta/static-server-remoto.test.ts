// static-server-remoto.test.ts — QUÉ hace el servidor estático del render de diagramas cuando corre SIN checkout del
// kit (`client/tools/static-server.ts` con respaldo remoto; spec: specs/herramientas/spec.md S-H2). Caja negra: se
// levanta contra una carpeta temporal y un "raw" falso en 127.0.0.1, y se afirma solo sobre las respuestas HTTP y
// sobre cuántas veces se le pidió al remoto.
//   R1 lo que está en disco se sirve tal cual y no toca el remoto.
//   R2 un `dist/cdn/…` ausente se trae del remoto y se sirve con el MIME de su extensión (raw da text/plain).
//   R3 el remoto responde 404 → 404, sin reintentos; R4 fuera de `dist/cdn/` → 404 y el remoto ni se consulta.
//   R5 fallos pasajeros del remoto (500) se reintentan; R6 rutas que escapan de la raíz → 404.
//   R7 ref inmutable (SHA) → lo traído queda en disco y sirve con el remoto caído; ref de rama → no queda.
//   R8 `baseRemota`: un SHA de 40 hex fija esa ref; cualquier otra cosa cae a `main`.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticServer } from '../../../vendor-distributions/client/tools/static-server.ts';
import { baseRemota } from '../../../vendor-distributions/client/tools/render-lote.ts';

const SHA = 'c'.repeat(40);
const SIN_SANITIZAR = { sanitizeResources: false, sanitizeOps: false };

type Remoto = { base: (ref: string) => string; pedidos: string[]; cerrar: () => Promise<void> };

/** "raw" falso: `respuestas[ruta]` es la lista de estados a devolver en orden (el último se repite); sin entrada → 404. */
function remoto(respuestas: Record<string, number[]>, cuerpo = 'export const desdeRemoto = 1;'): Remoto {
  const pedidos: string[] = [];
  const srv = Deno.serve({ port: 0, hostname: '127.0.0.1', onListen() {} }, (req) => {
    const ruta = new URL(req.url).pathname.split('/').slice(2).join('/');
    pedidos.push(ruta);
    const lista = respuestas[ruta] ?? [404];
    const estado = lista.length > 1 ? lista.shift()! : lista[0]!;
    return new Response(estado === 200 ? cuerpo : 'no', { status: estado, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  });
  return { base: (ref) => `http://127.0.0.1:${srv.addr.port}/${ref}/`, pedidos, cerrar: () => srv.shutdown() };
}

/** Raíz temporal con `index.html` y un `dist/cdn/local.min.js` en disco, y un `secreto.txt` FUERA de la raíz. */
function raiz(): string {
  const tmp = Deno.makeTempDirSync({ prefix: 'static-remoto-' });
  writeFileSync(join(tmp, 'secreto.txt'), 'no debe salir');
  const r = join(tmp, 'raiz');
  mkdirSync(join(r, 'dist', 'cdn'), { recursive: true });
  writeFileSync(join(r, 'index.html'), '<!doctype html><p>local</p>');
  writeFileSync(join(r, 'dist', 'cdn', 'local.min.js'), 'export const local = 1;');
  return r;
}

type Caso = { id: string; pedir: string; respuestas: Record<string, number[]>; estado: number; tipo: string | null; texto: string | null; pedidos: number };

const CASOS: Caso[] = [
  { id: 'R1 en disco', pedir: 'dist/cdn/local.min.js', respuestas: {}, estado: 200, tipo: 'text/javascript', texto: 'local = 1', pedidos: 0 },
  { id: 'R1 index.html en disco', pedir: '', respuestas: {}, estado: 200, tipo: 'text/html', texto: 'local', pedidos: 0 },
  { id: 'R2 js remoto con MIME por extensión', pedir: 'dist/cdn/diagrams/sequence-diagram.min.js', respuestas: { 'dist/cdn/diagrams/sequence-diagram.min.js': [200] }, estado: 200, tipo: 'text/javascript', texto: 'desdeRemoto', pedidos: 1 },
  { id: 'R2 css remoto con MIME por extensión', pedir: 'dist/cdn/styles/x.min.css', respuestas: { 'dist/cdn/styles/x.min.css': [200] }, estado: 200, tipo: 'text/css', texto: 'desdeRemoto', pedidos: 1 },
  { id: 'R3 404 remoto sin reintentos', pedir: 'dist/cdn/no-existe.min.js', respuestas: {}, estado: 404, tipo: null, texto: null, pedidos: 1 },
  { id: 'R4 fuera de dist/cdn no consulta el remoto', pedir: 'src/core/loader.ts', respuestas: { 'src/core/loader.ts': [200] }, estado: 404, tipo: null, texto: null, pedidos: 0 },
  { id: 'R5 dos 500 y luego 200', pedir: 'dist/cdn/inestable.min.js', respuestas: { 'dist/cdn/inestable.min.js': [500, 500, 200] }, estado: 200, tipo: 'text/javascript', texto: 'desdeRemoto', pedidos: 3 },
  { id: 'R6 escapar de la raíz con barras invertidas', pedir: '..%5csecreto.txt', respuestas: {}, estado: 404, tipo: null, texto: null, pedidos: 0 },
  { id: 'R6 escapar de la raíz codificado', pedir: '%2e%2e/secreto.txt', respuestas: {}, estado: 404, tipo: null, texto: null, pedidos: 0 },
];

for (const c of CASOS) {
  Deno.test({
    name: `static-server remoto: ${c.id}`,
    ...SIN_SANITIZAR,
    async fn() {
      const rem = remoto(structuredClone(c.respuestas));
      const srv = await startStaticServer(raiz(), rem.base('main'));
      try {
        const r = await fetch(srv.base + c.pedir);
        const texto = await r.text();
        assertEquals(r.status, c.estado, `${c.pedir}: ${texto}`);
        if (c.tipo) assert((r.headers.get('content-type') ?? '').startsWith(c.tipo), r.headers.get('content-type') ?? '');
        if (c.texto) assert(texto.includes(c.texto), texto);
        assert(!texto.includes('no debe salir'), 'nada fuera de la raíz');
        assertEquals(rem.pedidos.length, c.pedidos, `pedidos al remoto: ${rem.pedidos.join(', ')}`);
      } finally {
        srv.close();
        await rem.cerrar();
      }
    },
  });
}

const R7 = [
  { ref: SHA, inmutable: true },
  { ref: 'main', inmutable: false },
];

for (const c of R7) {
  Deno.test({
    name: `static-server remoto: R7 ref ${c.inmutable ? 'SHA: lo traído sirve con el remoto caído' : 'de rama: con el remoto caído ya no está'}`,
    ...SIN_SANITIZAR,
    async fn() {
      const dir = raiz();
      const ruta = 'dist/cdn/diagrams/flowchart.min.js';
      const rem = remoto({ [ruta]: [200] });
      const primero = await startStaticServer(dir, rem.base(c.ref));
      try {
        assert((await fetch(primero.base + ruta).then((r) => r.text())).includes('desdeRemoto'));
      } finally {
        primero.close();
        await rem.cerrar();
      }
      const caido = remoto({});
      const segundo = await startStaticServer(dir, caido.base(c.ref));
      try {
        const r = await fetch(segundo.base + ruta);
        await r.body?.cancel();
        assertEquals(r.status, c.inmutable ? 200 : 404);
        assertEquals(caido.pedidos.length, c.inmutable ? 0 : 1, 'con SHA no vuelve a pedir lo que ya tiene');
      } finally {
        segundo.close();
        await caido.cerrar();
      }
    },
  });
}

const R8: { pin: string | undefined; ref: string }[] = [
  { pin: SHA, ref: SHA },
  { pin: 'abc1234', ref: 'main' },
  { pin: '', ref: 'main' },
  { pin: undefined, ref: 'main' },
  { pin: `${SHA}x`, ref: 'main' },
];

Deno.test('static-server remoto: R8 baseRemota fija el SHA del pin o cae a main', () => {
  for (const c of R8) {
    const base = baseRemota(c.pin);
    assert(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/$/.test(base), base);
    assert(base.endsWith(`/${c.ref}/`), `${String(c.pin)} → ${base}`);
  }
});
