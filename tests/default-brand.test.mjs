import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

/* El "default brand" es la convención de esta app: cuando un componente
   tiene atributo `variant`, el default debe ser 'brand' (color de marca),
   NO 'neutral'. Esto es por consistencia visual — neutral queda como
   opción para "informativo neutro" pero NO como el primer render que ve
   el usuario. Esta regla se aplica a todos los componentes con variant:
   button, tag, callout, toast-item, stat, badge. */

const VARIANT_DEFAULTS = [
  { file: 'components/actions/button.js', expected: 'brand' },
  { file: 'components/feedback/tag.js', expected: 'brand' },
  { file: 'components/layout/callout.js', expected: 'brand' },
  { file: 'components/feedback/toast-item.js', expected: 'brand' },
  { file: 'components/data/stat.js', expected: 'brand' },
];

test('Todos los componentes con variant tienen default="brand" (no "neutral")', () => {
  for (const { file, expected } of VARIANT_DEFAULTS) {
    const src = readFileSync(join(root, file), 'utf8');
    // Busca patrón "setAttribute('variant', 'XXX')" o "|| 'XXX'"
    const setAttr = new RegExp(
      `setAttribute\\(\\s*['"]variant['"]\\s*,\\s*['"](${expected})['"]\\s*\\)`,
    ).test(src);
    const fallback = new RegExp(
      `getAttribute\\(\\s*['"]variant['"]\\s*\\)\\s*\\|\\|\\s*['"](${expected})['"]`,
    ).test(src);
    assert.ok(
      setAttr || fallback,
      `${file} debe setear variant='${expected}' cuando no se proporciona el atributo`,
    );
    // NO debe haber fallback 'neutral' en connectedCallback.
    // (es OK que attributeChangedCallback revierta a 'neutral' como red
    // de seguridad para valores inválidos).
    // Buscamos el patrón solo dentro del bloque connectedCallback { ... }.
    const ccb = src.match(/connectedCallback\s*\(\s*\)\s*\{([\s\S]*?)\n\s*\}/);
    const ccbBlock = ccb ? ccb[1] : '';
    if (ccbBlock) {
      const wrongInCCB = /setAttribute\(\s*['"]variant['"]\s*,\s*['"]neutral['"]/.test(ccbBlock);
      const wrongFallbackInCCB = /getAttribute\(\s*['"]variant['"]\s*\)\s*\|\|\s*['"]neutral['"]/.test(ccbBlock);
      assert.ok(
        !wrongInCCB && !wrongFallbackInCCB,
        `${file} connectedCallback() NO debe tener variant='neutral' como default (regla: brand por defecto)`,
      );
    }
  }
});

test('is-badge sigue declarando default="brand"', () => {
  // Sanity check: el badge ya era brand antes de la migración, no debe
  // haberse "neutralizado" por error.
  const src = readFileSync(join(root, 'components/feedback/badge.js'), 'utf8');
  assert.ok(
    /setAttribute\(\s*['"]variant['"]\s*,\s*['"]brand['"]/.test(src),
    'is-badge debe mantener default variant="brand"',
  );
});

test('Documentación (.md) refleja default brand en componentes migrados', () => {
  for (const { file } of VARIANT_DEFAULTS) {
    const mdPath = file.replace(/\.js$/, '.md');
    const md = readFileSync(join(root, mdPath), 'utf8');
    // El doc-block del .md debe mencionar "default brand" o "(default: brand)"
    const ok = /default[\s:]*['"]?brand/.test(md) || /\(default: brand\)/.test(md);
    assert.ok(ok, `${mdPath} debe documentar default brand en su doc-block`);
    // Y NO debe mencionar "default neutral" como default
    const wrong = /variant\s+brand\s*\|\s*neutral[^\n]*\(default\s+neutral\)/.test(md) ||
                  /variant\s+brand\s*\|\s*neutral[^\n]*\(default:\s*neutral\)/.test(md);
    assert.ok(!wrong, `${mdPath} NO debe seguir diciendo "default neutral"`);
  }
});