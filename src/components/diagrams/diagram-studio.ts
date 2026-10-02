/**
 * App API de diagramas. Visor y editor comparten ?kind= y ?json= (base64url).
 * El parámetro de la dirección solo se lee al abrir. Compartir arma otro enlace.
 */

export interface DiagramKind {
  kind: string;
  title: string;
  tag: string;
  file: string;
  preview: string;
  editor?: { tag: string; file: string };
}

export const DIAGRAM_KINDS: readonly DiagramKind[] = [
  { kind: 'flowchart', title: 'Flujo', tag: 'is-flowchart', file: 'flowchart', preview: 'flowchart.json' },
  { kind: 'sequence', title: 'Secuencia', tag: 'is-sequence-diagram', file: 'sequence-diagram', preview: 'sequence-diagram.json' },
  { kind: 'class', title: 'Clases', tag: 'is-class-diagram', file: 'class-diagram', preview: 'class-diagram.json' },
  { kind: 'state', title: 'Estados', tag: 'is-state-diagram', file: 'state-diagram', preview: 'state-diagram.json' },
  { kind: 'er', title: 'Entidad-relación', tag: 'is-er-diagram', file: 'er-diagram', preview: 'er-diagram.json', editor: { tag: 'is-er-editor', file: 'er-editor' } },
  { kind: 'block', title: 'Bloques', tag: 'is-block-diagram', file: 'block-diagram', preview: 'block-diagram.json' },
  { kind: 'component', title: 'Componentes', tag: 'is-component-diagram', file: 'component-diagram', preview: 'component-diagram.json' },
  { kind: 'mindmap', title: 'Mapa mental', tag: 'is-mindmap', file: 'mindmap', preview: 'mindmap.json' },
  { kind: 'gantt', title: 'Gantt', tag: 'is-gantt', file: 'gantt', preview: 'gantt.json' },
  { kind: 'timeline', title: 'Línea de tiempo', tag: 'is-timeline', file: 'timeline', preview: 'timeline.json' },
  { kind: 'org-chart', title: 'Organigrama', tag: 'is-org-chart', file: 'org-chart', preview: 'org-chart.json' },
  { kind: 'sankey', title: 'Sankey', tag: 'is-sankey-diagram', file: 'sankey-diagram', preview: 'sankey-diagram.json' },
  { kind: 'quadrant', title: 'Cuadrantes', tag: 'is-quadrant-chart', file: 'quadrant-chart', preview: 'quadrant-chart.json' },
  { kind: 'venn', title: 'Venn', tag: 'is-venn-diagram', file: 'venn-diagram', preview: 'venn-diagram.json' },
  { kind: 'usecase', title: 'Casos de uso', tag: 'is-use-case-diagram', file: 'use-case-diagram', preview: 'use-case-diagram.json' },
  { kind: 'swimlane', title: 'Carriles', tag: 'is-swimlane-diagram', file: 'swimlane-diagram', preview: 'swimlane-diagram.json' },
  { kind: 'journey', title: 'Recorrido', tag: 'is-journey-map', file: 'journey-map', preview: 'journey-map.json' },
];

export function kindById(kind: string | null | undefined): DiagramKind {
  const id = String(kind ?? '').toLowerCase();
  return DIAGRAM_KINDS.find((k) => k.kind === id) ?? DIAGRAM_KINDS[0];
}

