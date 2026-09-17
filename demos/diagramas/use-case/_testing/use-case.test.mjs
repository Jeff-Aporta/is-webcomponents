// use-case.test.mjs — tests del spec `use-case-spec` (funciones puras, sin DOM).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveUseCaseSpec,
  useCaseSpecToJson,
  computeUseCaseLayout,
  LINK_KINDS,
} from '../../../../src/components/diagrams/use-case-spec.ts';

const validPayload = {
  useCase: {
    system: 'Sistema X',
    actors: [
      { id: 'cli', label: 'Cliente', side: 'left' },
      { id: 'adm', label: 'Admin', side: 'right' },
    ],
    cases: [
      { id: 'c1', label: 'caso 1' },
      { id: 'c2', label: 'caso 2' },
    ],
    links: [
      { from: 'cli', to: 'c1' },
      { from: 'adm', to: 'c2' },
      { from: 'c1', to: 'c2', kind: 'include' },
    ],
  },
};

test('smoke: import no lanza', () => {
  assert.equal(typeof resolveUseCaseSpec, 'function');
  assert.equal(typeof computeUseCaseLayout, 'function');
});

test('payload vacío devuelve null', () => {
  assert.equal(resolveUseCaseSpec({}), null);
});

test('LINK_KINDS incluye los 4 tipos', () => {
  for (const k of ['association', 'include', 'extend', 'generalization']) {
    assert.ok(LINK_KINDS.has(k));
  }
});

test('spec mínimo produce layout con system, actors, cases', () => {
  const spec = resolveUseCaseSpec(validPayload);
  assert.ok(spec);
  assert.equal(spec.system, 'Sistema X');
  assert.equal(spec.actors.length, 2);
  assert.equal(spec.cases.length, 2);
  assert.equal(spec.links.length, 3);
  const layout = computeUseCaseLayout(spec);
  assert.ok(layout.width > 0);
  assert.ok(layout.height > 0);
  assert.equal(layout.actors.length, 2);
  assert.equal(layout.cases.length, 2);
  assert.equal(layout.links.length, 3);
  // el link include debe llevar stereotype
  const incl = layout.links.find((l) => l.kind === 'include');
  assert.equal(incl.stereotype, '«include»');
});

test('edge case: link con origen o destino inexistente se descarta', () => {
  const spec = resolveUseCaseSpec({
    useCase: {
      cases: [{ id: 'c1', label: 'caso 1' }],
      actors: [{ id: 'a1', label: 'A1', side: 'left' }],
      links: [
        { from: 'a1', to: 'c1' }, // válida
        { from: 'NOEXISTE', to: 'c1' }, // colgante
        { from: 'c1', to: 'NOEXISTE' }, // colgante
      ],
    },
  });
  assert.equal(spec.links.length, 1);
});

test('side default es "left" cuando falta o es inválido', () => {
  const spec = resolveUseCaseSpec({
    useCase: {
      cases: [{ id: 'c1', label: 'caso 1' }],
      actors: [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2', side: 'invalid' }],
    },
  });
  assert.equal(spec.actors[0].side, 'left');
  assert.equal(spec.actors[1].side, 'left');
});

test('round-trip JSON idéntico', () => {
  const spec = resolveUseCaseSpec(validPayload);
  const j1 = JSON.stringify(useCaseSpecToJson(spec));
  const j2 = JSON.stringify(useCaseSpecToJson(resolveUseCaseSpec(JSON.parse(j1))));
  assert.equal(j1, j2);
});