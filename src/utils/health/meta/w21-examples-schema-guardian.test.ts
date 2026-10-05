/**
 * w21-examples-schema-guardian.test.ts — Guardianes del contrato W21.
 *
 * Phase W21 (zod-migration): el JSON de demos (`iswc-preview/v1`) debe tener
 * el campo `examples` FUERTEMENTE tipado con Zod para alimentar a
 * `<iswc-examples-carousel>`. Estos tests cubren:
 *
 *   1. `ExampleSchema` / `ExamplesSchema` en `section-schema.ts`:
 *      - acepta un Example válido (solo `name`)
 *      - acepta campos opcionales (`category`, `props`, `slots`, `description`)
 *      - rechaza un Example sin `name`
 *      - `ExamplesSchema` acepta un array de Examples válidos
 *      - `ExamplesSchema` rechaza un array con un item mal formado
 *      - `ExamplesSchema` rechaza un no-array
 *
 *   2. El campo `examples` está documentado en `RAIZ_PROPS` del validador
 *      `iswc-preview/v1` (json-schema.ts). Si alguien lo borra, los JSON
 *      válidos empiezan a warnear "campo raíz no documentado".
 *
 *   3. `<iswc-examples-carousel>` está cableado para leer `examples` desde
 *      la propiedad pública del JSON. El setter normaliza la forma nueva
 *      (`name` → `label`) para mantener compat con demos viejos.
 *
 *   4. El render de preview (`renderDefinition`) inyecta el array en
 *      cada `<iswc-examples-carousel>` del main cuando el JSON declara
 *      `examples`. Esto cierra el contrato "el carrusel lee del JSON".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ExampleSchema, ExamplesSchema } from '../../../utils/section-schema.ts';
import { validarEsquema } from '../motor/validators/json-schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

/* --------------------------------------------------------------------------
 * 1) ExampleSchema / ExamplesSchema
 * ------------------------------------------------------------------------*/

test('W21: ExampleSchema acepta un ejemplo mínimo con solo `name`', () => {
  const r = ExampleSchema.safeParse({ name: 'Primario' });
  assert.equal(r.success, true, JSON.stringify(r));
});

test('W21: ExampleSchema acepta todos los campos opcionales', () => {
  const r = ExampleSchema.safeParse({
    name: 'Primario',
    category: 'Estados',
    props: { color: 'brand', variant: 'filled', disabled: false, count: 3 },
    slots: { default: '<strong>Hola</strong>' },
    description: 'Botón primario para CTAs principales.',
  });
  assert.equal(r.success, true, JSON.stringify(r));
});

test('W21: ExampleSchema rechaza un Example sin `name`', () => {
  const r = ExampleSchema.safeParse({ category: 'Estados', props: { color: 'brand' } });
  assert.equal(r.success, false, 'un Example sin name debe fallar');
  if (!r.success) {
    assert.ok(
      r.error.issues.some((i) => i.path.includes('name')),
      'el error debe apuntar al campo `name`',
    );
  }
});

test('W21: ExampleSchema rechaza `name` vacío', () => {
  const r = ExampleSchema.safeParse({ name: '' });
  assert.equal(r.success, false, '`name` vacío debe fallar');
});

test('W21: ExampleSchema rechaza `props` con tipos no primitivos', () => {
  const r = ExampleSchema.safeParse({
    name: 'Primario',
    props: { callback: () => 1 },
  });
  assert.equal(r.success, false, 'props no debe aceptar funciones');
});

test('W21: ExamplesSchema acepta un array de Examples válidos', () => {
  const r = ExamplesSchema.safeParse([
    { name: 'Primario', category: 'Estados', props: { color: 'brand' } },
    { name: 'Secundario', category: 'Estados', props: { color: 'neutral' } },
    { name: 'Peligro', category: 'Alertas', props: { color: 'danger' } },
  ]);
  assert.equal(r.success, true, JSON.stringify(r));
});

test('W21: ExamplesSchema rechaza un array con un item mal formado', () => {
  const r = ExamplesSchema.safeParse([
    { name: 'ok' },
    { props: { color: 'red' } }, // falta name
  ]);
  assert.equal(r.success, false, 'un item inválido debe invalidar el array');
});

test('W21: ExamplesSchema rechaza un array vacío (vacío = OK)', () => {
  // Por contrato, un array vacío es válido (no hay ejemplos para inyectar).
  const r = ExamplesSchema.safeParse([]);
  assert.equal(r.success, true, 'array vacío debe ser válido');
});

test('W21: ExamplesSchema rechaza un no-array', () => {
  const r = ExamplesSchema.safeParse({ name: 'foo' });
  assert.equal(r.success, false, 'un objeto no es un array de examples');
});

/* --------------------------------------------------------------------------
 * 2) El campo `examples` está en RAIZ_PROPS del validador iswc-preview/v1
 * ------------------------------------------------------------------------*/

