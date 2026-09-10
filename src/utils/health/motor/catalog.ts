/**
 * Enumerador del catálogo de demos.
 *
 * Recorre el manifest y la carpeta src/components/ para producir la lista
 * EXHAUSTIVA de componentes del demo. Cada entrada incluye:
 *   - tag del custom element
 *   - categoría
 *   - título legible
 *   - ruta del JSON de preview (si existe)
 *   - ruta del módulo JS/TS (si existe)
 *
 * El motor depende de este enumerador como single source of truth: si un
 * componente no aparece acá, no se audita. La función detecta tanto los
 * del manifest (single source of verdad para el build) como los del
 * catalog (single source para la galería).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

/** Entrada enumerada de un componente del catálogo. */
export interface EntradaCatalogo {
  tag: string;
  titulo: string;
  categoria: string;
  /** Ruta absoluta del JSON de preview (si existe). */
  rutaJsonAbsoluta: string | null;
  /** Ruta absoluta del módulo JS/TS (si existe). */
  rutaModuloAbsoluta: string | null;
  /** Ruta del JSON relativa a la raíz del proyecto (para reportes). */
  rutaJsonRelativa: string | null;
  /** Ruta del módulo relativa a la raíz del proyecto. */
  rutaModuloRelativa: string | null;
  /** `true` si el JSON existe y es parseable. */
  tieneJson: boolean;
  /** `true` si el módulo existe. */
  tieneModulo: boolean;
  /** `true` si es una página (home/theming/ecosystem/phase7) y no un componente. */
  esPagina: boolean;
  /** `true` si la entrada tiene `behavior` (módulo que extiende el preview). */
  tieneBehavior: boolean;
  /** `true` si el manifest lo marca como `module: true` (helper, no
   *  custom element). El motor salta chequeos de define/defineElement. */
  esModulo: boolean;
  /** Origen del componente (manifest "origin" o heredado de category). */
  origen?: string;
}

/** Opciones del enumerador. */
export interface OpcionesEnumerador {
  /** Incluir páginas (home, theming, ecosystem, phase7). Default: true. */
  incluirPaginas?: boolean;
}

/**
 * @param raiz raíz del proyecto (donde vive src/, package.json).
 * @param opciones flags del enumerador.
 * @returns lista estable y ordenada de entradas.
 */
export function enumerarCatalogo(raiz: string, opciones: OpcionesEnumerador = {}): EntradaCatalogo[] {
  const incluirPaginas = opciones.incluirPaginas !== false;
  const entradas: EntradaCatalogo[] = [];
  const seen = new Set<string>();

  // 1. Manifest (single source of verdad del build).
  const manifestPath = join(raiz, 'src', 'manifest.ts');
  if (existsSync(manifestPath)) {
    const items = leerManifest(manifestPath, raiz);
    for (const it of items) {
      seen.add(it.tag);
      entradas.push(it);
    }
  }

  // 2. Catalog (single source de la galería: incluye pages y puede diferir).
  const catalogPath = join(raiz, 'src', 'previews', 'catalog.ts');
  if (existsSync(catalogPath)) {
    const items = leerCatalog(catalogPath, raiz);
    for (const it of items) {
      if (seen.has(it.tag)) continue;
      seen.add(it.tag);
      entradas.push(it);
    }
  }

  // 3. Páginas sueltas (no siempre en el catalog, ej. phase7).
  for (const tag of ['home', 'theming', 'ecosystem', 'phase7']) {
    if (seen.has(tag)) continue;
    const jsonPath = join(raiz, 'src', 'pages', `${tag}.json`);
    if (!existsSync(jsonPath)) continue;
    entradas.push({
      tag,
      titulo: tag,
      categoria: '',
      rutaJsonAbsoluta: jsonPath,
      rutaModuloAbsoluta: null,
      rutaJsonRelativa: relative(raiz, jsonPath).replaceAll('\\', '/'),
      rutaModuloRelativa: null,
      tieneJson: true,
      tieneModulo: false,
      esPagina: true,
      tieneBehavior: false,
    });
    seen.add(tag);
  }

  if (!incluirPaginas) {
    return entradas.filter((e) => !e.esPagina);
  }
  return entradas;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectura del manifest (TS con objetos literales).
// ─────────────────────────────────────────────────────────────────────────────

interface ManifestItemCrudo {
  tag?: string;
  title?: string;
  category?: string;
  script?: string;
  style?: string;
  page?: string;
  module?: boolean;
  origin?: string;
}

/**
 * Parseo "lite" del manifest.ts: extrae cada `{ tag: '…', … }` por regex.
 * No usa un parser TS real para evitar dependencias en runtime del motor.
 *
 * Es tolerante a:
 *   - Comentarios de una línea (`//`)
 *   - Comentarios de bloque (`/* ... *\/`)
 *   - Strings con apostrofes escapados
 *   - Orden de campos variable
 *
 * No tolera: spread operators, computed keys, string templates con
 * interpolación. El manifest actual no usa nada de eso.
 */
function leerManifest(archivo: string, raiz: string): EntradaCatalogo[] {
  let src: string;
  try {
    src = readFileSync(archivo, 'utf8');
  } catch {
    return [];
  }
  // Quitar comentarios de bloque (multilínea) y de línea.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const items: ManifestItemCrudo[] = [];
  // Captura cada objeto literal: { tag: '...', ... }
  const re = /\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const literal = m[0];
    const obj: ManifestItemCrudo = {};
    // Capturar campo: valor (string|boolean).
    const camposRe = /(\w+)\s*:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"|(true|false))/g;
    let cm: RegExpExecArray | null;
    while ((cm = camposRe.exec(literal))) {
      const key = cm[1];
      if (cm[2] !== undefined) obj[key as keyof ManifestItemCrudo] = cm[2] as never;
      else if (cm[3] !== undefined) obj[key as keyof ManifestItemCrudo] = cm[3] as never;
      else if (cm[4] !== undefined) obj[key as keyof ManifestItemCrudo] = (cm[4] === 'true') as never;
    }
    if (obj.tag) items.push(obj);
  }
  return items.map((it) => aEntrada(it, raiz));
}

