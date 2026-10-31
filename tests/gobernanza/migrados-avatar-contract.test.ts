/**
 * migrados-avatar-contract.test.ts — contrato de los componentes generales que subieron desde una app: 4 archivos
 * hermanos, entrada en el manifest y en la skill, demo con playground, sin dominio de la app y sin medidas absolutas.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentJsonSchema } from '../../src/previews/_kit/schemas/component.schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname, '..', '..');
const COMPONENTES = [
  'layout/page-header', 'feedback/empty-state', 'media/person', 'data/stat-group', 'forms/tenant-selector', 'overlays/semantic-search',
  'feedback/loading', 'feedback/status-pill', 'data/trace-log', 'navigation/pagination', 'overlays/json-dialog', 'feedback/stream-bubble',
];
const base = (ruta: string): string => join(RAIZ, 'src', 'components', ruta);
const tagDe = (ruta: string): string => `iswc-${ruta.split('/')[1]}`;

test('migrados: .ts + .scss + .md + .json hermanos', () => {
  for (const c of COMPONENTES) for (const ext of ['.ts', '.scss', '.md', '.json']) assert.ok(existsSync(base(c) + ext), `falta ${c}${ext}`);
});

test('migrados: registrados en el manifest, el catálogo de previews y la skill', () => {
  const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  const catalogo = readFileSync(join(RAIZ, 'src', 'previews', 'catalog.ts'), 'utf8');
  const skill = readFileSync(join(RAIZ, 'skills', 'iswc-root', 'SKILL.md'), 'utf8');
  for (const c of COMPONENTES) {
    const tag = tagDe(c);
    assert.ok(manifest.includes(`tag: '${tag}'`), `${tag} en manifest.ts`);
    assert.ok(catalogo.includes(`"${tag}"`), `${tag} en catalog.ts`);
    assert.ok(skill.includes(`<${tag}>`), `${tag} en SKILL.md`);
  }
});

test('migrados: demo iswc-preview/v1 con target y controles', () => {
  for (const c of COMPONENTES) {
    const doc = ComponentJsonSchema.parse(JSON.parse(readFileSync(`${base(c)}.json`, 'utf8')));
    assert.equal(doc.tag, tagDe(c));
    const demos = doc.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'demo');
    assert.ok(demos.some((b) => b.kind === 'demo' && (b.controls ?? []).length >= 1), `${c}: el demo necesita playground`);
  }
});

test('migrados: sin textos del dominio de la app de origen', () => {
  for (const c of COMPONENTES) {
    for (const ext of ['.ts', '.scss', '.md', '.json']) {
      assert.doesNotMatch(readFileSync(base(c) + ext, 'utf8'), /\b(paty|patyia|iss|avatar demo)\b/i, `${c}${ext}`);
    }
  }
});

test('migrados: tamaños en em, sin px ni rem, sin hex y sin tokens inexistentes', () => {
  for (const c of COMPONENTES) {
    const scss = readFileSync(`${base(c)}.scss`, 'utf8');
    assert.doesNotMatch(scss, /\d(px|rem)\b/, `${c}: medida absoluta`);
    assert.doesNotMatch(scss, /#[0-9a-f]{3,8}\b/i, `${c}: color literal`);
    assert.doesNotMatch(scss, /--iswc-color-brand-500|--iswc-font-/, `${c}: token inexistente`);
  }
});

test('migrados: los indicadores de progreso no se quedan quietos con movimiento reducido', () => {
  for (const c of COMPONENTES) {
    const reducido = readFileSync(`${base(c)}.scss`, 'utf8').split('prefers-reduced-motion')[1] ?? '';
    assert.doesNotMatch(reducido, /\.(vivo|cursor|punto|paso-pulso)[^}]*animation: none/, `${c}: progreso detenido`);
  }
});

export default lista();
