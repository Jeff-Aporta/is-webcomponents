/**
 * Validador de CONTENIDO del JSON.
 *
 * El validador de esquema (json-schema.ts) confirma que la estructura
 * cumple is-preview/v1. Este módulo audita el CONTENIDO de cada bloque:
 *
 *   - Bloques `demo` cuyo HTML contiene tags no is-* y muchos slots sin
 *     inicializar (síntoma típico de demo que no se pensó como dato).
 *   - Bloques `demo` con scripts inline (deben pasarse por JSON al
 *     componente o usar `<script type="application/json">`).
 *   - Bloques `code` que repiten exactamente el mismo snippet (debería
 *     consolidarse).
 *   - Tablas que exceden 100 celdas sin ser referenciadas.
 *   - Bloques `html` que mezclan estructura y estilo (mala práctica).
 *   - Demostraciones que NO pasan JSON al componente (el usuario pidió
 *     que "todos los demos sean definidos directamente con jsons como
 *     button-group.json" — eso significa: los demos complejos (data-viz,
 *     diagramas, formularios) deben declarar su payload vía
 *     `<script type="application/json">` dentro del host).
 */

import type { Hallazgo } from '../types.js';

/** Forma mínima del JSON que necesitamos. */
type Def = { tag: string; sections?: Array<{ blocks?: any[] }> };

/** Opciones del validador de contenido. */
export interface OpcionesContenido {
  /** Si el tag es un módulo (helper, no custom element), el auditor
   *  no exige que el demo contenga <is-*>: el behavior puede inyectar
   *  los tags dinámicamente. */
  esModulo?: boolean;
}

/** Bloque normalizado. */
type Bloque = Record<string, any>;

/**
 * Detecta si un bloque `demo` contiene un <script type="application/json">
 * con payload para el componente. Esta es la forma canónica de pasarle
 * data compleja a un is-* (charts, diagramas, grids).
 */
