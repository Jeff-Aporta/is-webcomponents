import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolveClassSpec, computeClassLayout } from './class-spec.js';
import { resolveTimelineSpec, computeTimelineLayout } from './timeline-spec.js';
import { resolveStateSpec, computeStateLayout } from './state-spec.js';
import { resolveVennSpec, computeVennLayout } from './venn-spec.js';
import { sequenceThemeLight, sequenceThemeDark } from './sequence-spec.js';

/**
 * Defectos de LEGIBILIDAD que solo aparecen al exportar el diagrama a PNG.
 *
 * Los selfchecks de geometría pasaban en verde mientras el render real salía
 * con texto cortado, etiquetas ilegibles y `[object Object]` en pantalla: nada
 * comprobaba que lo dibujado CABE en el lienzo ni que los miembros se
 * componen. Estos cuatro casos vienen de imágenes reales del proyecto is-tkts.
 */

/* ── 1. Miembros de clase: objeto UML, no "[object Object]" ── */

const clases = resolveClassSpec({
  classDiagram: {
    classes: [{
      id: 'c1',
      name: 'Cursos',
      attributes: [{ name: 'ruta', type: 'string' }, 'suelto : number'],
      methods: [{ name: 'duplicar()', visibility: '+' }, { name: 'oculto()', visibility: '-', returns: 'void' }],
    }],
  },
});
const miembros = [...clases.classes[0].attributes, ...clases.classes[0].methods];
for (const m of miembros) {
  assert.ok(!m.includes('[object'),
    `class: un miembro objeto se renderizó como "${m}" — readMember debe componer "visibilidad nombre : tipo"`);
}
assert.deepEqual(miembros, ['ruta : string', 'suelto : number', '+ duplicar()', '- oculto() : void'],
  'class: la composición del miembro cambió de forma');

/* ── 2. La cabecera no puede salirse del lienzo ── */

const tituloLargo = 'Acciones extendidas de Cursos y Planes de estudio del módulo';
const subtituloLargo = 'los clientes heredaban las rutas base; ahora declaran la suya con el segmento del recurso';
const anchoMinimo = subtituloLargo.length * 5.5;

const claseAncha = computeClassLayout(resolveClassSpec({
  classDiagram: { title: tituloLargo, subtitle: subtituloLargo, classes: [{ id: 'c', name: 'A' }] },
}));
assert.ok(claseAncha.width >= anchoMinimo,
  `class: el lienzo (${claseAncha.width}) no cabe el subtítulo (~${Math.round(anchoMinimo)}): se corta en el PNG`);

const estadoAncho = computeStateLayout(resolveStateSpec({
  stateDiagram: { title: tituloLargo, subtitle: subtituloLargo, states: [{ id: 's', label: 'A' }] },
}));
assert.ok(estadoAncho.width >= anchoMinimo,
  `state: el lienzo (${estadoAncho.width}) no cabe el subtítulo: se corta en el PNG`);

const vennAncho = computeVennLayout(resolveVennSpec({
  venn: { title: tituloLargo, subtitle: subtituloLargo, sets: [{ id: 'a', label: 'Un conjunto de nombre largo' }, { id: 'b', label: 'Otro conjunto largo' }] },
}));
assert.ok(vennAncho.width >= anchoMinimo,
  `venn: el lienzo (${vennAncho.width}) no cabe el subtítulo: se corta en el PNG`);
for (const c of vennAncho.circles) {
  assert.ok(c.labelX > 0 && c.labelX < vennAncho.width,
    `venn: la etiqueta "${c.label}" cae fuera del lienzo (x=${c.labelX} de ${vennAncho.width})`);
}

/* ── 3. Timeline: ni tarjeta cortada, ni choque con la leyenda ── */

const linea = computeTimelineLayout(resolveTimelineSpec({
  timeline: {
    title: 'Obsolescencia de los Prompt objects',
    groups: [{ id: 'r', name: 'Riesgo' }, { id: 'd', name: 'Decisión' }],
    events: [
      { id: 'a', date: '2026-06-05', label: 'Aviso de obsolescencia', group: 'r' },
      { id: 'b', date: '2026-06-08', label: 'Validación de impacto', group: 'r' },
      { id: 'c', date: '2026-06-12', label: 'Estrategia: prompts en base de datos', group: 'd' },
      { id: 'e', date: '2026-06-24', label: 'Herramienta Prompts a SQL', group: 'd' },
    ],
  },
}));
for (const e of linea.events) {
  assert.ok(e.cardX >= 0,
    `timeline: la tarjeta "${e.label}" empieza en x=${e.cardX}: se corta por la izquierda`);
  assert.ok(e.cardX + e.cardW <= linea.width + 0.5,
    `timeline: la tarjeta "${e.label}" termina en ${e.cardX + e.cardW} y el lienzo mide ${linea.width}`);
}
// La leyenda manda en su banda: ante choque, el diagrama BAJA (no se estrecha).
const bandaTop = 30;
const bandaBottom = bandaTop + linea.groups.length * 16;
for (const e of linea.events) {
  const cruzaBanda = e.cardY < bandaBottom && e.cardY + e.cardH > bandaTop;
  const invadeAncho = e.cardX + e.cardW > linea.legendX - 12;
  assert.ok(!(cruzaBanda && invadeAncho),
    `timeline: la tarjeta "${e.label}" se encima con la leyenda; el contenido debe desplazarse hacia abajo`);
}

