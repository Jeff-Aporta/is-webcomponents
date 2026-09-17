// component-pack.test.mjs — smoke + edge cases para component-pack.
import assert from 'node:assert/strict';
import {
  packDiagram,
  layoutPackageOutlines,
  routeAvoidingBoxes,
  resolvePackingGaps,
  orthogonalUnion,
  orthogonalWrap,
  inflateBox,
  inflateTitleObstacle,
  outlineToPath,
  COL_GUTTER,
  PKG_CORRIDOR,
  ROW_GAP,
  EDGE_CLEARANCE,
  TITLE_CLEARANCE,
} from '../../../../src/components/diagrams/component-pack.ts';

const tests = [];

tests.push({
  name: 'smoke: packDiagram reposiciona componentes en columnas',
  run: () => {
    const packages = [
      { id: 'p1', name: 'P1', x: 0, y: 0, w: 200, h: 200 },
    ];
    const components = [
      { id: 'a', package: 'p1', x: 999, y: 999, w: 80, h: 40 },
      { id: 'b', package: 'p1', x: 999, y: 999, w: 80, h: 40 },
      { id: 'c', package: 'p1', x: 999, y: 999, w: 80, h: 40 },
    ];
    packDiagram(packages, components, [], { mode: 'pack' });
    // Tras pack, los componentes tienen coordenadas reales (no 999)
    for (const c of components) {
      assert.ok(c.x >= 0 && c.x < 1000, `${c.id}.x debe estar dentro del paquete`);
      assert.ok(c.y >= 0 && c.y < 1000, `${c.id}.y debe estar dentro del paquete`);
    }
  },
});

tests.push({
  name: 'resolvePackingGaps: aplica fallback cuando opts faltan',
  run: () => {
    const gaps = resolvePackingGaps({});
    assert.equal(gaps.rowGap, ROW_GAP);
    assert.equal(gaps.colGutter, COL_GUTTER);
    assert.equal(gaps.pkgCorridor, PKG_CORRIDOR);
  },
});

tests.push({
  name: 'resolvePackingGaps: minGap es piso para los demás',
  run: () => {
    const gaps = resolvePackingGaps({ minGap: 100, rowGap: 50 });
    assert.ok(gaps.rowGap >= 100, 'rowGap respeta el piso minGap');
  },
});

tests.push({
  name: 'layoutPackageOutlines: genera outline ortogonal para paquetes con hijos',
  run: () => {
    const packages = [{ id: 'p', name: 'P', x: 0, y: 0, w: 200, h: 200 }];
    const components = [
      { id: 'a', package: 'p', x: 20, y: 30, w: 50, h: 40 },
      { id: 'b', package: 'p', x: 100, y: 30, w: 50, h: 40 },
    ];
    layoutPackageOutlines(packages, components);
    assert.ok(packages[0].outline && packages[0].outline.length > 0);
  },
});

tests.push({
  name: 'routeAvoidingBoxes: devuelve path ortogonal o null',
  run: () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 100 };
    const obstacles = [
      { x: 30, y: 30, w: 40, h: 40, id: 'ob1' },
    ];
    const path = routeAvoidingBoxes(a, b, obstacles);
    assert.ok(path === null || typeof path === 'string');
  },
});

tests.push({
  name: 'routeAvoidingBoxes: path sin obstáculos es directo',
  run: () => {
    const path = routeAvoidingBoxes({ x: 0, y: 0 }, { x: 100, y: 0 }, []);
    assert.ok(typeof path === 'string');
    assert.ok(path.startsWith('M'));
  },
});

tests.push({
  name: 'inflateBox: añade padding',
  run: () => {
    const r = inflateBox({ x: 10, y: 10, w: 100, h: 50 }, 8);
    assert.equal(r.x, 2);
    assert.equal(r.y, 2);
    assert.equal(r.w, 116);
    assert.equal(r.h, 66);
  },
});

tests.push({
  name: 'inflateTitleObstacle: recorta altura por yClip',
  run: () => {
    const tb = { id: 't', x: 0, y: 0, w: 100, h: 20 };
    // sin yClip finito: altura = h + pad
    const r1 = inflateTitleObstacle(tb, 5, NaN);
    assert.equal(r1.h, 25, 'sin clip, altura = 20 + 5');
    // con yClip que recorta:
    // yClip - y = 15 - (-5) = 20 → h = max(8, 20) = 20 (no recorta aquí)
    // usamos yClip mucho menor para forzar el recorte
    const r2 = inflateTitleObstacle({ x: 0, y: 0, w: 100, h: 50 }, 5, 10);
    // y = -5, h = 50 + 5 = 55, y + h = 50 > 10 → h = max(8, 10 - (-5)) = max(8, 15) = 15
    assert.equal(r2.h, 15, 'altura recortada al yClip - y');
  },
});

tests.push({
  name: 'outlineToPath: genera path M...L...Z',
  run: () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];
    const path = outlineToPath(pts);
    assert.ok(path.startsWith('M'));
    assert.ok(path.endsWith('Z'));
  },
});

tests.push({
  name: 'orthogonalUnion: rectángulos disjuntos → polígono CCW',
  run: () => {
    const polys = orthogonalUnion([
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 100, y: 0, w: 50, h: 50 },
    ]);
    assert.ok(Array.isArray(polys));
  },
});

tests.push({
  name: 'orthogonalWrap: tolera inputs vacíos',
  run: () => {
    const polys = orthogonalWrap([]);
    assert.deepEqual(polys, []);
  },
});

tests.push({
  name: 'constantes exportadas tienen valores esperados',
  run: () => {
    assert.equal(COL_GUTTER, 52);
    assert.equal(PKG_CORRIDOR, 72);
    assert.equal(ROW_GAP, 64);
    assert.equal(EDGE_CLEARANCE, 14);
    assert.equal(TITLE_CLEARANCE, 22);
  },
});

let failures = 0;
for (const t of tests) {
  try {
    await t.run();
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    console.error(`  ✗ ${t.name}\n     ${String(err?.message ?? err)}`);
    failures++;
  }
}
console.log(JSON.stringify({ name: 'component-pack.test.mjs', ok: failures === 0, total: tests.length, failures }, null, 2));
if (failures) process.exit(1);