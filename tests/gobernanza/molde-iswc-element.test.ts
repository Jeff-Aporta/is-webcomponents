// @contexto INDICE.md · tests/gobernanza/README.md
// molde-iswc-element.test.ts — guardián del molde único de componentes (specs/plan-carga-modular.md §D4/D6, fase F2).
//   M1 toda clase de `src/components` que sea un elemento hereda del molde `IswcElement`: su base directa es
//      `IswcElement`, `withStyleAttrs(IswcElement)`, una clase del mismo archivo que cumple, o una de la LISTA_CORTA
//      (subclases del molde declaradas en el kit). Ninguna extiende `HTMLElement` ni `ElementBase` (alias de compat).
//   M2 ningún componente adopta CSS a mano: nada de `adoptCss(` ni `siblingCssHref(` (el CSS llega por `iswc:css`).
//   M3 ningún componente declara `static get observedAttributes`: van en `static observed` (el molde hace la unión).
//   M4 `static tag` coincide con su `define(Clase)` y con el manifest; los tags de las fábricas también están en él.
//   M5 el molde publica el contrato de D4 con esos nombres (estáticos, hooks, `emit`, `setBooleanAttr`, `define`).
// Fuera: `helpers/ui.ts` no es un componente del kit sino la fábrica `crearComponente` para tags de las apps
// consumidoras (extiende `HTMLElement` a propósito y enlaza el CSS de la app).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const KIT = join(import.meta.dirname!, '..', '..');
const COMPONENTES = join(KIT, 'src', 'components');
const FUERA = new Set(['src/components/helpers/ui.ts']);
/** Subclases del molde declaradas en el kit que un componente de OTRO archivo puede extender. */
const LISTA_CORTA = new Set(['PropsElement', 'DiagramElementBase', 'ModalBase', 'BreakpointHost', 'IswcLightbox', 'IswcEditorBase']);
const MOLDE = new Set(['IswcElement', 'withStyleAttrs(IswcElement)', 'IswcReactive', 'withStyleAttrs(IswcReactive)', 'IswcFormControl', 'withStyleAttrs(IswcFormControl)']);
const RE_CLASE = /\bclass\s+([A-Za-z_$][\w$]*)?\s*(?:<[^{]*?>)?\s*extends\s+(withStyleAttrs\(\s*\w+\s*\)|[A-Za-z_$][\w$.]*)/g;

const rel = (abs: string) => relative(KIT, abs).split(sep).join('/');
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

function fuentes(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'schemas') fuentes(p, out); continue; }
    if (n.endsWith('.ts') && !n.endsWith('.d.ts') && !/\.(schemas|preview|selfcheck|test)\./.test(n) && !FUERA.has(rel(p))) out.push(p);
  }
  return out;
}

const archivos = fuentes(COMPONENTES).map((p) => ({ ruta: rel(p), codigo: sinComentarios(readFileSync(p, 'utf8')) }));
const clases = archivos.flatMap(({ ruta, codigo }) => [...codigo.matchAll(RE_CLASE)].map((m) => ({ ruta, nombre: m[1] ?? '(anónima)', base: m[2]!.replace(/\s+/g, '') })));
const manifest = new Set([...readFileSync(join(KIT, 'src', 'manifest.ts'), 'utf8').matchAll(/tag:\s*'(iswc-[a-z0-9-]+)'/g)].map((m) => m[1]!));

/** ¿La clase llega al molde? Sigue la cadena por las clases del kit; `HTMLElement`/`ElementBase` la cortan. */
function llegaAlMolde(base: string, vistos = new Set<string>()): boolean {
  if (MOLDE.has(base) || LISTA_CORTA.has(base)) return true;
  if (vistos.has(base)) return false;
  vistos.add(base);
  const padre = clases.find((c) => c.nombre === base);
  return padre ? llegaAlMolde(padre.base, vistos) : false;
}

