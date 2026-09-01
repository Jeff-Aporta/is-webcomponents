/**
 * datagrid-core/server-datasource — Modelo de filas por servidor (paridad ISP).
 *
 * Reproduce el contrato que `ISP-SvelteComponents/src/lib/base/Grid.svelte` usa
 * con ag-Grid Enterprise (`IServerSideDatasource` + `rowModelType: 'serverSide'`),
 * pero sin dependencias: el TRANSPORTE se puede falsear con un fixture JSON y el
 * CONTRATO PÚBLICO (formas de request/respuesta) es idéntico al de ISP.
 *
 * Piezas:
 *   - buildJSONFiltro(params)      request de la grilla  → TFiltroLista.
 *   - convertFilterModelToSQL(...) FilterModel           → WHERE en SQL simple.
 *   - singleFilterToClause / sqlLiteral (portados 1:1 de ISP).
 *   - createServerSideDatasource({ Lista })              → IServerSideDatasource.
 *   - createFakeLista(rows, opts)  fixture en memoria    → Lista(JSONFiltro).
 *
 * Formas (espejo de `@ingenieria_insoft/ispgen`):
 *
 *   TFiltroLista = {
 *     pagina?: number,          // 1-based
 *     qregistros?: number,      // tamaño de página
 *     orden?: Record<campo, 'asc'|'desc'>,
 *     filtro?: { idnfiltro?: string, sql?: string },
 *   }
 *
 *   TListaPaginacion = {
 *     datos: any[],
 *     pagina: number,           // 1-based
 *     qregistros: number,
 *     totalregistros: number,
 *     totalpaginas: number,
 *   }
 *
 * El `rowCount` que la grilla necesita para dimensionar el scroll sale de
 * `totalregistros`, igual que en ISP.
 */

/* ── SQL helpers (portados de Grid.svelte) ──────────────────────────────── */

/**
 * Literal SQL escapado. NULL / número / booleano / string con comillas dobladas.
 * @param {unknown} v
 * @returns {string}
 */
export function sqlLiteral(v: unknown) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Traduce UN filtro de columna a una cláusula SQL.
 * Acepta tanto la forma de ag-Grid (`{ filterType, type, filter, dateFrom }`)
 * como la del motor propio (`{ type: 'text'|'number'|'date'|'set', op, value, to }`).
 * @param {string} field
 * @param {any} def
 * @returns {string}
 */
export function singleFilterToClause(field: string, def: FiltroEntrada | null | undefined) {
  if (!def) return '';
  // Normaliza la forma del motor propio a la de ag-Grid.
  const kind = def.filterType ?? def.type;
  const op = def.type && def.filterType ? def.type : (def.op ?? def.type);

  if (kind === 'text') {
    const v = def.filter ?? def.value;
    if (v == null || v === '') return '';
    switch (op) {
      case 'equals': return `${field} = ${sqlLiteral(v)}`;
      case 'contains': return `${field} LIKE ${sqlLiteral(`%${v}%`)}`;
      case 'notContains': return `${field} NOT LIKE ${sqlLiteral(`%${v}%`)}`;
      case 'startsWith': return `${field} LIKE ${sqlLiteral(`${v}%`)}`;
      case 'endsWith': return `${field} LIKE ${sqlLiteral(`%${v}`)}`;
      case 'notEqual': return `${field} <> ${sqlLiteral(v)}`;
      default: return '';
    }
  }

  if (kind === 'number') {
    const v = def.filter ?? def.value;
    if (v == null || v === '') return '';
    switch (op) {
      case 'equals': case 'eq': return `${field} = ${Number(v)}`;
      case 'notEqual': case 'neq': return `${field} <> ${Number(v)}`;
      case 'greaterThan': case 'gt': return `${field} > ${Number(v)}`;
      case 'greaterThanOrEqual': case 'gte': return `${field} >= ${Number(v)}`;
      case 'lessThan': case 'lt': return `${field} < ${Number(v)}`;
      case 'lessThanOrEqual': case 'lte': return `${field} <= ${Number(v)}`;
      case 'inRange': {
        const to = def.dateTo ?? def.to;
        if (to == null || to === '') return '';
        return `${field} BETWEEN ${Number(v)} AND ${Number(to)}`;
      }
      default: return '';
    }
  }

  if (kind === 'date' || kind === 'dateTime') {
    const v = def.dateFrom ?? def.value;
    if (!v) return '';
    switch (op) {
      case 'equals': case 'eq': return `${field} = ${sqlLiteral(v)}`;
      case 'greaterThan': case 'after': return `${field} > ${sqlLiteral(v)}`;
      case 'lessThan': case 'before': return `${field} < ${sqlLiteral(v)}`;
      case 'inRange': {
        const to = def.dateTo ?? def.to;
        if (!to) return '';
        return `${field} BETWEEN ${sqlLiteral(v)} AND ${sqlLiteral(to)}`;
      }
      default: return '';
    }
  }

  return '';
}

