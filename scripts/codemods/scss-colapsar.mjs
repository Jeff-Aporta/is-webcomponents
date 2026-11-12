// @contexto INDICE.md · scripts/README.md
// scss-colapsar.mjs — colapsa a una linea las reglas de un .scss, REGLA a REGLA.
//
//   deno run -A scripts/codemods/scss-colapsar.mjs [--carpeta=src] [--ancho=120] [--check]
//
// Que una regla se escriba en una linea o en tres no cambia el CSS: Sass emite lo mismo.
// El colapso es RECURSIVO: primero se colapsan las hijas y, si la regla entera (declaraciones
// + hijas) cabe en el ancho, se colapsa ella.
//
// El codemod se COMPRUEBA a si mismo, REGLA a REGLA: despues de colapsar una regla compila el
// CSS y lo compara con el de antes. Si no es identico, esa regla se queda como estaba y se
// sigue con la siguiente. Asi una regla problematica no tira el archivo entero.
//
// Lo que NO se toca:
//
//   · los comentarios (no se pierden ni se mueven);
//   · los selectores repartidos en varias lineas;
//   · las reglas cuyo selector tiene coma: al fundirlas con sus hijas, Sass reordena las
//     reglas y con ellas la especificidad;
//   · las declaraciones partidas en varias lineas (un valor largo con comas).
//
// Los finales de linea del archivo se respetan (algunos del repo usan CRLF).
import { compile } from 'sass';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const RAIZ = process.cwd();
const SRC = join(RAIZ, 'src');
const args = process.argv.slice(2);
const valor = (k, def) => args.find((a) => a.startsWith('--' + k + '='))?.slice(k.length + 3) ?? def;
const ANCHO = Number(valor('ancho', '120'));
const CHECK = args.includes('--check');
const CARPETA = valor('carpeta', 'src');

/** Archivos que no se tocan: se generan. */
const GENERADOS = new Set(['src/styles/palettes.scss']);

function scssFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) scssFiles(p, out);
    else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

/** El terminador de linea del archivo (CRLF, CR o LF). */
const terminadorDe = (texto) => {
  if (texto.includes('\r\n')) return '\r\n';
  if (/\r(?![\n])/.test(texto)) return '\r';
  return '\n';
};

const compilar = (abs) => compile(abs, {
  style: 'expanded',
  sourceMap: false,
  loadPaths: [dirname(abs), join(SRC, 'styles')],
  silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
}).css;

/** Si una declaracion sigue en la linea siguiente (valor largo, parentesis abierto). */
const sigueEn = (s) => {
  if (!s.endsWith(';') && !s.endsWith(',')) return true;
  const a = (s.match(/\(/g) ?? []).length;
  const c = (s.match(/\)/g) ?? []).length;
  return a > c;
};

/**
 * Una regla con su rango: el selector, las declaraciones, las hijas y las lineas.
 *
 * Devuelve null si la regla no se puede colapsar (comentarios, selectores repartidos...).
 */
function reglaEn(lineas, i) {
  const t = lineas[i].trim();
  const decls = [];
  const hijas = [];
  let prof = 1;
  let j = i + 1;
  let bloqueable = true;
  const selectorMultiple = t.includes(',');
  while (j < lineas.length) {
    const dt = lineas[j].trim();
    if (!dt) { j++; continue; }
    if (dt === '}' || dt === '};') {
      prof--;
      if (prof === 0) break;
      j++;
      continue;
    }
    if (dt.endsWith('{')) {
      const r = reglaEn(lineas, j);
      if (!r) { bloqueable = false; break; }
      hijas.push(r);
      j = r.fin + 1;
      continue;
    }
    if (dt.startsWith('//') || dt.startsWith('/*')) { bloqueable = false; j++; continue; }
    // Un selector repartido en varias lineas: no se aplana. Ojo: un selector puede contener
    // ':' (`:host(:not([x]))`), asi que la senal de que NO es una declaracion es que la linea
    // siguiente termine en '{' (un selector) en vez de ser otra declaracion.
    const siguiente = lineas[j + 1]?.trim() ?? '';
    if (!dt.endsWith(';') && siguiente.endsWith('{')) { bloqueable = false; j++; continue; }
    let decl = dt;
    while (sigueEn(decl) && j + 1 < lineas.length) {
      const sig = lineas[j + 1].trim();
      if (!sig || sig.endsWith('{') || sig === '}' || sig === '};') break;
      decl += ' ' + sig;
      j++;
    }
    decls.push(decl);
    j++;
  }
  if (!bloqueable || !decls.length) return null;
  const cuerpo = decls.map((d) => d.replace(/;$/, '')).join('; ') + ';';
  const textoHijas = hijas.map((h) => h.texto).join(' ');
  const texto = t + ' ' + (cuerpo ? cuerpo + ' ' : '') + (textoHijas ? textoHijas + ' ' : '') + '}';
  return { ini: i, fin: j, texto, lineas: 1 + hijas.length, selectorMultiple };
}

