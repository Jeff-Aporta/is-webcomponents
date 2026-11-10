// @contexto INDICE.md · src/components/isp/README.md
/**
 * Helpers de registro planos / TObject-like (ispgen) para componentes ISP.
 * No depende de `@iswc/ispgen`.
 */

/** @param v valor a evaluar. */
import type { IspRecord, GridRow, FlatGridColumn, IspColumnsMap, IspController } from '@jeff-aporta/iswc-base/components/isp/schemas/isp-utils.schemas.js';

export function isPresent(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** @param v valor a convertir a string. */
export function asStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

/** Forma flexible de un registro ISP: plano o con `getProp`/`setProp`/`.f`. */

/**
 * @param record Registro ISP (puede ser null).
 * @param key Clave a leer.
 */
export function getProp(record: IspRecord | null | undefined, key: string): unknown {
  if (!record || !key) return undefined;
  if (typeof record.getProp === 'function') return record.getProp(key);
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  if (record.f && typeof record.f === 'object' && key in record.f) return record.f[key];
  return undefined;
}

/**
 * @param record Registro ISP.
 * @param key Clave a escribir.
 * @param value Valor a guardar.
 */
export function setProp<T extends IspRecord>(record: T, key: string, value: unknown): T {
  if (!record || !key) return record;
  if (typeof record.setProp === 'function') {
    record.setProp(key, value);
    return record;
  }
  if (record.f && typeof record.f === 'object') {
    record.f[key] = value;
    return record;
  }
  (record as unknown as Record<string, unknown>)[key] = value;
  return record;
}

/**
 * Clona un registro: `clone()` de TObject, o shallow copy / `f`.
 * @param record Registro a clonar.
 */
export function cloneRecord(record: IspRecord | null | undefined): IspRecord {
  if (!record) return {};
  if (typeof record.clone === 'function') return record.clone();
  if (record.f && typeof record.f === 'object') {
    return { f: { ...record.f } };
  }
  return { ...record };
}

/** Fila plana para la grilla (API de `<iswc-ag-grid>`): datos + referencia al registro. */

/**
 * Fila plana para la grilla (API de `<iswc-ag-grid>`).
 * @param record Registro de origen.
 * @param primaryKeys Claves primarias (la última se usa como `id`).
 */
export function toGridRow(record: IspRecord, primaryKeys: readonly string[] = []): GridRow {
  let base: Record<string, unknown> | undefined;
  if (typeof record?.toJSON === 'function') {
    try {
      const v = record.toJSON(false) ?? record.toJSON();
      if (v && typeof v === 'object') base = { ...(v as Record<string, unknown>) };
    } catch {
      base = undefined;
    }
  }
  if (!base) {
    if (record?.f && typeof record.f === 'object') base = { ...record.f };
    else base = { ...record };
  }
  const lastKey = primaryKeys.length ? asStr(primaryKeys[primaryKeys.length - 1]) : '';
  const pk = lastKey ? asStr(getProp(record, lastKey)) : '';
  if (pk && base['id'] == null) base['id'] = pk;
  base['__record'] = record;
  return base;
}

/** Definición cruda de una columna ISP. */

/** Columna plana que entiende la grilla del kit. */

/** Mapa anidado de columnas ISP. */

/**
 * Aplana `Columns` anidadas de ISP a defs de `<iswc-ag-grid>`.
 * @param cols Mapa anidado de columnas (puede ser null).
 * @param out Acumulador al que se empujan las columnas planas.
 */
function flattenIspColumns(cols: IspColumnsMap | null | undefined, out: FlatGridColumn[] = []): FlatGridColumn[] {
  if (!cols || typeof cols !== 'object') return out;
  for (const [key, def] of Object.entries(cols)) {
    if (!def || typeof def !== 'object') continue;
    if (def.children && typeof def.children === 'object') {
      flattenIspColumns(def.children, out);
      continue;
    }
    const type: FlatGridColumn['type'] =
      def.type === 'number' || def.type === 'currency' ? 'number'
        : def.type === 'date' || def.type === 'dateTime' ? 'date'
          : def.type === 'bool' ? 'enum'
            : 'text';
    out.push({
      field: key,
      header: def.caption ?? key,
      width: def.size || undefined,
      align: def.align || 'left',
      hide: def.visible === false,
      sortable: true,
      filter: def.filter !== false,
      type,
    });
  }
  return out;
}

/** Controlador ISP: tiene `columns` array o `Columns` mapa. */

/**
 * @param controller Controlador ISP del que extraer columnas.
 * @returns Array de columnas planas (vacío si no hay ninguna).
 */
export function columnsFromController(controller: IspController | null | undefined): FlatGridColumn[] {
  if (!controller) return [];
  if (Array.isArray(controller.columns)) return controller.columns as FlatGridColumn[];
  if (controller.Columns) return flattenIspColumns(controller.Columns);
  return [];
}

/** @param s Cadena a normalizar a minúsculas. */
export function lowerCase(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).toLowerCase();
}

