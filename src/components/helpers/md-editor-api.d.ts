/**
 * Contrato TypeScript del documento y endpoints CRUD de `<is-md-editor>`.
 *
 * Uso (consumidor):
 *   import type { IsMdEditorDocument, IsMdEditorApiConfig } from '…/md-editor-api.d.ts';
 */

/** Documento markdown persistido / intercambiado con la API. */
export interface IsMdEditorDocument {
  /** Identificador remoto (opcional). */
  id?: string;
  /** Nombre de archivo — se muestra en el header del diálogo. */
  filename?: string;
  /** Cuerpo markdown (fuente de verdad del editor). */
  content: string;
  /** MIME lógico. Default `text/markdown`. */
  contentType?: 'text/markdown' | 'text/plain' | string;
  /** ISO-8601 última edición. */
  updatedAt?: string;
  /** Usuario que editó por última vez (nombre o id legible). */
  updatedBy?: string;
  /** Tamaño en bytes si el servidor lo reporta (si no, se calcula del content). */
  sizeBytes?: number;
  /** Metadatos libres del backend. */
  meta?: Record<string, string | number | boolean | null>;
}

/** Rutas REST relativas a `baseUrl` (o absolutas). */
export interface IsMdEditorEndpoints {
  /** GET → IsMdEditorDocument | { data: IsMdEditorDocument } */
  get?: string;
  /** PUT body IsMdEditorDocument → documento guardado */
  put?: string;
  /** POST body IsMdEditorDocument → documento creado */
  post?: string;
  /** DELETE → void / 204 */
  delete?: string;
}

/**
 * Configuración CRUD por HTTP (fetch).
 * También aceptada como JSON en el atributo `api` o propiedad `.api`.
 * Alternativa sin red: propiedad `.actions` (`IsMdEditorActions`).
 */
export interface IsMdEditorApiConfig {
  baseUrl?: string;
  endpoints?: IsMdEditorEndpoints;
  /** Headers fijos o factory (p.ej. Authorization). */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Bearer token (string o getter). */
  token?: string | (() => string);
  /**
   * Mapeo opcional de campos del JSON remoto → documento canónico.
   * Claves = campos remotos; valores = claves de IsMdEditorDocument.
   * Default entiende: content|body|markdown|text, filename|name|fileName,
   * updatedAt|updated_at|modifiedAt, updatedBy|updated_by|editor|user.
   */
  fieldMap?: Partial<Record<string, keyof IsMdEditorDocument>>;
}

/**
 * Acciones custom (JS only) cuando no hay `api.endpoints` / `src`.
 * Prioridad: `actions.*` > `api.endpoints` / `src` > solo eventos locales.
 */
export interface IsMdEditorActions {
  /** Carga remota / store → documento o string markdown. */
  load?: () => Promise<IsMdEditorDocument | string>;
  /** Persiste el documento; puede devolver el guardado (meta actualizada). */
  persist?: (doc: IsMdEditorDocument) => Promise<IsMdEditorDocument | void>;
  /** Elimina el documento remoto. */
  delete?: (doc: IsMdEditorDocument) => Promise<void>;
}

/** Payload emitido en `is-persist` / `is-change` cuando hay API o actions. */
export interface IsMdEditorPersistDetail {
  value: string;
  document: IsMdEditorDocument;
}
