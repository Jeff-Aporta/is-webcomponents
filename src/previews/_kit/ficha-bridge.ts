/**
 * Bridge entre `FichaSchema` (Zod, `src/utils/section-schema.ts`) y el
 * `PreviewDefinition` (`iswc-preview/v1`).
 *
 * Contexto — Phase N (zod-migration):
 *   El estándar del usuario pide que las demos (incluido el playground) tengan
 *   9 secciones standard (anatomia, atributos, props, states, eventos, slots,
 *   parts, apiJs, ejemplos) validadas con `FichaSchema.parse()`.
 *   `exclude` suprime los warnings. El "Playground" (controles en grid) se
 *   consolida en la primera sección — no se renderiza como sección aparte.
 *
 *   El render runtime, en cambio, sigue consumiendo `PreviewDefinition` (sección
 *   → blocks). Este bridge es la pieza intermedia: detecta la presencia de
 *   una ficha (sub-objeto `ficha:` o schema dedicado), valida con Zod, emite
 *   `console.warn` para las secciones que faltan (respetando `exclude`) y,
 *   si la ficha declara `playground` HTML, lo prepende a la primera sección
 *   de `sections[]` (no renderiza como sección aparte).
 *
 *   Las dos formas de declarar la ficha son:
 *     A. JSON completo en formato ficha (legacy: `iswc-ficha/v1`):
 *        `{ $schema: "iswc-ficha/v1", sections: { anatomia, ... }, ... }`.
 *        El bridge convierte a PreviewDefinition (mapea cada sección ficha a
 *        una PreviewSection con tabla/lede blocks en orden estricto).
 *     B. JSON `iswc-preview/v1` con un sub-objeto `ficha` (modo mixto):
 *        `{ $schema: "iswc-preview/v1", sections: [...], ficha: { sections, exclude } }`.
 *        El bridge valida la ficha con Zod + warns, y opcionalmente prepende
 *        `ficha.playground.html` a `sections[0].blocks`. La renderización
 *        sigue siendo la de `sections[]`.
 *
 * Importante:
 *   - **No** falla con secciones ausentes: la ficha parsea y los warnings se
 *     loguean via `console.warn`. Sólo `.refine()` errors (sección en `sections`
 *     Y en `exclude` a la vez, IDs desconocidos) lanzan — son errores de forma.
 *   - El orden de las 9 secciones en el output (modo A) sigue `SECTION_IDS`
 *     (constante exportada por `section-schema.ts`), que es el orden estricto
 *     del estándar del usuario.
 *   - Si el JSON no trae `ficha` ni `$schema: iswc-ficha/v1`, este módulo es
 *     un no-op y `loadFichaLikeDefinition` devuelve el input tal cual,
 *     dejando el comportamiento actual intacto.
 *
 * Phase V7 (zod-migration): el runtime hook que materializa los warnings
 * es `emitFichaWarnings(tag, ficha)`. Se llama automáticamente desde
 * `loadFichaLikeDefinition(...)` (modos A y B) tras validar con Zod, y
 * produce UN solo `console.warn` por tag con la lista consolidada de
 * secciones ausentes y excludes espurios. Aparece en el dev server y en
 * el bundle de producción (visible en la consola del navegador).
 */
import {
  FichaSchema,
  inspectFicha,
  SECTION_IDS,
  type Ficha,
  type SectionId,
} from '../../utils/section-schema.ts';
import type {
  PreviewDefinition,
  PreviewSection,
  PreviewBlock,
} from './types.d.ts';

/** Tag del schema ficha dedicado. */
export const FICHA_SCHEMA = 'iswc-ficha/v1';

/** Forma de un bloque de playground adjunto a la primera sección de la ficha. */
export interface FichaPlayground {
  /** HTML del demo a consolidar en la primera sección. */
  html: string;
  /** Título opcional encima del demo. */
  title?: string;
  /** Lede opcional bajo el título. */
  lede?: string;
}

/** Forma del sub-objeto `ficha:` dentro de un PreviewDefinition. */
export interface FichaSubObject {
  /** Mapa de secciones ficha. */
  sections?: Record<string, unknown>;
  /** Secciones a excluir del warning. */
  exclude?: string[];
  /** Bloque playground (opcional) — se prepende a la primera sección del preview. */
  playground?: FichaPlayground;
}

/** Forma mínima del JSON que este bridge entiende. */
export interface FichaLikeDefinition {
  $schema?: string;
  tag: string;
  category?: string;
  title?: string;
  /** Forma ficha completa (modo A). */
  sections?: unknown;
  /** Forma mixta (modo B): sub-objeto `ficha:`. */
  ficha?: FichaSubObject;
  /** Resto de campos se preservan. */
  [key: string]: unknown;
}

