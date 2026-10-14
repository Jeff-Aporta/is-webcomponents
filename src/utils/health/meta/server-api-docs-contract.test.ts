/**
 * server-api-docs-contract.test.ts — WHAT de `<iswc-server-api-docs>` (documentación de la API de un server).
 *
 * Caja negra sobre el dominio publicado (`server-api-docs-model.ts`) con el documento de su demo:
 *   S1 el documento InSoft del demo valida con Zod; una referencia rota es error con su ruta JSON.
 *   S2 algo que no es InSoft ni OpenAPI 3 no se materializa y explica por qué.
 *   S3 el modelo agrupa tag → subgrupo en el orden declarado y expande los templates de respuesta.
 *   S4 «Probar»: URL con parámetros codificados, cURL con Bearer y cuerpo, QUERY lleva sus filtros en el cuerpo.
 *   S5 login por proveedor (patyia-portal en claro contra el propio server; orquestador envuelve la clave).
 *   S6 exporta OpenAPI 3.0.3 con las mismas operaciones; un OpenAPI 3 de entrada también se pinta.
 * Contrato de kit (guardián de estructura, marcado como tal): hermanos, ficha, manifest, demo con playground y skill.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';
import {
  aOpenApi,
  curlDe,
  envolverClave,
  esMaterializable,
  normalizarDocumentoApi,
  peticionLogin,
  urlDeOperacion,
  validarDocumentoApi,
} from '../../../components/layout/server-api-docs-model.ts';
import { ServerApiDocsModeloSchema } from '../../../components/layout/server-api-docs.schemas.ts';

const RAIZ = join(import.meta.dirname!, '..', '..', '..', '..');
const BASE = join(RAIZ, 'src', 'components', 'layout', 'server-api-docs');

/** El documento embebido en el demo de la ficha (`server-api-docs.json`): única fuente del fixture. */
function documentoDelDemo(): Record<string, unknown> {
  const ficha = ComponentJsonSchema.parse(JSON.parse(readFileSync(`${BASE}.json`, 'utf8')));
  const demo = ficha.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'demo');
  assert.ok(demo && demo.kind === 'demo', 'bloque demo');
  const html = Array.isArray(demo.html) ? demo.html.join('\n') : String(demo.html ?? '');
  const json = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(json, 'el demo trae el documento en un script JSON hijo');
  return JSON.parse(json[1]!);
}
const clon = <T>(v: T): T => structuredClone(v);

test('server-api-docs S1: el documento InSoft del demo valida; una referencia rota es error con su ruta', () => {
  const doc = documentoDelDemo();
  assert.deepEqual(validarDocumentoApi(doc), { ok: true, formato: 'insoft', errores: [] });
  const roto = clon(doc);
  const paths = roto.paths as Record<string, Record<string, Record<string, unknown>>>;
  paths['/sistema/cfg']!.get!.doc = 'no-existe';
  const v = validarDocumentoApi(roto);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => e.startsWith('paths › /sistema/cfg › get › doc') && e.includes('no-existe')), v.errores.join('\n'));
  assert.ok(esMaterializable(roto), 'con avisos sigue siendo pintable');
  const sinResumen = clon(doc);
  delete (sinResumen.paths as Record<string, Record<string, Record<string, unknown>>>)['/docs']!.get!.summary;
  const v2 = validarDocumentoApi(sinResumen);
  assert.ok(v2.errores.some((e) => e.startsWith('paths › /docs › get › summary')), v2.errores.join('\n'));
});

test('server-api-docs S2: lo que no es InSoft ni OpenAPI 3 no se materializa y explica por qué', () => {
  for (const malo of [null, {}, { kind: 'otro', paths: {} }, { kind: 'config' }, [1, 2]]) {
    assert.equal(esMaterializable(malo), false, JSON.stringify(malo));
    const v = validarDocumentoApi(malo);
    assert.equal(v.ok, false);
    assert.ok(v.errores.length > 0);
  }
  assert.throws(() => normalizarDocumentoApi({ hola: 1 }), /no es InSoft/);
});