/**
 * FilterModel completo → WHERE SQL (cláusulas unidas por AND).
 * Ignora columnas que no estén en `colIDFields` (p. ej. columnas de grupo),
 * igual que ISP.
 * @param {Record<string, any>} filterModel
 * @param {Map<string,string>} colIDFields  colId → nombre de campo real
 * @returns {string}
 */
/* -- Contratos con ISP --------------------------------------------------- */

/** Una entrada de `filterModel`: la forma la fija ag-Grid, no el kit. */
export interface FiltroEntrada {
  filterType?: string;
  type?: string;
  values?: unknown[];
  filterModels?: (FiltroEntrada | null)[];
  [extra: string]: unknown;
}

/** Peticion que manda la grilla al pedir un bloque de filas. */
export interface PeticionLista {
  startRow?: number;
  endRow?: number;
  sortModel?: { colId?: string; sort?: string; dir?: string }[];
  filterModel?: Record<string, FiltroEntrada | null>;
}

/** `TFiltroLista` de ISP: lo que espera el endpoint al otro lado. */
export interface TFiltroLista {
  qregistros?: number;
  pagina?: number;
  orden?: Record<string, string>;
  filtro?: { idnfiltro: string; sql?: string };
}

/** Respuesta paginada de ISP. */
export interface TListaPaginacion {
  datos?: Record<string, unknown>[];
  totalregistros?: number;
  [extra: string]: unknown;
}

/** Callbacks con los que la grilla recoge el bloque pedido. */
export interface ParamsGetRows {
  request: PeticionLista;
  success(res: { rowData: Record<string, unknown>[]; rowCount: number }): void;
  fail(): void;
}

export function convertFilterModelToSQL(
  filterModel: Record<string, FiltroEntrada | null> | null | undefined,
  colIDFields: Map<string, string> | null,
): string {
  const clauses: string[] = [];
  for (const [colId, def] of Object.entries(filterModel ?? {})) {
    if (!def) continue;
    if (colIDFields && !colIDFields.has(colId)) continue;
    // `has()` ya se comprobo arriba, asi que el `get()` no puede fallar aqui.
    const field = colIDFields ? colIDFields.get(colId)! : colId;

    // multiFilter
    if (def.filterType === 'multi') {
      const sub = (def.filterModels ?? [])
        .map((sm: FiltroEntrada | null) => singleFilterToClause(field, sm))
        .filter(Boolean);
      if (sub.length) clauses.push(`(${sub.join(' AND ')})`);
      continue;
    }

    // set filter
    if (def.filterType === 'set' || def.type === 'set') {
      const values = def.values ?? [];
      if (values.length) clauses.push(`${field} IN (${values.map(sqlLiteral).join(', ')})`);
      continue;
    }

    const clause = singleFilterToClause(field, def);
    if (clause) clauses.push(clause);
  }
  return clauses.join(' AND ');
}

/**
 * Request de la grilla -> TFiltroLista, exactamente como ISP.
 *
 * ag-Grid pide el rango semiabierto `[startRow, endRow)`; de ahi se derivan
 * `qregistros` (tamano de pagina) y `pagina` (1-based).
 */
export function buildJSONFiltro(params: {
  request?: PeticionLista;
  idnfiltro?: string;
  colIDFields?: Map<string, string> | null;
}): TFiltroLista {
  const req: PeticionLista = params?.request ?? {};
  const colIDFields = params?.colIDFields ?? null;
  const JSONFiltro: TFiltroLista = {};

  // 1) Paginación
  if (typeof req.startRow === 'number' && typeof req.endRow === 'number') {
    const pageSize = Math.max(0, req.endRow - req.startRow);
    JSONFiltro.qregistros = pageSize || undefined;
    JSONFiltro.pagina = pageSize > 0 ? Math.floor(req.startRow / pageSize) + 1 : 1;
  }

  // 2) Orden
  if (Array.isArray(req.sortModel) && req.sortModel.length > 0) {
    JSONFiltro.orden = {};
    for (const s of req.sortModel) {
      const colId = s?.colId;
      const dir = s?.sort ?? s?.dir;
      if (!colId || !dir) continue;
      if (colIDFields && !colIDFields.has(colId)) continue;
      JSONFiltro.orden![colIDFields ? colIDFields.get(colId)! : colId] = dir;
    }
    if (!Object.keys(JSONFiltro.orden!).length) delete JSONFiltro.orden;
  }

  // 3) Filtros
  JSONFiltro.filtro = { idnfiltro: params?.idnfiltro ?? '' };
  const sql = convertFilterModelToSQL(req.filterModel, colIDFields);
  if (sql) JSONFiltro.filtro!.sql = sql;

  return JSONFiltro;
}

