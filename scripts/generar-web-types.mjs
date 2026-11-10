// @contexto INDICE.md · scripts/README.md
// generar-web-types.mjs — los metadatos del kit para los editores.
//
//   deno run -A --no-check scripts/generar-web-types.mjs
//
// De cada componente saca los @prop (del .ts), los slots y las CSS parts (del .md) y los eventos
// (del .json) y escribe dos archivos que los editores ya saben leer:
//
//   dist/cdn/vscode.html-custom-data.json  — VS Code (y los que lo leen)
//   dist/cdn/web-types.json                — JetBrains (WebStorm, IntelliJ)
//
// Los dos salen MINIFICADOS: se descargan en cada apertura del editor y no los lee nadie.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const OUT = join(RAIZ, 'dist', 'cdn');

/** El manifest: el mapa de que componentes hay y donde vive cada uno. */
function manifiesto() {
  const texto = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  const out = [];
  // Los campos no van siempre en el mismo orden (la categoria isp mete un `origin` en medio),
  // asi que se leen uno a uno dentro de cada entrada.
  for (const m of texto.matchAll(/\{ tag: '(iswc-[a-z0-9-]+)'([^}]*)\}/g)) {
    const resto = m[2];
    const titulo = resto.match(/title: '([^']*)'/)?.[1] ?? '';
    const categoria = resto.match(/category: '([^']*)'/)?.[1] ?? '';
    const script = resto.match(/script: '([^']*)'/)?.[1] ?? '';
    const page = resto.match(/page: '([^']*)'/)?.[1] ?? '';
    if (!script) continue;
    out.push({
      tag: m[1],
      titulo,
      categoria,
      ts: 'src/' + script.replace(/\.js$/, '.ts'),
      md: 'src/' + script.replace(/\.js$/, '.md'),
      json: page ? 'src/' + page : 'src/' + script.replace(/\.js$/, '.json'),
    });
  }
  return out;
}

/** Los @prop de un .ts: nombre, tipo y valor por defecto. */
function propsDe(ruta) {
  if (!existsSync(ruta)) return [];
  const texto = readFileSync(ruta, 'utf8');
  const out = [];
  for (const m of texto.matchAll(/@prop\((?:\{([^}]*)\})?\)\s*(?:accessor\s+)?([A-Za-z_$][\w$]*)\??\s*(?::\s*[^=;]+)?\s*(?:=\s*([^;]+))?/g)) {
    const tipo = ((m[1] || '').match(/type:\s*'([^']+)'/) || [])[1] || 'string';
    out.push({ nombre: m[2], tipo, porDefecto: (m[4] || '').trim() });
  }
  return out;
}

/** Los slots y las CSS parts de la tabla del .md. */
function tablasDe(ruta) {
  const vacio = { slots: [], parts: [] };
  if (!existsSync(ruta)) return vacio;
  const texto = readFileSync(ruta, 'utf8');
  const seccion = (titulo) => {
    const re = new RegExp('^###\\s+' + titulo + '\\s*\\n([\\s\\S]*?)(?=^###?\\s|\\Z)', 'm');
    const m = texto.match(re);
    return m ? m[1] : '';
  };
  const filas = (bloque) => {
    const out = [];
    for (const linea of bloque.split('\n')) {
      const m = linea.match(/^\|\s*`?([^`|]+)`?\s*\|\s*(.*?)\s*\|\s*$/);
      if (m && m[1].trim() && !/^-+$/.test(m[1].trim()) && !/^(slot|part|uso|descripci[oó]n)$/i.test(m[1].trim())) out.push({ nombre: m[1].trim(), uso: m[2].trim() });
    }
    return out;
  };
  return { slots: filas(seccion('Slots')), parts: filas(seccion('CSS parts')) };
}

/** Los eventos de un .json. */
function eventosDe(ruta) {
  if (!existsSync(ruta)) return [];
  try {
    const j = JSON.parse(readFileSync(ruta, 'utf8'));
    return Array.isArray(j.events) ? j.events : [];
  } catch {
    return [];
  }
}

/** El resumen de un componente, en el formato comun. */
function fichaDe(c) {
  const props = propsDe(c.ts);
  const { slots, parts } = tablasDe(c.md);
  const eventos = eventosDe(c.json);
  return {
    tag: c.tag,
    titulo: c.titulo,
    categoria: c.categoria,
    props,
    slots,
    parts,
    eventos: eventos.map((e) => ({ nombre: e.name, detalle: e.detail ?? '', cancelable: !!e.cancelable })),
  };
}

const fichas = manifiesto().map(fichaDe);

/** El formato de VS Code. */
const vscode = {
  tags: fichas.map((f) => ({
    name: f.tag,
    description: f.titulo,
    attributes: f.props.map((p) => ({ name: p.nombre, description: p.tipo + (p.porDefecto ? ' (por defecto ' + p.porDefecto + ')' : '') })),
    slots: f.slots.map((s) => ({ name: s.nombre, description: s.uso })),
    events: f.eventos.map((e) => ({ name: e.nombre, description: e.detalle })),
    cssProperties: f.parts.map((p) => ({ name: p.nombre, description: p.uso })),
  })),
};

/** El formato de JetBrains. */
const webTypes = {
  version: '1.0.0',
  contributions: {
    html: {
      'description-markup': 'markdown',
      elements: fichas.map((f) => ({
        name: f.tag,
        description: f.titulo,
        attributes: f.props.map((p) => ({ name: p.nombre, value: { kind: 'expression', type: p.tipo } })),
        slots: f.slots.map((s) => ({ name: s.nombre, description: s.uso })),
        events: f.eventos.map((e) => ({ name: e.nombre, description: e.detalle })),
        cssProperties: f.parts.map((p) => ({ name: p.nombre, description: p.uso })),
      })),
    },
  },
};

/** Escribe los dos archivos. Devuelve el resumen (componentes y bytes). */
export async function generarWebTypes(root = RAIZ) {
  const out = join(root, 'dist', 'cdn');
  mkdirSync(out, { recursive: true });
  const vscodePath = join(out, 'vscode.html-custom-data.json');
  const webTypesPath = join(out, 'web-types.json');
  writeFileSync(vscodePath, JSON.stringify(vscode), 'utf8');
  writeFileSync(webTypesPath, JSON.stringify(webTypes), 'utf8');
  const props = fichas.reduce((s, f) => s + f.props.length, 0);
  const slots = fichas.reduce((s, f) => s + f.slots.length, 0);
  const parts = fichas.reduce((s, f) => s + f.parts.length, 0);
  const eventos = fichas.reduce((s, f) => s + f.eventos.length, 0);
  const bytes = Buffer.byteLength(JSON.stringify(vscode), 'utf8') + Buffer.byteLength(JSON.stringify(webTypes), 'utf8');
  return { componentes: fichas.length, props, slots, parts, eventos, bytes, vscodePath, webTypesPath };
}

if (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('generar-web-types.mjs'))) {
  const r = await generarWebTypes();
  console.log('web-types: ' + r.componentes + ' componentes | ' + r.props + ' props, ' + r.slots + ' slots, ' + r.parts + ' parts, ' + r.eventos + ' eventos');
  console.log('  vscode.html-custom-data.json  ' + Math.round(r.bytes / 2) + ' B');
  console.log('  web-types.json                ' + Math.round(r.bytes / 2) + ' B');
}