/** Heurística: ¿el JSON tiene una ficha (sub-objeto o schema dedicado)? */
export function hasFicha(def: unknown): def is FichaLikeDefinition {
  if (!def || typeof def !== 'object') return false;
  const d = def as Record<string, unknown>;
  if (d.$schema === FICHA_SCHEMA) return true;
  if (d.ficha && typeof d.ficha === 'object') return true;
  // Fallback: `sections` es objeto (no array) → es modo A sin schema explícito.
  if (d.sections && typeof d.sections === 'object' && !Array.isArray(d.sections)) {
    return true;
  }
  return false;
}

/** Etiqueta legible para el H2 de cada sección (modo A). */
const SECTION_TITLE: Record<SectionId, string> = {
  anatomia: 'Anatomía',
  atributos: 'Atributos',
  props: 'Props',
  states: 'Custom States',
  eventos: 'Eventos',
  slots: 'Slots',
  parts: 'CSS Parts',
  apiJs: 'API JavaScript',
  ejemplos: 'Ejemplos',
};

/** Columnas del `kind: 'table'` por sección (modo A, orden estable). */
const SECTION_COLUMNS: Record<SectionId, string[] | null> = {
  anatomia: null,
  atributos: ['Atributo', 'Tipo', 'Descripción'],
  props: ['Prop', 'Tipo', 'Default', 'Descripción'],
  states: ['State', 'Selector', 'Cuándo se aplica'],
  eventos: ['Evento', 'Detalle', 'Cuándo se emite'],
  slots: ['Slot', 'Descripción'],
  parts: ['Part', 'Descripción'],
  apiJs: ['Método', 'Descripción', 'Ejemplo'],
  ejemplos: null,
};

/** Traduce la etiqueta de columna a la clave del schema Zod (modo A). */
function claveEsquemaParaColumna(col: string, id: SectionId): string {
  switch (id) {
    case 'atributos':
      return col === 'Atributo' ? 'name' : col === 'Tipo' ? 'type' : 'desc';
    case 'props':
      if (col === 'Prop') return 'name';
      if (col === 'Tipo') return 'type';
      if (col === 'Default') return 'default';
      return 'desc';
    case 'states':
      if (col === 'State') return 'state';
      if (col === 'Selector') return 'selector';
      return 'cuando';
    case 'eventos':
      if (col === 'Evento') return 'evento';
      if (col === 'Detalle') return 'detalle';
      return 'cuando';
    case 'slots':
      return col === 'Slot' ? 'slot' : 'descripcion';
    case 'parts':
      return col === 'Part' ? 'part' : 'descripcion';
    case 'apiJs':
      if (col === 'Método') return 'metodo';
      if (col === 'Ejemplo') return 'ejemplo';
      return 'descripcion';
    default:
      return col.toLowerCase();
  }
}

/** Convierte una fila ficha (tabla) en celdas Preview (HTML o code-ejemplo). */
function filaToCeldas(
  fila: Record<string, unknown>,
  id: SectionId,
  columns: string[],
): Array<string | { kind: 'code-ejemplo'; code: string; lang?: string; summary?: string }> {
  return columns.map((col) => {
    const clave = claveEsquemaParaColumna(col, id);
    let v = fila[clave];
    // Compat: ficha histórica usa `desc` en vez de `descripcion`.
    if (v == null && (clave === 'descripcion' || clave === 'desc')) {
      v = fila.descripcion ?? fila.desc;
    }
    if (col === 'Ejemplo' || clave === 'ejemplo') {
      if (v == null || v === '') return '';
      if (typeof v === 'object' && v && (v as { kind?: string }).kind === 'code-ejemplo') {
        return v as { kind: 'code-ejemplo'; code: string; lang?: string; summary?: string };
      }
      return {
        kind: 'code-ejemplo' as const,
        code: String(v),
        lang: typeof fila.ejemploLang === 'string' ? fila.ejemploLang : 'html',
        summary: typeof fila.ejemploSummary === 'string' ? fila.ejemploSummary : 'Ejemplo',
      };
    }
    if (v == null) return '';
    return String(v);
  });
}

/** Convierte un bloque ficha (de anatomia/atributos/...) a bloques Preview (modo A). */
function convertirSeccionFicha(id: SectionId, raw: unknown): PreviewBlock[] {
  if (raw == null) return [];
  const seccion = raw as Record<string, unknown>;
  const bloques: PreviewBlock[] = [];

  if (id === 'anatomia' || id === 'ejemplos') {
    const content = typeof seccion.content === 'string' ? seccion.content : '';
    if (content) bloques.push({ kind: 'lede', html: content } as PreviewBlock);
    return bloques;
  }

  const tableRaw = seccion.table;
  if (!Array.isArray(tableRaw) || tableRaw.length === 0) return [];
  const columns = SECTION_COLUMNS[id] ?? [];
  const rows = (tableRaw as Array<Record<string, unknown>>).map(
    (fila) => filaToCeldas(fila, id, columns),
  );
  bloques.push({
    kind: 'table',
    columns,
    rows,
  } as PreviewBlock);
  return bloques;
}

