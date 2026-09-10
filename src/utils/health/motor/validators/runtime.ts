/**
 * Validador de RUNTIME (errores potenciales en runtime).
 *
 * Examina el código fuente del componente buscando patrones que la
 * auditoría de 2026-08 ya documentó como fuentes de bugs:
 *
 *   - listeners de document/window sin removeEventListener simétrico
 *   - observers (Mutation/Resize/Intersection) sin .disconnect()
 *   - setInterval sin clearInterval
 *   - observedAttributes sin attributeChangedCallback
 *   - attributeChangedCallback sin observedAttributes (nunca se invoca)
 *   - adoptCss sin .css hermano o al revés
 *   - extends HTMLElement sin customElements.define
 *
 * Es best-effort y ortogonal al componente audit-components.ts: este
 * módulo se enfoca en los hallazgos QUE IMPIDEN QUE EL DEMO FUNCIONE
 * (lo que el usuario ve cuando navega la galería), no en la higiene
 * general del componente.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Hallazgo } from '../types.js';

/**
 * Revisa el módulo del componente en busca de patrones problemáticos.
 * Devuelve hallazgos (severidad error si rompe funcionalidad).
 */
export interface OpcionesRuntime {
  esModulo?: boolean;
}

export function auditarRuntimeComponente(rutaModulo: string | null, tag: string, opciones: OpcionesRuntime = {}): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  if (!rutaModulo || !existsSync(rutaModulo)) return hallazgos;
  // Módulos: no emiten customElements.define, no necesitan guard.
  if (opciones.esModulo === true) return hallazgos;

  let src: string;
  try {
    src = readFileSync(rutaModulo, 'utf8');
  } catch {
    return hallazgos;
  }

  // 1. Listeners de document/window sin removeEventListener simétrico.
  const docAdds = [...src.matchAll(/(document|window)\.addEventListener\(\s*['"`]([a-z-]+)['"`]/g)];
  const docRemoves = new Set(
    [...src.matchAll(/(document|window)\.removeEventListener\(\s*['"`]([a-z-]+)['"`]/g)]
      .map((m) => `${m[1]}.${m[2]}`),
  );
  for (const m of docAdds) {
    const key = `${m[1]}.${m[2]}`;
    if (!docRemoves.has(key)) {
      hallazgos.push({
        categoria: 'runtime',
        severidad: 'error',
        tag,
        ruta: rutaModulo,
        mensaje: `${m[1]}.addEventListener('${m[2]}') sin removeEventListener simétrico. Demo del componente fuga listeners.`,
        sugerencia: 'Guardá el listener en un AbortController y abortá en disconnectedCallback, o agregá removeEventListener.',
      });
    }
  }

  // 2. setInterval sin clearInterval.
  if (/setInterval\s*\(/.test(src) && !/clearInterval\s*\(/.test(src)) {
    hallazgos.push({
      categoria: 'runtime',
      severidad: 'error',
      tag,
      ruta: rutaModulo,
      mensaje: 'setInterval sin clearInterval. El demo fuga timers.',
    });
  }

  // 3. Observers sin disconnect.
  for (const obs of ['MutationObserver', 'ResizeObserver', 'IntersectionObserver']) {
    const re = new RegExp(`new\\s+${obs}\\s*\\(`, 'g');
    if (re.test(src) && !new RegExp(`\\.disconnect\\s*\\(`).test(src)) {
      hallazgos.push({
        categoria: 'runtime',
        severidad: 'error',
        tag,
        ruta: rutaModulo,
        mensaje: `${obs} instanciado sin .disconnect() en el lifecycle. El demo acumula observers en cada remount.`,
      });
    }
  }

  // 4. observedAttributes sin callback (o viceversa).
  const extendsBase = /extends\s+(ElementBase|ModalBase|DiagramElementBase|withStyleAttrs|PickerElement|DateFieldElement|BreakpointHost)/.test(src);
  if (!extendsBase) {
    const hasObserved = /static\s+(?:get\s+)?observedAttributes\s*(?:\(\s*\))?\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?[\{:]/.test(src)
      // Variante: const OBSERVED = [...] (común en isp/*).
      || /(?:const|let|var)\s+(OBSERVED|OBSERVED_ATTRS|ATTRS)\s*[:=]\s*\[/.test(src);
    const hasCallback = /attributeChangedCallback\s*\(/.test(src);
    if (hasObserved && !hasCallback) {
      // Si extiende ElementBase, el callback lo aporta la base.
      if (extendsBase) {
        // silencioso.
      } else {
        hallazgos.push({
          categoria: 'runtime',
          severidad: 'error',
          tag,
          ruta: rutaModulo,
          mensaje: 'observedAttributes declarado pero sin attributeChangedCallback: los cambios de atributo nunca se procesan. El playground del demo no será reactivo.',
        });
      }
    }
    if (hasCallback && !hasObserved) {
      hallazgos.push({
        categoria: 'runtime',
        severidad: 'error',
        tag,
        ruta: rutaModulo,
        mensaje: 'attributeChangedCallback presente pero sin observedAttributes: nunca se invoca.',
      });
    }
  }

  // 5. CSS huérfano / adoptCss sin CSS.
  const hasCss = existsSync(rutaModulo.replace(/\.[jt]s$/, '.css'));
  const usesShadow = /attachShadow\s*\(/.test(src);
  const adoptCssCall = /(?<!export const )adoptCss\s*\(/.test(src)
    && !/export\s+const\s+adoptCss\s*=/.test(src);
  if (hasCss && usesShadow && !adoptCssCall) {
    hallazgos.push({
      categoria: 'runtime',
      severidad: 'warn',
      tag,
      ruta: rutaModulo,
      mensaje: 'Componente con attachShadow y .css hermano, pero sin adoptCss(). Los estilos nunca se inyectan en el shadow.',
    });
  }
  if (!hasCss && adoptCssCall) {
    hallazgos.push({
      categoria: 'runtime',
      severidad: 'error',
      tag,
      ruta: rutaModulo,
      mensaje: 'adoptCss() invocado pero sin .css hermano. 404 silencioso en runtime.',
    });
  }

  // 6. customElements.define directo sin guard (puede romper el demo si el
  // módulo se importa dos veces, p.ej. por HMR). Las fábricas del kit
  // (defineElement, defineTypedChart, definePickerInput, defineDateField)
  // ya traen guard: las exoneramos. Igual el patrón __isDefineTypedChart
  // de los charts tipados.
  const defineMatches = [...src.matchAll(/customElements\.define\s*\(\s*['"`]([a-zA-Z0-9-]+)['"`]/g)];
  const usaFabrica = /\b(?:defineElement|defineTypedChart|definePickerInput|defineDateField)\s*\(/.test(src)
    || /__isDefineTypedChart/.test(src);
  if (defineMatches.length > 0 && !/customElements\.get\s*\(/.test(src) && !usaFabrica) {
    hallazgos.push({
      categoria: 'runtime',
      severidad: 'warn',
      tag,
      ruta: rutaModulo,
      mensaje: 'customElements.define sin guard idempotente. Re-importar el módulo tira DOMException.',
    });
  }

  return hallazgos;
}

/**
 * Versión "lite": busca referencias rotas a URLs externas en CSS
 * hermano. Útil para los demos servidos por CDN.
 */
export function auditarCssHermano(rutaModulo: string | null, tag: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  if (!rutaModulo) return hallazgos;
  const cssPath = rutaModulo.replace(/\.[jt]s$/, '.css');
  if (!existsSync(cssPath)) return hallazgos;
  let css: string;
  try {
    css = readFileSync(cssPath, 'utf8');
  } catch {
    return hallazgos;
  }
  // Buscar imports relativos potencialmente rotos.
  const dir = dirname(rutaModulo);
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)) {
    const ref = m[1];
    if (ref.startsWith('http') || ref.startsWith('//')) continue;
    // Resolver contra dir del css.
    const absoluto = resolve(dir, ref.replace(/^\.\//, ''));
    if (!existsSync(absoluto)) {
      hallazgos.push({
        categoria: 'runtime',
        severidad: 'warn',
        tag,
        ruta: cssPath,
        mensaje: `@import "${ref}" no resuelve a ningún archivo.`,
        detalle: { ref, absoluto },
      });
    }
  }
  return hallazgos;
}