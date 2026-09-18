/**
 * Controladores ISP desde JSON — remake compacto de TControllerCatalogoGen /
 * TCapacitacionBaseClient (ispgen) para `<is-catalogo-gen>` y `<is-btn-ref>`.
 *
 * Catálogo (acciones CRUD + verificar/duplicar/recodificar/consolidar):
 *
 *   createCatalogController({
 *     entrie: 'Curso',
 *     primaryKeys: ['icurso'],
 *     columns: [{ field: 'icurso', header: 'Código' }, { field: 'ncurso', header: 'Nombre' }],
 *     mock: [{ icurso: 'C1', ncurso: 'Intro' }],
 *     // actions: true | ['crear','modificar',…]  (default true)
 *     // server + endpoints → HTTP real (opcional)
 *   })
 *
 * BtnRef (solo listado + selección; sin acciones de toolbar):
 *
 *   createBtnRefController({
 *     entrie: 'Aplicación',
 *     primaryKeys: ['app'],
 *     ColumnsBtnRef: ['app'],
 *     columns: [{ field: 'app', header: 'Aplicación' }],
 *     mock: [{ app: 'ContaPyme' }],
 *     multiSelect: false,
 *   })
 */

/* ─────────────────────────── Tipos del contrato ───────────────────────── */

/** Forma mínima de un registro: objeto plano indexado por nombre de campo. */
export type IspRecord = Record<string, unknown>;

/** Nombre de una acción CRUD reconocida por el controller. */
export type IspActionKey =
  | 'crear'
  | 'modificar'
  | 'visualizar'
  | 'verificar'
  | 'duplicar'
  | 'recodificar'
  | 'eliminar'
  | 'consolidar';

/** Definición de columna aplanada (campo + header). */
export interface IspColumnDef {
  field: string;
  header?: string;
}

/** Configuración de una conexión HTTP al backend. */
export interface IspServerConfig {
  /** `true` para usar `local` en lugar de `remote`. */
  useLocal?: boolean;
  /** Conexión local (mock-friendly). */
  local?: IspConnection | null;
  /** Conexión remota. */
  remote?: IspConnection | null;
}

/** Parámetros HTTP de un endpoint. */
export interface IspConnection {
  host: string;
  port?: number | null;
  /** `false` para forzar `http://`; por defecto `https`. */
  https?: boolean;
  /** Prefijo de contexto REST (p. ej. `/conta`). */
  restcontext?: string;
}

/** Endpoints REST configurables por acción. */
export interface IspEndpoints {
  /** Recurso singular — usado para derivar `recursos` y `crud` por defecto. */
  recurso?: string;
  /** Recurso plural — usado para `listado` por defecto. */
  recursos?: string;
  /** Base CRUD (POST/PUT/DELETE). */
  crud?: string;
  /** Endpoint de listado (GET). */
  listado?: string;
  verificar?: string;
  duplicar?: string;
  recodificar?: string;
  consolidar?: string;
}

/** Token resuelto o función que lo devuelve perezosamente. */
export type IspToken = string | (() => string | null | undefined) | null | undefined;

/** Forma del argumento de `Lista`. */
export interface IspListaArgs {
  pagina?: number;
  qregistros?: number;
  filtro?: { sql?: string };
}

/** Forma del resultado de `Lista` (mock o HTTP). */
export interface IspListaResult {
  datos: IspRecord[];
  qregistros?: number;
  totalregistros?: number;
  pagina?: number;
  totalpaginas?: number;
}

/** Configuración del controller — entrada de las factorías. */
export interface IspControllerConfig {
  /** `'catalog'` (default) o `'btnref'`. */
  kind?: 'catalog' | 'btnref';
  /** Etiqueta visible de la entidad. */
  entrie?: string;
  /** Clave primaria — única o compuesta. */
  primaryKeys?: string[];
  /** Columnas planas (alternativa a `Columns`). */
  columns?: IspColumnDef[];
  /** Columnas mostradas en BtnRef (default: primaryKeys). */
  ColumnsBtnRef?: string[];
  /** Selección múltiple. */
  multiSelect?: boolean;
  /** Etiqueta legible de la PK (para prompts). */
  labelPk?: string;
  /** Tamaño máximo de la PK. */
  sizePk?: number;
  /** Constructor de un objeto nuevo. */
  klass?: new () => IspRecord;
  /** Acciones habilitadas. */
  actions?: boolean | IspActionKey[];
  /** Datos iniciales (mock mode). */
  mock?: IspRecord[];
  /** Conexión HTTP. */
  server?: IspServerConfig;
  /** Endpoints REST. */
  endpoints?: IspEndpoints;
  /** Recurso singular (atajo). */
  recurso?: string;
  /** Bearer token o función que lo devuelve. */
  token?: IspToken;
}