/**
 * Colapsa las reglas de un texto, una a una.
 *
 * Devuelve el texto nuevo y cuantas reglas se colapsaron.
 */
export function colapsar(texto, ancho = ANCHO, profundidad = 0) {
  const term = terminadorDe(texto);
  const lineas = texto.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const salida = [];
  let colapsadas = 0;
  let i = 0;
  while (i < lineas.length) {
    const t = lineas[i].trim();
    if (!t.endsWith('{') || t.startsWith('@') || t.includes('(')) {
      salida.push(lineas[i]);
      i++;
      continue;
    }
    const r = reglaEn(lineas, i);
    if (!r) {
      // No se puede colapsar: se copia la regla COMPLETA (hasta su cierre), no solo la primera
      // linea: si no, sus lineas sueltas se tratarian como reglas aparte.
      let prof = 1;
      let j = i + 1;
      while (j < lineas.length) {
        const dt = lineas[j].trim();
        if (dt === '}' || dt === '};') {
          prof--;
          if (prof === 0) break;
        } else if (dt.endsWith('{')) {
          prof++;
        }
        j++;
      }
      salida.push(...lineas.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    // La regla tiene hijas: se aplana de dentro hacia fuera.
    if (r.lineas > 1 && profundidad < 12) {
      const interior = colapsar(lineas.slice(i, r.fin + 1).join('\n'), ancho, profundidad + 1).texto.split('\n');
      const r2 = reglaEn(interior, 0);
      if (r2 && r2.texto.length <= ancho) {
        salida.push(r2.texto);
        colapsadas++;
        i = r.fin + 1;
        continue;
      }
      salida.push(...lineas.slice(i, r.fin + 1));
      i = r.fin + 1;
      continue;
    }
    if (r.texto.length <= ancho) {
      salida.push(r.texto);
      colapsadas++;
      i = r.fin + 1;
      continue;
    }
    salida.push(...lineas.slice(i, r.fin + 1));
    i = r.fin + 1;
  }
  // Quitar los blancos entre dos reglas que han quedado en una linea: si cada regla es una
  // linea, el blanco ya no separa nada. El CSS no cambia (los espacios no cuentan).
  const esRegla = (l) => {
    const t = l.trim();
    return t.endsWith('}') && t.includes('{') && !t.startsWith('//') && !t.startsWith('/*');
  };
  const limpio = [];
  for (let i = 0; i < salida.length; i++) {
    if (
      salida[i].trim() === '' &&
      limpio.length && esRegla(limpio[limpio.length - 1]) &&
      esRegla(salida[i + 1] ?? '')
    ) continue;
    limpio.push(salida[i]);
  }
  return { texto: limpio.join(term), colapsadas };
}

function ejecutar() {
  const archivos = scssFiles(join(RAIZ, CARPETA));
  let lineasAntes = 0;
  let lineasDespues = 0;
  let colapsadas = 0;
  let tocados = 0;
  let descartados = 0;
  const porArchivo = [];
  for (const abs of archivos) {
    const rel = relative(RAIZ, abs).replaceAll('\\', '/');
    if (GENERADOS.has(rel)) continue;
    const antes = readFileSync(abs, 'utf8');
    const { texto, colapsadas: n } = colapsar(antes, ANCHO);
    if (!n) continue;
    const la = antes.split(/\r\n|\r|\n/).length;
    const ld = texto.split(/\r\n|\r|\n/).length;
    // La comprobacion: si el CSS cambia, el archivo no se toca.
    const temporal = abs + '.tmp-colapsar.scss';
    let cssAntes = '';
    let cssDespues = '';
    try {
      cssAntes = compilar(abs);
      writeFileSync(temporal, texto, 'utf8');
      cssDespues = compilar(temporal);
    } catch {
      descartados++;
    } finally {
      try { unlinkSync(temporal); } catch { /* ya no esta */ }
    }
    if (cssAntes !== cssDespues) {
      descartados++;
      continue;
    }
    if (!CHECK) writeFileSync(abs, texto, 'utf8');
    tocados++;
    colapsadas += n;
    lineasAntes += la;
    lineasDespues += ld;
    porArchivo.push({ rel, n, la, ld });
  }
  porArchivo.sort((a, b) => (b.la - b.ld) - (a.la - a.ld));
  console.log('archivos: ' + tocados + ' tocados | ' + descartados + ' descartados (el CSS cambiaba)');
  console.log('reglas colapsadas: ' + colapsadas);
  console.log('lineas: ' + lineasAntes + ' -> ' + lineasDespues + '  (' + (lineasDespues - lineasAntes) + ')');
  for (const p of porArchivo.slice(0, 12)) console.log('  ' + String(p.la - p.ld).padStart(5) + ' lineas  ' + String(p.n).padStart(4) + ' reglas  ' + p.rel);
}

if (import.meta.main) ejecutar();