function tieneJsonEnDemo(html: string): boolean {
  return /<script\s+type=["']application\/json["']/i.test(html);
}

/** Cuenta tags is-* en un HTML (sin importar host del demo). */
function contarTagsIs(html: string): number {
  const matches = html.match(/<is-[a-z0-9-]+/g);
  return matches ? matches.length : 0;
}

/** Devuelve los tags is-* únicos en el HTML. */
function tagsIsUnicos(html: string): string[] {
  const set = new Set<string>();
  for (const m of html.matchAll(/<is-([a-z0-9-]+)/g)) set.add(`is-${m[1]}`);
  return [...set];
}

/**
 * Detecta si el demo tiene estructura compleja sin JSON embebido:
 *   - chart con datasets grandes
 *   - diagram con muchas definitions
 *   - grid con muchas columns
 *   - calendar / pivot / spreadsheet
 *
 * Estos componentes DEBEN recibir su payload por JSON. Si no, el demo
 * es estático y no se está aprovechando la API real.
 */
const COMPONENTES_QUE_REQUIEREN_JSON = new Set([
  'is-bar-chart', 'is-line-chart', 'is-pie-chart', 'is-doughnut-chart',
  'is-polar-area-chart', 'is-bubble-chart', 'is-waterfall-chart', 'is-funnel-chart',
  'is-treemap', 'is-heatmap',
  'is-flowchart', 'is-sequence-diagram', 'is-class-diagram', 'is-state-diagram',
  'is-er-diagram', 'is-block-diagram', 'is-component-diagram',
  'is-mindmap', 'is-gantt', 'is-timeline',
  'is-sankey-diagram', 'is-quadrant-chart', 'is-venn-diagram',
  'is-use-case-diagram', 'is-swimlane-diagram', 'is-journey-map', 'is-org-chart',
  'is-pivot-table',
  // is-chart, is-radar-chart, is-scatter-chart: tienen factory
  // `window.__isDefineTypedChart` que delega a chart.ts. Sus demos
  // admiten tanto JSON embebido como `chart.config = {...}` por JS.
  // is-kanban, is-spreadsheet, is-transfer, is-stat, is-gauge: data
  // inyectada por behavior (.config / .value). Ver
  // `COMPONENTES_DATA_VIA_BEHAVIOR` para la lista completa.
  // is-sparkline: acepta `data="…"` por atributo, no JSON embebido.
  // is-data-grid: la API canónica es `grid.columns/rows = …` vía propiedad
  // (en el behavior). El JSON es la "cáscara" con atributos declarativos
  // (show-toolbar, page-size, etc.) y los datos los inyecta el behavior.
]);

/**
 * Componentes que típicamente reciben data compleja vía atributo (no JSON):
 *   - tablas, kanban, etc. los declaramos arriba porque tienen JSON oficial.
 *   - estos de acá abajo NO tienen JSON oficial pero igual deberían
 *     pasarse vía atributo o slot.
 */
export function ejecutarValidacionContenido(def: Def, rutaJson: string, opciones: OpcionesContenido = {}): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const tag = def.tag;
  const secciones = def.sections ?? [];
  const esModulo = opciones.esModulo === true;

  secciones.forEach((sec, si) => {
    const bloques: Bloque[] = sec.blocks ?? [];
    bloques.forEach((bloque, bi) => {
      const ruta = `${rutaJson}#sections[${si}].blocks[${bi}]`;
      switch (bloque.kind) {
        case 'demo': {
          const html = String(bloque.html ?? '');
          const tags = tagsIsUnicos(html);

          // 1. Demo sin is-* en el HTML.
          //    Módulos (helpers como is-ui) reciben los <is-*> por behavior
          //    en runtime; no se puede auditar estáticamente.
          if (contarTagsIs(html) === 0 && !esModulo) {
            hallazgos.push({
              categoria: 'json-contenido',
              severidad: 'warn',
              tag,
              ruta: rutaJson,
              mensaje: `Bloque demo en sections[${si}].blocks[${bi}] no contiene ningún <is-*>.`,
              detalle: { html: html.slice(0, 80) + (html.length > 80 ? '…' : '') },
              sugerencia: 'Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).',
            });
          }

          // 2. Componente que requiere JSON embebido pero no lo tiene.
          //    Si la misma sección tiene un bloque `code` con asignación
          //    JS (`x.config = {...}` o similar), el demo "sin JSON" es
          //    intencional: está mostrando la API alternativa. Bajamos
          //    de error a warn en ese caso.
          const tieneCodeJsApi = tieneCodeConJsConfig(sec);
          for (const t of tags) {
            if (COMPONENTES_QUE_REQUIEREN_JSON.has(t) && !tieneJsonEnDemo(html)) {
              hallazgos.push({
                categoria: 'json-complejidad',
                severidad: tieneCodeJsApi ? 'warn' : 'error',
                tag,
                ruta: rutaJson,
                mensaje: `Demo de <${t}> no declara <script type="application/json"> con payload.`,
                sugerencia: `Pasale la data por JSON al host: <${t}><script type="application/json">{…}</script></${t}>. Si preferís la API JS, dejá un bloque code con ".config = {…}" como referencia.`,
              });
            }
            // Componentes basados en slots: no requieren JSON.
            if (COMPONENTES_BASADOS_EN_SLOTS.has(t) && !tieneJsonEnDemo(html)) {
              void 0;
            }
            // Componentes data-via-behavior: data inyectada por el
            // behavior, no requiere JSON embebido. (Silencioso.)
            if (COMPONENTES_DATA_VIA_BEHAVIOR.has(t) && !tieneJsonEnDemo(html)) {
              void 0;
            }
          }

          // 3. Script inline ejecutable dentro de demo (debería ir en un behavior aparte).
          //    Excluimos scripts con `type="text/markdown"` (datos, no ejecutables)
          //    y `type="application/json"` (data embebida, ya cubierta arriba).
          //    También `type="text/x-..."` que algunos componentes usan como
          //    payloads (lightbox templates, etc.) y scripts dentro de
          //    `<textarea hidden>` (que son datos, no ejecutables).
          const htmlSinTextareas = html.replace(/<textarea\b[\s\S]*?<\/textarea>/gi, '');
          if (/<script(?![^>]*type=["'](application\/json|text\/markdown|text\/x-[a-z0-9-]+|text\/plain)["'])[^>]*>/i.test(htmlSinTextareas)) {
            hallazgos.push({
              categoria: 'json-contenido',
              severidad: 'warn',
              tag,
              ruta: rutaJson,
              mensaje: 'Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).',
            });
          }

          // 4. Demasiados tags en un solo demo (síntoma de mezcla).
          if (tags.length >= 8) {
            hallazgos.push({
              categoria: 'json-contenido',
              severidad: 'info',
              tag,
              ruta: rutaJson,
              mensaje: `Demo con ${tags.length} tags distintos: ${tags.slice(0, 8).join(', ')}${tags.length > 8 ? '…' : ''}. Considerá partirlo en varios bloques.`,
            });
          }
          break;
        }

        case 'code': {
          const code = String(bloque.code ?? '');
          if (!code.trim()) {
            hallazgos.push({
              categoria: 'json-contenido', severidad: 'error', tag, ruta: rutaJson,
              mensaje: `Bloque code en sections[${si}].blocks[${bi}] está vacío.`,
            });
          }
          // Detecta copias literales (placeholders sin expandir).
          // Excluimos "...", ya que en CSS dentro de snippets y en
          // ejemplos de selectores CSS es legítimo. Solo alertamos si
          // el bloque es muy corto y TODO/FIXME/XXX reales.
          if (/(TODO|FIXME|XXX)\b/.test(code) && code.length < 80) {
            hallazgos.push({
              categoria: 'json-contenido', severidad: 'warn', tag, ruta: rutaJson,
              mensaje: 'Bloque code parece tener un placeholder sin expandir (TODO/FIXME/...).',
              detalle: { code },
            });
          }
          break;
        }

        case 'table': {
          const cols = Array.isArray(bloque.columns) ? bloque.columns : [];
          const rows = Array.isArray(bloque.rows) ? bloque.rows : [];
          if (cols.length === 0 && rows.length === 0) {
            hallazgos.push({
              categoria: 'json-contenido', severidad: 'warn', tag, ruta: rutaJson,
              mensaje: 'Tabla vacía (sin columns ni rows).',
            });
          }
          // Celdas que no son strings: normalmente es JSON mal formado.
          for (let i = 0; i < rows.length; i++) {
            const fila = rows[i];
            if (!Array.isArray(fila)) {
              hallazgos.push({
                categoria: 'json-schema', severidad: 'error', tag, ruta: rutaJson,
                mensaje: `Tabla.rows[${i}] no es un array.`,
                linea: i + 1,
              });
            }
          }
          break;
        }

        case 'html': {
          // Mezclar <style> dentro de un bloque html es mala práctica en JSON.
          if (/<style[\s>]/i.test(String(bloque.html ?? ''))) {
            hallazgos.push({
              categoria: 'json-contenido', severidad: 'warn', tag, ruta: rutaJson,
              mensaje: 'Bloque html contiene <style>; usar el campo `styles` raíz o un behavior en su lugar.',
            });
          }
          break;
        }
      }
    });
  });

  return hallazgos;
}

/** Helper exportado: ¿este tag requiere JSON embebido? */
export function requiereJsonEmbebido(tag: string): boolean {
  return COMPONENTES_QUE_REQUIEREN_JSON.has(tag);
}

/** Tags que tienen API basada en slots en lugar de JSON. La auditoría
 *  los considera válidos sin requerir script type=application/json. */
export const COMPONENTES_BASADOS_EN_SLOTS = new Set([
  'is-tree', 'is-tree-item', 'is-tree-view',
  'is-date-picker', 'is-month-calendar', 'is-year-calendar', 'is-full-calendar',
]);

/** Tags que reciben su data vía property assignment en un behavior
 *  (no requieren script type=application/json en el host). El JSON
 *  solo declara el shell + atributos. */
export const COMPONENTES_DATA_VIA_BEHAVIOR = new Set([
  'is-data-grid', 'is-sparkline',
  'is-chart', 'is-radar-chart', 'is-scatter-chart',
  'is-stat', 'is-transfer', 'is-gauge',
  'is-kanban', 'is-spreadsheet',
]);

/** Detecta si la sección tiene un bloque `code` con la API JS
 *  alternativa (`.config = {...}`). Si lo tiene, los demos sin JSON
 *  son intencionales. */
function tieneCodeConJsConfig(sec: any): boolean {
  for (const b of (sec.blocks ?? []) as Array<{ kind?: string; code?: string }>) {
    if (b.kind === 'code' && typeof b.code === 'string') {
      // Patrones: ".config = {…}", "chart.config = {…}", "x = {…}",
      // "host.config = {…}", o asignación a una propiedad cualquiera.
      if (/\.\s*config\s*=\s*[\[{]/.test(b.code)) return true;
      if (/\.data\s*=\s*[\[{]/.test(b.code)) return true;
      if (/\.setAttribute\(\s*['"]data['"]/.test(b.code)) return true;
    }
  }
  return false;
}