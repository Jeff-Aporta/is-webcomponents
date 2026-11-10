// @contexto INDICE.md · scripts/README.md
// eventos.ts — sonda de eventos tipados (specs/paridad-webawesome.md HOW-6, F8 hito 5).
//
// Contrato (cero bytes en runtime): cada componente declara sus eventos con un tipo de una línea en su
// `schemas/<tag>.schemas.ts` (`export type CheckboxEventos = { 'iswc-change': { checked: boolean } };`) y lo enlaza en
// la clase con `declare static events: CheckboxEventos;` (un campo `declare` no se emite: esbuild y tsc lo borran).
// Un tipo puede sumar los de su base: `DialogEventos = ModalBaseEventos & { … }`.
//
// Lo que hace:
//   - `analizar(raiz)`  lee cada `.ts` de src/components: eventos `iswc-*` emitidos (emit/emitCancelable, new
//                       CustomEvent, helpers privados `this.#x('iswc-…')`, `cambioDelUsuario`), literales `iswc-*`,
//                       eventos propios declarados y, por clase, su tag y sus eventos resueltos.
//   - sin argumentos     escribe `"events"` en la ficha `.json` de cada tag con eventos declarados y la tabla generada
//                       en la sección «Eventos» de su `.md`. `--comprobar` solo informa lo desfasado.
//
// Uso: deno run -A --no-check scripts/sondas/eventos.ts [--comprobar]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ArchivoEventos, ClaseConEventos, EventoFicha } from './eventos.schemas.ts';

const KIT = join(import.meta.dirname ?? '.', '..', '..');
const INICIO_MD = '<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->';
const FIN_MD = '<!-- /eventos -->';

const rel = (abs: string) => relative(KIT, abs).split(sep).join('/');

function recorrer(dir: string, filtro: (n: string) => boolean, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p, filtro, out);
    else if (filtro(n)) out.push(p);
  }
  return out;
}

/** Índice del `)` que cierra el `(` en `abre`, saltando cadenas y plantillas. */
function cierre(codigo: string, abre: number): number {
  let nivel = 0;
  for (let i = abre; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < codigo.length && codigo[i] !== c; i++) if (codigo[i] === '\\') i++;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') nivel++;
    if (c === ')' || c === '}' || c === ']') nivel--;
    if (nivel === 0) return i;
  }
  return codigo.length;
}

/** Parte `texto` por `sep` en el nivel 0 de llaves, corchetes, paréntesis y ángulos. */
function partir(texto: string, separadores: string): string[] {
  const partes: string[] = [];
  let nivel = 0;
  let desde = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (c === "'" || c === '"') {
      for (i++; i < texto.length && texto[i] !== c; i++);
      continue;
    }
    if ('({[<'.includes(c)) nivel++;
    if (')}]>'.includes(c) && texto[i - 1] !== '=') nivel--;
    if (nivel === 0 && separadores.includes(c)) {
      partes.push(texto.slice(desde, i));
      desde = i + 1;
    }
  }
  partes.push(texto.slice(desde));
  return partes.map((p) => p.trim()).filter(Boolean);
}

/** Los `export type XEventos = …;` de una línea de todos los `.schemas.ts` de src. */
function tiposEventos(raiz = KIT): Map<string, string> {
  const tipos = new Map<string, string>();
  for (const f of recorrer(join(raiz, 'src'), (n) => n.endsWith('.schemas.ts'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/^export type (\w+Eventos) = (.+);\s*$/gm)) tipos.set(m[1]!, m[2]!.trim());
  }
  return tipos;
}

/** Miembros `'iswc-x': Detalle` de un objeto de tipos `{ … }`. */
function miembros(objeto: string): [string, string][] {
  const cuerpo = objeto.trim().replace(/^\{/, '').replace(/\}$/, '');
  return partir(cuerpo, ';,').map((m) => /^['"]([^'"]+)['"]\??\s*:\s*([\s\S]+)$/.exec(m)).filter((m) => m !== null).map((m) => [m![1]!, m![2]!.replace(/\s+/g, ' ').trim()]);
}

/** Eventos de un tipo resuelto: sus objetos `{ … }` y, por nombre, los de los tipos que suma con `&`; cada uno con el tipo que lo escribe. */
function resolver(tipo: string, tipos: Map<string, string>, visto = new Set<string>()): [string, string, string][] {
  const expr = tipos.get(tipo);
  if (!expr || visto.has(tipo)) return [];
  visto.add(tipo);
  return partir(expr, '&').flatMap((p) => (p.startsWith('{') ? miembros(p).map(([n, d]): [string, string, string] => [n, d, tipo]) : resolver(p, tipos, visto)));
}

/** Eventos escritos en el propio tipo (no los heredados por `&`): son los que el archivo debe emitir. */
function propiosDe(tipo: string, tipos: Map<string, string>): string[] {
  return partir(tipos.get(tipo) ?? '', '&').filter((p) => p.startsWith('{')).flatMap((p) => miembros(p).map(([n]) => n));
}

