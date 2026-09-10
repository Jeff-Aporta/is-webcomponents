/**
 * Validador de CONSISTENCIA componente ↔ JSON.
 *
 * El JSON del preview declara los atributos, props y eventos que el
 * componente soporta. Para que el demo funcione y el playground sea
 * reactivo, el módulo JS/TS del componente tiene que:
 *
 *   1. Registrar el custom element con el tag exacto (`customElements.define`).
 *   2. Declarar `static get observedAttributes()` para CADA atributo
 *      reflejado que use el JSON (color, variant, disabled, …).
 *   3. Exponer `prop:` para CADA control JSON-driven que asigne por
 *      propiedad (no por atributo).
 *
 * Este módulo lee el código fuente del componente, extrae los atributos
 * observados y las props públicas (vía heurística: campos con guión bajo
 * final + getter declarado en la clase) y compara contra lo que el JSON
 * declara.
 *
 * Es una verificación BEST-EFFORT: el código usa decoradores
 * `@prop @observe` del kit, así que las props reflejadas se infieren de
 * esos patrones. Si una heurística falla, se registra como `info` (no
 * como error), para no generar falsos positivos.
 */

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import type { Hallazgo } from '../types.js';

type Def = {
  tag: string;
  sections?: Array<{ blocks?: any[] }>;
};

/**
 * Lee el módulo del componente y devuelve un mapa de metadata útil:
 *   - atributos observados
 *   - props declaradas (vía `@prop`, `@observed`, getters o campos)
 *   - si define el custom element
 *   - si hay guard idempotente
 */
interface MetaComponente {
  /** Ruta del módulo analizada. */
  ruta: string;
  /** Atributos observados (extraídos de static get observedAttributes o @observed). */
  atributosObservados: Set<string>;
  /** Props públicas (extraídas de @prop, getters o campos públicos). */
  propsPublicas: Set<string>;
  /** Si customElements.define( se invoca. */
  defineCustomElement: boolean;
  /** Si hay guard idempotente (customElements.get). */
  guardIdempotente: boolean;
  /** Slots declarados (vía HTMLSlotElement o comentario @slot). */
  slots: Set<string>;
  /** Si hereda de ElementBase / ModalBase / DiagramElementBase. */
  heredaBase: boolean;
}

