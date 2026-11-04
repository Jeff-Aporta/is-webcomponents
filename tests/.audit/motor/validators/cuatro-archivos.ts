/**
 * Validador de los CUATRO ARCHIVOS de cada tag público: `.ts`, `.scss`, `.md` y `.json`.
 *
 * La lista sale de `src/manifest.ts`, no de las carpetas: un tag público nuevo entra solo. Lo usan el motor
 * (`auditor.ts`, hallazgo `cuatro-archivos`) y el guardián `tests/gobernanza/contrato-cuatro-archivos.test.ts`.
 *
 * Reglas:
 *   - `.ts`: el `script` del manifest existe. Un subcomponente usa el `.ts` del padre.
 *   - `.scss`: el hermano, o `anatomy.scss` del `.json`. `"anatomy": {}` solo vale en `SIN_HOJA`.
 *   - `.json`: `iswc-preview/v1`, mismo tag y categoría que el manifest, y un bloque `demo` con `controls`,
 *     salvo `SIN_PLAYGROUND`.
 *   - `.md`: UTF-8 sin BOM, frontmatter que apunta a archivos reales y las secciones de `SECCIONES`.
 *   - Todo tag registrado con `defineElement` en `src/components` está en el manifest o en `INTERNOS`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const ZFichaManifest = z.object({
  tag: z.string(),
  category: z.string(),
  script: z.string(),
  page: z.string(),
});
export type FichaManifest = z.infer<typeof ZFichaManifest>;

export const ZFallo = z.object({ tag: z.string(), archivo: z.string(), mensaje: z.string() });
export type Fallo = z.infer<typeof ZFallo>;

/** Otros frentes los están migrando: cumplen los archivos, y frontmatter y secciones se exigen al cerrar. */
export const EN_MIGRACION = new Set([
  'iswc-dropdown', 'iswc-dropdown-item', 'iswc-dialog', 'iswc-login', 'iswc-login-gate', 'iswc-login-dropdown',
  'iswc-session-menu', 'iswc-data-grid', 'iswc-spreadsheet', 'iswc-ag-grid',
]);

/** Sin hoja propia, a propósito: light DOM, módulos y páginas. */
export const SIN_HOJA = new Set([
  'iswc-demo', 'iswc-ui', 'iswc-diagram-view-app', 'iswc-diagram-edit-app', 'iswc-icon-explorer', 'iswc-preview-controls',
]);

/** Sin playground, a propósito: páginas, módulos y el propio chrome de la galería. */
export const SIN_PLAYGROUND = new Set([
  'iswc-ui', 'iswc-diagram-view-app', 'iswc-diagram-edit-app', 'iswc-icon-explorer', 'iswc-er-editor',
  'iswc-doc-demo', 'iswc-preview-component', 'iswc-preview-controls', 'iswc-playground', 'iswc-slots-pg',
  'iswc-examples-carousel', 'iswc-demo-section',
  // Se usan por API o dependen de la página: un atributo no cambia nada visible en un escenario.
  'iswc-toast', 'iswc-main', 'iswc-scrollspy', 'iswc-resize-observer', 'iswc-drawer', 'iswc-lightbox', 'iswc-diagram-lightbox',
  'iswc-modal-verificacion',
  // Datos que pinta el padre: sus controles están en el demo del padre.
  'iswc-tab-panel', 'iswc-transfer-item', 'iswc-map-marker',
]);

/** Registrados en `src/components` pero fuera del catálogo público. */
export const INTERNOS = new Set<string>([]);

/** Secciones de la ficha del kit. `API` admite también `Atributos`, y `Propósito` la abre siempre. */
export const SECCIONES = ['Propósito', 'Cuándo usarlo', 'Cuándo no usarlo', 'Importación', 'Ejemplo mínimo', 'API', 'Comportamiento', 'Accesibilidad', 'Reglas para LLM'];

type Definicion = {
  $schema?: string;
  tag?: string;
  category?: string;
  anatomy?: { scss?: string };
  sections?: Array<{ blocks?: Array<{ kind?: string; controls?: unknown[] }> }>;
};

/** Tags públicos del manifest. Se lee como texto para no ejecutar nada ni depender de `dist/`. */
export function leerManifest(raiz: string): FichaManifest[] {
  const fuente = readFileSync(join(raiz, 'src', 'manifest.ts'), 'utf8');
  return [...fuente.matchAll(/^\s*\{ tag: '(iswc-[^']+)'(.*)$/gm)].map((m) => {
    const campo = (k: string): string => new RegExp(`${k}: '([^']+)'`).exec(m[2]!)?.[1] ?? '';
    return ZFichaManifest.parse({ tag: m[1], category: campo('category'), script: campo('script'), page: campo('page') });
  });
}

const recorrer = (dir: string, salida: string[] = []): string[] => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta, salida);
    else if (nombre.endsWith('.ts') && !nombre.endsWith('.schemas.ts')) salida.push(ruta);
  }
  return salida;
};