/** Definición del controller devuelto por `createIspController`. */
export interface IspController {
  entrie: string;
  primaryKeys: string[];
  columns: IspColumnDef[];
  Columns: Record<string, string>;
  ColumnsBtnRef: string[];
  multiSelect: boolean;
  labelPk?: string;
  sizePk?: number;
  klass: new () => IspRecord;
  CtxBtnRef?: IspController | null;
  Lista: (args?: IspListaArgs) => Promise<IspListaResult>;
  actCrear?: (record: IspRecord) => Promise<IspRecord>;
  actModificar?: (record: IspRecord) => Promise<IspRecord>;
  actVisualizar?: (record: IspRecord) => Promise<IspRecord>;
  actVerificar?: (record: IspRecord) => Promise<{ mensajes: Array<{ itdmensaje: unknown; mensaje: string }> }>;
  actEliminar?: (record: IspRecord) => Promise<IspRecord>;
  actDuplicar?: (src: IspRecord, work: IspRecord) => Promise<true>;
  actRecodificar?: (src: IspRecord, work: IspRecord) => Promise<true>;
  actConsolidar?: (src: IspRecord, work: IspRecord) => Promise<true>;
  /** Acceso al store mock — sólo tests / demos. */
  readonly _store: IspRecord[];
}

/** Forma del JSON que devuelve el backend ISP. */
interface IspHttpEnvelope {
  encabezado?: { resultado?: boolean; mensaje?: string };
  respuesta?: {
    datos?: IspRecord[];
    pagina?: number;
    qregistros?: number;
    totalpaginas?: number;
    totalregistros?: number;
    verificacion?: { mensajes: Array<{ itdmensaje: unknown; mensaje: string }> };
  };
  /** Algunos endpoints exponen `datos` en la raíz sin `respuesta`. */
  datos?: IspRecord[];
}

/** Forma del controller antes de añadir los `actXxx` y `_store` finales. */
type MutableIspController = {
  -readonly [K in keyof IspController]: IspController[K];
};

/* ───────────────────────────── helpers puros ──────────────────────────── */

/** Pluralización ES mínima (curso→cursos, z→ces). */
export function pluralizeEs(s: string): string {
  if (!s) return s;
  const last = s.slice(-1).toLowerCase();
  return last === 'z'
    ? `${s.slice(0, -1)}ces`
    : 'aeiouáéíóú'.includes(last)
      ? `${s}s`
      : `${s}es`;
}

const ALL_ACTIONS: readonly IspActionKey[] = [
  'crear', 'modificar', 'visualizar', 'verificar',
  'duplicar', 'recodificar', 'eliminar', 'consolidar',
];

const ACT_MAP: Record<IspActionKey, string> = {
  crear: 'actCrear',
  modificar: 'actModificar',
  visualizar: 'actVisualizar',
  verificar: 'actVerificar',
  duplicar: 'actDuplicar',
  recodificar: 'actRecodificar',
  eliminar: 'actEliminar',
  consolidar: 'actConsolidar',
};

function resolveActions(
  actions: IspControllerConfig['actions'],
  kind: 'catalog' | 'btnref',
): IspActionKey[] {
  if (kind === 'btnref' || actions === false) return [];
  if (actions == null || actions === true) return [...ALL_ACTIONS];
  if (Array.isArray(actions)) {
    const out: IspActionKey[] = [];
    for (const a of actions) {
      const lower = String(a).toLowerCase() as IspActionKey;
      if (ACT_MAP[lower]) out.push(lower);
    }
    return out;
  }
  return [...ALL_ACTIONS];
}

function pkKey(rec: IspRecord | null | undefined, primaryKeys: string[]): string {
  return primaryKeys.map((k) => String(rec?.[k] ?? '')).join('\0');
}

function matchSqlFilter(
  datos: IspRecord[],
  sql: string | undefined,
  primaryKeys: string[],
): IspRecord[] {
  const q = String(sql || '').trim();
  if (!q) return datos;
  // Patrones simples: campo='valor' (BtnRef typing)
  const m = q.match(/([a-zA-Z_][\w]*)\s*=\s*'([^']*)'/);
  if (m) {
    const field = m[1]!;
    const val = m[2]!;
    return datos.filter((r) => String(r?.[field] ?? '') === val);
  }
  const lower = q.toLowerCase();
  return datos.filter(
    (r) =>
      primaryKeys.some((k) => String(r?.[k] ?? '').toLowerCase().includes(lower)) ||
      Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(lower)),
  );
}

function connectionOf(server: IspServerConfig | undefined): IspConnection | null {
  if (!server) return null;
  if (server.useLocal && server.local) return server.local;
  return server.remote || server.local || null;
}