/* ── 4. Las etiquetas sobre una arista no pueden tapar la arista ── */

for (const [nombre, tema] of [['claro', sequenceThemeLight()], ['oscuro', sequenceThemeDark()]]) {
  assert.ok(tema.chipFillSoft, `tema ${nombre}: falta chipFillSoft (fondo translúcido de las etiquetas de arista)`);
  const alfa = Number(/([\d.]+)\)$/.exec(tema.chipFillSoft)?.[1]);
  assert.ok(alfa > 0 && alfa <= 0.75,
    `tema ${nombre}: chipFillSoft con alfa ${alfa}; debe dejar ver la arista por debajo (~0.7)`);
}

const conChip = [
  'class-diagram.js', 'er-diagram.js', 'flowchart.js',
  'state-diagram.js', 'swimlane-diagram.js', 'use-case-diagram.js',
];
for (const archivo of conChip) {
  const src = readFileSync(new URL(`./${archivo}`, import.meta.url), 'utf8');
  const chip = /fill: theme\.chipFill(Soft)?[^,]*, class: '[a-z-]+__chip'/.exec(src);
  assert.ok(chip, `${archivo}: no se encontró el chip de la etiqueta de arista`);
  assert.ok(chip[0].includes('chipFillSoft'),
    `${archivo}: el chip de la arista volvió al fondo opaco y tapa la línea`);
}

console.log('render-legibilidad.selfcheck: OK');

/* ── 5. Actores de secuencia: nombre real y avatar siempre pintado ── */

const { resolveSequenceSpec } = await import('./sequence-spec.js');

const sec = resolveSequenceSpec({
  sequence: {
    actors: [
      { id: 'a', name: 'Turno entrante' },       // `name`, no `label`
      { id: 'b', label: 'OpenIAServer' },
      { id: 'c', name: 'Hilo de la conversación' },
      { id: 'd', name: 'Clasificador' },
    ],
    messages: [{ from: 'a', to: 'b', label: 'consulta' }],
  },
});
for (const actor of sec.actors) {
  assert.ok(!/^Actor \d+$/.test(actor.label),
    `sequence: el actor "${actor.id}" quedó como "${actor.label}" — el payload traía nombre y se ignoró`);
  assert.ok(actor.icon && actor.icon.includes(':'),
    `sequence: el actor "${actor.id}" no recibió icono`);
}

// Todos los iconos por defecto tienen que EXISTIR en los assets del kit: uno
// inexistente deja el avatar vacío (le pasó a simple-icons:openai).
const { readdirSync, existsSync } = await import('node:fs');
const raizIconos = new URL('../../assets/icons/', import.meta.url);
for (const actor of sec.actors) {
  const [prefijo, nombre] = actor.icon.split(':');
  const ruta = new URL(`${prefijo}/${nombre}.svg`, raizIconos);
  assert.ok(existsSync(ruta),
    `sequence: el icono por defecto "${actor.icon}" no está en assets/icons — el avatar saldría vacío`);
}
void readdirSync;

console.log('render-legibilidad.selfcheck (actores): OK');

/* ── 6. Diagrama de componentes: paquete translúcido y etiquetas encima ── */

const cd = readFileSync(new URL('./component-diagram.js', import.meta.url), 'utf8');
assert.ok(/hsla\(\$\{p\.hue\},60%,50%,0\.06\)/.test(cd),
  'component: el paquete con `hue` volvió al relleno sólido y ahoga a los componentes de dentro');
assert.ok(cd.includes('this.svg.appendChild(this.#etiquetasEdges)'),
  'component: las etiquetas de arista salieron de la capa superior; las tapan las cajas');
assert.ok(cd.includes('e.labelX') && cd.includes('e.labelW'),
  'component: las chips deben usar la geometría de actores (labelX/labelW), no un dy a ojo');
assert.ok(!cd.includes('marker-end'),
  'component: marker SVG no rasteriza en PNG; usar svgArrowHead');
assert.ok(cd.includes('svgArrowHead'),
  'component: las puntas deben ser polígonos (PNG-safe)');
assert.ok(cd.includes('requiredSocketPath'),
  'component: falta el socket UML (arco C) de las interfaces required');
assert.ok(cd.includes('Tahoma,Arial,sans-serif'),
  'component: la tipografía debe coincidir con el diagrama ER');

const specActors = [
  'component-spec.js', 'flowchart-spec.js', 'block-spec.js',
  'class-spec.js', 'state-spec.js', 'er-spec.js',
  'swimlane-spec.js', 'use-case-spec.js',
];
for (const archivo of specActors) {
  const src = readFileSync(new URL(`./${archivo}`, import.meta.url), 'utf8');
  assert.ok(src.includes('applyEdgeActorLayout'),
    `${archivo}: las etiquetas de arista deben colocarse como actores (applyEdgeActorLayout)`);
}

console.log('render-legibilidad.selfcheck (componentes): OK');