function aEntrada(it: ManifestItemCrudo, raiz: string): EntradaCatalogo {
  const tag = String(it.tag ?? '').trim();
  const categoria = String(it.category ?? '').trim();
  const titulo = String(it.title ?? tag).trim();
  const scriptRel = it.script ? normalizarRuta(it.script, raiz) : null;
  const pageRel = it.page ? normalizarRuta(it.page, raiz) : null;
  // Para el módulo, preferir la extensión que realmente exista (.ts o .js).
  let scriptReal: string | null = null;
  if (scriptRel) {
    const candidateTs = scriptRel.replace(/\.js$/, '.ts');
    const candidateJs = scriptRel.replace(/\.ts$/, '.js');
    if (existsSync(join(raiz, candidateTs))) scriptReal = candidateTs;
    else if (existsSync(join(raiz, candidateJs))) scriptReal = candidateJs;
    else scriptReal = scriptRel; // no existe; el validador lo reportará
  }
  return {
    tag,
    titulo,
    categoria,
    rutaJsonAbsoluta: pageRel ? join(raiz, pageRel) : null,
    rutaModuloAbsoluta: scriptReal ? join(raiz, scriptReal) : null,
    rutaJsonRelativa: pageRel ? pageRel.replaceAll('\\', '/') : null,
    rutaModuloRelativa: scriptReal ? scriptReal.replaceAll('\\', '/') : null,
    tieneJson: pageRel ? existsSync(join(raiz, pageRel)) : false,
    tieneModulo: scriptReal ? existsSync(join(raiz, scriptReal)) : false,
    esPagina: false,
    tieneBehavior: false,
    esModulo: it.module === true,
    origen: it.origin,
  };
}

function normalizarRuta(ruta: string, raiz: string): string {
  // Las rutas del manifest son relativas a <raiz>/src/previews/<cat>/.
  // Las "page" viven en src/components/<cat>/. Subimos un nivel.
  if (ruta.startsWith('components/')) {
    return join('src', ruta).replaceAll('\\', '/');
  }
  return ruta.replaceAll('\\', '/');
}