/** Tags que `src/components` registra con nombre literal. */
export function tagsRegistrados(raiz: string): string[] {
  const tags = new Set<string>();
  for (const ruta of recorrer(join(raiz, 'src', 'components'))) {
    const fuente = readFileSync(ruta, 'utf8');
    // Molde IswcElement: `static tag = 'iswc-x'` + `define(Clase)`.
    for (const m of fuente.matchAll(/(?:(?:customElements\.define|\bdefineElement)\(\s*|static\s+(?:override\s+)?tag\s*=\s*)['"`](iswc-[a-z0-9-]+)['"`]/g)) tags.add(m[1]!);
  }
  return [...tags].sort();
}

function validarFrontmatter(md: string, base: string, ficha: FichaManifest, conHoja: boolean, agregar: (m: string) => void): void {
  const bloque = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1];
  if (!bloque) { agregar('sin frontmatter'); return; }
  const campo = (k: string): string => new RegExp(`^${k}:\\s*(.*?)\\s*$`, 'm').exec(bloque)?.[1] ?? '';
  if (campo('tag') !== ficha.tag) agregar(`frontmatter tag «${campo('tag')}»`);
  if (campo('category') !== ficha.category) agregar(`frontmatter category «${campo('category')}», manifest «${ficha.category}»`);
  if (!/^tags:/m.test(bloque)) agregar('frontmatter sin tags');
  if (!['public', 'internal'].includes(campo('status'))) agregar(`frontmatter status «${campo('status')}»`);
  for (const k of ['source', 'preview', ...(conHoja ? ['style'] : [])]) {
    const valor = campo(k);
    if (!valor) agregar(`frontmatter sin ${k}`);
    else if (!existsSync(join(dirname(base), valor))) agregar(`frontmatter ${k} no existe: ${valor}`);
  }
}

function validarSecciones(md: string, agregar: (m: string) => void): void {
  const titulos = [...md.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]!);
  for (const s of SECCIONES) {
    const hay = titulos.some((t) => t.startsWith(s) || (s === 'API' && t.startsWith('Atributos')));
    if (!hay) agregar(`sin sección «${s}»`);
  }
  if (!/```(?:html|js)\b/.test(md)) agregar('sin ejemplo en bloque html o js');
}

/** Valida un tag del manifest. */
export function validarFicha(raiz: string, ficha: FichaManifest): Fallo[] {
  const fallos: Fallo[] = [];
  const agregar = (archivo: string) => (mensaje: string) => fallos.push({ tag: ficha.tag, archivo, mensaje });
  const src = join(raiz, 'src');
  const base = join(src, ficha.page.replace(/\.json$/, ''));
  const rel = ficha.page.replace(/\.json$/, '');
  const script = join(src, ficha.script.replace(/\.js$/, '.ts'));
  if (!existsSync(script)) agregar(ficha.script)('falta el .ts');
  if (!existsSync(`${base}.json`)) { agregar(ficha.page)('falta el .json'); return fallos; }
  const def = JSON.parse(readFileSync(`${base}.json`, 'utf8')) as Definicion;
  const enJson = agregar(`${rel}.json`);
  if (def.$schema !== 'iswc-preview/v1') enJson(`$schema «${def.$schema}»`);
  if (def.tag !== ficha.tag) enJson(`tag «${def.tag}»`);
  if (def.category !== ficha.category) enJson(`category «${def.category}», manifest «${ficha.category}»`);
  const propio = `${base}.scss`;
  const hoja = def.anatomy?.scss ? join(dirname(base), def.anatomy.scss) : propio;
  const conHoja = existsSync(hoja);
  if (!conHoja && !(def.anatomy && SIN_HOJA.has(ficha.tag))) agregar(`${rel}.scss`)('falta el .scss');
  const bloques = (def.sections ?? []).flatMap((s) => s.blocks ?? []);
  if (!SIN_PLAYGROUND.has(ficha.tag) && !EN_MIGRACION.has(ficha.tag) && !bloques.some((b) => b.kind === 'demo' && b.controls?.length)) {
    enJson('sin bloque demo con controls');
  }
  if (!existsSync(`${base}.md`)) { agregar(`${rel}.md`)('falta el .md'); return fallos; }
  if (EN_MIGRACION.has(ficha.tag)) return fallos;
  const md = readFileSync(`${base}.md`, 'utf8');
  const enMd = agregar(`${rel}.md`);
  if (md.charCodeAt(0) === 0xfeff) enMd('BOM');
  validarFrontmatter(md, `${base}.md`, ficha, conHoja, enMd);
  validarSecciones(md, enMd);
  return fallos;
}

/** Valida todo el catálogo y los tags registrados fuera del manifest. */
export function auditarCuatroArchivos(raiz: string): Fallo[] {
  const fichas = leerManifest(raiz);
  const publicos = new Set(fichas.map((f) => f.tag));
  const fallos = fichas.flatMap((f) => validarFicha(raiz, f));
  for (const tag of tagsRegistrados(raiz)) {
    if (!publicos.has(tag) && !INTERNOS.has(tag)) fallos.push({ tag, archivo: 'src/manifest.ts', mensaje: 'registrado y fuera del manifest' });
  }
  return fallos;
}
