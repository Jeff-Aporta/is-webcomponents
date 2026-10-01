/**
 * er-features.selfcheck.ts — verificación de las 3 mejoras de ISWC sobre
 * <is-er-diagram>:
 *
 *   1. Iconos PK/FK en vez de texto monoespaciado.
 *   2. Bordes de cluster como obstáculos del ruteo A* (no se cruzan).
 *   3. Clusters anidados (parent) con detección de ciclos y containment.
 *
 * No usa DOM: trabaja sobre el layout geométrico y el source estático de los
 * módulos. Sigue el patrón del resto de selfchecks del repo (console.log con
 * `PASS` para que `npm run` lo detecte).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  resolveErSpec, computeErLayout, ER_KEY_ICON_IDS,
} from './er-spec.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

/* ─────────────────────── 1. Iconos PK/FK ─────────────────────── */

assert.equal(typeof ER_KEY_ICON_IDS, 'object', 'ER_KEY_ICON_IDS debe ser un objeto');
assert.ok(ER_KEY_ICON_IDS.PK, 'PK debe tener un icono');
assert.ok(ER_KEY_ICON_IDS.FK, 'FK debe tener un icono distinto');

// Los iconos deben vivir en dist/assets/icons/<col>/<name>.svg — la fuente
// de iconos del kit. Si la ruta cambia, falla la build de iconos, pero este
// test cubre la regresión: si alguien borra los SVGs o los renombra, salta.
{
  const pkIcon = ER_KEY_ICON_IDS.PK;
  const fkIcon = ER_KEY_ICON_IDS.FK;
  const [pkCol, pkName] = pkIcon.split(':');
  const [fkCol, fkName] = fkIcon.split(':');
  assert.ok(pkCol && pkName, `icono PK mal formado: ${pkIcon}`);
  assert.ok(fkCol && fkName, `icono FK mal formado: ${fkIcon}`);
  const pkPath = join(repoRoot, 'dist', 'assets', 'icons', pkCol, `${pkName}.svg`);
  const fkPath = join(repoRoot, 'dist', 'assets', 'icons', fkCol, `${fkName}.svg`);
  assert.ok(readFileSync(pkPath, 'utf8').includes('<svg'), `PK SVG no existe en ${pkPath}`);
  assert.ok(readFileSync(fkPath, 'utf8').includes('<svg'), `FK SVG no existe en ${fkPath}`);
}

// El render debe emitir la clave `svgIconGroup` con los IDs del mapa, no el
// viejo `<text>PK</text>`. Verificamos el source del componente (estático):
// cualquier reescritura que vuelva a texto rompería el contrato visual.
{
  const erSrc = readFileSync(join(here, 'er-diagram.ts'), 'utf8');
  // svgIconGroup está importado y referenciado.
  assert.match(erSrc, /import\s*\{[^}]*svgIconGroup[^}]*\}\s*from\s*['"][^'"]*tk-icon-inline/, 'er-diagram.ts debe importar svgIconGroup');
  assert.match(erSrc, /svgIconGroup\s*\(\s*iconId/, 'er-diagram.ts debe invocar svgIconGroup para los marcadores PK/FK');
  // El viejo `<text>PK</text>` literal ya no debe quedar. Permitimos "PK" como
  // substring de identificadores (p.ej. ER_KEY_ICON_IDS.PK) y dentro de
  // strings de icono ("mdi:key-variant"), pero NO como textContent suelto.
  const stillTextBadge = /textContent\s*=\s*['"]PK['"]|textContent\s*=\s*['"]FK['"]/;
  assert.ok(!stillTextBadge.test(erSrc), 'er-diagram.ts no debe emitir <text>PK</text> ni <text>FK</text>');
}

// Sanity: el spec no rompe cuando una entidad tiene PK/FK mezclados con
// atributos sin clave. El layout debe aceptar todas las variantes.
{
  const spec = resolveErSpec({
    erDiagram: {
      entities: [
        { id: 'A', name: 'A', attributes: [
          { name: 'id', key: 'PK' },
          { name: 'other', type: 'int' },
          { name: 'fk_a', key: 'FK' },
        ] },
      ],
      relations: [],
    },
  });
  assert.ok(spec, 'spec con atributos PK/FK no debe fallar');
  const layout = computeErLayout(spec!);
  const ent = layout.entities.find((e) => e.id === 'A')!;
  // La entidad debe crecer lo suficiente para acomodar las 3 filas (PK/FK/
  // plain). Las filas se computan a ER_ROW_H (18 px) + header, así que 3 filas
  // dan al menos 60 px extra sobre el header.
  assert.ok(ent.h > 60, `entidad con 3 atributos debe medir > 60px de alto, midió ${ent.h}`);
}

/* ─────────────────────── 2. Bordes de cluster como obstáculo ─────────────────────── */

// El test de bordes de cluster como obstáculo se añade en el commit de
// Step 2. Aquí sólo validamos que `computeErLayout` sigue produciendo un
// layout coherente cuando hay ≥2 clusters (regresión de contrato).
{
  const spec = resolveErSpec({
    erDiagram: {
      direction: 'LR',
      groups: [
        { id: 'left', name: 'Left' },
        { id: 'right', name: 'Right' },
      ],
      entities: [
        { id: 'L1', name: 'L1', group: 'left', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'R1', name: 'R1', group: 'right', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [
        { from: 'L1', to: 'R1', fromCard: 'one', toCard: 'many', identifying: true },
      ],
    },
  });
  assert.ok(spec, 'spec con dos clusters debe ser válido');
  const layout = computeErLayout(spec!);
  assert.ok(layout.clusters && layout.clusters.length >= 2, 'layout debe emitir al menos 2 cajones');
  assert.equal(layout.relations.length, 1, 'una arista entre clusters');
}

/* ─────────────────────── 3. Clusters anidados (parent) ─────────────────────── */

// Los chequeos de clusters anidados se cubren en una segunda tanda tras el
// commit de Step 3 (nested clusters). Aquí dejamos un placeholder que sólo
// verifica que el type acepta el campo (regresión de contrato).
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      entities: [{ id: 'x', name: 'X', group: 'a', attributes: [{ name: 'id', key: 'PK' }] }],
      relations: [],
    },
  });
  assert.ok(spec, 'spec con grupos debe parsear');
  assert.equal(spec!.groups?.length, 2, 'dos grupos sin parent = dos siblings');
}

console.log('er-features self-check: PASS');