// _css-compilado.ts — lectura del CSS COMPILADO (.tmp-scss/src/**) para los
// tests de componentes. No es un test (no termina en .test.ts).
//
// Sass emite los selectores de atributo sin comillas cuando el valor es un
// identificador (`:host([color="brand"])` → `:host([color=brand])`). Los tests
// afirman sobre lo observable (el CSS que llega al navegador), así que se
// normaliza a la forma canónica con comillas dobles antes de buscar; las dos
// formas son equivalentes para el motor CSS.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** `[attr=valor]` → `[attr="valor"]` (también `~=`, `|=`, `^=`, `$=`, `*=`). */
export function normalizarCss(css: string): string {
  return css
    .replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*'([^']*)'\s*\]/g, '[$1$2"$3"]')
    .replace(/\[\s*([\w-]+)\s*([~|^$*]?=)\s*(-?[A-Za-z_][\w-]*)\s*\]/g, '[$1$2"$3"]');
}

/** Lee `.tmp-scss/<rel>` (rel = ruta del .css bajo src/, p.ej. `src/components/actions/button.css`). */
export function leerCssCompilado(root: string, rel: string): string {
  return normalizarCss(readFileSync(join(root, '.tmp-scss', rel), 'utf8'));
}

export type Regla = { selector: string; cuerpo: string; at: string[] };

/**
 * Reglas hoja del CSS (sin comentarios), con los @-bloques que las envuelven.
 * Parser mínimo por llaves: suficiente para el CSS plano que emite Sass.
 */
export function reglas(css: string): Regla[] {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Regla[] = [];
  const pila: string[] = [];
  let i = 0;
  let inicio = 0;
  while (i < limpio.length) {
    const c = limpio[i];
    if (c === '{') {
      const cabecera = limpio.slice(inicio, i).trim();
      if (cabecera.startsWith('@')) {
        pila.push(cabecera);
        i++;
        inicio = i;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < limpio.length && depth > 0) {
        if (limpio[j] === '{') depth++;
        else if (limpio[j] === '}') depth--;
        j++;
      }
      out.push({ selector: cabecera.replace(/^@charset[^;]*;/, '').trim(), cuerpo: limpio.slice(i + 1, j - 1), at: [...pila] });
      i = j;
      inicio = i;
      continue;
    }
    if (c === '}') {
      pila.pop();
      i++;
      inicio = i;
      continue;
    }
    if (c === ';' && limpio.slice(inicio, i).trim().startsWith('@')) {
      i++;
      inicio = i;
      continue;
    }
    i++;
  }
  return out;
}

/** Separa una lista de selectores por las comas de nivel 0 (respeta `:is(a, b)`). */
export function selectores(lista: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let actual = '';
  for (const c of lista) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(actual);
      actual = '';
    } else actual += c;
  }
  out.push(actual);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Reglas cuyo selector (lista separada por comas) incluye exactamente `sel`. */
export function reglasDe(css: string, sel: string): Regla[] {
  const objetivo = sel.replace(/\s+/g, ' ').trim();
  return reglas(css).filter((r) => selectores(r.selector).includes(objetivo));
}