/** Eventos `iswc-*` emitidos por el código, con `true` si alguna emisión es cancelable. */
function emitidos(codigo: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const sumar = (nombre: string, cancelable: boolean) => out.set(nombre, (out.get(nombre) ?? false) || cancelable);
  const llamadas: [RegExp, number][] = [
    [/(?<![.#])\bemit(Cancelable)?\s*(?:<[^>()]*>)?\s*\(/g, 1],
    [/\bthis\.emit\s*(?:<[^>()]*>)?\s*\(/g, 0],
    [/\bnew\s+(?:Custom)?Event\s*(?:<[^>()]*>)?\s*\(/g, 0],
    [/\bthis\.#\w+\s*\(/g, 0],
  ];
  for (const [re, posicion] of llamadas) {
    for (const m of codigo.matchAll(re)) {
      const abre = m.index! + m[0].length - 1;
      const args = codigo.slice(abre + 1, cierre(codigo, abre));
      const nombre = partir(args, ',')[posicion];
      if (!nombre) continue;
      const cancelable = m[1] === 'Cancelable' || /cancelable:\s*true/.test(args);
      const literal = /^['"`](iswc-[a-z0-9-]+)['"`]$/.exec(nombre)?.[1];
      if (literal) sumar(literal, cancelable);
      else if (posicion === 1 && !/^this\.#/.test(m[0])) for (const x of nombre.matchAll(/['"`](iswc-[a-z0-9-]+)['"`]/g)) sumar(x[1]!, cancelable);
    }
  }
  for (const m of codigo.matchAll(/\bcambioDelUsuario\s*(?:<[^>()]*>)?\(\s*'(input|change)'/g)) sumar(`iswc-${m[1]}`, false);
  return out;
}

/** Clases del archivo con `declare static events`: su tag (si lo tiene) y el tipo. */
function clases(codigo: string): { tag: string | null; tipo: string }[] {
  const inicios = [...codigo.matchAll(/\bclass\s+\w+[^{]*\{/g)].map((m) => m.index!);
  return inicios.flatMap((desde, i) => {
    const cuerpo = codigo.slice(desde, inicios[i + 1] ?? codigo.length);
    const tipo = /\bdeclare\s+static\s+(?:override\s+)?events\s*:\s*(\w+)\s*;/.exec(cuerpo)?.[1];
    if (!tipo) return [];
    return [{ tag: /\bstatic\s+(?:override\s+)?tag\s*=\s*['"]([a-z0-9-]+)['"]/.exec(cuerpo)?.[1] ?? null, tipo }];
  });
}

/** Analiza un `.ts` de componente. */
function analizarArchivo(ruta: string, codigo: string, tipos: Map<string, string>): ArchivoEventos {
  const cancelables = emitidos(codigo);
  const declaradas = clases(codigo);
  const fichas: ClaseConEventos[] = declaradas.map(({ tag, tipo }) => ({
    tag,
    tipo,
    eventos: resolver(tipo, tipos).map(([name, detail, dueno]) => ({ name, detail, cancelable: dueno === tipo && (cancelables.get(name) ?? false) })),
    herencia: Object.fromEntries(resolver(tipo, tipos).filter(([, , dueno]) => dueno !== tipo).map(([name, , dueno]) => [name, dueno])),
  }));
  return {
    ruta,
    emitidos: cancelables,
    literales: new Set([...codigo.matchAll(/['"`](iswc-[a-z0-9-]+)['"`]/g)].map((m) => m[1]!)),
    propios: new Set(declaradas.flatMap(({ tipo }) => propiosDe(tipo, tipos))),
    clases: fichas,
  };
}

/** Todos los `.ts` de componente (sin schemas, previews ni pruebas). */
export function analizar(raiz = KIT): ArchivoEventos[] {
  const tipos = tiposEventos(raiz);
  const archivos = recorrer(join(raiz, 'src', 'components'), (n) => n.endsWith('.ts') && !/\.(schemas|preview|selfcheck|test|d)\.ts$/.test(n));
  return archivos.map((f) => analizarArchivo(rel(f), readFileSync(f, 'utf8'), tipos));
}

/** Un evento heredado (`Base & { … }`) toma su cancelable del archivo cuya clase declara el tipo base. */
function completarCancelables(archivos: ArchivoEventos[]): void {
  const dueno = new Map<string, Map<string, boolean>>();
  for (const a of archivos) for (const k of a.clases) dueno.set(k.tipo, a.emitidos);
  for (const a of archivos) {
    for (const k of a.clases) for (const e of k.eventos) if (k.herencia[e.name]) e.cancelable = dueno.get(k.herencia[e.name]!)?.get(e.name) ?? false;
  }
}

/** Tabla «Eventos» generada para el `.md`. */
function tablaMd(eventos: EventoFicha[]): string {
  const filas = eventos.map((e) => `| \`${e.name}\` | \`${e.detail.replaceAll('|', '\\|')}\` | ${e.cancelable ? 'sí' : 'no'} |`);
  return [INICIO_MD, '', '| Evento | detail | cancelable |', '| --- | --- | --- |', ...filas, '', FIN_MD].join('\n');
}

/** Ficha `.json` y `.md` hermanas del tag (`iswc-foo` → `foo.json`) en la carpeta del archivo o la de arriba. */
function hermanos(ruta: string, tag: string): { json: string; md: string } | null {
  const nombre = tag.replace(/^iswc-/, '');
  const dir = join(KIT, ruta, '..');
  for (const d of [dir, join(dir, '..')]) {
    const json = join(d, `${nombre}.json`);
    if (existsSync(json)) return { json, md: join(d, `${nombre}.md`) };
  }
  return null;
}

/** El texto del `.json` con `"events"` antes de `"sections"` (como `anatomy`), sin reformatear lo demás. */
function jsonConEventos(texto: string, eventos: EventoFicha[]): string {
  const eol = texto.includes('\r\n') ? '\r\n' : '\n';
  const plano = texto.replace(/\r\n/g, '\n');
  const valor = JSON.stringify(eventos, null, 2).replace(/\n/g, '\n  ');
  const linea = `\n  "events": ${valor},\n`;
  const previo = /\n {2}"events": (?:\[\]|\[[\s\S]*?\n {2}\]),\n/;
  const nuevo = previo.test(plano) ? plano.replace(previo, linea) : plano.replace(/\n {2}"sections": \[/, `${linea.slice(0, -1)}\n  "sections": [`);
  return nuevo.replace(/\n/g, eol);
}

/** El `.md` con la tabla generada dentro de «### Eventos» (sustituye la tabla vieja de bubbles/composed). */
function mdConEventos(texto: string, tabla: string): string {
  const eol = texto.includes('\r\n') ? '\r\n' : '\n';
  return mdPlano(texto.replace(/\r\n/g, '\n'), tabla).replace(/\n/g, eol);
}

/** `mdConEventos` sobre texto con `\n`. */
function mdPlano(md: string, tabla: string): string {
  const marcado = new RegExp(`${INICIO_MD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${FIN_MD}`);
  if (marcado.test(md)) return md.replace(marcado, tabla);
  const vieja = /\n\| Evento \| detail \| bubbles \| composed \| cancelable \|\n\| ---[^\n]*\n(?:\|[^\n]*\n)*/;
  const seccion = /^### Eventos[^\n]*\n/m;
  if (seccion.test(md)) {
    const sinVieja = md.replace(vieja, '');
    return sinVieja.replace(seccion, (h) => `${h}\n${tabla}\n`);
  }
  const ancla = /^### (?:Métodos|CSS parts|Custom states)[^\n]*$/m;
  const bloque = `### Eventos\n\n${tabla}\n\n`;
  if (ancla.test(md)) return md.replace(ancla, (h) => `${bloque}${h}`);
  return /^## Comportamiento/m.test(md) ? md.replace(/^## Comportamiento/m, `${bloque}## Comportamiento`) : `${md.trimEnd()}\n\n${bloque}`;
}

/** Fichas desfasadas (o escritas si `escribir`): devuelve las rutas tocadas o pendientes. */
export function sincronizar(escribir: boolean, archivos = analizar()): string[] {
  completarCancelables(archivos);
  const cambios: string[] = [];
  for (const a of archivos) {
    for (const k of a.clases) {
      if (!k.tag) continue;
      const destino = hermanos(a.ruta, k.tag);
      if (!destino) continue;
      const texto = readFileSync(destino.json, 'utf8');
      if ((JSON.parse(texto) as { tag?: string }).tag !== k.tag) continue;
      const nuevo = jsonConEventos(texto, k.eventos);
      if (nuevo !== texto) {
        cambios.push(rel(destino.json));
        if (escribir) writeFileSync(destino.json, nuevo, 'utf8');
      }
      if (!existsSync(destino.md)) continue;
      const md = readFileSync(destino.md, 'utf8');
      const mdNuevo = mdConEventos(md, tablaMd(k.eventos));
      if (mdNuevo !== md) {
        cambios.push(rel(destino.md));
        if (escribir) writeFileSync(destino.md, mdNuevo, 'utf8');
      }
    }
  }
  return cambios;
}

if (import.meta.main) {
  const comprobar = Deno.args.includes('--comprobar');
  const cambios = sincronizar(!comprobar);
  console.log(cambios.length ? `${comprobar ? 'desfasadas' : 'escritas'}: ${cambios.length}\n  ${cambios.join('\n  ')}` : 'fichas de eventos al día');
  if (comprobar && cambios.length) Deno.exit(1);
}
