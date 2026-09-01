import assert from 'node:assert';
import { resolveUseCaseSpec, computeUseCaseLayout } from './use-case-spec.js';
import { resolveSwimlaneSpec, computeSwimlaneLayout } from './swimlane-spec.js';
import { resolveJourneySpec, computeJourneyLayout } from './journey-spec.js';

/**
 * Invariantes de los tres diagramas de proceso y alcance.
 *
 *   - Casos de uso: los casos van DENTRO del límite del sistema y los actores
 *     fuera; si eso se rompe, el diagrama deja de decir lo único que dice.
 *   - Carriles: cada paso cae en la fila de su responsable y a la derecha de
 *     lo que lo alimenta.
 *   - Journey: la curva solo une pasos medidos.
 */

/* ── Casos de uso ── */

const ucSpec = resolveUseCaseSpec({
  useCase: {
    system: { name: 'Portal' },
    actors: [
      { id: 'qa', label: 'QA', side: 'left' },
      { id: 'ing', label: 'Ingeniería', side: 'right' },
      { id: 'ia', label: 'Proveedor', side: 'right', external: true },
    ],
    cases: [
      { id: 'chat', label: 'Conversar' },
      { id: 'calif', label: 'Calificar' },
    ],
    links: [
      { from: 'qa', to: 'chat' },
      { from: 'calif', to: 'chat', kind: 'extend' },
      { from: 'chat', to: 'ia', kind: 'include' },
      { from: 'ing', to: 'qa', kind: 'generalization' },
      { from: 'qa', to: 'fantasma' },            // extremo inexistente: se descarta
      { from: 'chat', to: 'chat' },              // bucle sobre sí mismo: se descarta
    ],
  },
});

assert.ok(ucSpec, 'use case: el spec no debe ser null con casos');
assert.equal(ucSpec.links.length, 4, 'use case: relaciones colgantes o reflexivas no se dibujan');

const ucLayout = computeUseCaseLayout(ucSpec);
const sistema = ucLayout.system;
for (const caso of ucLayout.cases) {
  assert.ok(caso.x >= sistema.x && caso.x + caso.w <= sistema.x + sistema.w,
    `use case: el caso "${caso.id}" se sale del límite del sistema`);
  assert.ok(caso.y >= sistema.y && caso.y + caso.h <= sistema.y + sistema.h,
    `use case: el caso "${caso.id}" se sale del alto del sistema`);
}
for (const actor of ucLayout.actors) {
  const dentro = actor.x + actor.w > sistema.x && actor.x < sistema.x + sistema.w;
  assert.ok(!dentro, `use case: el actor "${actor.id}" no puede quedar dentro del sistema`);
}
const izquierda = ucLayout.actors.find((a) => a.id === 'qa');
const derecha = ucLayout.actors.find((a) => a.id === 'ing');
assert.ok(izquierda.x < sistema.x && derecha.x > sistema.x, 'use case: cada actor va del lado que declaró');

const extend = ucLayout.links.find((l) => l.kind === 'extend');
const include = ucLayout.links.find((l) => l.kind === 'include');
const general = ucLayout.links.find((l) => l.kind === 'generalization');
assert.equal(extend.stereotype, '«extend»', 'use case: extend se rotula con su estereotipo UML');
assert.equal(include.stereotype, '«include»', 'use case: include se rotula con su estereotipo UML');
assert.equal(general.stereotype, undefined, 'use case: la generalización no lleva estereotipo, lleva punta hueca');
assert.equal(resolveUseCaseSpec({ useCase: { cases: [] } }), null, 'use case: sin casos no hay diagrama');

/* ── Carriles ── */

const swSpec = resolveSwimlaneSpec({
  swimlane: {
    lanes: [{ id: 'neg', name: 'Negocio' }, { id: 'ing', name: 'Ingeniería' }],
    steps: [
      { id: 'pide', lane: 'neg', label: 'Solicita', kind: 'start' },
      { id: 'hace', lane: 'ing', label: 'Ejecuta' },
      { id: 'revisa', lane: 'neg', label: '¿Aprueba?', kind: 'decision' },
      { id: 'cierra', lane: 'neg', label: 'Cierra', kind: 'end' },
      { id: 'suelto', lane: 'qa', label: 'Prueba' },   // carril no declarado: se crea
    ],
    links: [
      { from: 'pide', to: 'hace' },
      { from: 'hace', to: 'revisa' },
      { from: 'revisa', to: 'hace', label: 'ajustes' }, // retorno
      { from: 'revisa', to: 'cierra' },
    ],
  },
});