test('server-api-docs S3: grupos tag → subgrupo en el orden declarado y templates expandidos', () => {
  const m = ServerApiDocsModeloSchema.parse(normalizarDocumentoApi(documentoDelDemo()));
  assert.equal(m.titulo, 'API PatyIA');
  assert.equal(m.marca.titulo, 'ISS PatyIA');
  assert.equal(m.operaciones.length, 6);
  assert.deepEqual(m.grupos.map((g) => g.nombre), ['Conversaciones', 'Sistema'], 'orden de viewer.nav');
  assert.deepEqual(m.grupos[1]!.subgrupos.map((s) => s.nombre), ['Configuración', 'Documentación']);
  const op = (metodo: string, ruta: string) => m.operaciones.find((o) => o.metodo === metodo && o.ruta === ruta)!;
  assert.deepEqual(op('put', '/sistema/cfg').respuestas.map((r) => r.codigo), ['200', '401', '403'], 'authForbidden');
  assert.deepEqual(op('get', '/conversacion/{iconversacion}').respuestas.map((r) => r.codigo), ['200', '401', '404'], 'authNotFound');
  const borrar = op('delete', '/conversacion/{iconversacion}').respuestas[0]!;
  assert.deepEqual((borrar.schema as { properties: { respuesta: unknown } }).properties.respuesta, { type: 'object', properties: { iconversacion: { type: 'string' } } }, 'deleteEnvelope con la fila del catálogo');
  assert.deepEqual(op('post', '/conversacion').respuestas.map((r) => r.codigo), ['200', '401'], 'raw: sus items');
  assert.equal(op('get', '/sistema/cfg').doc.includes('## Configuración'), true, 'doc del catálogo');
  assert.deepEqual(op('put', '/sistema/cfg').cuerpo?.ejemplo, { convlog: false }, 'cuerpo de catalog.requestBodies');
  assert.equal(op('put', '/sistema/cfg').confirmar?.titulo, 'Guardar configuración');
  assert.deepEqual(op('post', '/conversacion').adjuntos, [{ tipo: 'images', campo: 'imagenes', max: 5 }]);
  assert.equal(op('get', '/docs').sesion, false);
  assert.equal(op('get', '/sistema/cfg').sesion, true);
  assert.deepEqual(m.auth, { proveedor: 'patyia-portal', loginUrl: '', loginPath: '/auth/portal-login', app: 'isa-patyia' });
});

test('server-api-docs S4: «Probar» arma URL, cURL y los filtros de QUERY van en el cuerpo', () => {
  const m = normalizarDocumentoApi(documentoDelDemo());
  const op = m.operaciones.find((o) => o.ruta === '/conversacion/{iconversacion}' && o.metodo === 'get')!;
  assert.equal(urlDeOperacion('https://h/api/', op, { path: { iconversacion: 'a b/c' }, query: { x: '1', vacio: '' } }), 'https://h/api/conversacion/a%20b%2Fc?x=1');
  const curl = curlDe('https://h/api', op, { path: { iconversacion: 'c-1' }, token: 'tok', cuerpo: '{"a":1}' });
  assert.match(curl, /^curl -X GET 'https:\/\/h\/api\/conversacion\/c-1'/);
  assert.match(curl, /Authorization: Bearer tok/);
  assert.match(curl, /-d '\{"a":1\}'/);
  assert.match(curlDe('https://h/api', op, { cuerpo: '{\n  "a": 1\n}' }), /-d '\{"a":1\}'$/, 'el cuerpo JSON va en una línea');
  assert.match(curlDe('https://h/api', op), /Bearer <token>/, 'sin sesión, el cURL marca dónde va el token');
  const query = normalizarDocumentoApi({ kind: 'config', paths: { '/x': { query: { summary: 'Listar', parameters: [{ name: 'dias', in: 'query', example: 7 }] } } } }).operaciones[0]!;
  assert.deepEqual(query.parametros, [], 'QUERY no manda ?q=');
  assert.deepEqual(query.cuerpo?.ejemplo, { dias: 7 });
});

