/**
 * _helpers.ts — Utilidades comunes para los tests exhaustivos de forms.
 *
 * Los tests NO levantan un DOM: no hay jsdom ni happy-dom en el repo, y
 * añadirlos solo para tests sería ruido. Lo que sí podemos asegurar de forma
 * fiable con análisis estático + customElements.registry es:
 *
 *   - el archivo existe y define el tag con `defineElement('<is-x>', ...)`
 *     o `defineXxxField({tag:'is-x',...})`
 *   - los atributos observados coinciden con los documentados
 *   - los eventos prometidos en la cabecera JSDoc tienen un `emit(..., '<ev>')`
 *   - los slots y parts prometidos están en el TEMPLATE
 *   - el JSON de preview declara el tag y el schema correcto
 *
 * Para los aspectos dinámicos (custom states, focus, etc.) nos apoyamos en
 * convenciones: si la cabecera dice `Custom states: foo, bar` y en el código
 * hay llamadas a `setCustomState(this.#internals, 'foo', ...)`, el contrato
 * se cumple.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
// _helpers.ts está en src/utils/health/exhaustive/forms/_helpers.ts.
// Tres niveles arriba llegan a src/ (raíz del kit).
export const RAIZ = join(dirname(__filename), '..', '..', '..', '..');

export const FORMS_DIR = join(RAIZ, 'components', 'forms');

/** Lee el .ts fuente de un componente de forms. */
export function leerComponente(tag: string): string {
  // tag `is-foo` → archivo `foo.ts`
  const archivo = `${tag.replace(/^is-/, '')}.ts`;
  const ruta = join(FORMS_DIR, archivo);
  if (!existsSync(ruta)) {
    throw new Error(`No existe el archivo ${archivo} para <${tag}> en ${FORMS_DIR}`);
  }
  return readFileSync(ruta, 'utf8');
}