function buildEndpoints(cfg: IspControllerConfig): Required<Pick<IspEndpoints, 'crud' | 'listado' | 'verificar' | 'duplicar' | 'recodificar' | 'consolidar'>> {
  const ep = cfg.endpoints || {};
  const recurso = ep.recurso || cfg.recurso || '';
  const recursos = ep.recursos || (recurso ? pluralizeEs(recurso) : '');
  const base = ep.crud || (recurso ? `/api/${recurso}` : '/api');
  const listado = ep.listado || (recursos ? `/api/${recursos}` : `${base}`);
  return {
    crud: base,
    listado,
    verificar: ep.verificar || `${base}/verificar`,
    duplicar: ep.duplicar || `${base}/duplicar`,
    recodificar: ep.recodificar || `${base}/recodificar`,
    consolidar: ep.consolidar || `${base}/consolidar`,
  };
}

function authHeader(token: IspToken): Record<string, string> {
  const t = typeof token === 'function' ? token() : token;
  if (!t) return {};
  const v = String(t);
  return { Authorization: v.startsWith('Bearer ') || v.startsWith('Basic ') ? v : `Bearer ${v}` };
}

async function httpJson(
  conn: IspConnection | null,
  method: string,
  path: string,
  body: unknown,
  token: IspToken,
): Promise<IspHttpEnvelope> {
  if (!conn) throw new Error('Sin conexión de servidor en el controller');
  const proto = conn.https === false ? 'http' : 'https';
  const port = conn.port != null ? `:${conn.port}` : '';
  const ctx = conn.restcontext || '';
  const url = `${proto}://${conn.host}${port}${ctx}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: IspHttpEnvelope = {};
  try { json = text ? (JSON.parse(text) as IspHttpEnvelope) : {}; } catch { json = {}; }
  if (!res.ok || json?.encabezado?.resultado === false) {
    throw new Error(json?.encabezado?.mensaje || `HTTP ${res.status}`);
  }
  return json;
}

/* ──────────────────────────────── factoría ────────────────────────────── */

/**
 * Crea un controller compatible con `<is-catalogo-gen>` y `<is-btn-ref>`.
 * @param config Configuración declarativa (mock o HTTP).
 * @returns Controller listo para asignar a `is-catalogo-gen.controller` o `is-btn-ref.controller`.
 */
export function createIspController(config: IspControllerConfig = {}): IspController {
  const kind: 'catalog' | 'btnref' = config.kind === 'btnref' ? 'btnref' : 'catalog';
  const primaryKeys = [...(config.primaryKeys || ['id'])];
  const columns = config.columns || [];
  const actions = resolveActions(config.actions, kind);
  const endpoints = buildEndpoints(config);
  const conn = connectionOf(config.server);
  const useMock = Array.isArray(config.mock) || !conn;

  let store: IspRecord[] = (config.mock || []).map((r) => ({ ...r }));

  // Klass por defecto: devuelve un objeto con las PKs vacías.
  class EmptyRecord {
    [key: string]: unknown;
    constructor() {
      for (const k of primaryKeys) this[k] = '';
    }
  }

  // Construimos el ctrl como un objeto mutable para poder añadir `actXxx` y
  // `_store` (definido por propiedad) tras crearlo.
  const ctrl = {
    entrie: config.entrie || 'Registro',
    primaryKeys,
    columns,
    Columns: Object.fromEntries(columns.map((c) => [c.field, c.header || c.field])),
    ColumnsBtnRef: config.ColumnsBtnRef || primaryKeys,
    multiSelect: !!config.multiSelect,
    labelPk: config.labelPk,
    sizePk: config.sizePk,
    klass: (typeof config.klass === 'function' ? config.klass : EmptyRecord) as new () => IspRecord,

    async Lista({ filtro }: IspListaArgs = {}) {
      if (useMock) {
        const datos = matchSqlFilter(store, filtro?.sql, primaryKeys);
        return {
          datos: datos.map((r) => ({ ...r })),
          qregistros: datos.length,
          totalregistros: datos.length,
        };
      }
      const json = await httpJson(conn, 'GET', endpoints.listado, null, config.token);
      const datos = json?.respuesta?.datos || json?.datos || [];
      return {
        datos,
        pagina: json?.respuesta?.pagina,
        qregistros: json?.respuesta?.qregistros,
        totalpaginas: json?.respuesta?.totalpaginas,
        totalregistros: json?.respuesta?.totalregistros,
      };
    },
  } as MutableIspController;

  if (actions.includes('crear')) {
    ctrl.actCrear = async (o: IspRecord) => {
      if (useMock) {
        store = [...store, { ...o }];
        return o;
      }
      const json = await httpJson(conn, 'POST', endpoints.crud, o, config.token);
      return { ...o, ...(json?.respuesta?.datos || {}) };
    };
  }
  if (actions.includes('modificar')) {
    ctrl.actModificar = async (o: IspRecord) => {
      if (useMock) {
        const key = pkKey(o, primaryKeys);
        store = store.map((r) => (pkKey(r, primaryKeys) === key ? { ...o } : r));
        return o;
      }
      const path = `${endpoints.crud}/${primaryKeys.map((k) => encodeURIComponent(String(o[k]))).join('/')}`;
      const json = await httpJson(conn, 'PUT', path, o, config.token);
      return { ...o, ...(json?.respuesta?.datos || {}) };
    };
  }
  if (actions.includes('visualizar')) {
    ctrl.actVisualizar = async (o: IspRecord) => o;
  }
  if (actions.includes('verificar')) {
    ctrl.actVerificar = async (o: IspRecord) => {
      if (useMock) {
        return { mensajes: [{ itdmensaje: 'info', mensaje: `${ctrl.entrie} OK` }] };
      }
      const path = `${endpoints.verificar}/${primaryKeys.map((k) => encodeURIComponent(String(o[k]))).join('/')}`;
      const json = await httpJson(conn, 'GET', path, null, config.token);
      return json?.respuesta?.verificacion || { mensajes: [] };
    };
  }
  if (actions.includes('eliminar')) {
    ctrl.actEliminar = async (o: IspRecord) => {
      if (useMock) {
        const key = pkKey(o, primaryKeys);
        store = store.filter((r) => pkKey(r, primaryKeys) !== key);
        return o;
      }
      const path = `${endpoints.crud}/${primaryKeys.map((k) => encodeURIComponent(String(o[k]))).join('/')}`;
      await httpJson(conn, 'DELETE', path, null, config.token);
      return o;
    };
  }
  if (actions.includes('duplicar')) {
    ctrl.actDuplicar = async (src: IspRecord, work: IspRecord) => {
      if (useMock) {
        store = [...store, { ...work }];
        return true;
      }
      const path = `${endpoints.duplicar}/${primaryKeys.map((k) => encodeURIComponent(String(src[k]))).join('/')}`;
      await httpJson(conn, 'POST', path, work, config.token);
      return true;
    };
  }
  if (actions.includes('recodificar')) {
    ctrl.actRecodificar = async (src: IspRecord, work: IspRecord) => {
      if (useMock) {
        const key = pkKey(src, primaryKeys);
        store = store.map((r) => (pkKey(r, primaryKeys) === key ? { ...work } : r));
        return true;
      }
      const path = `${endpoints.recodificar}/${primaryKeys.map((k) => encodeURIComponent(String(src[k]))).join('/')}`;
      await httpJson(conn, 'PUT', path, work, config.token);
      return true;
    };
  }
  if (actions.includes('consolidar')) {
    ctrl.actConsolidar = async (src: IspRecord, work: IspRecord) => {
      if (useMock) {
        const from = pkKey(src, primaryKeys);
        const to = pkKey(work, primaryKeys);
        store = store.filter((r) => pkKey(r, primaryKeys) !== from);
        if (!store.some((r) => pkKey(r, primaryKeys) === to)) store = [...store, { ...work }];
        return true;
      }
      const path = `${endpoints.consolidar}/${primaryKeys.map((k) => encodeURIComponent(String(src[k]))).join('/')}`;
      await httpJson(conn, 'PUT', path, work, config.token);
      return true;
    };
  }

  /** Acceso al store mock (demos / tests). */
  Object.defineProperty(ctrl, '_store', {
    get(this: MutableIspController) { return store; },
    set(this: MutableIspController, v: IspRecord[]) { store = Array.isArray(v) ? v.map((r) => ({ ...r })) : []; },
  });

  return ctrl;
}

/** Catálogo CRUD: acciones por defecto = todas. */
export function createCatalogController(config: IspControllerConfig = {}): IspController {
  return createIspController({
    ...config,
    kind: 'catalog',
    actions: config.actions ?? true,
  });
}

/** BtnRef: sin acciones de toolbar; solo Lista + columnas de etiqueta. */
export function createBtnRefController(config: IspControllerConfig = {}): IspController {
  return createIspController({
    ...config,
    kind: 'btnref',
    actions: false,
    ColumnsBtnRef: config.ColumnsBtnRef || config.primaryKeys,
  });
}

/** CDN / demos: disponible en `window` al importar este módulo. */
if (typeof window !== 'undefined') {
  Object.assign(window, {
    createIspController,
    createCatalogController,
    createBtnRefController,
    pluralizeEs,
  });
}