/** Despacho MIME/ext -> tags view/edit (S-FP3). */
export type FileKind = 'txt' | 'csv' | 'pdf' | 'docx' | 'pptx' | 'unknown';

export type FileDispatch = {
  kind: FileKind;
  viewTag: string | null;
  editTag: string | null;
  tag: string | null;
  unsupported: boolean;
};

const BY_MIME: Record<string, FileKind> = {
  'text/plain': 'txt',
  'text/markdown': 'txt',
  'text/x-markdown': 'txt',
  'text/csv': 'csv',
  'application/csv': 'csv',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
};

const BY_EXT: Record<string, FileKind> = {
  txt: 'txt',
  md: 'txt',
  markdown: 'txt',
  csv: 'csv',
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
};

const TAGS: Record<FileKind, { view: string | null; edit: string | null }> = {
  txt: { view: 'iswc-txt-view', edit: 'iswc-txt-edit' },
  csv: { view: 'iswc-csv-view', edit: 'iswc-csv-edit' },
  pdf: { view: 'iswc-pdf-viewer', edit: null },
  docx: { view: 'iswc-docx-view', edit: null },
  pptx: { view: 'iswc-pptx-view', edit: null },
  unknown: { view: null, edit: null },
};

export function extOf(nameOrUrl: string): string {
  const path = String(nameOrUrl || '').split(/[?#]/)[0];
  const base = path.split('/').pop() || '';
  const i = base.lastIndexOf('.');
  return i >= 0 ? base.slice(i + 1).toLowerCase() : '';
}

export function resolveFileKind(opts: {
  type?: string | null;
  name?: string | null;
  src?: string | null;
}): FileKind {
  const mime = String(opts.type || '').trim().toLowerCase();
  if (mime && BY_MIME[mime]) return BY_MIME[mime];
  const ext = extOf(opts.name || '') || extOf(opts.src || '');
  if (ext && BY_EXT[ext]) return BY_EXT[ext];
  return 'unknown';
}

export function resolveDispatch(opts: {
  type?: string | null;
  name?: string | null;
  src?: string | null;
  mode: 'view' | 'edit';
}): FileDispatch {
  const kind = resolveFileKind(opts);
  const tags = TAGS[kind];
  const tag = opts.mode === 'edit' ? tags.edit : tags.view;
  return {
    kind,
    viewTag: tags.view,
    editTag: tags.edit,
    tag,
    unsupported: !tag,
  };
}

export { BY_MIME, BY_EXT, TAGS };