/** Lee el .json de preview si existe. */
export function leerPreview(tag: string): Record<string, unknown> | null {
  const ruta = join(FORMS_DIR, `${tag.replace(/^is-/, '')}.json`);
  if (!existsSync(ruta)) return null;
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

/** Lee el .css del componente si existe. */
export function existeCss(tag: string): boolean {
  return existsSync(join(FORMS_DIR, `${tag.replace(/^is-/, '')}.css`));
}

/** Lee el .md (documentación) si existe. */
export function leerDoc(tag: string): string | null {
  const ruta = join(FORMS_DIR, `${tag.replace(/^is-/, '')}.md`);
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
}

/** Atributos observados declarados como `static get observedAttributes()`. */
export function atributosObservados(src: string): string[] {
  const attrs = new Set<string>();
  // Encuentra el getter.
  const m = src.match(
    /static\s+get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?\{([\s\S]{0,400}?)\}/,
  );
  if (!m) return [];
  const cuerpo = m[1];
  // Captura la expresión de retorno (`return [...]` o `return CONST`).
  const ret = cuerpo.match(/return\s+([\s\S]+?)\s*;/);
  if (!ret) return [];
  let arrayLit: string | null = ret[1];
  // Si retorna una constante, resolver su array literal.
  const constMatch = arrayLit.match(/^[A-Z_$][\w$]*$/);
  if (constMatch) {
    const cn = constMatch[0];
    const cm = src.match(new RegExp(`(?:const|let|var)\\s+${cn}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
    if (cm) arrayLit = cm[1];
    else return [];
  }
  if (!arrayLit) return [];
  // Resolver spreads `...CONST` recursivamente.
  const visitar = (lit: string, depth = 0): void => {
    if (depth > 3) return;
    for (const m of lit.matchAll(/['"`]([a-z0-9-]+)['"`]/g)) attrs.add(m[1]);
    for (const m of lit.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
      const alias = m[1];
      const aliasMatch = src.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
      if (aliasMatch) visitar(aliasMatch[1], depth + 1);
    }
  };
  visitar(arrayLit);
  return [...attrs];
}

/** Tags `<is-foo>` que aparecen como `defineElement('is-foo', ...)`. */
export function tagsDefinidos(src: string): string[] {
  const tags = new Set<string>();
  for (const m of src.matchAll(/defineElement\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    tags.add(m[1]);
  }
  for (const m of src.matchAll(/customElements\.define\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    tags.add(m[1]);
  }
  return [...tags];
}

/** Nombres de eventos emitidos por el componente (`emit(this, 'is-foo', ...)`). */
export function eventosEmitidos(src: string): string[] {
  const evs = new Set<string>();
  // Variantes: emit(this, 'is-foo', ...), #emit('is-foo', ...), dispatchEvent(new Event('is-foo', ...))
  for (const m of src.matchAll(/(?:#emit|emit)\s*\(\s*this\s*,\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    evs.add(m[1]);
  }
  for (const m of src.matchAll(/(?:#emit|emit)\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    evs.add(m[1]);
  }
  for (const m of src.matchAll(/dispatchEvent\s*\(\s*new\s+\w+\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    evs.add(m[1]);
  }
  return [...evs];
}

/** Nombres de slots declarados en el TEMPLATE (`<slot name="...">` o `<slot></slot>`). */
export function slotsDeclarados(src: string): string[] {
  const slots = new Set<string>();
  for (const m of src.matchAll(/<slot\s+name=["']([a-z0-9-]+)["']/g)) slots.add(m[1]);
  if (/TEMPLATE\.innerHTML[\s\S]*?<slot(?![^>]*name=)/.test(src)) slots.add('default');
  return [...slots];
}

/** Nombres de `part="x"` declarados en el TEMPLATE. */
export function partsDeclaradas(src: string): string[] {
  const parts = new Set<string>();
  for (const m of src.matchAll(/\bpart=["']([^"']+)["']/g)) {
    for (const p of m[1].split(/\s+/)) parts.add(p);
  }
  return [...parts];
}

/** Custom states (`:state(name)` o `setCustomState(this.#internals, 'name', ...)`). */
export function customStates(src: string): string[] {
  const states = new Set<string>();
  for (const m of src.matchAll(/setCustomState\s*\(\s*this\.#\w+\s*,\s*['"`]([a-z0-9-]+)['"`]/g)) {
    states.add(m[1]);
  }
  // Variante con this.#internals
  for (const m of src.matchAll(/setCustomState\s*\(\s*this\.\w+\s*,\s*['"`]([a-z0-9-]+)['"`]/g)) {
    states.add(m[1]);
  }
  return [...states];
}

/** Tokens CSS declarados (`--is-foo` en styleAttrs o TEMPLATE inline). */
export function tokensCss(src: string): string[] {
  const toks = new Set<string>();
  for (const m of src.matchAll(/['"`](--is-[a-z0-9-]+)['"`]/g)) toks.add(m[1]);
  // styleAttrs con prefijo `--is-x`
  for (const m of src.matchAll(/prop:\s*['"`](--is-[a-z0-9-]+)['"`]/g)) toks.add(m[1]);
  return [...toks];
}

/** Eventos documentados en la cabecera JSDoc (`Eventos: ...`). */
export function eventosDocumentados(src: string): string[] {
  const evs = new Set<string>();
  // Busca la sección "Eventos: ..." antes del primer `(() => {` o `class `.
  const cabecera = src.slice(0, src.indexOf('class ') > -1 ? src.indexOf('class ') : src.indexOf('(() =>'));
  for (const m of cabecera.matchAll(/['"`](is-[a-z0-9-]+)['"`]/g)) evs.add(m[1]);
  return [...evs];
}

/** Slots documentados en la cabecera (`Slots: ...`). */
export function slotsDocumentados(src: string): string[] {
  const slots = new Set<string>();
  const cabecera = src.slice(0, src.indexOf('class ') > -1 ? src.indexOf('class ') : src.indexOf('(() =>'));
  for (const m of cabecera.matchAll(/name=["']([a-z0-9-]+)["']/g)) slots.add(m[1]);
  return [...slots];
}

/** Atributos documentados (líneas de `   attr` o `   attr   descripción`). */
export function atributosDocumentados(src: string): string[] {
  const attrs = new Set<string>();
  const cabecera = src.slice(0, src.indexOf('class ') > -1 ? src.indexOf('class ') : src.indexOf('(() =>'));
  for (const m of cabecera.matchAll(/^\s+([a-z][a-z0-9-]*)\s+\w/gm)) attrs.add(m[1]);
  return [...attrs];
}

/** Indica si el componente usa form-associated custom elements. */
export function esFormAssociated(src: string): boolean {
  return /static\s+formAssociated\s*=\s*true/.test(src) || /attachFormInternals\s*\(/.test(src);
}

/** Indica si extiende ElementBase (no HTMLElement). */
export function extiendeElementBase(src: string): boolean {
  return /extends\s+ElementBase/.test(src);
}

/** Indica si usa Shadow DOM. */
export function usaShadowDom(src: string): boolean {
  return /attachShadow\s*\(/.test(src);
}

/** Indica si tiene un getter `static get observedAttributes` con anotación TS de tipo. */
export function tieneObservedTipado(src: string): boolean {
  return /static\s+get\s+observedAttributes\s*\(\s*\)\s*:\s*string\[\]/.test(src);
}

/** Indica si tiene `defineElement(...)` (es un custom element registrado). */
export function tieneDefineElement(src: string): boolean {
  return /defineElement\s*\(/.test(src);
}

/** Indica si el componente es un wrapper de factory (`defineDateField`, `definePickerInput`). */
export function esFactoryWrapper(src: string): boolean {
  return /\b(defineDateField|definePickerInput|createObserverElement)\s*\(/.test(src);
}

/** Indica si el componente importa `defineTypedChart` global (charts). */
export function esTypedChart(src: string): boolean {
  return /window\.__isDefineTypedChart/.test(src);
}