/** Documento JSON → base64url, seguro en un query string. */
export function encodeJsonParam(value: unknown): string {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** base64 o base64url → valor JSON. */
export function decodeJsonParam(raw: string): unknown {
  let b64 = String(raw).trim().replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Enlace nuevo con el JSON actual. No toca `location`: el query de la
 * página abierta sigue siendo el documento con el que se entró.
 */
export function buildShareUrl(pageHref: string, kind: string, value: unknown): string {
  const url = new URL(pageHref);
  url.search = '';
  url.searchParams.set('kind', kind);
  url.searchParams.set('json', encodeJsonParam(value));
  return url.href;
}

type Host = HTMLElement & { payload?: unknown; exportJson?: () => string };

function moduleHref(stem: string): string {
  const name = import.meta.url.includes('.min.js') ? `${stem}.min.js` : `${stem}.ts`;
  return new URL(`./${name}`, import.meta.url).href;
}

function previewHref(file: string): string {
  if (import.meta.url.includes('/dist/cdn/')) {
    return new URL(`../../previews/diagrams/${file}`, import.meta.url).href;
  }
  return new URL(`./${file}`, import.meta.url).href;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function findJsonScript(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findJsonScript(item);
      if (hit) return hit;
    }
    return null;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec.html === 'string') {
    const m = rec.html.match(/<script type="application\/json">([\s\S]*?)<\/script>/i);
    if (m) return m[1];
  }
  for (const value of Object.values(rec)) {
    const hit = findJsonScript(value);
    if (hit) return hit;
  }
  return null;
}

async function sampleFor(kind: DiagramKind): Promise<unknown> {
  try {
    const res = await fetch(previewHref(kind.preview));
    if (!res.ok) return {};
    const raw = findJsonScript(await res.json());
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readLive(host: Host | null, fallback: unknown): unknown {
  if (!host) return fallback;
  try {
    if (typeof host.exportJson === 'function') return JSON.parse(host.exportJson());
  } catch { /* el visor no exporta */ }
  if (host.payload != null) return host.payload;
  return fallback;
}

export async function bootDiagramStudio(mode: 'view' | 'edit'): Promise<void> {
  const root = document.getElementById('studio');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const initialKind = kindById(params.get('kind'));
  let live: unknown = {};
  let statusText = '';
  const encoded = params.get('json');
  if (encoded) {
    try { live = decodeJsonParam(encoded); }
    catch { statusText = 'El parámetro json no es un documento válido. Se usa el ejemplo del componente.'; live = await sampleFor(initialKind); }
  } else {
    live = await sampleFor(initialKind);
  }

  root.innerHTML = '';
  const bar = document.createElement('header');
  bar.className = 'studio-bar';
  const kindSelect = document.createElement('select');
  kindSelect.setAttribute('aria-label', 'Tipo de diagrama');
  for (const kind of DIAGRAM_KINDS) {
    const opt = document.createElement('option');
    opt.value = kind.kind;
    opt.textContent = kind.title;
    kindSelect.append(opt);
  }
  kindSelect.value = initialKind.kind;

  const recoverBtn = document.createElement('button');
  recoverBtn.type = 'button';
  recoverBtn.textContent = 'Recuperar JSON';
  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.textContent = 'Compartir';
  const viewLinkBtn = document.createElement('button');
  viewLinkBtn.type = 'button';
  viewLinkBtn.textContent = mode === 'edit' ? 'Enlace de solo vista' : 'Enlace del editor';
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.textContent = 'Aplicar JSON';
  const status = document.createElement('p');
  status.className = 'studio-status';
  status.textContent = statusText || 'La dirección no cambia al editar. Compartir copia un enlace nuevo.';

  bar.append(kindSelect, recoverBtn, shareBtn, viewLinkBtn);
  if (mode === 'edit') bar.append(applyBtn);

  const work = document.createElement('div');
  work.className = mode === 'edit' ? 'studio-work studio-work--edit' : 'studio-work';
  const stage = document.createElement('div');
  stage.className = 'studio-stage';
  const panel = document.createElement('aside');
  panel.className = 'studio-panel';
  panel.hidden = mode !== 'edit';
  const area = document.createElement('textarea');
  area.spellcheck = false;
  area.setAttribute('aria-label', 'JSON del diagrama');
  area.value = pretty(live);
  const shareOut = document.createElement('input');
  shareOut.readOnly = true;
  shareOut.placeholder = 'El enlace compartido aparece aquí';
  shareOut.setAttribute('aria-label', 'Enlace para compartir');
  panel.append(area, shareOut);
  work.append(stage, panel);
  root.append(bar, status, work);

  let current = initialKind;
  let host: Host | null = null;

  const syncArea = () => {
    if (document.activeElement === area) return;
    area.value = pretty(live);
  };

  const mount = async (kind: DiagramKind) => {
    current = kind;
    const useEditor = mode === 'edit' && kind.editor;
    await import(moduleHref(kind.file));
    if (useEditor) await import(moduleHref(kind.editor!.file));
    const tag = useEditor ? kind.editor!.tag : kind.tag;
    const el = document.createElement(tag) as Host;
    el.payload = live;
    host = el;
    stage.replaceChildren(el);
    if (useEditor) {
      el.addEventListener('is-state-change', () => {
        live = readLive(el, live);
        syncArea();
      });
    }
  };

  kindSelect.addEventListener('change', () => {
    void mount(kindById(kindSelect.value));
  });

  recoverBtn.addEventListener('click', async () => {
    live = readLive(host, live);
    area.value = pretty(live);
    panel.hidden = false;
    try {
      await navigator.clipboard.writeText(area.value);
      status.textContent = 'JSON copiado. La dirección de esta página sigue igual.';
    } catch {
      status.textContent = 'JSON en el panel. La dirección de esta página sigue igual.';
    }
  });

  const copyShare = async (target: 'view' | 'edit') => {
    live = readLive(host, live);
    const page = new URL(target === 'view' ? 'view.html' : 'edit.html', location.href).href;
    const href = buildShareUrl(page, current.kind, live);
    shareOut.value = href;
    panel.hidden = false;
    try {
      await navigator.clipboard.writeText(href);
      status.textContent = 'Enlace copiado con el JSON actual. Esta dirección no se modificó.';
    } catch {
      status.textContent = 'Copia el enlace del panel. Esta dirección no se modificó.';
    }
    shareOut.focus();
    shareOut.select();
  };

  shareBtn.addEventListener('click', () => { void copyShare(mode); });
  viewLinkBtn.addEventListener('click', () => { void copyShare(mode === 'edit' ? 'view' : 'edit'); });

  applyBtn.addEventListener('click', () => {
    try {
      live = JSON.parse(area.value);
      if (host) host.payload = live;
      status.textContent = 'JSON aplicado al diagrama. La dirección no cambió.';
    } catch {
      status.textContent = 'Ese texto no es JSON.';
    }
  });

  await mount(initialKind);
}