/** Inserta el bloque `playground` (HTML) en la primera sección como demo. */
function prependerPlaygroundPreview(
  seccion: PreviewSection,
  pg: FichaPlayground,
): PreviewSection {
  const lede = pg.lede ?? 'Controles en grid: modifica y observa en vivo.';
  const bloqueDemo: PreviewBlock = {
    kind: 'demo',
    html: pg.html,
  } as PreviewBlock;
  const blocks = [bloqueDemo, ...seccion.blocks];
  return {
    ...seccion,
    lede: seccion.lede ? `${seccion.lede}\n\n${lede}` : lede,
    blocks,
    className: seccion.className
      ? `${seccion.className} has-playground`
      : 'has-playground',
  };
}

/** Construye el `PreviewSection` para una sección ficha (modo A). */
function seccionPara(
  id: SectionId,
  raw: unknown,
  esPrimera: boolean,
  pg: FichaPlayground | undefined,
): PreviewSection {
  const base: PreviewSection = {
    id,
    title: SECTION_TITLE[id],
    blocks: convertirSeccionFicha(id, raw),
  };
  if (esPrimera && pg) return prependerPlaygroundPreview(base, pg);
  return base;
}

/** Construye el array de secciones para el modo A. */
function construirSeccionesFicha(
  fichaInput: { sections?: Record<string, unknown>; playground?: FichaPlayground },
): PreviewSection[] {
  const secciones: PreviewSection[] = [];
  for (const id of SECTION_IDS) {
    const rawSeccion = fichaInput.sections?.[id];
    secciones.push(seccionPara(id, rawSeccion, secciones.length === 0, fichaInput.playground));
  }
  // Filtrar secciones vacías (sin bloques) para no llenar la página de
  // secciones en blanco.
  return secciones.filter((s) => s.blocks.length > 0);
}

/**
 * Phase V7 hook (zod-migration): emite un único `console.warn` consolidado
 * con la lista de secciones ausentes (y excludes espurios) de una ficha
 * recién validada.
 *
 * - Se llama automáticamente desde `loadFichaLikeDefinition(...)` después
 *   de `FichaSchema.parse(...)` en los modos A (iswc-ficha/v1) y B
 *   (sub-objeto `ficha:`).
 * - Se exporta para que callers externos (auditorías, scripts CLI,
 *   harnesses de tests) puedan re-correr el hook sin re-parsear.
 *
 * La salida es UN solo `console.warn` por tag (no uno por sección), para
 * que sea fácil de filtrar y agregar en logs de CI / dev server. Si la
 * ficha no tiene issues, esta función es silenciosa (no emite nada).
 *
 * Visibilidad:
 *   - **Dev server** (`deno task dev`): aparece en la consola del navegador
 *     cada vez que se carga un preview controlado con secciones ausentes.
 *   - **Build** (`deno task build`): el bundle minificado la incluye, así
 *     que también sale si un usuario abre el preview desde la build.
 *
 * Salida (ejemplo):
 *
 *   [ficha] iswc-button: 2 advertencia(s) — missing: [parts, apiJs]; spurious-exclude: [slots]
 */
export function emitFichaWarnings(tag: string, ficha: Ficha): void {
  const warnings = inspectFicha(ficha);
  const total = warnings.missing.length + warnings.spuriousExclude.length;
  if (total === 0) return;
  const parts: string[] = [];
  if (warnings.missing.length > 0) {
    const lista = warnings.missing.map((w) => w.section).join(', ');
    parts.push(`missing: [${lista}]`);
  }
  if (warnings.spuriousExclude.length > 0) {
    const lista = warnings.spuriousExclude.map((w) => w.section).join(', ');
    parts.push(`spurious-exclude: [${lista}]`);
  }
  console.warn(`[ficha] ${tag}: ${total} advertencia(s) — ${parts.join('; ')}`);
}

/**
 * Punto de entrada del bridge.
 *
 * - Modo A (`iswc-ficha/v1` o `sections` objeto): convierte a PreviewDefinition
 *   y emite warnings.
 * - Modo B (`ficha:` sub-objeto en un `iswc-preview/v1`): valida la ficha con
 *   Zod, emite warnings, y opcionalmente prepende `ficha.playground.html` a
 *   `sections[0].blocks`. Devuelve el preview original (con la sección 0
 *   modificada) o el original si no hay playground.
 * - Otros shapes: passthrough (compatibilidad).
 */
