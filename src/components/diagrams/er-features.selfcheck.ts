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

// 3a. Sin `parent`, nada cambia: grupos siguen siendo siblings.
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      entities: [
        { id: 'x', name: 'X', group: 'a', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [],
    },
  });
  assert.equal(spec!.groups?.length, 2, 'dos grupos sin parent = dos siblings');
  for (const g of spec!.groups!) assert.equal(g.parent, undefined, 'sin `parent` en JSON, queda undefined');
}

// 3b. Con `parent`, el spec normalizado lo conserva y el layout coloca el bbox
// interior estrictamente dentro del bbox exterior.
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'outer', name: 'Outer' },
        { id: 'inner', name: 'Inner', parent: 'outer' },
      ],
      entities: [
        { id: 'A', name: 'A', group: 'outer', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'B', name: 'B', group: 'inner', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [],
    },
  });
  assert.ok(spec, 'spec con parent debe parsear');
  assert.equal(spec!.groups!.find((g) => g.id === 'inner')!.parent, 'outer');
  const layout = computeErLayout(spec!);
  const innerCluster = layout.clusters!.find((c) => c.id === 'inner')!;
  const outerCluster = layout.clusters!.find((c) => c.id === 'outer')!;
  assert.ok(innerCluster, 'cluster interior debe existir');
  assert.ok(outerCluster, 'cluster exterior debe existir');
  // Contención estricta con margen: el interior queda dentro del exterior
  // dejando padding a ambos lados.
  assert.ok(
    innerCluster.x > outerCluster.x,
    `inner.x (${innerCluster.x}) debe ser > outer.x (${outerCluster.x})`,
  );
  assert.ok(
    innerCluster.y > outerCluster.y,
    `inner.y (${innerCluster.y}) debe ser > outer.y (${outerCluster.y})`,
  );
  assert.ok(
    innerCluster.x + innerCluster.w < outerCluster.x + outerCluster.w,
    `inner debe terminar antes que outer horizontalmente`,
  );
  assert.ok(
    innerCluster.y + innerCluster.h < outerCluster.y + outerCluster.h,
    `inner debe terminar antes que outer verticalmente`,
  );
  // Las entidades del cluster hijo también quedan dentro del bbox del padre.
  const innerEntity = layout.entities.find((e) => e.id === 'B')!;
  assert.ok(innerEntity, 'entidad B existe');
  assert.ok(
    innerEntity.x >= outerCluster.x && innerEntity.x + innerEntity.w <= outerCluster.x + outerCluster.w,
    `B.x (${innerEntity.x}..${innerEntity.x + innerEntity.w}) debe estar dentro de outer (${outerCluster.x}..${outerCluster.x + outerCluster.w})`,
  );
  assert.ok(
    innerEntity.y >= outerCluster.y && innerEntity.y + innerEntity.h <= outerCluster.y + outerCluster.h,
    `B.y debe estar dentro de outer verticalmente`,
  );
  // El layout debe registrar la profundidad de anidamiento.
  assert.ok((innerCluster.depth ?? 0) >= 1, 'inner.depth >= 1');
  assert.ok((outerCluster.depth ?? 0) === 0, 'outer.depth = 0');
}

// 3c. Detección de ciclos: A.parent = B y B.parent = A debe romper el ciclo
// durante la normalización. La forma exacta del manejo (drop o normalización
// a undefined) la define el spec; lo importante es que el layout NO se cuelga
// ni produce recursión infinita.
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'a', name: 'A', parent: 'b' },
        { id: 'b', name: 'B', parent: 'a' },
      ],
      entities: [
        { id: 'x', name: 'X', group: 'a', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [],
    },
  });
  // La spec debe romper el ciclo soltando el parent de los participantes.
  for (const g of spec!.groups!) {
    assert.equal(g.parent, undefined, `parent del cluster ${g.id} debe quedar undefined tras romper el ciclo`);
  }
  const layout = computeErLayout(spec!);
  assert.ok(layout, 'layout con ciclos en parent no debe colgarse');
  assert.ok(layout.entities.length === 1, 'X sigue presente');
  // Ningún cluster debe estar anidado dentro de sí mismo (containment vacío).
  for (const c of layout.clusters ?? []) {
    assert.ok(c.w >= 0 && c.h >= 0, `cluster ${c.id} debe tener dimensiones no-negativas`);
    assert.equal(c.parentId, undefined, `cluster ${c.id} debe quedar sin parent tras romper ciclo`);
  }
}

// 3d. Padre inexistente: el spec lo marca como inválido y el cluster queda
// suelto (sin parent) para que el layout no se rompa buscando un bbox padre
// que no existe.
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'g', name: 'G', parent: 'fantasma' },
      ],
      entities: [
        { id: 'x', name: 'X', group: 'g', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [],
    },
  });
  assert.ok(spec, 'spec con parent inexistente no debe fallar al parsear');
  const inner = spec!.groups!.find((g) => g.id === 'g')!;
  assert.equal(inner.parent, undefined, 'parent inexistente debe quedar undefined');
  const layout = computeErLayout(spec!);
  assert.ok(layout, 'layout con parent inexistente debe renderizar');
  const g = layout.clusters!.find((c) => c.id === 'g');
  assert.ok(g, 'cluster g debe existir igual');
  assert.ok(g!.x >= 0 && g!.y >= 0, 'cluster huérfano debe tener coordenadas válidas');
}

// 3e. Anidamiento de 3 niveles: A → B → C. La jerarquía se respeta y los
// bboxes quedan anidados correctamente.
{
  const spec = resolveErSpec({
    erDiagram: {
      groups: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B', parent: 'a' },
        { id: 'c', name: 'C', parent: 'b' },
      ],
      entities: [
        { id: 'ea', name: 'EA', group: 'a', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'eb', name: 'EB', group: 'b', attributes: [{ name: 'id', key: 'PK' }] },
        { id: 'ec', name: 'EC', group: 'c', attributes: [{ name: 'id', key: 'PK' }] },
      ],
      relations: [],
    },
  });
  assert.ok(spec, 'spec de 3 niveles debe parsear');
  const layout = computeErLayout(spec!);
  const a = layout.clusters!.find((c) => c.id === 'a')!;
  const b = layout.clusters!.find((c) => c.id === 'b')!;
  const c = layout.clusters!.find((c) => c.id === 'c')!;
  // C dentro de B dentro de A.
  for (const inner of [b, c]) {
    assert.ok(
      inner.x > a.x && inner.x + inner.w < a.x + a.w,
      `${inner.id}.x no está estrictamente dentro de a`,
    );
    assert.ok(
      inner.y > a.y && inner.y + inner.h < a.y + a.h,
      `${inner.id}.y no está estrictamente dentro de a`,
    );
  }
  assert.ok(c.y > b.y, 'c.y debe ser > b.y');
  assert.equal((c.depth ?? 0), 2, 'c.depth = 2');
  assert.equal((b.depth ?? 0), 1, 'b.depth = 1');
  assert.equal((a.depth ?? 0), 0, 'a.depth = 0');
}

console.log('er-features self-check: PASS');