test('W21: json-schema acepta `examples` como campo raíz válido', () => {
  const def = {
    $schema: 'iswc-preview/v1',
    tag: 'iswc-button',
    sections: [{ id: 's1', blocks: [{ kind: 'demo', html: '<iswc-button></iswc-button>' }] }],
    examples: [
      { name: 'Primario', category: 'Estados', props: { color: 'brand' } },
      { name: 'Secundario', category: 'Estados', props: { color: 'neutral' } },
    ],
  };
  const hs = validarEsquema(def);
  const raizNoDocumentada = hs.filter((h) =>
    h.categoria === 'json-schema' &&
    h.mensaje.includes('"examples"') &&
    h.mensaje.includes('no documentado')
  );
  assert.equal(
    raizNoDocumentada.length,
    0,
    `examples debe estar en RAIZ_PROPS; encontrados: ${JSON.stringify(raizNoDocumentada)}`,
  );
});

test('W21: json-schema no reporta hallazgo fatal si `examples` está mal formado', () => {
  // El validador de ESTRUCTURA (`validarEsquema`) solo reconoce el campo en
  // RAIZ_PROPS; no valida su forma (eso es responsabilidad de ExampleSchema).
  // Un `examples` mal formado NO debe generar un hallazgo fatal del
  // json-schema. La validación de forma queda para el caller (ej. el bridge
  // del runtime, o un test dedicado como los de §1).
  const def = {
    $schema: 'iswc-preview/v1',
    tag: 'iswc-button',
    sections: [],
    examples: 'esto no es un array',
  };
  const hs = validarEsquema(def);
  const fatalSobreExamples = hs.filter((h) =>
    h.categoria === 'json-schema' &&
    h.severidad === 'fatal' &&
    h.mensaje.includes('examples')
  );
  assert.equal(fatalSobreExamples.length, 0);
});

test('W21: RAIZ_PROPS contiene `examples` en el código fuente del validador', () => {
  // Defensa adicional: si alguien borra `examples` de RAIZ_PROPS, este
  // test falla antes de que los JSON reales empiecen a warnear.
  const src = readFileSync(join(root, 'src/utils/health/motor/validators/json-schema.ts'), 'utf8');
  assert.match(
    src,
    /RAIZ_PROPS[\s\S]*?'examples'/,
    'RAIZ_PROPS debe listar `examples` para que el validador no warnee los demos con array de examples',
  );
});

/* --------------------------------------------------------------------------
 * 3) <iswc-examples-carousel> acepta la forma nueva (name) y la legacy (label)
 * ------------------------------------------------------------------------*/

test('W21: <iswc-examples-carousel> expone setter `examples` (API pública)', () => {
  const src = readFileSync(join(root, 'src/components/preview/examples-carousel.ts'), 'utf8');
  assert.match(src, /set\s+examples\s*\(/, 'carousel debe declarar setter `examples`');
  assert.match(src, /JSON\.parse\(\s*this\.getAttribute\(['"]examples['"]\)/,
    'carousel debe parsear el atributo HTML `examples`');
});

test('W21: <iswc-examples-carousel> normaliza `name` → `label` en el setter', () => {
  // Si el JSON raíz trae la forma nueva (con `name`), el setter del carousel
  // debe mapearla a la propiedad interna (`ExampleSpec.label`). Esta pieza
  // cierra el contrato "el carrusel lee del JSON".
  const src = readFileSync(join(root, 'src/components/preview/examples-carousel.ts'), 'utf8');
  assert.match(
    src,
    /!ex\.label\s*&&\s*typeof\s+ex\.name\s*===\s*['"]string['"]/,
    'setter debe mapear `name` (JSON) a `label` (prop interna) cuando el item no trae label',
  );
});

/* --------------------------------------------------------------------------
 * 4) El render inyecta `examples` del JSON en cada <iswc-examples-carousel>
 * ------------------------------------------------------------------------*/

test('W21: renderDefinition inyecta `def.examples` en los <iswc-examples-carousel>', () => {
  const src = readFileSync(join(root, 'src/previews/_kit/render.ts'), 'utf8');
  assert.match(
    src,
    /main\.querySelectorAll[\s\S]*?'iswc-examples-carousel'/,
    'render.ts debe buscar iswc-examples-carousel dentro del main',
  );
  assert.match(
    src,
    /def\.examples/,
    'render.ts debe iterar `def.examples`',
  );
  assert.match(
    src,
    /\.examples\s*=\s*def\.examples/,
    'render.ts debe asignar `def.examples` a la propiedad `examples` del carousel',
  );
});

test('W21: JsonPreview preserva `examples` en la PreviewDefinition normalizada', () => {
  const src = readFileSync(join(root, 'src/previews/_kit/JsonPreview.ts'), 'utf8');
  assert.match(
    src,
    /converted\.examples/,
    'JsonPreview debe preservar el campo `examples` tras normalizar la definición',
  );
});

test('W21: PreviewDefinition declara `examples` opcional', () => {
  const src = readFileSync(join(root, 'src/previews/_kit/types.d.ts'), 'utf8');
  assert.match(
    src,
    /examples\?:\s*unknown\[\]/,
    'types.d.ts debe declarar `examples?: unknown[]` en PreviewDefinition',
  );
});