function existeTsOJs(abs: string): boolean {
  if (existsSync(abs)) return true;
  const dir = dirname(abs);
  const base = basename(abs).replace(/\.[jt]s$/, '');
  return existsSync(join(dir, `${base}.ts`)) || existsSync(join(dir, `${base}.js`));
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectura del catalog.ts (mapa tag → { json, behavior, category }).
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogItemCrudo {
  json?: string;
  behavior?: string;
  category?: string;
}

function leerCatalog(archivo: string, raiz: string): EntradaCatalogo[] {
  let src: string;
  try {
    src = readFileSync(archivo, 'utf8');
  } catch {
    return [];
  }
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // Captura bloques "tag": { json: '…', behavior?: '…', category: '…' }
  const re = /["']([a-z0-9-]+)["']\s*:\s*\{([^{}]*)\}/g;
  const entradas: EntradaCatalogo[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const tag = m[1];
    const body = m[2];
    const obj: CatalogItemCrudo = {};
    const camposRe = /['"]?(\w+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
    let cm: RegExpExecArray | null;
    camposRe.lastIndex = 0;
    while ((cm = camposRe.exec(body))) {
      obj[cm[1] as keyof CatalogItemCrudo] = cm[2] as never;
    }
    // json es relativo a src/previews/ (registry.ts lo resuelve así).
    // `jsonAbs` es la ruta absoluta lista para leer con existsSync.
    const jsonRel = obj.json ? resolverRelativaCatalog(obj.json, raiz) : null;
    const behaviorRel = obj.behavior ? resolverRelativaCatalog(obj.behavior, raiz) : null;
    const jsonAbs = jsonRel && existsSync(jsonRel) ? jsonRel : null;
    entradas.push({
      tag,
      titulo: tag,
      categoria: obj.category ?? '',
      rutaJsonAbsoluta: jsonAbs,
      rutaModuloAbsoluta: behaviorRel ? join(raiz, behaviorRel) : null,
      rutaJsonRelativa: jsonRel ? jsonRel.replaceAll('\\', '/') : null,
      rutaModuloRelativa: behaviorRel ? behaviorRel.replaceAll('\\', '/') : null,
      tieneJson: jsonAbs ? true : false,
      tieneModulo: behaviorRel ? existeTsOJs(join(raiz, behaviorRel)) : false,
      esPagina: tag === 'home' || tag === 'theming' || tag === 'ecosystem' || tag === 'phase7',
      tieneBehavior: Boolean(behaviorRel),
    });
  }
  return entradas;
}

/**
 * Las rutas del catalog son tipo "../components/<cat>/<tag>.json" y se
 * resuelven desde src/previews/. Se devuelven como absolutas si la raíz
 * del proyecto viene en el argumento.
 */
function resolverRelativaCatalog(rel: string, raiz: string): string {
  let relPath: string;
  if (rel.startsWith('../')) {
    relPath = join('src', rel.slice(3)).replaceAll('\\', '/');
  } else if (rel.startsWith('./')) {
    relPath = join('src', 'previews', rel.slice(2)).replaceAll('\\', '/');
  } else {
    relPath = join('src', 'previews', rel).replaceAll('\\', '/');
  }
  return join(raiz, relPath).replaceAll('\\', '/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtros y utilidades.
// ─────────────────────────────────────────────────────────────────────────────

/** Filtra el catálogo por tag(s), categoría(s) y/o predicado custom. */
export function filtrarCatalogo(
  entradas: EntradaCatalogo[],
  filtros: { solo?: string[]; categorias?: string[]; limite?: number },
): EntradaCatalogo[] {
  let res = entradas;
  if (filtros.solo?.length) {
    const set = new Set(filtros.solo);
    res = res.filter((e) => set.has(e.tag));
  }
  if (filtros.categorias?.length) {
    const set = new Set(filtros.categorias);
    res = res.filter((e) => set.has(e.categoria));
  }
  if (filtros.limite && filtros.limite > 0) {
    res = res.slice(0, filtros.limite);
  }
  return res;
}

/**
 * Resumen agregado del catálogo (para el reporte). No es información
 * sensible: solo cuentas y agrupación por categoría.
 */
export function resumirCatalogo(entradas: EntradaCatalogo[]): {
  total: number;
  porCategoria: Record<string, number>;
  conJson: number;
  conModulo: number;
  conBehavior: number;
  paginas: number;
} {
  const porCategoria: Record<string, number> = {};
  let conJson = 0;
  let conModulo = 0;
  let conBehavior = 0;
  let paginas = 0;
  for (const e of entradas) {
    porCategoria[e.categoria] = (porCategoria[e.categoria] ?? 0) + 1;
    if (e.tieneJson) conJson++;
    if (e.tieneModulo) conModulo++;
    if (e.tieneBehavior) conBehavior++;
    if (e.esPagina) paginas++;
  }
  return { total: entradas.length, porCategoria, conJson, conModulo, conBehavior, paginas };
}

/**
 * Walk recursivo de una carpeta (debug / smoke). Útil cuando un componente
 * aparece en disco pero no en el manifest ni en el catalog (huérfano).
 */
export function walkComponentes(raiz: string): string[] {
  const out: string[] = [];
  const compRoot = join(raiz, 'src', 'components');
  if (!existsSync(compRoot)) return out;
  const visit = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (name === '_shared') continue;
        visit(p);
      } else if (/\.(ts|js)$/.test(name) && !name.endsWith('.d.ts')) {
        out.push(relative(raiz, p).replaceAll('\\', '/'));
      }
    }
  };
  visit(compRoot);
  return out;
}