test('server-api-docs S5: login por proveedor', () => {
  const patyia = peticionLogin({ proveedor: 'patyia-portal', loginUrl: '', loginPath: '/auth/portal-login', app: 'isa-patyia' }, 'https://srv/api/', 'ana@contapyme.com', 'secreta');
  assert.equal(patyia.endpoint, 'https://srv/api/auth/portal-login', 'contra el propio server');
  assert.deepEqual(patyia.body, { semail: 'ana@contapyme.com', password: 'secreta' });
  const orq = peticionLogin({ proveedor: 'orquestador', loginUrl: 'https://orq', loginPath: '/auth/login', app: 'swagger' }, 'https://srv/api', 'ana@contapyme.com', 'secreta', '810000630');
  assert.equal(orq.endpoint, 'https://orq/auth/login');
  assert.deepEqual(orq.body, { semail: 'ana', password: envolverClave('secreta'), app: 'swagger', itercero: '810000630' });
  assert.equal(envolverClave('ab', 1), 'bcd123bcyza987', 'César por día UTC con prefijo y sufijo');
  assert.equal(envolverClave('Ab', 2), 'cde123Cdzab987');
  assert.equal(envolverClave(''), '');
});

test('server-api-docs S6: exporta OpenAPI 3.0.3 y acepta OpenAPI 3 de entrada', () => {
  const m = normalizarDocumentoApi(documentoDelDemo());
  const oa = aOpenApi(m) as { openapi: string; paths: Record<string, Record<string, unknown>> };
  assert.equal(oa.openapi, '3.0.3');
  assert.deepEqual(Object.entries(oa.paths).flatMap(([r, ms]) => Object.keys(ms).map((x) => `${x} ${r}`)).sort(), m.operaciones.map((o) => `${o.metodo} ${o.ruta}`).sort());
  assert.equal(validarDocumentoApi(oa).ok, true, 'lo exportado es un OpenAPI 3 válido para el visor');
  const de = normalizarDocumentoApi(oa);
  assert.equal(de.formato, 'openapi');
  assert.equal(de.operaciones.length, m.operaciones.length, 'ida y vuelta conserva las operaciones');
  assert.equal(de.operaciones.find((o) => o.ruta === '/sistema/cfg' && o.metodo === 'get')?.sesion, true, 'security Bearer');
});

// ── Guardián de estructura del kit (HOW fuerte: contrato de registro) ──────────

test('iswc-server-api-docs: hermanos .ts/.scss/.md/.json/.schemas.ts, ficha con frontmatter, manifest y skill', () => {
  for (const ext of ['.ts', '.scss', '.md', '.json', '.schemas.ts']) assert.ok(existsSync(BASE + ext), `falta server-api-docs${ext}`);
  const ficha = readFileSync(`${BASE}.md`, 'utf8');
  assert.match(ficha, /^---[\s\S]*tag: iswc-server-api-docs[\s\S]*category: layout[\s\S]*---/);
  for (const s of ['## Propósito', '## API', '### Eventos', '## Accesibilidad', '## Reglas para LLM']) assert.ok(ficha.includes(s), `ficha: ${s}`);
  const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  assert.match(manifest, /tag: 'iswc-server-api-docs'[^\n]*category: 'layout'[^\n]*page: 'components\/layout\/server-api-docs.json'/);
  assert.ok(existsSync(join(RAIZ, 'skills', 'iswc-server-api-docs', 'SKILL.md')), 'skill del componente');
  const ficha2 = ComponentJsonSchema.parse(JSON.parse(readFileSync(`${BASE}.json`, 'utf8')));
  const demo = ficha2.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'demo');
  assert.ok(demo && demo.kind === 'demo' && (demo.controls ?? []).length >= 1, 'demo con playground');
});

test('iswc-server-api-docs: se compone con piezas del kit sobre el layout documental (sin visor propio)', () => {
  const src = readFileSync(`${BASE}.ts`, 'utf8');
  for (const tag of ['iswc-doc-layout', 'iswc-doc-index', 'iswc-md-render', 'iswc-code', 'iswc-pager', 'iswc-dialog', 'iswc-copy-button']) assert.ok(src.includes(`<${tag}`), `monta <${tag}>`);
  assert.doesNotMatch(src, /isc-swagger|iswc-docs@|docs-viewer/, 'sin rastro del visor externo');
});
