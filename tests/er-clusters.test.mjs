/**
 * Guardián del layout por agrupadores de <is-er-diagram> (er-spec.js).
 *
 * Vigila lo que se rompió al menos una vez y no debe volver a romperse:
 *   1. Un grupo declarado se dibuja como cajón y sus entidades quedan DENTRO.
 *   2. Dos cajones no se solapan (si se tocan, el diagrama miente sobre a qué
 *      base pertenece cada tabla).
 *   3. El `ratio` guía manda: pedir apaisado da un lienzo más ancho que pedir
 *      vertical, con el mismo contenido.
 *   4. Las entidades sin relaciones dentro de su cajón NO se apilan en una sola
 *      columna (el bug de la tira vertical de 14 tablas).
 *   5. Las etiquetas de relación caen dentro del lienzo (antes se cortaban).
 */
import test from 'node:test';
import assert from 'node:assert';
import { resolveErSpec, computeErLayout } from '../src/components/diagrams/er-spec.js';

/** Entidad mínima con n atributos. */
function entidad(id, group, n = 2) {
  return {
    id,
    name: id,
    group,
    attributes: Array.from({ length: n }, (_, i) => ({ name: `c${i}`, type: 'varchar', key: i === 0 ? 'PK' : undefined })),
  };
}

/** Dos grupos, relaciones internas en cada uno y una que cruza. */
function payloadDosGrupos(ratio) {
  return {
    erDiagram: {
      ratio,
      direction: 'LR',
      groups: [
        { id: 'a', name: 'Base A', hue: 210 },
        { id: 'b', name: 'Base B', hue: 38 },
      ],
      entities: [
        entidad('A1', 'a'), entidad('A2', 'a'), entidad('A3', 'a'),
        entidad('B1', 'b'), entidad('B2', 'b'), entidad('B3', 'b'),
      ],
      relations: [
        { from: 'A1', to: 'A2', label: 'usa' },
        { from: 'A2', to: 'A3', label: 'tiene' },
        { from: 'B1', to: 'B2', label: 'asigna' },
        { from: 'A1', to: 'B1', label: 'cruza', identifying: false },
      ],
    },
  };
}

function seSolapan(p, q) {
  return p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
}

test('cada grupo declarado produce un cajón con nombre', () => {
  const layout = computeErLayout(resolveErSpec(payloadDosGrupos(1.2)));
  assert.strictEqual(layout.clusters.length, 2, 'dos grupos → dos cajones');
  assert.deepStrictEqual(
    layout.clusters.map((c) => c.name).sort(),
    ['Base A', 'Base B'],
    'el cajón conserva el nombre del grupo',
  );
});

test('las entidades de un grupo caen dentro de su cajón', () => {
  const layout = computeErLayout(resolveErSpec(payloadDosGrupos(1.2)));
  const porId = new Map(layout.clusters.map((c) => [c.id, c]));
  for (const e of layout.entities) {
    const caja = porId.get(e.group);
    assert.ok(caja, `la entidad ${e.id} declara grupo ${e.group} sin cajón`);
    assert.ok(
      e.x >= caja.x && e.y >= caja.y && e.x + e.w <= caja.x + caja.w && e.y + e.h <= caja.y + caja.h,
      `${e.id} se sale del cajón ${caja.name}`,
    );
  }
});

test('los cajones no se solapan entre sí', () => {
  const layout = computeErLayout(resolveErSpec(payloadDosGrupos(1.2)));
  for (let i = 0; i < layout.clusters.length; i++) {
    for (let j = i + 1; j < layout.clusters.length; j++) {
      assert.ok(
        !seSolapan(layout.clusters[i], layout.clusters[j]),
        `los cajones ${layout.clusters[i].name} y ${layout.clusters[j].name} se solapan`,
      );
    }
  }
});

test('el ratio guía cambia la forma del lienzo', () => {
  const apaisado = computeErLayout(resolveErSpec(payloadDosGrupos(3)));
  const vertical = computeErLayout(resolveErSpec(payloadDosGrupos(0.4)));
  assert.ok(
    apaisado.width / apaisado.height > vertical.width / vertical.height,
    `ratio 3 (${(apaisado.width / apaisado.height).toFixed(2)}) debe salir más ancho que ratio 0.4 (${(vertical.width / vertical.height).toFixed(2)})`,
  );
});

test('las entidades sueltas se reparten en rejilla, no en una tira vertical', () => {
  // Seis tablas sin ninguna relación: el motor de capas las mandaba todas a la
  // capa 0 y el cajón salía como una columna larguísima.
  const payload = {
    erDiagram: {
      ratio: 1,
      groups: [{ id: 'g', name: 'Sueltas', hue: 210 }],
      entities: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((id) => entidad(id, 'g')),
      relations: [],
    },
  };
  const layout = computeErLayout(resolveErSpec(payload));
  const columnas = new Set(layout.entities.map((e) => e.x)).size;
  assert.ok(columnas > 1, `las 6 entidades sueltas quedaron en ${columnas} columna(s)`);
  const forma = layout.width / layout.height;
  assert.ok(forma > 0.35 && forma < 3, `lienzo desbocado para ratio 1: ${forma.toFixed(2)}`);
});

test('las etiquetas de relación caen dentro del lienzo', () => {
  const layout = computeErLayout(resolveErSpec(payloadDosGrupos(1.2)));
  for (const r of layout.relations.filter((x) => x.label)) {
    const media = r.label.length * 2.8;
    assert.ok(
      r.labelX - media >= 0 && r.labelX + media <= layout.width,
      `la etiqueta "${r.label}" se sale por el eje x (${r.labelX} de ${layout.width})`,
    );
    assert.ok(
      r.labelY >= 0 && r.labelY <= layout.height,
      `la etiqueta "${r.label}" se sale por el eje y (${r.labelY} de ${layout.height})`,
    );
  }
});
