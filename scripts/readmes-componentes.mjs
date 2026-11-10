// @contexto INDICE.md · scripts/README.md
// readmes-componentes.mjs — genera el README.md de cada categoria de componentes.
//
//   deno task readmes
//
// El README de una categoria dice que hay en ella, como se usa y quien lo vigila. La lista de
// componentes se genera desde el manifest (src/manifest.ts) y va entre las marcas
// `<!-- generado:componentes -->`: nadie la escribe a mano, y si el manifest y el README no
// coinciden, el build lo arregla.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();

/** De que va cada categoria. Una frase: es lo que se lee para orientarse. */
const DESCRIPCIONES = {
  actions: 'Botones y acciones: lo que el usuario pulsa para que pase algo.',
  charts: 'Graficos de canvas: series, ejes y tooltips dibujados a mano.',
  code: 'Codigo: resaltado de sintaxis y vista de un archivo de codigo.',
  data: 'Datos: tablas, rejillas, tableros y hojas de calculo.',
  'data-viz': 'Visualizacion: mapas, mapas de calor y graficos de series.',
  diagrams: 'Diagramas: flujo, clases, estados, ER, Gantt y demas, en SVG.',
  feedback: 'Respuesta: avisos, estados vacios, progreso y confirmaciones.',
  files: 'Archivos: visores y editores de texto, CSV, DOCX, PPTX y PDF.',
  forms: 'Formularios: campos, selectores, fechas, mascaras y subida de archivos.',
  helpers: 'Ayudantes: formato, observadores y utilidades sin interfaz propia.',
  isp: 'ISP: los componentes de la aplicacion interna que los proyectos consumen.',
  layout: 'Diseno: dialogos, drawers, tarjetas, app-shell y.Documentacion.',
  media: 'Multimedia: iconos, imagenes, video, audio y codigos.',
  navigation: 'Navegacion: menus, migas, pestañas, paginacion y arboles.',
  overlays: 'Superposiciones: ventanas, paleta de comandos, visor JSON y busqueda.',
  preview: 'Galeria: los componentes que la propia galeria usa para mostrar los demas.',
};

/** Las reglas que se repiten en todas las categorias. */
const REGLAS = [
  'Los cuatro archivos de cada componente: `<nombre>.ts`, `<nombre>.scss`, `<nombre>.md` y `<nombre>.json`.',
  'El `.md` del componente es su ficha: props, eventos, slots y ejemplos.',
  'El `.json` es el contrato que leen la galeria, el audit y el constructor de apps.',
  'El SCSS entra por `@use \'iswc:css\'` (el alias) o por el modulo compartido `kit`.',
  'El `.ts` lleva la cabecera `// @contexto INDICE.md · <md del dominio>`.',
];

/** Quien vigila el dominio. */
const GUARDIANES = [
  '`tests/gobernanza/contrato-cuatro-archivos.test.ts` — los cuatro archivos de cada componente.',
  '`tests/gobernanza/componentes-contrato.test.ts` — props, eventos y slots contra el `.json`.',
  '`tests/gobernanza/sin-codigo-muerto.test.ts` — nada sin importador ni export sin consumidor.',
  '`tests/gobernanza/indice-md.test.ts` — cada tag tiene su md y el indice esta al dia.',
];

/** Los componentes de una categoria, desde el manifest. */
function componentesDe(categoria) {
  const manifiesto = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
  const out = [];
  for (const m of manifiesto.matchAll(/\{ tag: '(iswc-[a-z0-9-]+)', title: '([^']*)', category: '([a-z0-9-]+)'/g)) {
    if (m[3] !== categoria) continue;
    out.push({ tag: m[1], titulo: m[2], nombre: m[1].replace(/^iswc-/, '') });
  }
  return out;
}

/** Escribe el README de una categoria. Devuelve true si cambio. */
function escribirReadmeCategoria(categoria) {
  const dir = join(RAIZ, 'src', 'components', categoria);
  if (!existsSync(dir)) return false;
  const componentes = componentesDe(categoria);
  const filas = componentes.map((c) => '| `' + c.tag + '` | ' + c.titulo + ' | [' + c.nombre + '.md](' + c.nombre + '.md) |');
  const texto = [
    '# Componentes · ' + categoria,
    '',
    DESCRIPCIONES[categoria] ?? 'Componentes del kit.',
    '',
    '## Componentes',
    '',
    '<!-- generado:componentes -->',
    '| Tag | Título | Documento |',
    '|---|---|---|',
    ...filas,
    '<!-- /generado:componentes -->',
    '',
    '## Reglas del dominio',
    '',
    ...REGLAS.map((r) => '- ' + r),
    '',
    '## Guardianes',
    '',
    ...GUARDIANES.map((g) => '- ' + g),
    '',
    '## Documentos relacionados',
    '',
    '- [INDICE.md](../../../../INDICE.md) — el indice de todos los documentos del kit.',
    '- [specs/constitution.md](../../../../specs/constitution.md) — lo que no se negocia.',
    '',
  ].join('\n');
  const ruta = join(dir, 'README.md');
  const antes = existsSync(ruta) ? readFileSync(ruta, 'utf8') : '';
  if (antes === texto) return false;
  writeFileSync(ruta, texto, 'utf8');
  return true;
}

/** Escribe todos los README de categoria. */
export function escribirReadmes() {
  const cats = readdirSync(join(RAIZ, 'src', 'components'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name);
  let n = 0;
  for (const c of cats) if (escribirReadmeCategoria(c)) n++;
  return n;
}

if (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('readmes-componentes.mjs'))) {
  const n = escribirReadmes();
  console.log(n ? n + ' README de categoria escritos' : 'README de categoria al dia');
}
