/**
 * server-api-docs-contract.test.ts — WHAT de `<iswc-server-api-docs>` (documentación de la API de un server).
 *
 * Caja negra sobre el dominio publicado (`server-api-docs-md.ts`) con el documento de su demo:
 *   S1 el documento InSoft del demo valida con Zod; una referencia rota es error con su ruta JSON.
 *   S7 parse estricto (InSoft v2): el demo lo admite; una clave de más, un v1 o un endpoint con sesión sin
 *      permiso no, y cada error trae su ruta JSON; OpenAPI 3 no aplica.
 *   S8 cada endpoint trae su secuencia (cliente → server → permiso → controller → respuestas, fallas en `alt`).
 *   S2 algo que no es InSoft ni OpenAPI 3 no se materializa y explica por qué.
 *   S3 el modelo agrupa tag → subgrupo en el orden declarado y expande los templates de respuesta.
 *   S4 «Probar»: URL con parámetros codificados, cURL con Bearer y cuerpo, QUERY lleva sus filtros en el cuerpo.
 *   S5 login por proveedor (patyia-portal en claro contra el propio server; orquestador envuelve la clave).
 *   S6 exporta OpenAPI 3.0.3 con las mismas operaciones; un OpenAPI 3 de entrada también se pinta.
 * Contrato de kit (guardián de estructura, marcado como tal): hermanos, ficha, manifest, demo con playground y skill.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { ComponentJsonSchema } from '../../src/previews/_kit/schemas/component.schemas.ts';
import {
  aOpenApi,
  COLOR_METODO,
  curlDe,
  envolverClave,
  esMaterializable,
  normalizarDocumentoApi,
  peticionLogin,
  secuenciaDeOperacion,
  urlDeOperacion,
  validarDocumentoApi,
  validarEstricto,
} from '../../src/components/layout/utils/server-api-docs-md.ts';
import { ServerApiDocsModeloSchema } from '../../src/components/layout/schemas/server-api-docs.schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const RAIZ = join(import.meta.dirname!, '..', '..');
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
  const paths = roto.paths as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
  paths['/sistema/cfg']!.get!.responses!.payload = 'no-existe';
  const v = validarDocumentoApi(roto);
  assert.equal(v.ok, false);
  assert.ok(v.errores.some((e) => e.startsWith('paths › /sistema/cfg › get › responses › payload') && e.includes('no-existe')), v.errores.join('\n'));
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
  assert.deepEqual(m.grupos.map((g) => g.nombre), ['Conversaciones', 'Sistema'], 'orden de tags');
  const op = (metodo: string, ruta: string) => m.operaciones.find((o) => o.metodo === metodo && o.ruta === ruta)!;
  assert.deepEqual(op('put', '/sistema/cfg').respuestas.map((r) => r.codigo), ['200', '401', '403'], 'authForbidden');
  assert.deepEqual(op('get', '/conversacion/{iconversacion}').respuestas.map((r) => r.codigo), ['200', '401', '404'], 'authNotFound');
  const borrar = op('delete', '/conversacion/{iconversacion}').respuestas[0]!;
  const fila = (borrar.schema as { properties: { respuesta: { properties: Record<string, unknown> } } }).properties.respuesta;
  assert.ok('iconversacion' in fila.properties, 'deleteEnvelope con la fila del catálogo');
  assert.ok(op('post', '/conversacion').respuestas.length >= 2 && op('post', '/conversacion').respuestas[0]!.codigo === '200', 'raw: sus items');
  const leer = op('get', '/sistema/cfg');
  assert.equal(leer.permiso, 'CFG:/sistema', 'permiso del endpoint');
  assert.equal(leer.controller, 'TSysValueController.leerCfg', 'controller del endpoint');
  const contenido = (leer.respuestas[0]!.schema as { properties: { respuesta: { type: string; properties?: Record<string, unknown> } } }).properties.respuesta;
  assert.equal(contenido.type, 'object', 'sin schema declarado, el de la respuesta se deduce del ejemplo');
  assert.ok(Object.keys(contenido.properties ?? {}).length > 0, 'con sus propiedades');
  assert.notEqual(op('put', '/sistema/cfg').cuerpo?.ejemplo, undefined, 'cuerpo de catalog.requestBodies');
  assert.equal(op('put', '/sistema/cfg').confirmar, null, 'el documento estricto no trae confirmaciones');
  assert.deepEqual(op('post', '/conversacion').adjuntos.map((a) => a.tipo).sort(), ['audios', 'images']);
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
  assert.equal(de.operaciones.find((o) => o.ruta === '/sistema/cfg' && o.metodo === 'get')?.permiso, 'CFG:/sistema', 'x-permission ida y vuelta');
});

test('server-api-docs S7: parse estricto InSoft v2 (el demo lo admite; lo que no cumple trae su error con ruta)', () => {
  const doc = documentoDelDemo();
  assert.deepEqual(validarEstricto(doc), { aplica: true, ok: true, errores: [] });
  const extra = clon(doc);
  (extra.paths as Record<string, Record<string, Record<string, unknown>>>)['/docs']!.get!.nota = 'clave de más';
  const e1 = validarEstricto(extra);
  assert.equal(e1.ok, false);
  assert.ok(e1.errores.some((e) => e.startsWith('paths › /docs › get') && /nota/.test(e)), e1.errores.join('\n'));
  assert.equal(validarDocumentoApi(extra).ok, true, 'el modo tolerante lo sigue pintando');
  const v1 = clon(doc);
  v1.version = 1;
  assert.ok(validarEstricto(v1).errores.some((e) => e.startsWith('version')), 'un documento v1 no admite el estricto');
  const sinPermiso = clon(doc);
  delete (sinPermiso.paths as Record<string, Record<string, Record<string, unknown>>>)['/sistema/cfg']!.get!.permission;
  assert.ok(validarEstricto(sinPermiso).errores.some((e) => e.startsWith('paths › /sistema/cfg › get › permission')), 'con sesión exige permiso');
  const huerfano = clon(doc);
  (huerfano.catalog as { payloads: Record<string, unknown> }).payloads['sin-uso'] = {};
  assert.ok(validarEstricto(huerfano).errores.some((e) => e.includes('sin-uso')), 'nada del catálogo queda huérfano');
  const conQuery = clon(doc);
  const pathsQ = conQuery.paths as Record<string, Record<string, unknown>>;
  pathsQ['/sistema/cfg']!.query = { ...(pathsQ['/sistema/cfg']!.get as Record<string, unknown>), summary: 'Listar con filtro en el cuerpo' };
  assert.equal(validarEstricto(conQuery).ok, true, 'el verbo QUERY (filtro en el cuerpo) es parte del contrato y un permiso puede repetirse');
  assert.notEqual(COLOR_METODO.query ?? 'neutral', 'neutral', 'QUERY con color propio (el neutral relleno no da contraste)');
  const oa = aOpenApi(normalizarDocumentoApi(doc));
  assert.deepEqual(validarEstricto(oa), { aplica: false, ok: false, errores: [] }, 'OpenAPI 3 no aplica');
});

test('server-api-docs S8: secuencia de cada endpoint (cliente → server → permiso → controller → respuestas)', () => {
  const m = normalizarDocumentoApi(documentoDelDemo());
  const op = m.operaciones.find((o) => o.metodo === 'get' && o.ruta === '/sistema/cfg')!;
  const { sequence } = secuenciaDeOperacion(op, 'ISS PatyIA');
  assert.deepEqual(sequence.actors.map((a) => a.label), ['Cliente', 'ISS PatyIA', 'TSysValueController']);
  assert.match(sequence.messages[0]!.label, /^GET \/sistema\/cfg · Bearer JWT$/);
  assert.ok(sequence.messages.some((x) => x.label === 'Permiso CFG:/sistema'), 'el permiso aparece en el flujo');
  assert.ok(sequence.messages.some((x) => x.from === 'S' && x.to === 'K' && x.label === 'leerCfg()'), 'llama al controller');
  const alt = sequence.fragments.find((f) => f.kind === 'alt');
  assert.ok(alt, 'las fallas van en alt');
  assert.deepEqual(alt.messages.map((id) => sequence.messages.find((x) => x.id === id)?.label.slice(0, 3)), ['401', '403']);
  const publica = secuenciaDeOperacion(m.operaciones.find((o) => o.ruta === '/docs')!).sequence;
  assert.ok(!publica.messages.some((x) => x.label.startsWith('Permiso')), 'un endpoint público no valida permiso');
});

// ── Guardián de estructura del kit (HOW fuerte: contrato de registro) ──────────

test('server-api-docs-md: módulo de dominio con su ficha y su schema estricto (solo zod, vendorizable)', () => {
  const md = join(RAIZ, 'src', 'components', 'layout', 'utils', 'server-api-docs-md');
  // El schema vive en <categoria>/schemas/ (convención del kit: layout/schemas/), no en utils/schemas/.
  const schema = `${join(dirname(md), '..', 'schemas', basename(md))}.schemas.ts`;
  for (const ext of ['.ts', '.md']) assert.ok(existsSync(md + ext), `falta server-api-docs-md${ext}`);
  assert.ok(existsSync(schema), 'falta schemas/server-api-docs-md.schemas.ts');
  assert.match(readFileSync(`${md}.md`, 'utf8'), /^---[\s\S]*tag: iswc-server-api-docs-md[\s\S]*---/);
  const imports = [...readFileSync(schema, 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map((x) => x[1]);
  assert.deepEqual(imports, ['zod'], 'el schema estricto solo depende de zod');
  assert.ok(!existsSync(join(RAIZ, 'src', 'components', 'layout', 'server-api-docs-model.ts')), 'el nombre viejo no queda');
});

test('iswc-server-api-docs: hermanos .ts/.scss/.md/.json/.schemas.ts, ficha con frontmatter, manifest y skill', () => {
  for (const ext of ['.ts', '.scss', '.md', '.json', '.schemas.ts']) assert.ok(existsSync((ext === '.schemas.ts' ? join(dirname(BASE), "schemas", basename(BASE)) : BASE) + ext), `falta server-api-docs${ext}`);
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
  for (const tag of ['iswc-doc-layout', 'iswc-doc-index', 'iswc-code', 'iswc-pager', 'iswc-dialog', 'iswc-copy-button', 'iswc-input', 'iswc-sequence-diagram']) assert.ok(src.includes(`<${tag}`), `monta <${tag}>`);
  assert.match(src, /data-theme="light"><iswc-sequence-diagram[^>]*diagram-style="insoft"/, 'los diagramas del visor van en estilo InSoft (lienzo claro, como los adjuntos de docs)');
  assert.match(src, /<table class="tabla endpoints">/, 'la portada es la tabla de endpoints');
  assert.doesNotMatch(src, /iswc-md-render/, 'sin prosa documental: nada de markdown');
  assert.doesNotMatch(src, /isc-swagger|iswc-docs@|docs-viewer/, 'sin rastro del visor externo');
});

export default lista();
