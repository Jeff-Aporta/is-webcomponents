// reactivo.test.ts — guardián de F8 (specs/paridad-webawesome.md HOW-8): el kit converge al molde reactivo.
//   R1 reflejo a mano (`set x(v) { …Attribute… }` en una línea): por archivo, nunca más que en `reactivo-pendientes.json`;
//      un archivo que no está en la lista tiene 0 (lo nuevo o migrado declara `@prop`).
//   R2 todo `src/components/forms/*` que declare `formAssociated` extiende `IswcFormControl`, salvo los pendientes.
//   R3 ningún `aria-label` literal en las plantillas (pasa por `t()`): por archivo, nunca más que lo pendiente.
//   R4 una propiedad `@prop` no repite su atributo en `static observed` (lo suma `IswcReactive`).
// Las listas de pendientes solo bajan: cuando un archivo baja (o llega a 0), la prueba reescribe el JSON con lo medido
// (trinquete, como `typecheckBaseline`); subir es rojo.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const KIT = join(import.meta.dirname!, '..', '..');
const COMPONENTES = join(KIT, 'src', 'components');
const PENDIENTES = join(import.meta.dirname!, 'reactivo-pendientes.json');

type Pendientes = { setters: Record<string, number>; forms: string[]; ariaLabel: Record<string, number> };

/** Setter de una línea que escribe un atributo (la heurística de W2: 469 en el punto de partida). */
const RE_SETTER = /^\s*set [A-Za-z_$][\w$]*\([^)]*\)[^{]*\{.*(?:Attribute|setStringAttr|setOptionalAttr|setEnumAttr|setBooleanAttr|setEnumToneAttr)\b.*\}\s*$/gm;
/** `aria-label` con texto fijo (empieza por mayúscula o signo) en vez de `${this.t(…)}`. */
const RE_ARIA = /aria-label="[A-ZÁÉÍÓÚÑ¿¡][^"$]*"/g;

const rel = (abs: string) => relative(KIT, abs).split(sep).join('/');

function fuentes(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) fuentes(p, out);
    else if (n.endsWith('.ts') && !/\.(schemas|preview|selfcheck|test|d)\.ts$/.test(n)) out.push(p);
  }
  return out;
}

const archivos = fuentes(COMPONENTES).map((p) => ({ ruta: rel(p), codigo: readFileSync(p, 'utf8') }));
const pendientes = JSON.parse(readFileSync(PENDIENTES, 'utf8')) as Pendientes;
const contar = (texto: string, re: RegExp) => (texto.match(re) ?? []).length;

/** Compara lo medido con lo pendiente: devuelve los que suben y la lista nueva (solo lo que queda > 0). */
function trinquete(medido: Record<string, number>, previo: Record<string, number>): [string[], Record<string, number>] {
  const suben = Object.entries(medido).filter(([r, n]) => n > (previo[r] ?? 0)).map(([r, n]) => `${r}: ${n} (pendiente ${previo[r] ?? 0})`);
  const nuevo = Object.fromEntries(Object.entries(medido).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)));
  return [suben, nuevo];
}

function guardar(cambio: Partial<Pendientes>): void {
  const antes = JSON.stringify(pendientes);
  Object.assign(pendientes, cambio);
  if (JSON.stringify(pendientes) !== antes) writeFileSync(PENDIENTES, `${JSON.stringify(pendientes, null, 2)}\n`, 'utf8');
}

test('reactivo: R1 el reflejo a mano solo baja (los migrados usan @prop)', () => {
  const medido = Object.fromEntries(archivos.map(({ ruta, codigo }) => [ruta, contar(codigo, RE_SETTER)]));
  const [suben, nuevo] = trinquete(medido, pendientes.setters);
  assert.deepEqual(suben, [], 'setters que reflejan a mano: declara la propiedad con @prop (core/iswc-reactive.ts)');
  guardar({ setters: nuevo });
  console.log(`  setters a mano pendientes: ${Object.values(nuevo).reduce((a, b) => a + b, 0)} en ${Object.keys(nuevo).length} archivos`);
});

test('reactivo: R2 forms/* con formAssociated extiende IswcFormControl', () => {
  const sinMolde = archivos
    .filter(({ ruta, codigo }) => ruta.startsWith('src/components/forms/') && /static\s+(?:override\s+)?formAssociated\s*=\s*true/.test(codigo) && !/extends\s+(?:withStyleAttrs\()?IswcFormControl\b/.test(codigo))
    .map(({ ruta }) => ruta)
    .sort();
  const nuevos = sinMolde.filter((r) => !pendientes.forms.includes(r));
  assert.deepEqual(nuevos, [], 'controles de formulario fuera de IswcFormControl (core/iswc-form-control.ts)');
  guardar({ forms: sinMolde });
  console.log(`  forms pendientes de IswcFormControl: ${sinMolde.length}`);
});

test('reactivo: R3 aria-label literal solo baja (los textos pasan por t())', () => {
  const medido = Object.fromEntries(archivos.map(({ ruta, codigo }) => [ruta, contar(codigo, RE_ARIA)]));
  const [suben, nuevo] = trinquete(medido, pendientes.ariaLabel);
  assert.deepEqual(suben, [], 'aria-label con texto fijo: usa aria-label=${this.t(…)} (core/localize.ts)');
  guardar({ ariaLabel: nuevo });
  console.log(`  aria-label literales pendientes: ${Object.values(nuevo).reduce((a, b) => a + b, 0)} en ${Object.keys(nuevo).length} archivos`);
});

test('reactivo: R4 @prop no repite su atributo en static observed', () => {
  const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const malos: string[] = [];
  for (const { ruta, codigo } of archivos) {
    const props = [...codigo.matchAll(/@prop\(\s*(\{[^}]*\})?\s*\)\s*(?:override\s+)?accessor\s+([A-Za-z_$][\w$]*)/g)].map((m) => {
      const attr = /attr:\s*'([^']+)'/.exec(m[1] ?? '')?.[1];
      return /attr:\s*false/.test(m[1] ?? '') ? null : (attr ?? kebab(m[2]!));
    });
    const observados = new Set([...codigo.matchAll(/static\s+(?:override\s+)?observed\s*(?::[^=]+)?=\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!)));
    for (const a of props) if (a && observados.has(a)) malos.push(`${ruta}: ${a}`);
  }
  assert.deepEqual(malos, []);
});

export default lista();