assert.ok(swSpec, 'swimlane: el spec no debe ser null con pasos');
assert.ok(swSpec.lanes.some((l) => l.id === 'qa'), 'swimlane: un carril citado por un paso debe crearse');

const swLayout = computeSwimlaneLayout(swSpec);
const paso = new Map(swLayout.steps.map((s) => [s.id, s]));
const carril = new Map(swLayout.lanes.map((l) => [l.id, l]));

assert.ok(paso.get('hace').column > paso.get('pide').column, 'swimlane: un paso va a la derecha del que lo alimenta');
assert.ok(paso.get('cierra').column > paso.get('revisa').column, 'swimlane: el cierre es posterior a la decisión');
for (const s of swLayout.steps) {
  const lane = carril.get(s.lane);
  assert.ok(s.y >= lane.y && s.y + s.h <= lane.y + lane.h,
    `swimlane: el paso "${s.id}" se sale de su carril`);
  assert.ok(s.x >= lane.x + lane.labelW,
    `swimlane: el paso "${s.id}" invade la columna de títulos`);
}
const retorno = swLayout.links.find((l) => l.from === 'revisa' && l.to === 'hace');
assert.equal(retorno.forward, false, 'swimlane: volver a un paso anterior es un reproceso, no un avance');
assert.ok(retorno.path.startsWith('M') && retorno.path.includes('V'),
  'swimlane: el reproceso baja y vuelve, no cruza en diagonal');
assert.equal(resolveSwimlaneSpec({ swimlane: { steps: [] } }), null, 'swimlane: sin pasos no hay proceso');

/* ── Journey ── */

const jnSpec = resolveJourneySpec({
  journey: {
    phases: [{ id: 'in', name: 'Entrada' }, { id: 'out', name: 'Salida' }],
    steps: [
      { id: 's1', phase: 'in', label: 'Graba', score: 5 },
      { id: 's2', phase: 'in', label: 'Sube', score: 9 },      // fuera de escala: se recorta
      { id: 's3', phase: 'out', label: 'Responde' },           // sin puntaje
      { id: 's4', phase: 'out', label: 'Cierra', score: 1 },
    ],
  },
});

assert.ok(jnSpec, 'journey: el spec no debe ser null con pasos');
assert.deepEqual(jnSpec.scale, { min: 1, max: 5 }, 'journey: la escala por defecto es 1..5');

const jnLayout = computeJourneyLayout(jnSpec);
const s1 = jnLayout.steps.find((s) => s.id === 's1');
const s2 = jnLayout.steps.find((s) => s.id === 's2');
const s3 = jnLayout.steps.find((s) => s.id === 's3');
const s4 = jnLayout.steps.find((s) => s.id === 's4');

assert.equal(s2.score, 5, 'journey: un puntaje sobre el máximo se recorta a la escala');
assert.equal(s3.hasScore, false, 'journey: un paso sin score no inventa puntaje');
assert.ok(s1.cy < s4.cy, 'journey: más satisfacción se dibuja más arriba');
assert.equal(jnLayout.line.split('L').length, 3,
  'journey: la curva une solo los pasos medidos (3 de 4)');
assert.equal(jnLayout.phases.length, 2, 'journey: una banda por grupo contiguo de fase');
assert.ok(jnLayout.phases[0].w > 0 && jnLayout.phases[1].x > jnLayout.phases[0].x,
  'journey: las bandas de fase avanzan de izquierda a derecha');
assert.equal(jnLayout.gridLines.length, 5, 'journey: una línea de rejilla por punto de la escala');
assert.equal(resolveJourneySpec({ journey: { steps: [] } }), null, 'journey: sin pasos no hay recorrido');

console.log('usecase-swimlane-journey.selfcheck: OK');
