// @contexto INDICE.md · scripts/README.md
// scss-anidar.mjs — anida las reglas hijas dentro de su padre, cuando se puede.
//
//   deno run -A scripts/codemods/scss-anidar.mjs [--carpeta=src] [--check]
//
// Anidar NO cambia el CSS: Sass compila `.a { .b { x: y; } }` igual que `.a .b { x: y; }`.
// Lo que cambia es el texto: la hija deja de repetir el selector del padre.
//
// Cuando se puede anidar (specs/componentes.md, S-K4):
//
//   · la hija es un selector de clase o elemento (`.label`, `.error-text`);
//   · la hija ya usa `&` (`&:hover`, `&.is-open`);
//   · la hija es `::part(...)`, `::slotted(...)`.
//
// Cuando NO se puede:
//
//   · `&[attr]` dentro de `:host {}` compila a `:host[attr]`, que nunca matchea el host
//     (la regla prohibida de S-K4): se deja como regla hermana `:host([attr])`;
//   · la hija es un `@media`, `@supports`… (se mueve el bloque entero, no la regla).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const args = process.argv.slice(2);
const valor = (k, def) => args.find((a) => a.startsWith('--' + k + '='))?.slice(k.length + 3) ?? def;
const CHECK = args.includes('--check');
const CARPETA = valor('carpeta', 'src');

function scssFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scssFiles(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

/** ¿Se puede anidar esta hija dentro del padre? */
export function anidable(selHija, selPadre) {
  const h = selHija.trim();
  const p = selPadre.trim();
  if (!h) return false;
  // La trampa de S-K4: `&[attr]` dentro de `:host {}` no matchea el host.
  if ((p === ':host' || p.startsWith(':host(')) && /^&\[[^\]]+\]/.test(h)) return false;
  // Los at-rules no se anidan como regla.
  if (h.startsWith('@')) return false;
  // Una clase, un elemento, un pseudo de clase con &, un ::part o ::slotted.
  if (h.startsWith('&')) return true;
  if (h.startsWith('::part') || h.startsWith('::slotted')) return true;
  if (h.startsWith('.')) return true;
  if (/^[a-z][a-z0-9-]*$/i.test(h)) return true;
  return false;
}

/**
 * Las reglas de un archivo, con una PILA para saber que llave cierra que regla.
 *
 * Cada regla lleva su selector, su cuerpo (declaraciones), sus hijas y su rango.
 */
export function reglasDe(lineas) {
  const pila = [];
  const raices = [];
  let i = 0;
  while (i < lineas.length) {
    const t = lineas[i].trim();
    if (!t) { i++; continue; }
    if (t.startsWith('//') || t.startsWith('/*')) { i++; continue; }
    if (t.endsWith('{')) {
      const sel = t.slice(0, -1).trim();
      const regla = { sel, cuerpo: [], hijas: [], ini: i, fin: -1, atRule: sel.startsWith('@') };
      if (pila.length) pila[pila.length - 1].hijas.push(regla);
      else raices.push(regla);
      pila.push(regla);
      i++;
      continue;
    }
    if (t === '}' || t === '};') {
      if (pila.length) {
        const r = pila.pop();
        r.fin = i;
      }
      i++;
      continue;
    }
    // Una declaracion (puede ocupar varias lineas si el valor es largo).
    let decl = t;
    while (!decl.endsWith(';') && !decl.endsWith(',') && i + 1 < lineas.length) {
      const sig = lineas[i + 1].trim();
      if (!sig || sig.endsWith('{') || sig === '}' || sig === '};') break;
      decl += ' ' + sig;
      i++;
    }
    if (pila.length) pila[pila.length - 1].cuerpo.push(decl);
    i++;
  }
  return raices;
}

/**
 * Anida las hijas de un padre dentro de el, cuando se puede.
 *
 * Solo mueve una hija si es anidable (specs/componentes.md, S-K4), si es simple (sin reglas
 * dentro y sin comentarios) y si todas las hijas del padre son movibles: si se queda alguna
 * fuera, el orden del CSS cambiaria.
 */
export function anidar(texto) {
  const term = texto.includes('\r\n') ? '\r\n' : /\r(?![\n])/.test(texto) ? '\r' : '\n';
  let lineas = texto.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  let movidas = 0;
  for (let vuelta = 0; vuelta < 30; vuelta++) {
    const raices = reglasDe(lineas);
    let progreso = false;
    for (const padre of raices) {
      if (padre.atRule || !padre.hijas.length) continue;
      const movibles = padre.hijas.filter((h) =>
        !h.atRule &&
        !h.hijas.length &&
        h.cuerpo.length &&
        !h.cuerpo.some((c) => c.startsWith('//') || c.startsWith('/*')) &&
        anidable(h.sel, padre.sel)
      );
      if (!movibles.length || movibles.length !== padre.hijas.length) continue;
      const bloque = [padre.sel + ' {'];
      for (const c of padre.cuerpo) bloque.push('  ' + c);
      for (const h of movibles) {
        const sel = h.sel.startsWith('&') ? h.sel : '& ' + h.sel;
        bloque.push('  ' + sel + ' { ' + h.cuerpo.map((d) => d.replace(/;$/, '')).join('; ') + '; }');
      }
      bloque.push('}');
      const dentro = new Set();
      for (const h of padre.hijas) for (let k = h.ini; k <= h.fin; k++) dentro.add(k);
      const salida = [];
      let i = 0;
      while (i < lineas.length) {
        if (i === padre.ini) { salida.push(...bloque); i = padre.fin + 1; continue; }
        if (dentro.has(i)) { i++; continue; }
        salida.push(lineas[i]);
        i++;
      }
      lineas = salida;
      movidas += movibles.length;
      progreso = true;
      break;
    }
    if (!progreso) break;
  }
  return { texto: lineas.join(term), movidas };
}

function ejecutar() {
  const archivos = scssFiles(join(RAIZ, CARPETA));
  let movidas = 0;
  let tocados = 0;
  const porArchivo = [];
  for (const abs of archivos) {
    const rel = relative(RAIZ, abs).replaceAll('\\', '/');
    const antes = readFileSync(abs, 'utf8');
    const { texto, movidas: m } = anidar(antes);
    if (!m) continue;
    const la = antes.split(/\r\n|\r|\n/).length;
    const ld = texto.split(/\r\n|\r|\n/).length;
    if (!CHECK) writeFileSync(abs, texto, 'utf8');
    tocados++;
    movidas += m;
    porArchivo.push({ rel, m, la, ld });
  }
  porArchivo.sort((a, b) => (b.la - b.ld) - (a.la - a.ld));
  console.log('archivos: ' + tocados + ' | reglas anidadas: ' + movidas);
  for (const p of porArchivo.slice(0, 12)) console.log('  ' + String(p.la - p.ld).padStart(5) + ' lineas  ' + String(p.m).padStart(4) + ' reglas  ' + p.rel);
}

if (import.meta.main) ejecutar();
