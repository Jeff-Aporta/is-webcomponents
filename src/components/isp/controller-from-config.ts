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

/** Pluralización ES mínima (curso→cursos, z→ces). */
export function pluralizeEs(s) {
  if (!s) return s;
  const last = s.slice(-1).toLowerCase();
  return last === 'z'
    ? `${s.slice(0, -1)}ces`
    : 'aeiouáéíóú'.includes(last)
      ? `${s}s`
      : `${s}es`;
}

const ALL_ACTIONS = [
  'crear', 'modificar', 'visualizar', 'verificar',
  'duplicar', 'recodificar', 'eliminar', 'consolidar',
];

const ACT_MAP = {
  crear: 'actCrear',
  modificar: 'actModificar',
  visualizar: 'actVisualizar',
  verificar: 'actVerificar',
  duplicar: 'actDuplicar',
  recodificar: 'actRecodificar',
  eliminar: 'actEliminar',
  consolidar: 'actConsolidar',
};

function resolveActions(actions, kind) {
  if (kind === 'btnref' || actions === false) return [];
  if (actions == null || actions === true) return [...ALL_ACTIONS];
  if (Array.isArray(actions)) {
    return actions.map((a: string) => String(a).toLowerCase()).filter((a) => ACT_MAP[a]);
  }
  return [...ALL_ACTIONS];
}

function pkKey(rec, primaryKeys) {
  return primaryKeys.map((k) => String(rec?.[k] ?? '')).join('\0');
}

function matchSqlFilter(datos, sql, primaryKeys) {
  const q = String(sql || '').trim();
  if (!q) return datos;
  // Patrones simples: campo='valor' (BtnRef typing)
  const m = q.match(/([a-zA-Z_][\w]*)\s*=\s*'([^']*)'/);
  if (m) {
    const [, field, val] = m;
    return datos.filter((r) => String(r?.[field] ?? '') === val);
  }
  const lower = q.toLowerCase();
  return datos.filter((r) => primaryKeys.some((k) => String(r?.[k] ?? '').toLowerCase().includes(lower))
    || Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(lower)));
}

function connectionOf(server) {
  if (!server) return null;
  if (server.useLocal && server.local) return server.local;
  return server.remote || server.local || null;
}

