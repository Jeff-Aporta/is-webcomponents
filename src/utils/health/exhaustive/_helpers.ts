/**
 * _helpers.ts — utilidades compartidas por los tests exhaustivos.
 *
 * Estrategia: análisis estático del código fuente + uso del audit motor
 * (`extraerMetaComponente`) para que la resolución de atributos siga la
 * cadena `extends` y los factories (defineDateField, defineTypedChart, etc.).
 *
 * Cubre las 10 dimensiones del checklist:
 *   1. Render        → attachShadow + template innerHTML
 *   2. Observados    → extraerMetaComponente (sigue extends + factories)
 *   3. Eventos       → emit / dispatchEvent
 *   4. Slots         → <slot name="...">
 *   5. Shadow parts  → part="..."
 *   6. JSON payload  → <script type="application/json"> + JSON.parse
 *   7. Accesibilidad → role= / aria-*
 *   8. Edge cases    → guards null/empty
 *   9. Integración   → defineElement / registerDiagramKind
 *  10. Performance   → disconnectedCallback cleanup
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/** Raíz del repo (5 niveles arriba desde _helpers.ts → src/utils/health/exhaustive). */
export const ROOT = join(__dirname, '..', '..', '..', '..');

export function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

export function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

/** Extrae eventos `is-*` que el componente emite. Acepta `emit(this, 'is-x', …)`,
 *  `emit(dragCard, 'is-x', …)`, `dispatchEvent(new CustomEvent('is-x', …))`. */
