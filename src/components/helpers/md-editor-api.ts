/**
 * Cliente CRUD ligero para `<is-md-editor>`.
 * @typedef {import('./md-editor-api.d.ts').IsMdEditorDocument} IsMdEditorDocument
 * @typedef {import('./md-editor-api.d.ts').IsMdEditorApiConfig} IsMdEditorApiConfig
 */

const DEFAULT_MAP = {
  content: ['content', 'body', 'markdown', 'text', 'value'],
  filename: ['filename', 'fileName', 'name', 'title'],
  updatedAt: ['updatedAt', 'updated_at', 'modifiedAt', 'modified_at', 'fecha'],
  updatedBy: ['updatedBy', 'updated_by', 'editor', 'user', 'usuario'],
  id: ['id', 'uuid', 'key'],
  sizeBytes: ['sizeBytes', 'size', 'bytes', 'length'],
  contentType: ['contentType', 'content_type', 'mime'],
};

/**
 * @param {unknown} raw
 * @param {IsMdEditorApiConfig} [cfg]
 * @returns {IsMdEditorDocument}
 */
export function normalizeDocument(raw: unknown, cfg: IsMdEditorApiConfig = {}) {
  const src = unwrapData(raw);
  if (src == null) return { content: '' };
  if (typeof src === 'string') return { content: src };

  const map = cfg.fieldMap || {};
  const pick = (canon) => {
    if (map[canon] && src[map[canon]] != null) return src[map[canon]];
    for (const k of DEFAULT_MAP[canon] || []) {
      if (src[k] != null) return src[k];
    }
    return undefined;
  };

  const content = String(pick('content') ?? '');
  /** @type {IsMdEditorDocument} */
  const doc = { content };
  const id = pick('id');
  const filename = pick('filename');
  const updatedAt = pick('updatedAt');
  const updatedBy = pick('updatedBy');
  const sizeBytes = pick('sizeBytes');
  const contentType = pick('contentType');
  if (id != null) doc.id = String(id);
  if (filename != null) doc.filename = String(filename);
  if (updatedAt != null) doc.updatedAt = String(updatedAt);
  if (updatedBy != null) doc.updatedBy = String(updatedBy);
  if (contentType != null) doc.contentType = String(contentType);
  if (sizeBytes != null && Number.isFinite(Number(sizeBytes))) doc.sizeBytes = Number(sizeBytes);
  else doc.sizeBytes = byteLength(content);
  if (src.meta && typeof src.meta === 'object') doc.meta = { ...src.meta };
  return doc;
}

export function byteLength(text) {
  try {
    return new TextEncoder().encode(String(text ?? '')).length;
  } catch {
    return String(text ?? '').length;
  }
}

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1000) return `${v} B`;
  if (v < 1e6) return `${(v / 1024).toFixed(v < 10_240 ? 1 : 0)} KB`;
  return `${(v / 1_048_576).toFixed(2)} MB`;
}

function unwrapData(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.data != null && (typeof raw.data === 'object' || typeof raw.data === 'string')) return raw.data;
    if (raw.respuesta?.datos != null) return raw.respuesta.datos;
    if (raw.document != null) return raw.document;
  }
  return raw;
}

function authHeaders(cfg) {
  /** @type {Record<string, string>} */
  const h = { Accept: 'application/json' };
  const extra = typeof cfg.headers === 'function' ? cfg.headers() : cfg.headers;
  if (extra) Object.assign(h, extra);
  const token = typeof cfg.token === 'function' ? cfg.token() : cfg.token;
  if (token) {
    const t = String(token);
    h.Authorization = t.startsWith('Bearer ') || t.startsWith('Basic ') ? t : `Bearer ${t}`;
  }
  return h;
}

function resolveUrl(cfg, path: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = (cfg.baseUrl || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : path;
}

/**
 * @param {IsMdEditorApiConfig} cfg
 * @param {'get'|'put'|'post'|'delete'} method
 * @param {IsMdEditorDocument} [doc]
 */
export async function apiRequest(cfg: IsMdEditorApiConfig, method: 'get'|'put'|'post'|'delete', doc: IsMdEditorDocument) {
  const ep = cfg.endpoints || {};
  const path = ep[method];
  if (!path) throw new Error(`Sin endpoint "${method}" en api.endpoints`);
  const url = resolveUrl(cfg, path);
  const init = {
    method: method === 'get' ? 'GET' : method.toUpperCase(),
    headers: authHeaders(cfg),
  };
  if (method === 'put' || method === 'post') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(doc || { content: '' });
  }
  const res = await fetch(url, init);
  if (method === 'delete') {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return null;
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { content: text }; }
  if (!res.ok) {
    const msg = json?.encabezado?.mensaje || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return normalizeDocument(json, cfg);
}

/**
 * @param {string|IsMdEditorApiConfig|null|undefined} raw
 * @returns {IsMdEditorApiConfig|null}
 */
export function parseApiConfig(raw: string|IsMdEditorApiConfig|null|undefined) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const j = JSON.parse(String(raw));
    return j && typeof j === 'object' ? j : null;
  } catch {
    return null;
  }
}
