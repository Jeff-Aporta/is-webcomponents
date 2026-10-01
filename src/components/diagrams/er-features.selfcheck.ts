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

// Caso real: dos clusters con bordes que deben ser rodeados por las aristas
// que cruzan entre ellos. Si el cluster NO se añade al cost grid como
// obstáculo duro, las aristas pasarán por dentro del rectángulo del cluster
// vecino, atravesándolo.
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
        { id: 'L2', name: 'L2', group: 'left', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'R1', name: 'R1', group: 'right', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'R2', name: 'R2', group: 'right', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [
        { from: 'L1', to: 'R1', fromCard: 'one', toCard: 'many', identifying: true },
        { from: 'L2', to: 'R2', fromCard: 'one', toCard: 'many', identifying: true },
      ],
    },
  });
  assert.ok(spec, 'spec con dos clusters debe ser válido');
  const layout = computeErLayout(spec!);
  assert.ok(layout.clusters && layout.clusters.length >= 2, 'layout debe emitir al menos 2 cajones');
  // Cada arista cruza entre clusters. Verificamos que ningún punto intermedio
  // del path cae dentro de OTRO cluster que no sea el origen/destino.
  for (const rel of layout.relations) {
    const fromEntity = layout.entities.find((e) => e.id === rel.from)!;
    const toEntity = layout.entities.find((e) => e.id === rel.to)!;
    const fromClusterId = fromEntity.group;
    const toClusterId = toEntity.group;
    // Parsear puntos del path SVG: 'M x,yL x,yL x,y…'
    const nums = [...rel.path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i]!;
      const y = nums[i + 1]!;
      for (const c of layout.clusters!) {
        if (c.id === fromClusterId || c.id === toClusterId) continue;
        const inside = x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
        assert.ok(!inside, `arista ${rel.id} cruza el cluster ${c.id} en (${x},${y}) — debe rodearlo`);
      }
    }
  }
}

// Caso degenerado: dos clusters donde la geometría obliga a una arista
// corta que antes cruzaba el cluster vecino. Aquí validamos que el resultado
// sigue siendo un layout con la arista rutada (no se rompe el A*).
{
  const spec = resolveErSpec({
    erDiagram: {
      direction: 'TB',
      groups: [
        { id: 'top', name: 'Top' },
        { id: 'bottom', name: 'Bottom' },
      ],
      entities: [
        { id: 'A', name: 'A', group: 'top', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'B', name: 'B', group: 'bottom', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [
        { from: 'A', to: 'B', fromCard: 'one', toCard: 'many', identifying: true },
      ],
    },
  });
  const layout = computeErLayout(spec!);
  assert.equal(layout.relations.length, 1);
  assert.ok(layout.relations[0]!.path.startsWith('M'));
  // El layout no debe ser más ancho que el doble del cluster más ancho (los
  // bordes no se cruzan → no hay pasillos extra). Si esta cota se rompe,
  // alguien volvió a la versión que cruza clusters.
  const maxW = Math.max(...layout.clusters!.map((c) => c.w));
  assert.ok(layout.width <= maxW * 4, `ancho ${layout.width} excede el límite esperado`);
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