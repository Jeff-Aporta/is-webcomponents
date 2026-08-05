/**
 * Helpers de registro planos / TObject-like (ispgen) para componentes ISP.
 * No depende de `@ingenieria_insoft/ispgen`.
 */

/** @param {unknown} v */
export function isPresent(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** @param {unknown} v */
export function asStr(v) {
  if (v == null) return '';
  return String(v);
}

/**
 * @param {object|null|undefined} record
 * @param {string} key
 */
export function getProp(record, key) {
  if (!record || !key) return undefined;
  if (typeof record.getProp === 'function') return record.getProp(key);
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  if (record.f && typeof record.f === 'object' && key in record.f) return record.f[key];
  return undefined;
}

/**
 * @param {object} record
 * @param {string} key
 * @param {unknown} value
 */
export function setProp(record, key, value) {
  if (!record || !key) return record;
  if (typeof record.setProp === 'function') {
    record.setProp(key, value);
    return record;
  }
  if (record.f && typeof record.f === 'object') {
    record.f[key] = value;
    return record;
  }
  record[key] = value;
  return record;
}

/**
 * Clona un registro: `clone()` de TObject, o shallow copy / `f`.
 * @param {object|null|undefined} record
 */
export function cloneRecord(record) {
  if (!record) return {};
  if (typeof record.clone === 'function') return record.clone();
  if (record.f && typeof record.f === 'object') {
    return { f: { ...record.f } };
  }
  return { ...record };
}

/**
 * Fila plana para la grilla (API de `<is-ag-grid>`).
 * @param {object} record
 * @param {string[]} primaryKeys
 */
export function toGridRow(record, primaryKeys = []) {
  let base;
  if (typeof record?.toJSON === 'function') {
    try {
      base = record.toJSON(false) ?? record.toJSON();
    } catch {
      base = null;
    }
  }
  if (!base || typeof base !== 'object') {
    if (record?.f && typeof record.f === 'object') base = { ...record.f };
    else base = { ...record };
  }
  const pk = primaryKeys.length ? asStr(getProp(record, asStr(primaryKeys.at(-1)))) : '';
  if (pk && base.id == null) base.id = pk;
  base.__record = record;
  return base;
}

/**
 * Aplana `Columns` anidadas de ISP a defs de `<is-ag-grid>`.
 * @param {Record<string, any>|null|undefined} cols
 * @param {Array<object>} [out]
 */
export function flattenIspColumns(cols, out = []) {
  if (!cols || typeof cols !== 'object') return out;
  for (const [key, def] of Object.entries(cols)) {
    if (!def || typeof def !== 'object') continue;
    if (def.children && typeof def.children === 'object') {
      flattenIspColumns(def.children, out);
      continue;
    }
    out.push({
      field: key,
      header: def.caption ?? key,
      width: def.size || undefined,
      align: def.align || 'left',
      hide: def.visible === false,
      sortable: true,
      filter: def.filter !== false,
      type: def.type === 'number' || def.type === 'currency' ? 'number'
        : def.type === 'date' || def.type === 'dateTime' ? 'date'
          : def.type === 'bool' ? 'enum'
            : 'text',
    });
  }
  return out;
}

/**
 * @param {object|null|undefined} controller
 * @returns {Array<object>}
 */
export function columnsFromController(controller) {
  if (!controller) return [];
  if (Array.isArray(controller.columns)) return controller.columns;
  if (controller.Columns) return flattenIspColumns(controller.Columns);
  return [];
}

/** @param {string|null|undefined} s */
export function lowerCase(s) {
  if (!s) return '';
  return String(s).toLowerCase();
}