function buildEndpoints(cfg) {
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

function authHeader(token) {
  const t = typeof token === 'function' ? token() : token;
  if (!t) return {};
  const v = String(t);
  return { Authorization: v.startsWith('Bearer ') || v.startsWith('Basic ') ? v : `Bearer ${v}` };
}

async function httpJson(conn, method, path, body, token) {
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
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
  if (!res.ok || json?.encabezado?.resultado === false) {
    throw new Error(json?.encabezado?.mensaje || `HTTP ${res.status}`);
  }
  return json;
}

/**
 * @param {object} config
 * @returns {object} controller compatible con is-catalogo-gen / is-btn-ref
 */
export function createIspController(config: object = {}) {
  const kind = config.kind === 'btnref' ? 'btnref' : 'catalog';
  const primaryKeys = [...(config.primaryKeys || ['id'])];
  const columns = config.columns || [];
  const actions = resolveActions(config.actions, kind);
  const endpoints = buildEndpoints(config);
  const conn = connectionOf(config.server);
  const useMock = Array.isArray(config.mock) || !conn;

  /** @type {object[]} */
  let store = (config.mock || []).map((r) => ({ ...r }));

  const ctrl = {
    entrie: config.entrie || 'Registro',
    primaryKeys,
    columns,
    Columns: Object.fromEntries(columns.map((c) => [c.field, c.header || c.field])),
    ColumnsBtnRef: config.ColumnsBtnRef || primaryKeys,
    multiSelect: !!config.multiSelect,
    labelPk: config.labelPk,
    sizePk: config.sizePk,
    klass: typeof config.klass === 'function'
      ? config.klass
      : () => {
        const o = {};
        for (const k of primaryKeys) o[k] = '';
        return o;
      },

    async Lista({ filtro } = {}) {
      if (useMock) {
        const datos = matchSqlFilter(store, filtro?.sql, primaryKeys);
        return { datos: datos.map((r) => ({ ...r })), qregistros: datos.length, totalregistros: datos.length };
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
  };

  if (actions.includes('crear')) {
    ctrl.actCrear = async (o) => {
      if (useMock) {
        store = [...store, { ...o }];
        return o;
      }
      const json = await httpJson(conn, 'POST', endpoints.crud, o, config.token);
      return { ...o, ...(json?.respuesta?.datos || {}) };
    };
  }
  if (actions.includes('modificar')) {
    ctrl.actModificar = async (o) => {
      if (useMock) {
        const key = pkKey(o, primaryKeys);
        store = store.map((r) => (pkKey(r, primaryKeys) === key ? { ...o } : r));
        return o;
      }
      const path = `${endpoints.crud}/${primaryKeys.map((k) => encodeURIComponent(o[k])).join('/')}`;
      const json = await httpJson(conn, 'PUT', path, o, config.token);
      return { ...o, ...(json?.respuesta?.datos || {}) };
    };
  }
  if (actions.includes('visualizar')) {
    ctrl.actVisualizar = async (o) => o;
  }
  if (actions.includes('verificar')) {
    ctrl.actVerificar = async (o) => {
      if (useMock) {
        return { mensajes: [{ itdmensaje: 'info', mensaje: `${ctrl.entrie} OK` }] };
      }
      const path = `${endpoints.verificar}/${primaryKeys.map((k) => encodeURIComponent(o[k])).join('/')}`;
      const json = await httpJson(conn, 'GET', path, null, config.token);
      return json?.respuesta?.verificacion || { mensajes: [] };
    };
  }
  if (actions.includes('eliminar')) {
    ctrl.actEliminar = async (o) => {
      if (useMock) {
        const key = pkKey(o, primaryKeys);
        store = store.filter((r) => pkKey(r, primaryKeys) !== key);
        return o;
      }
      const path = `${endpoints.crud}/${primaryKeys.map((k) => encodeURIComponent(o[k])).join('/')}`;
      await httpJson(conn, 'DELETE', path, null, config.token);
      return o;
    };
  }
  if (actions.includes('duplicar')) {
    ctrl.actDuplicar = async (src, work) => {
      if (useMock) {
        store = [...store, { ...work }];
        return true;
      }
      const path = `${endpoints.duplicar}/${primaryKeys.map((k) => encodeURIComponent(src[k])).join('/')}`;
      await httpJson(conn, 'POST', path, work, config.token);
      return true;
    };
  }
  if (actions.includes('recodificar')) {
    ctrl.actRecodificar = async (src, work) => {
      if (useMock) {
        const key = pkKey(src, primaryKeys);
        store = store.map((r) => (pkKey(r, primaryKeys) === key ? { ...work } : r));
        return true;
      }
      const path = `${endpoints.recodificar}/${primaryKeys.map((k) => encodeURIComponent(src[k])).join('/')}`;
      await httpJson(conn, 'PUT', path, work, config.token);
      return true;
    };
  }
  if (actions.includes('consolidar')) {
    ctrl.actConsolidar = async (src, work) => {
      if (useMock) {
        const from = pkKey(src, primaryKeys);
        const to = pkKey(work, primaryKeys);
        store = store.filter((r) => pkKey(r, primaryKeys) !== from);
        if (!store.some((r) => pkKey(r, primaryKeys) === to)) store = [...store, { ...work }];
        return true;
      }
      const path = `${endpoints.consolidar}/${primaryKeys.map((k) => encodeURIComponent(src[k])).join('/')}`;
      await httpJson(conn, 'PUT', path, work, config.token);
      return true;
    };
  }

  /** Acceso al store mock (demos / tests). */
  Object.defineProperty(ctrl, '_store', {
    get() { return store; },
    set(v) { store = Array.isArray(v) ? v.map((r) => ({ ...r })) : []; },
  });

  return ctrl;
}

/** Catálogo CRUD: acciones por defecto = todas. */
export function createCatalogController(config = {}) {
  return createIspController({
    ...config,
    kind: 'catalog',
    actions: config.actions ?? true,
  });
}

/** BtnRef: sin acciones de toolbar; solo Lista + columnas de etiqueta. */
export function createBtnRefController(config = {}) {
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