export function loadFichaLikeDefinition(
  raw: Record<string, unknown>,
): PreviewDefinition {
  if (!raw || typeof raw !== 'object') {
    return raw as unknown as PreviewDefinition;
  }
  const tag = typeof raw.tag === 'string' ? raw.tag : '<unknown>';

  // ── Modo A: schema ficha o `sections` objeto ──
  const schemaFicha = raw.$schema === FICHA_SCHEMA;
  const sectionsObjeto = raw.sections && typeof raw.sections === 'object' && !Array.isArray(raw.sections);
  if (schemaFicha || (sectionsObjeto && !raw.ficha)) {
    const parsed: Ficha = FichaSchema.parse({
      sections: (raw.sections as Record<string, unknown>) ?? {},
      exclude: Array.isArray(raw.exclude) ? (raw.exclude as string[]) : [],
    });
    emitFichaWarnings(tag, parsed);

    const seccionesVisibles = construirSeccionesFicha({
      sections: raw.sections as Record<string, unknown>,
      playground: raw.playground as FichaPlayground | undefined,
    });

    const preview: PreviewDefinition = {
      $schema: 'iswc-preview/v1',
      tag: typeof raw.tag === 'string' ? raw.tag : '',
      category: (raw.category as string) ?? '',
      title: (raw.title as string) ?? `<${tag}>`,
      ...(typeof raw.titleHtml === 'boolean' ? { titleHtml: raw.titleHtml } : {}),
      ...(typeof raw.styles === 'string' ? { styles: raw.styles } : {}),
      ...(typeof raw.storageKey === 'string' ? { storageKey: raw.storageKey } : {}),
      ...(typeof raw.mainClass === 'string' ? { mainClass: raw.mainClass } : {}),
      ...(typeof raw.wrapperClass === 'string' ? { wrapperClass: raw.wrapperClass } : {}),
      ...(typeof raw.prelude === 'string' ? { prelude: raw.prelude } : {}),
      sections: seccionesVisibles,
    };
    return preview;
  }

  // ── Modo B: sub-objeto `ficha:` dentro de iswc-preview/v1 ──
  if (raw.ficha && typeof raw.ficha === 'object') {
    const ficha = raw.ficha as FichaSubObject;
    const parsed: Ficha = FichaSchema.parse({
      sections: ficha.sections ?? {},
      exclude: Array.isArray(ficha.exclude) ? ficha.exclude : [],
    });
    emitFichaWarnings(tag, parsed);

    // Si la ficha declara `playground`, prependerlo a la primera sección
    // del preview (no se renderiza como sección aparte).
    if (ficha.playground && Array.isArray(raw.sections) && (raw.sections as unknown[]).length > 0) {
      const sections = (raw.sections as PreviewSection[]).slice();
      sections[0] = prependerPlaygroundPreview(sections[0], ficha.playground);
      return { ...(raw as unknown as PreviewDefinition), sections };
    }
    return raw as unknown as PreviewDefinition;
  }

  // ── Otros shapes: passthrough ──
  return raw as unknown as PreviewDefinition;
}

/** API auxiliar: deja los warnings accesibles para tests/debug sin tener que
 *  parsear dos veces. */
export function loadFichaLikeDefinitionWithWarnings(
  raw: Record<string, unknown>,
): { preview: PreviewDefinition; warnings: ReturnType<typeof inspectFicha> } {
  if (!hasFicha(raw)) {
    return {
      preview: raw as unknown as PreviewDefinition,
      warnings: { missing: [], spuriousExclude: [], unknownExclude: [] },
    };
  }
  const preview = loadFichaLikeDefinition(raw);
  // Re-correr inspect para devolver los warnings.
  const tag = typeof raw.tag === 'string' ? raw.tag : '<unknown>';
  let warnings: ReturnType<typeof inspectFicha> = { missing: [], spuriousExclude: [], unknownExclude: [] };
  try {
    const fichaInput = raw.ficha as FichaSubObject | undefined;
    const sectionsFuente = fichaInput?.sections
      ?? ((raw.sections && typeof raw.sections === 'object' && !Array.isArray(raw.sections))
        ? (raw.sections as Record<string, unknown>)
        : undefined);
    const exclude = fichaInput?.exclude
      ?? (Array.isArray(raw.exclude) ? (raw.exclude as string[]) : undefined);
    if (sectionsFuente) {
      const parsed = FichaSchema.parse({
        sections: sectionsFuente,
        exclude: exclude ?? [],
      });
      warnings = inspectFicha(parsed);
    }
  } catch (e) {
    // Errores de forma (no warnings) no se re-emiten aquí: loadFichaLikeDefinition
    // ya lanzó. Pero evitamos romper la API devolviendo warnings vacíos.
    console.warn(`[ficha] ${tag}: no se pudieron recomputar warnings`, e);
  }
  return { preview, warnings };
}