/**
 * Envuelve un `Lista(JSONFiltro): Promise<TListaPaginacion>` en el datasource
 * que consume la grilla. Espejo de `getServerSideDatasource()` de ISP: en el
 * exito reporta `{ rowData, rowCount }`, en el error llama `params.fail()`.
 */
export function createServerSideDatasource(opts: {
  Lista: (f: TFiltroLista) => Promise<TListaPaginacion>;
  /** Puede ser fijo o resolverse en cada peticion. */
  idnfiltro?: string | (() => string);
  colIDFields?: Map<string, string> | null;
  onLoad?: (lista: TListaPaginacion) => void;
}): { getRows: (params: ParamsGetRows) => Promise<void> } {
  const { Lista, colIDFields = null, onLoad } = opts ?? {};
  return {
    async getRows(params: ParamsGetRows) {
      try {
        const JSONFiltro = buildJSONFiltro({
          request: params.request,
          idnfiltro: typeof opts.idnfiltro === 'function' ? opts.idnfiltro() : (opts.idnfiltro ?? ''),
          colIDFields,
        });
        const lista = await Lista(JSONFiltro);
        onLoad?.(lista);
        params.success({
          rowData: lista?.datos ?? [],
          rowCount: lista?.totalregistros ?? (lista?.datos?.length ?? 0),
        });
      } catch {
        params.fail();
      }
    },
  };
}

/* ── Fake server (fixture en memoria) ───────────────────────────────────── */

const RE_CLAUSE = /^(\S+)\s+(NOT LIKE|LIKE|IN|BETWEEN|<>|>=|<=|=|>|<)\s+(.+)$/i;

/** Parte un WHERE en cláusulas separadas por AND respetando comillas y paréntesis. */
function splitAnd(sql: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let buf = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      // '' es un apóstrofo escapado, no un cierre.
      if (quoted && sql[i + 1] === "'") { buf += "''"; i++; continue; }
      quoted = !quoted;
      buf += ch;
      continue;
    }
    if (!quoted && ch === '(') depth++;
    if (!quoted && ch === ')') depth--;
    if (!quoted && depth === 0 && sql.slice(i, i + 5).toUpperCase() === ' AND ') {
      out.push(buf.trim());
      buf = '';
      i += 4;
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/** Convierte un literal SQL a valor JS. */
/** Un literal SQL ya interpretado. */
type Literal = string | number | null;

function parseLiteral(tok: string): Literal {
  const t = tok.trim();
  if (/^NULL$/i.test(t)) return null;
  if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}

/** LIKE de SQL → RegExp (soporta % y _). */
function likeToRegExp(pattern: Literal): RegExp {
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
}

const cmp = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Evalúa UNA cláusula generada por `singleFilterToClause` contra un registro.
 * Gramática soportada (la única que emitimos): `campo OP literal`,
 * `campo IN (l1, l2)`, `campo BETWEEN l1 AND l2`, y grupos `( … AND … )`.
 */
function evalClause(clause: string, row: Record<string, unknown> | null | undefined): boolean {
  let c = clause.trim();
  if (c.startsWith('(') && c.endsWith(')')) {
    return splitAnd(c.slice(1, -1)).every((sub) => evalClause(sub, row));
  }
  const m = RE_CLAUSE.exec(c);
  if (!m) return true; // cláusula desconocida: no filtra (igual que un backend permisivo)
  const [, field, rawOp, rest] = m;
  const op = rawOp.toUpperCase();
  const value = row?.[field];

  if (op === 'IN') {
    const inner = rest.trim().replace(/^\(/, '').replace(/\)$/, '');
    const list = splitList(inner).map(parseLiteral).map((v) => String(v));
    return list.includes(value == null ? '' : String(value));
  }
  if (op === 'BETWEEN') {
    const parts = rest.split(/\s+AND\s+/i);
    if (parts.length < 2) return true;
    return cmp(value, parseLiteral(parts[0])) >= 0 && cmp(value, parseLiteral(parts[1])) <= 0;
  }
  if (op === 'LIKE') return likeToRegExp(parseLiteral(rest)).test(value == null ? '' : String(value));
  if (op === 'NOT LIKE') return !likeToRegExp(parseLiteral(rest)).test(value == null ? '' : String(value));

  const lit = parseLiteral(rest);
  const d = cmp(value, lit);
  if (op === '=') return String(value ?? '') === String(lit ?? '');
  if (op === '<>') return String(value ?? '') !== String(lit ?? '');
  if (op === '>') return d > 0;
  if (op === '>=') return d >= 0;
  if (op === '<') return d < 0;
  if (op === '<=') return d <= 0;
  return true;
}

/** Parte `a, b, 'c, d'` respetando comillas. */
function splitList(s: string): string[] {
  const out: string[] = [];
  let buf = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'") {
      if (quoted && s[i + 1] === "'") { buf += "''"; i++; continue; }
      quoted = !quoted;
      buf += ch;
      continue;
    }
    if (ch === ',' && !quoted) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map((x: string) => x.trim()).filter(Boolean);
}

