// tests/shadow-css-scope.test.ts
//
// Detecta las dos formas de CSS MUERTO que ya se colaron en este repo. Las dos
// comparten sintoma: el archivo se ve correcto, el navegador no se queja, y el
// componente sale sin estilar.
//
// 1) SELECTOR DE TAG PROPIO.
//    adopt-css.js adopta la hoja en CADA shadow root por separado. Dentro del
//    shadow de <is-tab>, una regla `is-tab .tab {}` no matchea NADA: el host
//    queda fuera del arbol del shadow y solo se alcanza con :host(...). Y desde
//    el shadow de <is-tab-group> tampoco, porque los tabs entran slotted y los
//    descendientes del light DOM no los alcanza el selector.
//    Paso de verdad: TODAS las reglas de <is-tab> en tab-group.css eran muertas
//    y los tabs se veian como botones nativos sin estilar.
//    Correcto: `:host(is-tab) .tab {}` — o `::slotted(is-tab)` desde el padre.
//
// 2) `&[attr]` ANIDADO DENTRO DE `:host {}`.
//    El nesting nativo lo compila a `:host[attr]`, que NO es lo mismo que
//    `:host([attr])` y no matchea nunca. Vive en tag/callout/card/details.
//    Correcto: `:host([attr]) {}` al nivel superior de la hoja.
//
// Uso:  node tests/shadow-css-scope.test.ts

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const compRoot = join(root, 'src', 'components');

const failures = [];

/** Quita comentarios para no analizar ejemplos escritos en la documentacion. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.css')) out.push(full);
  }
  return out;
};

/**
 * Tags que registra el .js hermano: son los hosts que adoptan esta hoja.
 * Un componente sin shadow root (light DOM a propósito, como
 * is-preview-component) no adopta nada: ahí `is-x .y {}` es la única forma de
 * estilarlo y no hay CSS muerto que perseguir.
 */
const tagsOf = (cssFile) => {
  const jsFile = cssFile.replace(/\.css$/, '.js');
  if (!existsSync(jsFile)) return [];
  const js = readFileSync(jsFile, 'utf8');
  if (!/attachShadow|adoptCss/.test(js)) return [];
  return [...js.matchAll(/(?:customElements\.define|defineElement)\(\s*['"]([\w-]+)['"]/g)].map((m) => m[1]);
};

/** Numero de linea de un indice de caracter, para poder citar file:line. */
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

for (const cssFile of walk(compRoot)) {
  const tags = tagsOf(cssFile);
  if (!tags.length) continue;
  const raw = readFileSync(cssFile, 'utf8');
  const css = stripComments(raw);
  const rel = relative(root, cssFile).replace(/\\/g, '/');

  // ---- 1) selectores que usan como elemento un tag de este mismo modulo ----
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    // Lo capturado arrastra las declaraciones previas del bloque padre
    // (`container-name: is-form; .y {`), y un valor de propiedad no es un
    // selector: quedarse solo con lo que sigue al último `;`.
    const selector = match[1].split(';').pop().trim();
    if (!selector || selector.startsWith('@')) continue;
    // :host(is-x) y ::slotted(is-x) son las formas CORRECTAS de nombrar el tag.
    const exposed = selector
      .replace(/:host\([^)]*\)/g, '')
      .replace(/::slotted\([^)]*\)/g, '');
    for (const tag of tags) {
      if (new RegExp(`(^|[\\s>+~,])${tag}(?![\\w-])`).test(exposed)) {
        failures.push(
          `${rel}:${lineAt(css, match.index)} — \`${selector}\` usa \`${tag}\` como elemento; `
          + `dentro del shadow eso es CSS muerto. Usa \`:host(${tag})\` o \`::slotted(${tag})\`.`,
        );
      }
    }
  }

  // ---- 2) `&[attr]` dentro de un bloque `:host {` ----
  const hostBlock = /:host\s*\{/g;
  let m;
  while ((m = hostBlock.exec(css))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    const body = css.slice(start, i - 1);
    // Solo el nivel INMEDIATO: dentro de una regla hija (`.label { &[hidden] }`)
    // el `&` es esa regla y el anidado es correcto. Contar llaves evita ese
    // falso positivo, que es la mayoria de los `&[hidden]` del repo.
    let nivel = 0;
    for (let k = 0; k < body.length; k += 1) {
      const ch = body[k];
      if (ch === '{') nivel += 1;
      else if (ch === '}') nivel -= 1;
      else if (ch === '&' && nivel === 0 && body[k + 1] === '[') {
        const bad = body.slice(k).match(/^&\[[^\]]+\]/);
        if (bad) {
          failures.push(
            `${rel}:${lineAt(css, start + k)} — \`${bad[0]}\` anidado en \`:host {}\` `
            + `compila a \`:host[attr]\`, que no matchea. Usa \`:host([attr])\` al nivel superior.`,
          );
        }
      }
    }
  }
}

if (failures.length) {
  console.error(`shadow-css-scope.test.ts: FAIL — ${failures.length} regla(s) de CSS muerto\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log('shadow-css-scope.test.ts: PASS');
