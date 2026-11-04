// ai.test.ts — IA en el navegador, sin modelos: catálogo, regla de descarga, reducción y orden.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../src/previews/_kit/schemas/component.schemas.ts';
import { HerramientaSchema } from '../../src/ai/schemas/ai.schemas.ts';
import { HERRAMIENTAS, herramienta, mbDe, MODELO_LOCAL, pesoDe } from '../../src/ai/herramientas.ts';
import { abrirCorpus, aplanar, desempacar, empacar, empacarAplanado, empacarVectores } from '../../src/ai/aplanado.ts';
import { ajustar } from '../../src/ai/aplanado-ajuste.ts';
import { conDescarga, LIMITE_MB, medidor, pospuesta } from '../../src/ai/descarga.ts';
import { coseno, normalizar, ORDEN_DEFECTO, ordenarAplanado } from '../../src/ai/orden.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const RAIZ = join(import.meta.dirname!, '..', '..');

test('ai: cada herramienta del catálogo es válida y tiene su motor', () => {
  for (const h of HERRAMIENTAS) {
    HerramientaSchema.parse(h);
    assert.ok(existsSync(join(RAIZ, 'src', 'ai', 'motores', `${h.id}.ts`)), `falta el motor ${h.id}`);
  }
  const motores = readdirSync(join(RAIZ, 'src', 'ai', 'motores')).map((f) => f.replace('.ts', '')).sort();
  assert.deepEqual(motores, HERRAMIENTAS.map((h) => h.id).sort());
});

test('ai: una herramienta desconocida cae en la primera y el peso sigue a las opciones', () => {
  assert.equal(herramienta('no-existe').id, HERRAMIENTAS[0]!.id);
  assert.equal(mbDe(herramienta('ocr'), { tamano: 'tiny' }), 6);
  assert.equal(mbDe(herramienta('ocr')), 31);
  assert.equal(pesoDe(3400), '3,4 GB');
  assert.equal(pesoDe(31), '31 MB');
});

test('ai: el modelo de embeddings es el multilingüe, nunca el inglés de runonweb', () => {
  assert.match(MODELO_LOCAL, /multilingual/);
  assert.equal(herramienta('embed').modelo, MODELO_LOCAL);
  assert.match(readFileSync(join(RAIZ, 'src', 'ai', 'motores', 'embed.ts'), 'utf8'), /model: MODELO_LOCAL, device: 'wasm'/);
});