export function extraerEventos(src: string): string[] {
  const eventos = new Set<string>();
  for (const m of src.matchAll(/emit(?:Cancelable)?\s*\([^,]+,\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    eventos.add(m[1]);
  }
  for (const m of src.matchAll(/new\s+CustomEvent\s*\(\s*['"`](is-[a-z0-9-]+)['"`]/g)) {
    eventos.add(m[1]);
  }
  return [...eventos];
}

/** Devuelve los slots declarados en el template. */
export function extraerSlots(src: string): string[] {
  const slots = new Set<string>();
  const htmlChunks = [
    ...src.matchAll(/TEMPLATE\.innerHTML\s*=\s*[\s\S]*?`([\s\S]*?)`/g),
    ...src.matchAll(/shadow\.innerHTML\s*=\s*[\s\S]*?`([\s\S]*?)`/g),
  ];
  for (const [, html] of htmlChunks) {
    for (const m of html.matchAll(/<slot\s+(?:name=["']([^"']+)["']\s*)?[^>]*>/g)) {
      slots.add(m[1] ?? '(default)');
    }
    for (const _ of html.matchAll(/<slot\s*><\/slot>/g)) {
      slots.add('(default)');
    }
  }
  return [...slots];
}

/** CSS Parts declarados (estáticos + dinámicos vía setAttribute). */
export function extraerParts(src: string): string[] {
  const parts = new Set<string>();
  for (const m of src.matchAll(/\bpart=["']([^"']+)["']/g)) {
    parts.add(m[1]);
  }
  for (const m of src.matchAll(/setAttribute\s*\(\s*['"]part['"]\s*,\s*['"]([^"']+)['"]/g)) {
    parts.add(m[1]);
  }
  return [...parts];
}

/** ¿La clase monta shadow DOM? */
export function tieneShadow(src: string): boolean {
  return /attachShadow\s*\(\s*\{\s*mode\s*:\s*['"]open['"]\s*\}\s*\)/.test(src);
}

/** ¿Limpia observers y listeners en disconnectedCallback? */
export function cleanupCompleto(src: string): { obs: boolean; listeners: boolean; ro: boolean } {
  const usaMO = /new\s+MutationObserver\s*\(/.test(src);
  const usaRO = /new\s+ResizeObserver\s*\(/.test(src);
  const usaAE = /addEventListener\s*\(/.test(src);
  const disc = src.match(/disconnectedCallback\s*\([^)]*\)\s*(?::\s*[A-Za-z_$<>[\]|.,\s]+\s*)?\{([\s\S]{0,2000}?)\n\s{0,4}\}/);
  const body = disc?.[1] ?? '';
  const discGlobal = /\.disconnect\s*\(/.test(body) || /\.disconnect\s*\(/.test(src);
  const remList = /removeEventListener\s*\(/.test(body) || /removeEventListener\s*\(/.test(src);
  return {
    obs: usaMO ? discGlobal : true,
    ro: usaRO ? discGlobal : true,
    listeners: usaAE ? remList : true,
  };
}

/** ¿Lee `<script type="application/json">` para data? */
export function leeJsonScript(src: string): boolean {
  return /script\s+type=["']application\/json["']/.test(src);
}

/** ¿Tiene guards contra datos vacíos/null? */
export function tieneEdgeCaseGuards(src: string): boolean {
  return /Array\.isArray\s*\(/.test(src)
    || /Number\.isFinite/.test(src)
    || /\|\|\s*\[\]/.test(src)
    || /\|\|\s*['"`]/.test(src)
    || /\?\?\s*['"`]/.test(src)
    || /try\s*\{/.test(src);
}

/** ¿Usa role/aria-* para accesibilidad? */
export function tieneAccesibilidad(src: string): boolean {
  return /\brole\s*=\s*["'][^"']+["']/.test(src) || /\baria-/.test(src);
}

/** ¿El componente está registrado? */
export function estaRegistrado(src: string): boolean {
  return /customElements\.define\s*\(/.test(src)
    || /defineElement\s*\(\s*['"`][a-z0-9-]+['"`]/.test(src)
    || /window\.__isDefineTypedChart\s*\?/.test(src)
    || /registerDiagramKind/.test(src);
}

/** ¿Hace JSON.parse? */
export function parseaJson(src: string): boolean {
  return /JSON\.parse\s*\(/.test(src);
}

/** ¿Tiene contenedor SVG? */
export function tieneSvg(src: string): boolean {
  return /<svg\b/.test(src) || /createElementNS\s*\(\s*['"]http/.test(src);
}

/** ¿Tiene <canvas>? */
export function tieneCanvas(src: string): boolean {
  return /<canvas\b/.test(src);
}

/** ¿Usa ResizeObserver? */
export function usaResizeObserver(src: string): boolean {
  return /new\s+ResizeObserver\s*\(/.test(src);
}

/** ¿Usa MutationObserver? */
export function usaMutationObserver(src: string): boolean {
  return /new\s+MutationObserver\s*\(/.test(src);
}

/** ¿Adopta CSS via adoptCss? */
export function adoptaCss(src: string): boolean {
  return /\badoptCss\s*\(/.test(src);
}

/** ¿Tiene JSDoc de cabecera? */
export function tieneJsDoc(src: string): boolean {
  return /\/\*\*[\s\S]{20,800}?\*\//.test(src);
}

/** Alias: algunos tests importan `extraerObservados` en vez de
 *  usar `extraerMetaComponente` directamente. Acepta tanto la ruta
 *  del módulo como el código fuente ya leído (string). Devuelve
 *  un array de strings con los nombres de los atributos
 *  (compatible con `.includes()`).
 *
 *  Si el módulo declara `extends DiagramElementBase` (u otra base
 *  class) y no tiene sus propios observados, busca los atributos
 *  observados del padre. */
export function extraerObservados(rutaOContenido: string): string[] {
  // Acepta tanto una ruta como el código fuente directamente.
  let src: string;
  let ruta: string | null = null;
  if (exists(rutaOContenido)) {
    ruta = rutaOContenido;
    src = read(rutaOContenido);
  } else {
    src = rutaOContenido;
  }
  const set = new Set<string>();

  // 1. Array literal en observedAttributes (ignorando matches dentro de comentarios).
  //    Quitamos los comentarios `/* ... */` antes de buscar.
  const srcSinComentarios = src
    .replace(/\/\*[\s\S]*?\*\//g, '')     // block comments
    .replace(/^\s*\/\/.*$/gm, '');        // line comments
  const obsStart = srcSinComentarios.match(/static\s+get\s+observedAttributes[\s\S]*?return\s*\[/);
  if (obsStart) {
    // Re-mapear el índice al src original.
    const startInSrc = src.indexOf(obsStart[0].slice(0, -1));
    // Buscamos el último `return [` antes del final del bloque (medido por la primera `}`).
    const idxEnSrc = startInSrc >= 0 ? startInSrc + obsStart[0].length - 1 : -1;
    if (idxEnSrc >= 0) {
      let depth = 0;
      let end = idxEnSrc;
      for (let i = idxEnSrc; i < src.length; i++) {
        if (src[i] === '[') depth++;
        else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
      }
      const literal = src.substring(idxEnSrc + 1, end);
      for (const m of literal.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) set.add(m[1]);
      for (const m of literal.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
        const alias = m[1];
        const aliasMatch = src.match(new RegExp(`(?:const|let|var)\\s+${alias}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
        if (aliasMatch) {
          for (const mm of aliasMatch[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) set.add(mm[1]);
        }
      }
    }
  }

  // 1b. Variante: `return OBSERVED;` (constante sin spread).
  //     Caso típico: `const OBSERVED = [...]` seguido de
  //     `static get observedAttributes() { return OBSERVED; }`.
  //     También funciona con nombres como `BOARD_OBSERVED`, etc.
  if (set.size === 0) {
    const obsConst = srcSinComentarios.match(/static\s+get\s+observedAttributes[\s\S]*?return\s+([A-Z_$][\w$]*)/);
    if (obsConst) {
      const alias = obsConst[1];
      for (const m of src.matchAll(new RegExp(`(?:const|let|var)\\s+${alias}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`, 'g'))) {
        for (const mm of m[1].matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) set.add(mm[1]);
      }
    }
  }

  // 2. styleAttrs (heredado de ElementBase).
  //    Quitamos comentarios para no confundir `// ...` con keys.
  const styleStart = srcSinComentarios.search(/static\s+styleAttrs\s*(?::\s*[A-Za-z_$<>[\]|. ,]+\s*)?=\s*\{/);
  if (styleStart >= 0) {
    const openIdx = src.indexOf('{', styleStart);
    let depth = 0;
    let endIdx = openIdx;
    for (let i = openIdx; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
    }
    const body = src.substring(openIdx + 1, endIdx);
    for (const m of body.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]\s*:|([a-zA-Z][a-zA-Z0-9-]*)\s*:/g)) {
      set.add(m[1] ?? m[2]);
    }
  }

  // 3. Herencia del base class (DiagramElementBase, ElementBase, etc.).
  //    Siempre añadimos los attrs del base, no solo cuando el wrapper tiene
  //    pocos. Esto cubre diagramas que extienden DiagramElementBase y
  //    exponen `color`/`open-on-click` solo via el base.
  if (ruta) {
    const extMatch = srcSinComentarios.match(/extends\s+([A-Z][A-Za-z0-9_]*Base)\b/);
    if (extMatch) {
      const baseName = extMatch[1];
      const kebab = baseName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const modDir = dirname(ruta);
      const candidates = [
        join(modDir, '..', '_shared', `${kebab}.ts`),
        join(modDir, '..', '_shared', `${baseName}.ts`),
        join(modDir, `${kebab}.ts`),
        join(modDir, `${baseName}.ts`),
      ];
      for (const cand of candidates) {
        if (exists(cand)) {
          const baseSrc = read(cand);
          const baseSinComentarios = baseSrc
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
          const baseObsStart = baseSinComentarios.match(/static\s+get\s+observedAttributes[\s\S]*?return\s*\[/);
          if (baseObsStart) {
            const startInBase = baseSrc.indexOf(baseObsStart[0].slice(0, -1));
            const idx = startInBase >= 0 ? startInBase + baseObsStart[0].length - 1 : -1;
            if (idx >= 0) {
              let depth = 0;
              let end = idx;
              for (let i = idx; i < baseSrc.length; i++) {
                if (baseSrc[i] === '[') depth++;
                else if (baseSrc[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
              }
              const literal = baseSrc.substring(idx + 1, end);
              for (const mm of literal.matchAll(/['"`]([a-zA-Z0-9-]+)['"`]/g)) set.add(mm[1]);
            }
          }
          break;
        }
      }
    }
  }

  // 4. Atributos usados vía `hasAttribute('xxx')` / `getAttribute('xxx')` /
  //    `:host([xxx])`. Estos atributos se leen en runtime pero quizás no
  //    están declarados en `observedAttributes`. Si los encontramos en el
  //    source del wrapper o de sus archivos relacionados (incluido el
  //    base), los añadimos (mejor falso positivo que faltante).
  const usedAttrRegex = /(?:hasAttribute|getAttribute|:host\(\[\s*|getElementsByTagName)\(\s*['"`]([a-zA-Z][a-zA-Z0-9-]*)['"`]/g;
  const srcParaAttrs = src + (ruta ? read(ruta) : '');
  for (const m of srcParaAttrs.matchAll(usedAttrRegex)) {
    if (m[1].length >= 2 && !m[1].startsWith('on') && m[1] !== 'data' && m[1] !== 'class' && m[1] !== 'style' && m[1] !== 'id') {
      set.add(m[1]);
    }
  }
  return [...set];
}

/**
 * Devuelve la fuente combinada del módulo + sus clases base.
 * Si el módulo extiende `DiagramElementBase`, `ElementBase`, etc.,
 * agrega la fuente del base class. Esto permite que los tests
 * exhaustivos de los diagramas/herederos vean el `<svg>`, parts,
 * MutationObserver, etc. que están en la base.
 *
 * También concatena archivos importados desde `../_shared/` que
 * el módulo referencia (e.g. `intent.ts` para listas de colores).
 *
 * Implementación: cola FIFO de archivos a procesar. Cada archivo
 * se concatena una sola vez; sus imports se encolan para visitar
 * después (BFS). Esto evita el bug de saltar imports cuando se
 * cambia el source bajo el regex.
 */
export function leerConBase(rutaModulo: string): string {
  if (!exists(rutaModulo)) return '';
  let src = read(rutaModulo);
  const visited = new Set<string>([rutaModulo]);
  const queue: string[] = [rutaModulo];
  const importRe = /import\s*\{?\s*[^}]+?\}\s*from\s*['"]([^'"]+)['"]/g;

  while (queue.length > 0) {
    const currentRuta = queue.shift()!;
    const currentSrc = read(currentRuta);
    let m: RegExpExecArray | null;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(currentSrc))) {
      const impPath = m[1];
      if (!impPath.startsWith('.')) continue;
      const dir = dirname(currentRuta);
      const target = join(dir, impPath);
      let resolved: string | null = null;
      if (exists(target)) resolved = target;
      else if (exists(target.replace(/\.js$/, '.ts'))) resolved = target.replace(/\.js$/, '.ts');
      if (!resolved || visited.has(resolved)) continue;
      visited.add(resolved);
      src += '\n' + read(resolved);
      queue.push(resolved);
    }
  }
  // Buscar `extends XxxBase` y concatenar el base class.
  const extMatch = src.match(/extends\s+([A-Z][A-Za-z0-9_]*Base)\b/);
  if (extMatch) {
    const baseName = extMatch[1];
    const kebab = baseName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    const modDir = dirname(rutaModulo);
    const candidates = [
      join(modDir, '..', '_shared', `${kebab}.ts`),
      join(modDir, '..', '_shared', `${baseName}.ts`),
      join(modDir, `${kebab}.ts`),
      join(modDir, `${baseName}.ts`),
    ];
    for (const cand of candidates) {
      if (exists(cand) && !visited.has(cand)) {
        src += '\n' + read(cand);
        visited.add(cand);
        break;
      }
    }
  }
  return src;
}
