/**
 * ts-revertir-inferencia.ts — Quita las anotaciones que el compilador desmiente.
 *
 * POR QUÉ EXISTE. `ts-inferir-params.ts` deduce el tipo de un parámetro por
 * cómo se usa, y una de sus reglas resultó demasiado laxa: en `Math.round(p.x)`
 * daba por número a `p`, cuando el número es `p.x`. El resultado son parámetros
 * anotados con el tipo de uno de sus campos, y cada uso posterior del objeto
 * pasa a ser un error.
 *
 * Una anotación equivocada es peor que ninguna: afirma algo falso y arrastra
 * errores lejos de donde está la causa. Este paso las retira usando como juez
 * al propio compilador —si `tsc` dice que `.x` no existe en `number`, la
 * anotación miente— y deja el parámetro sin tipo, que es un estado honesto:
 * vuelve a salir como TS7006 y se decide con criterio.
 *
 * SOLO REVIERTE LO QUE EL COMPILADOR SEÑALA. No adivina ni reinterpreta: se
 * limita a los parámetros que aparecen en un error de acceso a propiedad sobre
 * un tipo primitivo, y solo si la anotación es uno de los tipos que el paso de
 * inferencia sabe poner.
 *
 *   npx tsc -p tsconfig.json > errores.txt
 *   node scripts/ts-revertir-inferencia.ts errores.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { claveParametro, guardarDescartes, leerDescartes, nombreDeFuncion } from './ts-parametros-comunes.js';

/** Tipos que pone `ts-inferir-params.ts`; no se tocan anotaciones de otra procedencia. */
const INFERIDOS = new Set(['number', 'string', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent', 'CustomEvent']);

const RE_ERROR = /^(.+?)\((\d+),(\d+)\): error TS(?:2339|2571|18046):/;

const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node scripts/ts-revertir-inferencia.ts <fichero-con-la-salida-de-tsc>');
  process.exit(2);
}

/** fichero -> posiciones (línea, columna) señaladas por tsc */
const porFichero = new Map<string, { linea: number; columna: number }[]>();
for (const linea of readFileSync(entrada, 'utf8').split(/\r?\n/)) {
  const m = RE_ERROR.exec(linea);
  if (!m) continue;
  const lista = porFichero.get(m[1]!) ?? [];
  lista.push({ linea: Number(m[2]), columna: Number(m[3]) });
  porFichero.set(m[1]!, lista);
}

let ficheros = 0;
let quitadas = 0;
const descartes = leerDescartes();

for (const [ruta, marcas] of porFichero) {
  let texto: string;
  try {
    texto = readFileSync(ruta, 'utf8');
  } catch {
    continue;
  }
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

  /**
   * Nombre señalado y dónde se señaló. La posición importa: un fichero puede
   * tener varias funciones con un parámetro llamado `a`, y solo una de ellas
   * es la que el compilador desmiente. Revirtiendo por nombre a secas se
   * borraban anotaciones correctas, que el paso de inferencia volvía a poner
   * en la pasada siguiente — los dos scripts se deshacían el trabajo en bucle.
   */
  const sospechosos: { nombre: string; pos: number }[] = [];
  for (const { linea, columna } of marcas) {
    let pos: number;
    try {
      pos = ts.getPositionOfLineAndCharacter(sf, linea - 1, columna - 1);
    } catch {
      continue;
    }
    // La columna del error apunta a la propiedad; el objeto está a su izquierda.
    const antes = texto.slice(Math.max(0, pos - 80), pos);
    const m = /([A-Za-z_$][\w$]*)\s*[.?![]?\s*$/.exec(antes.replace(/\.$/, ''));
    if (m) sospechosos.push({ nombre: m[1]!, pos });
  }
  if (!sospechosos.length) continue;

  const cortes: { pos: number; fin: number }[] = [];
  const visitar = (n: ts.Node): void => {
    if (ts.isParameter(n) && n.type && ts.isIdentifier(n.name) && INFERIDOS.has(n.type.getText())) {
      const nombre = n.name.text;
      // El error tiene que caer dentro de la función que declara el parámetro:
      // ahí es donde ese nombre significa lo que el compilador desmiente.
      const ambito = n.parent;
      const dentro = sospechosos.some(
        (sos) => sos.nombre === nombre && sos.pos >= ambito.pos && sos.pos <= ambito.end,
      );
      // Del final del nombre al final del tipo: se lleva también los dos puntos.
      if (dentro) {
        cortes.push({ pos: n.name.end, fin: n.type!.end });
        // Se anota para que el inferidor no vuelva a proponer lo mismo.
        descartes.add(claveParametro(ruta, nombreDeFuncion(n), nombre));
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  if (!cortes.length) continue;

  cortes.sort((a, b) => a.pos - b.pos);
  let out = '';
  let ultimo = 0;
  for (const c of cortes) {
    if (c.pos < ultimo) continue;
    out += texto.slice(ultimo, c.pos);
    ultimo = c.fin;
  }
  out += texto.slice(ultimo);

  const rev = ts.createSourceFile(ruta, out, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  if ((rev as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics?.length) {
    console.error(`  ! ${ruta}: la reversión rompería la sintaxis, se deja intacto`);
    continue;
  }
  writeFileSync(ruta, out, 'utf8');
  ficheros++;
  quitadas += cortes.length;
}

guardarDescartes(descartes);
console.log(
  `anotaciones desmentidas retiradas: ${quitadas} en ${ficheros} ficheros`
  + ` (${descartes.size} parámetros en la lista de descartes)`,
);
