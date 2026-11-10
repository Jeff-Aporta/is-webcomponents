// @contexto INDICE.md · tests/gobernanza/README.md
// _identidad.mjs — núcleo compartido del guardián de identidad (FASE B.2).
//
// La marca del kit es `iswc`. Este módulo sabe cómo se escribe la marca que el kit
// YA NO TIENE sin escribirla: los patrones se arman con trozos, para que este archivo
// (y los guardianes que lo usan) puedan escanearse a sí mismos sin marcar un falso
// positivo. Si aquí se escribiera la marca vieja completa, el guardián se forbids a sí mismo.
//
// También centraliza lo que SÍ se puede decir de la marca: en prosa y en datos de
// muestra la marca va en minúscula (`iswc`), como el nombre del paquete (`iswc-base`).
import { execFileSync } from 'node:child_process';

// Trozos: la marca vieja nunca aparece junta en este archivo.
const A = 'in';
const B = 'soft';
const C = 'conta';
const D = 'pyme';
const E = 'ayudas';
const F = 'cpia';

/** La marca que el kit ya no tiene (tres nombres históricos), en cualquier grafía. */
export const MARCA_VIEJA = new RegExp(
  `${A}\\s?[-_]?${B}|${C}\\s?[-_]?${D}|${E}\\s?[-_]?${F}`,
  'i',
);

/** Los nombres de las empresas de muestra (ficticios). */
const MARCA_EJEMPLO = /acme|beta/i;

/** Las carpetas de labs que conservan el nombre histórico (los labs son ejemplos del dueño).
 *  Se enmascaran con o sin barra delante: los labs se nombran en un solo trozo
 *  (`labs/iss-…-flujos`) o por segmentos (`join(LABS, 'iss-…-flujos', …)`). */
const CARPETAS_LABS = new RegExp(`(?:labs[/\\\\])?iss-${E}${F}-[a-z]+`, 'g');

/** Quita de un texto las rutas a los labs de nombre histórico (no cuentan: los labs son de otro dueño). */
export function sinCarpetasLabs(texto) {
  return texto.replace(CARPETAS_LABS, 'labs/<lab>');
}

/** ¿El texto trae alguna marca que el kit ya no tiene? (sin contar las rutas a labs) */
export function traeMarcaVieja(texto) {
  return MARCA_VIEJA.test(sinCarpetasLabs(texto));
}

/** ¿El texto nombra una empresa de ejemplo (ficticia)? */
export function traeMarcaEjemplo(texto) {
  return MARCA_EJEMPLO.test(texto);
}

/** Rutas versionadas del repo (relative, con `/`). */
export function rutasVersionadas(raiz) {
  try {
    return execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
