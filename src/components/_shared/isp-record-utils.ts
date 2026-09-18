/**
 * Helpers de registro planos / TObject-like (ispgen) para componentes ISP.
 * No depende de `@ingenieria_insoft/ispgen`.
 */

/** @param v valor a evaluar. */
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
export type IspRecord = {
  getProp?: (key: string) => unknown;
  setProp?: (key: string, value: unknown) => void;
  toJSON?: (shallow?: boolean) => unknown;
  clone?: () => IspRecord;
  f?: Record<string, unknown>;
  [key: string]: unknown;
};

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

/** Fila plana para la grilla (API de `<is-ag-grid>`): datos + referencia al registro. */
export type GridRow = {
  id?: string | number;
  __record?: IspRecord;
  [key: string]: unknown;
};

/**
 * Fila plana para la grilla (API de `<is-ag-grid>`).
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
export type IspColumnDef = {
  caption?: string;
  size?: number;
  align?: 'left' | 'right' | 'center';
  visible?: boolean;
  filter?: boolean;
  type?: 'number' | 'currency' | 'date' | 'dateTime' | 'bool' | string;
  children?: Record<string, IspColumnDef>;
};

/** Columna plana que entiende la grilla del kit. */
export type FlatGridColumn = {
  field: string;
  header: string;
  width?: number;
  align: 'left' | 'right' | 'center';
  hide: boolean;
  sortable: boolean;
  filter: boolean;
  type: 'number' | 'date' | 'enum' | 'text';
};

/** Mapa anidado de columnas ISP. */
export type IspColumnsMap = Record<string, IspColumnDef>;

/**
 * Aplana `Columns` anidadas de ISP a defs de `<is-ag-grid>`.
 * @param cols Mapa anidado de columnas (puede ser null).
 * @param out Acumulador al que se empujan las columnas planas.
 */
export function flattenIspColumns(cols: IspColumnsMap | null | undefined, out: FlatGridColumn[] = []): FlatGridColumn[] {
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
export type IspController = {
  columns?: FlatGridColumn[];
  Columns?: IspColumnsMap;
  [key: string]: unknown;
};

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
