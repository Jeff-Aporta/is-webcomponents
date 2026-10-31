// tests/gobernanza/contrato-cuatro-archivos.test.ts
//
// Todo tag público del manifest trae .ts, .scss, .md y .json bien definidos, y ningún tag registrado queda fuera del
// manifest. La regla vive en `tests/.audit/motor/validators/cuatro-archivos.ts`, la misma que usa `deno task audit`.
//
// Uso: deno test -A --no-check tests/gobernanza/contrato-cuatro-archivos.test.ts
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { auditarCuatroArchivos, leerManifest, validarFicha } from '../.audit/motor/validators/cuatro-archivos.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FICHA = { tag: 'iswc-x', category: 'media', script: 'components/media/x.js', page: 'components/media/x.json' };
const MD = `---
tag: iswc-x
tags:
  - iswc-x
category: media
status: public
source: ./x.ts
style: ./x.scss
preview: ./x.json
---
# \`<iswc-x>\`

## Propósito
## Cuándo usarlo
## Cuándo no usarlo
## Importación
## Ejemplo mínimo

\`\`\`html
<iswc-x></iswc-x>
\`\`\`

## API
## Comportamiento
## Accesibilidad
## Reglas para LLM
`;
const JSON_OK = JSON.stringify({
  $schema: 'iswc-preview/v1',
  tag: 'iswc-x',
  category: 'media',
  sections: [{ blocks: [{ kind: 'demo', target: '#x', controls: [{}] }] }],
});

/** Monta un componente en disco, aplica `ajuste` y devuelve los mensajes del validador. */
function probar(ajuste: (carpeta: string) => void): string[] {
  const raiz = mkdtempSync(join(tmpdir(), 'cuatro-'));
  const carpeta = join(raiz, 'src', 'components', 'media');
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, 'x.ts'), '');
  writeFileSync(join(carpeta, 'x.scss'), '');
  writeFileSync(join(carpeta, 'x.md'), MD);
  writeFileSync(join(carpeta, 'x.json'), JSON_OK);
  ajuste(carpeta);
  try {
    return validarFicha(raiz, FICHA).map((f) => f.mensaje);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

test('gobernanza/contrato-cuatro-archivos: el catálogo cumple', () => {
  assert.ok(leerManifest(ROOT).length > 200, 'manifest con componentes');
  const fallos = auditarCuatroArchivos(ROOT).map((f) => `${f.tag} (${f.archivo}): ${f.mensaje}`);
  assert.deepEqual(fallos, []);
});

test('gobernanza/contrato-cuatro-archivos: un componente completo pasa', () => {
  assert.deepEqual(probar(() => {}), []);
});

test('gobernanza/contrato-cuatro-archivos: detecta cada archivo que falta', () => {
  for (const ext of ['ts', 'scss', 'md', 'json']) {
    const mensajes = probar((c) => rmSync(join(c, `x.${ext}`)));
    assert.ok(mensajes.some((m) => m === `falta el .${ext}`), `.${ext}: ${mensajes.join(' | ')}`);
  }
});

test('gobernanza/contrato-cuatro-archivos: detecta ficha y demo mal definidos', () => {
  const conMd = (texto: string) => probar((c) => writeFileSync(join(c, 'x.md'), texto));
  assert.ok(conMd(`﻿${MD}`).includes('BOM'));
  assert.ok(conMd(MD.replace('## Accesibilidad\n', '')).includes('sin sección «Accesibilidad»'));
  assert.ok(conMd(MD.replace('./x.scss', './x.css')).some((m) => m.startsWith('frontmatter style no existe')));
  const sinControles = probar((c) => writeFileSync(join(c, 'x.json'), JSON_OK.replace('"controls":[{}]', '"controls":[]')));
  assert.ok(sinControles.includes('sin bloque demo con controls'));
});

export default lista();