/** Parsea el módulo del componente (TS/JS) y extrae metadata. */
export async function extraerMetaComponente(rutaModulo: string | null): Promise<MetaComponente | null> {
  if (!rutaModulo || !existsSync(rutaModulo)) return null;
  let src: string;
  try {
    src = readFileSync(rutaModulo, 'utf8');
  } catch {
    return null;
  }

  const atributosObservados = new Set<string>();
  const propsPublicas = new Set<string>();
  const slots = new Set<string>();

  // 1. static get observedAttributes() { return [...] }
  //    Acepta tanto la firma simple como la anotada `: string[]` (TS).
  //    El `[\s\S]*?` lazy + anidamiento de corchetes: balanceamos para que
  //    `return [...A, ...B]` no corte en el primer `]` interno.
  const findBalancedArray = (s: string, startIdx: number): string | null => {
    let depth = 0;
    let i = startIdx;
    while (i < s.length) {
      if (s[i] === '[') depth++;
      else if (s[i] === ']') {
        depth--;
        if (depth === 0) return s.substring(startIdx, i + 1);
      }
      i++;
    }
    return null;
  };
  const findReturnArray = (s: string): string | null => {
    // Buscar el `static get observedAttributes` y dentro de su cuerpo
    // (entre { y su }) encontrar la primera `return [`. Restringimos
    // el lazy a 200 chars (más que suficiente para `return OBSERVED;`
    // o `return [...OBSERVED, ...STYLE];`).
    const re = /static\s+get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?\{([\s\S]{0,300}?)\}/;
    const m = s.match(re);
    if (!m) return null;
    const body = m[1];
    const inner = body.match(/return\s*\[/);
    if (!inner) return null;
    const start = m.index + m[0].indexOf('return [', m[0].indexOf('{')) + 'return ['.length;
    return findBalancedArray(s, start - 1);
  };
  const literalArray = findReturnArray(src);
  if (literalArray) {
    // Resolución recursiva: strings literales + spreads `...CONST`.
    const visitar = (lit: string): void => {
      for (const m of lit.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) {
        atributosObservados.add(m[1]);
      }
      for (const m of lit.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
        const alias = m[1];
        const cMatch = src.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*=\\s*Object\\.keys\\s*\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)`));
        if (cMatch) {
          const objName = cMatch[1];
          const objMatch = src.match(new RegExp(`(?:const|let|var)\\s+${objName}\\s*[:=]\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
          if (objMatch) {
            for (const k of objMatch[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]\s*:/g)) {
              atributosObservados.add(k[1]);
            }
          }
          continue;
        }
        const aliasMatch = src.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
        if (aliasMatch) visitar(aliasMatch[1]);
      }
    };
    visitar(literalArray);
  }
  // 1b. Variante: return OBSERVED (constante). Extraemos su literal.
  //     Acepta anotación de tipo de retorno: `(): string[] { return OBSERVED; }`.
  const obsConstMatch = src.match(/static\s+get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?\{[\s\S]*?return\s+([A-Z_$][\w$]*)/);
  if (obsConstMatch) {
    const constName = obsConstMatch[1];
    const cMatch = src.match(new RegExp(`(?:const|let|var)\\s+${constName}\\s*[:=]\\s*\\[([^\\]]*)\\]`));
    if (cMatch) {
      for (const m of cMatch[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) atributosObservados.add(m[1]);
    }
  }
  // 1c. Variante: const OBSERVED = [...]; (sin static getter). Algunos
  // componentes definen la lista en una constante y luego la usan en el
  // getter (común en isp/*).
  if (atributosObservados.size === 0) {
    for (const m of src.matchAll(/(?:const|let|var)\s+(OBSERVED|OBSERVED_ATTRS|ATTRS)\s*[:=]\s*\[([^\]]*)\]/g)) {
      for (const s of m[2].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) atributosObservados.add(s[1]);
    }
  }
  // 1e. Patrón `IsFoo.styleAttrNames` (definido en `ElementBase`):
  //     el componente declara `static styleAttrs = { 'attr-name': {...}, ... }`
  //     y combina sus keys via `...IsFoo.styleAttrNames` en observedAttributes.
  //     Extraer las keys del `styleAttrs` literal del propio archivo.
  //     Usamos balanceo de llaves para capturar el cuerpo completo.
  {
    const styleStart = src.search(/static\s+styleAttrs\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?=\s*\{/);
    if (styleStart >= 0) {
      const openIdx = src.indexOf('{', styleStart);
      let depth = 0;
      let endIdx = openIdx;
      for (let i = openIdx; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      const body = src.substring(openIdx + 1, endIdx);
      // Acepta claves con o sin comillas: `radius:` y `'border-width':`.
      for (const m of body.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]\s*:|([a-zA-Z][a-zA-Z0-9-]*)\s*:/g)) {
        atributosObservados.add(m[1] ?? m[2]);
      }
    }
  }

  // 1d. Wrappers que delegan en fábricas (defineDateField, definePickerInput,
  //     defineTypedChart): si no hay attrs en el wrapper, leer del archivo
  //     de la fábrica importada. El motor funciona tanto en ESM (donde
  //     `require` no existe) como en CJS (donde sí). Usamos createRequire
  //     desde node:module (válido en ambos).
  if (atributosObservados.size === 0) {
    try {
      // Carga lazy de node:fs y node:path — funcionan tanto en ESM como
      // en CJS sin necesidad de require (que no existe en ESM).
      const fs = (await import('node:fs')) as typeof import('node:fs');
      const path = (await import('node:path')) as typeof import('node:path');
      // Charts tipados (defineTypedChart en chart.ts) y wrappers
      // de fecha/picker (defineDateField/definePickerInput en _shared/).
      // Si el wrapper invoca alguna de estas, seguir la cadena al factory
      // para extraer sus `observedAttributes`.
      const factoryImports = [
        { factory: 'defineDateField', file: '../_shared/date-field-element.js' },
        { factory: 'definePickerInput', file: '../_shared/picker-element.js' },
        { factory: 'createObserverElement', file: './observer.js' },
        { factory: 'window.__isDefineTypedChart', file: '../charts/chart.js' },
      ];
      for (const { factory, file } of factoryImports) {
        // Patrón de invocación: `defineDateField({...})`, `definePickerInput({...})`
        // o `window.__isDefineTypedChart?.('is-x-chart', ...)` para charts.
        const invokesFactory = factory === 'window.__isDefineTypedChart'
          ? new RegExp(`window\\.\\s*__isDefineTypedChart\\s*\\?\\s*\\.\\s*\\(\\s*['"\`]is-[a-z0-9-]+['"\`]\\s*,`).test(src)
          : new RegExp(`\\b${factory}\\s*\\(`).test(src);
        if (invokesFactory) {
          const modDir = path.dirname(rutaModulo);
          const basePath = path.resolve(modDir, file);
          const factoryPath = [basePath, basePath.replace(/\.js$/, '.ts')]
            .find((p) => fs.existsSync(p));
          if (factoryPath) {
            const factorySrc = fs.readFileSync(factoryPath, 'utf8');
            const fLiteral = findReturnArray(factorySrc);
            if (fLiteral) {
              const visitar = (lit: string): void => {
                for (const m of lit.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) {
                  atributosObservados.add(m[1]);
                }
                for (const m of lit.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
                  const alias = m[1];
                  const cMatch = factorySrc.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*=\\s*Object\\.keys\\s*\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)`));
                  if (cMatch) {
                    const objName = cMatch[1];
                    const objMatch = factorySrc.match(new RegExp(`(?:const|let|var)\\s+${objName}\\s*[:=]\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
                    if (objMatch) {
                      for (const k of objMatch[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]\s*:/g)) {
                        atributosObservados.add(k[1]);
                      }
                    }
                    continue;
                  }
                  const aliasMatch = factorySrc.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
                  if (aliasMatch) visitar(aliasMatch[1]);
                }
              };
              visitar(fLiteral);
            } else {
              const fConst = factorySrc.match(/static\s+get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?\{[\s\S]*?return\s+([A-Z_$][\w$]*)/);
              if (fConst) {
                const cMatch = factorySrc.match(new RegExp(`(?:const|let|var)\\s+${fConst[1]}\\s*[:=]\\s*\\[([^\\]]*)\\]`));
                if (cMatch) {
                  for (const m of cMatch[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) atributosObservados.add(m[1]);
                }
              } else {
                for (const m of factorySrc.matchAll(/(?:const|let|var)\s+(OBSERVED|OBSERVED_ATTRS|ATTRS)\s*[:=]\s*\[([^\]]*)\]/g)) {
                  for (const s of m[2].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) atributosObservados.add(s[1]);
                }
              }
            }
          }
        }
      }
    } catch { /* filesystem falló, seguir */ }
  }

  // 2. @observed('attr-name') / @prop @observed
  for (const m of src.matchAll(/@(?:observed|prop)(?:\(\s*['"`]([a-zA-Z0-9-]+)['"`])?/g)) {
    if (m[1]) atributosObservados.add(m[1]);
  }

  // 3. @observedAttribute('attr-name')
  for (const m of src.matchAll(/@observedAttribute\(\s*['"`]([a-zA-Z0-9-]+)['"`]/g)) {
    atributosObservados.add(m[1]);
  }

  // 4. Propiedades públicas: `#foo` (campos privados con getter público).
  // Estrategia conservadora: solo contar getters declarados con notación
  // moderna `get #foo()` o `get foo()`. Los campos privados no son
  // "props públicas" del JSON, así que NO se incluyen.
  for (const m of src.matchAll(/\bget\s+([a-zA-Z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (name.startsWith('#')) continue; // privado
    if (['attributeChangedCallback', 'connectedCallback', 'disconnectedCallback',
      'observedAttributes', 'constructor', 'prototype'].includes(name)) continue;
    propsPublicas.add(name);
  }

  // 5. Slots: detectar <slot name="x"> o @slot('x').
  for (const m of src.matchAll(/<slot[^>]*\sname=["']([a-zA-Z0-9-]+)["']/g)) slots.add(m[1]);
  for (const m of src.matchAll(/@slot\(\s*['"`]([a-zA-Z0-9-]+)['"`]/g)) slots.add(m[1]);

  // 6. Define / guard.
  // El kit usa cuatro fábricas + un patrón "TypeScript-typed" para los
  // charts: `defineElement` (core/element.ts), `defineTypedChart`,
  // `definePickerInput`, `defineDateField`. Todas terminan llamando
  // `customElements.define` con guard. Detectamos cualquiera de las
  // cuatro formas para no generar falsos positivos.
  // Aceptamos tanto string literal como identificador (p.ej.
  // `defineElement(TAG, ...)` donde TAG es una constante).
  // Patrón adicional: `window.__isDefineTypedChart?.('is-X', ...)` —
  // los charts tipados delegan el define al runtime; eso cuenta.
  const defineFabrica = (fabrica: string) =>
    new RegExp(`\\b${fabrica}\\s*\\(\\s*(?:['"\`]([a-zA-Z0-9-]+)['"\`]|([A-Z_$][\\w$]*))`).test(src);
  const defineCustomElement =
    /customElements\.define\s*\(\s*['"`]([a-zA-Z0-9-]+)['"`]/.test(src)
    || defineFabrica('defineElement')
    || defineFabrica('defineTypedChart')
    || defineFabrica('definePickerInput')
    || defineFabrica('defineDateField')
    // Patrón chart-tipado: cada chart llama a la fábrica global.
    || /__isDefineTypedChart\s*\?\s*\.\s*\(\s*['"`]([a-zA-Z0-9-]+)['"`]/.test(src)
    // Patrón factory options: defineDateField({...}) o definePickerInput({...}).
    || /\b(?:defineDateField|definePickerInput|defineTypedChart)\s*\(\s*\{/.test(src);
  const guardIdempotente = /customElements\.get\s*\(\s*['"`][a-zA-Z0-9-]+['"`]\s*\)/.test(src)
    // Las fábricas ya traen guard internamente; no lo penalizamos.
    || /\bdefineElement\s*\(/.test(src)
    || /\bdefineTypedChart\s*\(/.test(src)
    || /\bdefinePickerInput\s*\(/.test(src)
    || /\bdefineDateField\s*\(/.test(src)
    || /__isDefineTypedChart/.test(src);

  // 7. Herencia.
  const heredaBase = /extends\s+(ElementBase|ModalBase|DiagramElementBase|withStyleAttrs|PickerElement|DateFieldElement|BreakpointHost)/.test(src);

  return {
    ruta: rutaModulo,
    atributosObservados,
    propsPublicas,
    defineCustomElement,
    guardIdempotente,
    slots,
    heredaBase,
  };
}

/** Opciones del validador de consistencia. */
export interface OpcionesConsistencia {
  /** Si el tag es un módulo (helper, no custom element), el auditor
   *  no exige que se registre un custom element con el tag. */
  esModulo?: boolean;
}

/**
 * Compara la metadata del módulo contra lo declarado en el JSON.
 * Devuelve hallazgos accionables.
 */
export function ejecutarValidacionConsistencia(def: Def, meta: MetaComponente | null, rutaJson: string, opciones: OpcionesConsistencia = {}): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const tag = def.tag;
  const secciones = def.sections ?? [];
  const esModulo = opciones.esModulo === true;

  // Si no hay módulo, no hay nada que validar contra.
  if (!meta) {
    hallazgos.push({
      categoria: 'consistencia',
      severidad: 'warn',
      tag,
      ruta: rutaJson,
      mensaje: `No se encontró módulo JS/TS del componente (tag=${tag}).`,
      sugerencia: 'Verificá que el manifest.ts declare `script` apuntando a un archivo existente (.ts o .js).',
    });
    return hallazgos;
  }

  // 1. El módulo tiene que registrar el custom element con el tag.
  // Módulos (helpers como is-ui): el "tag" no se registra como
  // custom element. La app consumidora lo decide. Salteamos ambos checks.
  if (!esModulo && !meta.defineCustomElement) {
    hallazgos.push({
      categoria: 'consistencia',
      severidad: 'error',
      tag,
      ruta: meta.ruta,
      mensaje: `Módulo del componente no llama customElements.define('${tag}', …). El JSON declara demos de <${tag}> pero el tag nunca se registra.`,
    });
  }
  if (!esModulo && !meta.guardIdempotente) {
    hallazgos.push({
      categoria: 'consistencia',
      severidad: 'warn',
      tag,
      ruta: meta.ruta,
      mensaje: 'Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.',
      sugerencia: 'Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.',
    });
  }

  // 2. Para cada bloque demo con controls, verificar que el componente
  //    exponga el atributo o la prop declarada.
  secciones.forEach((sec, si) => {
    const bloques: any[] = sec.blocks ?? [];
    bloques.forEach((bloque, bi) => {
      if (!Array.isArray(bloque.controls)) return;
      const rutaBloque = `${rutaJson}#sections[${si}].blocks[${bi}].controls`;
      (bloque.controls as any[]).forEach((ctrl, ci) => {
        const prop = String(ctrl.prop ?? '');
        const ctrlLabel = String(ctrl.label ?? prop);
        if (!prop) return;
        if (prop.startsWith('attr:')) {
          const attrName = prop.slice(5);
          if (!meta.atributosObservados.has(attrName)) {
            // Si hereda de una base que aporta observedAttributes, no es error.
            if (!meta.heredaBase) {
              hallazgos.push({
                categoria: 'consistencia',
                severidad: 'warn',
                tag,
                ruta: meta.ruta,
                mensaje: `Control "${ctrlLabel}" (prop="${prop}") en ${rutaBloque}[${ci}] apunta a un atributo que el módulo no declara como observado.`,
                sugerencia: `Agregá '${attrName}' al array devuelto por static get observedAttributes().`,
              });
            }
          }
        } else if (prop.startsWith('prop:')) {
          const propName = prop.slice(5);
          // Las props complejas (JSON) suelen asignarse sin getter público:
          // solo advertimos, no fallamos.
          if (!meta.propsPublicas.has(propName)) {
            hallazgos.push({
              categoria: 'consistencia',
              severidad: 'info',
              tag,
              ruta: meta.ruta,
              mensaje: `Control "${ctrlLabel}" usa prop "${propName}" pero el módulo no expone un getter público con ese nombre.`,
              sugerencia: 'Si es una prop compleja (objeto), basta con el campo privado + setter; el motor acepta asignación directa.',
            });
          }
        } else {
          // Sin prefijo: heurística → atributo.
          if (!meta.atributosObservados.has(prop)) {
            // Algunos tags declaran el atributo solo en observedAttributes
            // de la base (ElementBase, etc.).
            if (!meta.heredaBase) {
              hallazgos.push({
                categoria: 'consistencia',
                severidad: 'info',
                tag,
                ruta: meta.ruta,
                mensaje: `Control "${ctrlLabel}" usa "${prop}" sin prefijo. Verificá que se mapee como atributo o prop.`,
              });
            }
          }
        }
      });
    });
  });

  return hallazgos;
}

/** Helper: el módulo existe y se puede leer. */
export function existeModulo(rutaModulo: string | null): boolean {
  if (!rutaModulo) return false;
  if (existsSync(rutaModulo)) return true;
  const ts = rutaModulo.replace(/\.js$/, '.ts');
  const js = rutaModulo.replace(/\.ts$/, '.js');
  return existsSync(ts) || existsSync(js);
}

/** Helper: nombre del archivo del módulo (para mensajes). */
export function nombreModulo(ruta: string): string {
  return basename(ruta);
}