test('molde: M1 toda clase-elemento de src/components hereda de IswcElement (o de la lista corta)', () => {
  const malos: string[] = [];
  for (const c of clases) {
    if (c.base === 'HTMLElement' || c.base === 'ElementBase' || /^withStyleAttrs\((HTMLElement|ElementBase)\)$/.test(c.base)) {
      malos.push(`${c.ruta}: ${c.nombre} extends ${c.base}`);
      continue;
    }
    const local = clases.some((o) => o.ruta === c.ruta && o.nombre === c.base);
    const elemento = llegaAlMolde(c.base);
    if (!elemento) continue; // no es un elemento (Error, EventTarget, clases de datos)
    if (!local && !MOLDE.has(c.base) && !LISTA_CORTA.has(c.base)) malos.push(`${c.ruta}: ${c.nombre} extends ${c.base} (base de otro archivo fuera de la lista corta)`);
  }
  assert.deepEqual(malos, []);
});

test('molde: M2 ningún componente adopta CSS a mano (adoptCss / siblingCssHref)', () => {
  const malos = archivos.filter(({ codigo }) => /\b(adoptCss|siblingCssHref)\s*\(/.test(codigo)).map(({ ruta }) => ruta);
  assert.deepEqual(malos, []);
});

test('molde: M3 ningún componente declara static get observedAttributes', () => {
  const malos = archivos.filter(({ codigo }) => /static\s+(?:override\s+)?get\s+observedAttributes\b/.test(codigo)).map(({ ruta }) => ruta);
  assert.deepEqual(malos, []);
});

test('molde: M4 static tag coincide con su define() y con el manifest', () => {
  const malos: string[] = [];
  for (const { ruta, codigo } of archivos) {
    const cuerpos = [...codigo.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)[^{]*\{\s*(?:static\s+(?:override\s+)?tag\s*=\s*'([^']*)')?/g)];
    for (const m of cuerpos) {
      const [, nombre, tag] = m;
      if (!tag) continue;
      if (!manifest.has(tag)) malos.push(`${ruta}: ${tag} no está en el manifest`);
      if (!new RegExp(`\\bdefine\\(\\s*${nombre}\\b`).test(codigo)) malos.push(`${ruta}: ${nombre} declara ${tag} pero no hay define(${nombre})`);
    }
    // Fábricas: el tag literal lo pone el llamador.
    const fabricas = [
      ...codigo.matchAll(/\b(?:defineDateField|definePickerInput)\(\{\s*tag:\s*'([^']+)'/g),
      ...codigo.matchAll(/__isDefineTypedChart\?\.\(\s*'([^']+)'/g),
      ...codigo.matchAll(/createObserverElement\(\s*'\w+',\s*'([^']+)'\)/g),
    ];
    for (const f of fabricas) if (!manifest.has(f[1]!)) malos.push(`${ruta}: ${f[1]} (fábrica) no está en el manifest`);
    if (/\bdefineElement\s*\(|customElements\.define\s*\(/.test(codigo)) malos.push(`${ruta}: registra con defineElement/customElements.define en vez de define(Clase)`);
  }
  assert.deepEqual(malos, []);
});

test('molde: M5 core/iswc-element.ts publica el contrato de D4', () => {
  const molde = readFileSync(join(KIT, 'src', 'core', 'iswc-element.ts'), 'utf8');
  const contrato = [
    /export class IswcElement extends HTMLElement/,
    /static tag: string/, /static css: string/, /static template: HTMLTemplateElement \| null/,
    /static observed: readonly string\[\]/, /static deps: readonly string\[\]/, /static shadowInit: ShadowRootInit/,
    /static styleAttrs: StyleAttrMap/, /static get observedAttributes\(\)/,
    /get mounted\(\): boolean/, /get shadow\(\): ShadowRoot \| null/,
    /onConnected\(\): void/, /onDisconnected\(\): void/, /onAttributeChanged\(/,
    /emit<T = unknown>\(name: string/, /setBooleanAttr\(name: string/,
    /export function define</,
  ];
  assert.deepEqual(contrato.filter((re) => !re.test(molde)).map(String), []);
});

export default lista();