// ── isp-color ──
/**
 * isp-color.js — resolución de `color` / `mix` para tipografía ISP.
 *
 * Orden de resolución del atributo `color`:
 *   1. Semántico: brand | neutral | info | success | warning | danger
 *      → lo resuelve el CSS `:host([color=…])` a tokens `--iswc-*`.
 *   2. `current` → `currentColor` (hereda el color tipográfico del contexto,
 *      análogo a los tamaños en `em`).
 *   3. Cualquier otro string → color CSS/HTML tal cual (`#hex`, `rgb()`,
 *      `oklch()`, nombres CSS, `var(--…)`, etc.).
 *
 * `mix` (%): `color-mix` del color base hacia `mix-with` (default: texto del
 * tema). Sirve para atenuar, acercar al texto, o —con `mix-with`— hacia
 * transparent / white / black / otro color.
 */
export const SEMANTIC_COLORS = Object.freeze([
  'brand',
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
]);

const SEMANTIC_SET = new Set(SEMANTIC_COLORS);

/** @param {unknown} raw */
export function normalizeMix(raw: unknown) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/%$/.test(s)) return s;
  const n = Number(s);
  return Number.isFinite(n) ? `${n}%` : s;
}

/**
 * Interpreta el valor de `mix-with`.
 * Atajos: text | transparent | white | black | current
 * Cualquier otra cosa se usa como color CSS.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function resolveMixWith(raw: unknown) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'text') return 'var(--iswc-text, currentColor)';
  if (lower === 'transparent') return 'transparent';
  if (lower === 'white') return '#fff';
  if (lower === 'black') return '#000';
  if (lower === 'current') return 'currentColor';
  return s;
}

/**
 * @typedef {'none' | 'semantic' | 'current' | 'css'} ColorKind
 * @typedef {{ kind: ColorKind, value?: string }} ClassifiedColor
 */

/**
 * @param {unknown} raw
 * @returns {ClassifiedColor}
 */
export function classifyColor(raw: unknown) {
  if (raw == null) return { kind: 'none' };
  const s = String(raw).trim();
  if (!s) return { kind: 'none' };
  const lower = s.toLowerCase();
  if (lower === 'current') return { kind: 'current', value: 'current' };
  if (SEMANTIC_SET.has(lower)) return { kind: 'semantic', value: lower };
  return { kind: 'css', value: s };
}

/**
 * Sincroniza vars CSS en el host a partir de atributos `color` / `mix` / `mix-with`.
 *
 * @param {HTMLElement} el
 * @param {{
 *   colorVar: string,
 *   mixVar?: string,
 *   mixWithVar?: string,
 * }} opts
 */
export function syncIspColor(el: HTMLElement, opts: { colorVar: string; mixVar?: string; mixWithVar?: string }): void {
  const { colorVar, mixVar, mixWithVar } = opts;

  const classified = classifyColor(el.getAttribute('color'));

  // Canonicaliza semánticos / current a minúsculas en el atributo.
  if (
    (classified.kind === 'semantic' || classified.kind === 'current')
    && el.getAttribute('color') !== classified.value
  ) {
    el.setAttribute('color', String(classified.value));
  }

  if (classified.kind === 'none') {
    el.style.removeProperty(colorVar);
    el.removeAttribute('data-color-kind');
  } else if (classified.kind === 'semantic') {
    // El CSS `:host([color=brand])` define la var; no pisar con inline.
    el.style.removeProperty(colorVar);
    el.setAttribute('data-color-kind', 'semantic');
  } else if (classified.kind === 'current') {
    el.style.setProperty(colorVar, 'currentColor');
    el.setAttribute('data-color-kind', 'current');
  } else {
    el.style.setProperty(colorVar, String(classified.value));
    el.setAttribute('data-color-kind', 'css');
  }

  if (mixVar) {
    const mix = normalizeMix(el.getAttribute('mix'));
    if (mix) el.style.setProperty(mixVar, mix);
    else el.style.removeProperty(mixVar);
  }

  if (mixWithVar) {
    const resolved = resolveMixWith(el.getAttribute('mix-with'));
    if (resolved) el.style.setProperty(mixWithVar, resolved);
    else el.style.removeProperty(mixWithVar);
  }
}