test('ai: los motores se piden por URL, fuera del componente y de los barriles', () => {
  const componente = readFileSync(join(RAIZ, 'src', 'components', 'media', 'ai-tool.ts'), 'utf8');
  assert.doesNotMatch(componente, /runonweb/);
  assert.doesNotMatch(readFileSync(join(RAIZ, 'src', 'components', 'index.ts'), 'utf8'), /runonweb|ai\/motores/);
  for (const f of ['descarga', 'motores', 'vector-local', 'herramientas', 'orden', 'aplanado']) {
    assert.doesNotMatch(readFileSync(join(RAIZ, 'src', 'ai', `${f}.ts`), 'utf8'), /from 'runonweb/, f);
  }
  assert.match(readFileSync(join(RAIZ, 'src', 'ai', 'motores.ts'), 'utf8'), /new URL\(`\.\/motores\/\$\{h\.id\}\.min\.mjs/);
});

test('ai: hasta 20 MB la descarga no pide modal y lo ya bajado no se repite', async () => {
  assert.equal(LIMITE_MB, 20);
  let cargas = 0;
  const m = await conDescarga({ clave: 'prueba-liviana', nombre: 'x', mb: 5, cargar: () => Promise.resolve(++cargas) });
  assert.equal(m, 1);
  assert.equal(await conDescarga({ clave: 'prueba-liviana', nombre: 'x', mb: 500, cargar: () => Promise.resolve(++cargas) }), 2, 'ya bajado: ni toast ni modal');
});

test('ai: una carga rechazada se propaga y «Ahora no» se reconoce', async () => {
  await assert.rejects(conDescarga({ clave: 'prueba-falla', nombre: 'x', mb: 1, cargar: () => Promise.reject(new Error('red')) }), /red/);
  assert.equal(pospuesta(new Error('descarga pospuesta')), true);
  assert.equal(pospuesta(new Error('red')), false);
});

test('ai: el medidor une archivos, no retrocede e ignora lo menor de 1 MB', () => {
  const medir = medidor();
  assert.equal(medir({ status: 'progress', file: 'a', loaded: 1, total: 100 }), null);
  assert.equal(medir({ status: 'progress', file: 'a', loaded: 2e6, total: 4e6 }), 50);
  assert.equal(medir({ status: 'progress', file: 'b', loaded: 0, total: 4e6 }), 50, 'un archivo nuevo no baja el porcentaje');
});

const ITEMS = [{ id: 'a', clave: 'pizza', texto: 'comida italiana' }, { id: 'b', clave: 'perro', texto: 'mascota animal' }, { id: 'c', clave: 'gato', texto: 'mascota felino' }];
const VECTORES = [[1, 0, 0.1, 0], [0, 1, 0, 0.2], [0, 0.9, 0.1, 0.1]];

function corpus() {
  const a = ajustar({ base: VECTORES }, { metodo: 'pca', dims: 2, cuantizacion: { tipo: 'int8' } });
  const planos = VECTORES.map((v) => aplanar(v, a));
  return abrirCorpus({ modelo: 'x', aplanado: empacarAplanado(a, 16), items: ITEMS, vectores: empacarVectores(planos, a) });
}

test('ai: empacar y desempacar conservan los números', () => {
  const [f] = desempacar(empacar([[0.5, -0.25, 1]], 16), 3);
  assert.ok(Math.abs(f![1]! + 0.25) < 1e-3);
});

test('ai: el corpus viaja por JSON y la consulta cae en la misma rejilla', () => {
  const c = corpus();
  const q = aplanar(VECTORES[0]!, c.aplanado);
  assert.ok(coseno(q, c.vectores[0]!) > 0.99);
  assert.ok(coseno(q, c.vectores[1]!) < 0.5);
});

test('ai: lo exacto va primero, aunque el vector diga otra cosa', () => {
  const r = ordenarAplanado(corpus(), 'gato', VECTORES[0]!);
  assert.equal(r[0]!.item.id, 'c');
  assert.equal(r[0]!.exacta, true);
  assert.equal(r[0]!.relevante, true);
});

test('ai: sin coincidencia manda el significado', () => {
  assert.equal(ordenarAplanado(corpus(), 'xyzw', VECTORES[0]!)[0]!.item.id, 'a');
});

test('ai: sin vector ordena por palabra y aguanta errores de tecleo', () => {
  assert.equal(ordenarAplanado(corpus(), 'itaiana', null)[0]!.item.id, 'a');
  assert.equal(ordenarAplanado(corpus(), 'Mascotá', null, { ...ORDEN_DEFECTO, exacta: 'ninguna' })[0]!.lexico > 0, true);
  assert.equal(normalizar('  Árbol  Ñandú '), 'arbol ñandu'.normalize('NFD').replace(/[̀-ͯ]/g, ''));
});

test('iswc-ai-tool: cuatro archivos y demo con playground', () => {
  const base = join(RAIZ, 'src', 'components', 'media', 'ai-tool');
  for (const ext of ['.ts', '.scss', '.md', '.json']) assert.ok(existsSync(base + ext), ext);
  const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(`${base}.json`, 'utf8')));
  assert.equal(doc.tag, 'iswc-ai-tool');
  assert.ok(doc.sections.flatMap((s) => s.blocks).some((b) => b.kind === 'demo' && (b.controls ?? []).length >= 3));
  const scss = readFileSync(`${base}.scss`, 'utf8');
  assert.doesNotMatch(scss, /\d(px|rem)\b/);
  assert.doesNotMatch(scss, /#[0-9a-f]{3,8}\b/i);
});

export default lista();