/**
 * Servidor falso en memoria: implementa `Lista(JSONFiltro)` sobre un array.
 * Aplica, en el mismo orden que un backend real, el WHERE de `filtro.sql`, la
 * búsqueda libre de `filtro.idnfiltro`, el `orden` y la paginación.
 *
 * Es lo que permite que la demo funcione OFFLINE sin cambiar el contrato.
 *
 * @param {any[]} rows
 * @param {{latency?: number, searchFields?: string[]}} [opts]
 * @returns {(JSONFiltro:any)=>Promise<any>} Lista
 */
export function createFakeLista(
  rows: Record<string, unknown>[],
  opts: {
    /** Retardo simulado, en milisegundos. */
    latency?: number;
    /** Campos sobre los que busca `idnfiltro`; por defecto, todos. */
    searchFields?: string[];
  } = {},
): (JSONFiltro?: TFiltroLista) => Promise<TListaPaginacion> {
  const latency = opts.latency ?? 0;
  const all = Array.isArray(rows) ? rows : [];

  return function Lista(JSONFiltro: TFiltroLista = {}) {
    const qregistros = Math.max(1, Number(JSONFiltro.qregistros) || 100);
    const pagina = Math.max(1, Number(JSONFiltro.pagina) || 1);
    // Sin `filtro` la peticion no trae ni SQL ni busqueda libre; el objeto
    // vacio tiene que conservar la forma o se pierden ambos campos.
    const filtro: NonNullable<TFiltroLista['filtro']> = JSONFiltro.filtro ?? { idnfiltro: '' };

    let datos = all;

    // WHERE (SQL generado por convertFilterModelToSQL)
    if (filtro.sql) {
      const clauses = splitAnd(filtro.sql);
      datos = datos.filter((row) => clauses.every((c) => evalClause(c, row)));
    }

    // Búsqueda libre (idnfiltro) — equivalente al quick filter de ISP.
    const q = String(filtro.idnfiltro ?? '').trim().toLowerCase();
    if (q) {
      const fields = opts.searchFields;
      datos = datos.filter((row) => {
        const keys = fields ?? Object.keys(row ?? {});
        return keys.some((k) => String(row?.[k] ?? '').toLowerCase().includes(q));
      });
    }

    // ORDER BY
    const orden = JSONFiltro.orden;
    if (orden && Object.keys(orden).length) {
      const entries = Object.entries(orden);
      datos = datos.slice().sort((a, b) => {
        for (const [field, dir] of entries) {
          const d = cmp(a?.[field], b?.[field]);
          if (d !== 0) return dir === 'desc' ? -d : d;
        }
        return 0;
      });
    }

    const totalregistros = datos.length;
    const totalpaginas = Math.max(1, Math.ceil(totalregistros / qregistros));
    const start = (pagina - 1) * qregistros;

    const lista = {
      datos: datos.slice(start, start + qregistros),
      pagina,
      qregistros,
      totalregistros,
      totalpaginas,
    };
    return latency > 0
      ? new Promise((resolve) => setTimeout(() => resolve(lista), latency))
      : Promise.resolve(lista);
  };
}

/**
 * Carga un fixture JSON por fetch y devuelve un `Lista` falso sobre él.
 * @param {string} url
 * @param {{latency?: number, searchFields?: string[]}} [opts]
 * @returns {Promise<(JSONFiltro:any)=>Promise<any>>}
 */
export async function createFakeListaFromUrl(url: string, opts = {}) {
  const res = await fetch(url);
  const json = await res.json();
  const rows = Array.isArray(json) ? json : (json?.datos ?? []);
  return createFakeLista(rows, opts);
}
