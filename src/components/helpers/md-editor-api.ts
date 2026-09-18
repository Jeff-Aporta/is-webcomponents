/**
 * Cliente CRUD ligero para `<is-md-editor>`.
 *
 * Tipos definidos localmente (en lugar de importarlos desde `./md-editor-api.d.ts`,
 * que en modo strict genera import circular con este mismo archivo).
 * El `.d.ts` paralelo sigue siendo la documentación canónica del consumidor externo.
 */

interface IsMdEditorDocument {
  id?: string;
  filename?: string;
  content: string;
  contentType?: 'text/markdown' | 'text/plain' | string;
  updatedAt?: string;
  updatedBy?: string;
  sizeBytes?: number;
  meta?: Record<string, string | number | boolean | null>;
}

interface IsMdEditorEndpoints {
  get?: string;
  put?: string;
  post?: string;
  delete?: string;
}

interface IsMdEditorApiConfig {
  baseUrl?: string;
  endpoints?: IsMdEditorEndpoints;
  headers?: Record<string, string> | (() => Record<string, string>);
  token?: string | (() => string);
  fieldMap?: Partial<Record<string, keyof IsMdEditorDocument>>;
}

type CanonKey =
  | 'content'
  | 'filename'
  | 'updatedAt'
  | 'updatedBy'
  | 'id'
  | 'sizeBytes'
  | 'contentType';

const DEFAULT_MAP: Record<CanonKey, readonly string[]> = {
  content: ['content', 'body', 'markdown', 'text', 'value'],
  filename: ['filename', 'fileName', 'name', 'title'],
  updatedAt: ['updatedAt', 'updated_at', 'modifiedAt', 'modified_at', 'fecha'],
  updatedBy: ['updatedBy', 'updated_by', 'editor', 'user', 'usuario'],
  id: ['id', 'uuid', 'key'],
  sizeBytes: ['sizeBytes', 'size', 'bytes', 'length'],
  contentType: ['contentType', 'content_type', 'mime'],
};

type SrcMap = Record<string, unknown>;

function pickCanonKey(
  src: SrcMap,
  canon: CanonKey,
  map: Partial<Record<string, keyof IsMdEditorDocument>>,
): unknown {
  const overridden = map[canon];
  if (overridden != null && src[overridden] != null) return src[overridden];
  for (const k of DEFAULT_MAP[canon]) {
    if (src[k] != null) return src[k];
  }
  return undefined;
}

export function normalizeDocument(raw: unknown, cfg: IsMdEditorApiConfig = {}): IsMdEditorDocument {
  const src = unwrapData(raw);
  if (src == null) return { content: '' };
  if (typeof src === 'string') return { content: src };

  const map = cfg.fieldMap || {};
  const obj = src as SrcMap;

  const content = String(pickCanonKey(obj, 'content', map) ?? '');
  const doc: IsMdEditorDocument = { content };
  const id = pickCanonKey(obj, 'id', map);
  const filename = pickCanonKey(obj, 'filename', map);
  const updatedAt = pickCanonKey(obj, 'updatedAt', map);
  const updatedBy = pickCanonKey(obj, 'updatedBy', map);
  const sizeBytes = pickCanonKey(obj, 'sizeBytes', map);
  const contentType = pickCanonKey(obj, 'contentType', map);
  if (id != null) doc.id = String(id);
  if (filename != null) doc.filename = String(filename);
  if (updatedAt != null) doc.updatedAt = String(updatedAt);
  if (updatedBy != null) doc.updatedBy = String(updatedBy);
  if (contentType != null) doc.contentType = String(contentType);
  if (sizeBytes != null && Number.isFinite(Number(sizeBytes))) doc.sizeBytes = Number(sizeBytes);
  else doc.sizeBytes = byteLength(content);
  const metaSrc = obj['meta'];
  if (metaSrc && typeof metaSrc === 'object') doc.meta = { ...(metaSrc as IsMdEditorDocument['meta']) };
  return doc;
}

export function byteLength(text: string | null | undefined): number {
  try {
    return new TextEncoder().encode(String(text ?? '')).length;
  } catch {
    return String(text ?? '').length;
  }
}

export function formatBytes(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1000) return `${v} B`;
  if (v < 1e6) return `${(v / 1024).toFixed(v < 10_240 ? 1 : 0)} KB`;
  return `${(v / 1_048_576).toFixed(2)} MB`;
}

function unwrapData(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (r['data'] != null && (typeof r['data'] === 'object' || typeof r['data'] === 'string')) return r['data'];
    const respuesta = r['respuesta'] as { datos?: unknown } | undefined;
    if (respuesta?.datos != null) return respuesta.datos;
    if (r['document'] != null) return r['document'];
  }
  return raw;
}

function authHeaders(cfg: IsMdEditorApiConfig): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const extra = typeof cfg.headers === 'function' ? cfg.headers() : cfg.headers;
  if (extra) Object.assign(h, extra);
  const token = typeof cfg.token === 'function' ? cfg.token() : cfg.token;
  if (token) {
    const t = String(token);
    h['Authorization'] = t.startsWith('Bearer ') || t.startsWith('Basic ') ? t : `Bearer ${t}`;
  }
  return h;
}

function resolveUrl(cfg: IsMdEditorApiConfig, path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = (cfg.baseUrl || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : path;
}

export async function apiRequest(
  cfg: IsMdEditorApiConfig,
  method: 'get' | 'put' | 'post' | 'delete',
  doc?: IsMdEditorDocument,
): Promise<IsMdEditorDocument | null> {
  const ep = cfg.endpoints || {};
  const path = ep[method];
  if (!path) throw new Error(`Sin endpoint "${method}" en api.endpoints`);
  const url = resolveUrl(cfg, path);
  const init: RequestInit = {
    method: method === 'get' ? 'GET' : method.toUpperCase(),
    headers: authHeaders(cfg),
  };
  if (method === 'put' || method === 'post') {
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    init.body = JSON.stringify(doc || { content: '' });
  }
  const res = await fetch(url, init);
  if (method === 'delete') {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return null;
  }
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { content: text }; }
  if (!res.ok) {
    const j = json as { encabezado?: { mensaje?: string }; message?: string } | null;
    const msg = j?.encabezado?.mensaje || j?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return normalizeDocument(json, cfg);
}

export function parseApiConfig(
  raw: string | IsMdEditorApiConfig | null | undefined,
): IsMdEditorApiConfig | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const j = JSON.parse(String(raw));
    return j && typeof j === 'object' ? (j as IsMdEditorApiConfig) : null;
  } catch {
    return null;
  }
}