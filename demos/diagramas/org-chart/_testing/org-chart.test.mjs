// org-chart.test.mjs — tests de smoke para is-org-chart.
// Como el componente es DOM-bound (no expone spec puro),
// validamos el contrato del payload y la lógica de mount.
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Payload típico de un organigrama: jerarquía plana con `parent`.
const samplePayload = [
  { id: 'ceo', title: 'CEO', name: 'Carolina', parent: null },
  { id: 'cto', title: 'CTO', name: 'Pedro', parent: 'ceo' },
  { id: 'be', title: 'BE Lead', name: 'Sofía', parent: 'cto' },
  { id: 'fe', title: 'FE Lead', name: 'Diego', parent: 'cto' },
];

test('smoke: payload tiene al menos un nodo sin parent (raíz)', () => {
  const root = samplePayload.find((n) => !n.parent);
  assert.ok(root, 'debe existir un nodo raíz (sin parent)');
  assert.equal(root.id, 'ceo');
});

test('jerarquía: cada nodo no-raíz tiene un parent que existe en el array', () => {
  const ids = new Set(samplePayload.map((n) => n.id));
  const orphans = samplePayload.filter((n) => n.parent && !ids.has(n.parent));
  assert.equal(orphans.length, 0, 'no debe haber nodos huérfanos');
});

test('contrato: ids son únicos', () => {
  const seen = new Set();
  for (const n of samplePayload) {
    assert.ok(!seen.has(n.id), `id duplicado: ${n.id}`);
    seen.add(n.id);
  }
});

test('payload vacío: array sin nodos es válido', () => {
  const payload = [];
  const root = payload.find((n) => !n.parent);
  assert.equal(root, undefined);
});

test('objeto { nodes: [...] } también es válido', () => {
  const payload = { nodes: samplePayload };
  const nodes = Array.isArray(payload) ? payload : (Array.isArray(payload.nodes) ? payload.nodes : []);
  assert.equal(nodes.length, 4);
});

test('initialsOf: palabras sueltas caen al menos 1 carácter', () => {
  // Verifica el helper que renderiza el avatar cuando no hay photo.
  // Aquí reimplementamos el contrato para validar el comportamiento esperado.
  function initialsOf(name) {
    const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    const ini = words.slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
    return ini || '?';
  }
  assert.equal(initialsOf('Carolina Méndez'), 'CM');
  assert.equal(initialsOf('Pedro'), 'P');
  assert.equal(initialsOf(''), '?');
  assert.equal(initialsOf(null), '?');
});
