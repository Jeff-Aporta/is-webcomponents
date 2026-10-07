/**
 * App API de diagramas. Visor y editor comparten ?kind= y ?json= (base64url).
 * El parámetro de la dirección solo se lee al abrir. Compartir arma otro enlace.
 *
 * Edit mode: iswc-split-panel + iswc-tab-group + iswc-code + iswc-share-button.
 */

import type { DiagramKind, Host, CodeEl, ShareEl } from "./diagram-studio.schemas.js";
export const DIAGRAM_KINDS: readonly DiagramKind[] = [
  { kind: 'flowchart', title: 'Flujo', tag: 'iswc-flowchart', file: 'flowchart', preview: 'flowchart.json' },
  { kind: 'sequence', title: 'Secuencia', tag: 'iswc-sequence-diagram', file: 'sequence-diagram', preview: 'sequence-diagram.json' },
  { kind: 'class', title: 'Clases', tag: 'iswc-class-diagram', file: 'class-diagram', preview: 'class-diagram.json' },
  { kind: 'state', title: 'Estados', tag: 'iswc-state-diagram', file: 'state-diagram', preview: 'state-diagram.json' },
  { kind: 'er', title: 'Entidad-relación', tag: 'iswc-er-diagram', file: 'er-diagram', preview: 'er-diagram.json', editor: { tag: 'iswc-er-editor', file: 'er-editor' } },
  { kind: 'block', title: 'Bloques', tag: 'iswc-block-diagram', file: 'block-diagram', preview: 'block-diagram.json' },
  { kind: 'component', title: 'Componentes', tag: 'iswc-component-diagram', file: 'component-diagram', preview: 'component-diagram.json' },
  { kind: 'mindmap', title: 'Mapa mental', tag: 'iswc-mindmap', file: 'mindmap', preview: 'mindmap.json' },
  { kind: 'gantt', title: 'Gantt', tag: 'iswc-gantt', file: 'gantt', preview: 'gantt.json' },
  { kind: 'timeline', title: 'Línea de tiempo', tag: 'iswc-timeline', file: 'timeline', preview: 'timeline.json' },
  { kind: 'org-chart', title: 'Organigrama', tag: 'iswc-org-chart', file: 'org-chart', preview: 'org-chart.json' },
  { kind: 'sankey', title: 'Sankey', tag: 'iswc-sankey-diagram', file: 'sankey-diagram', preview: 'sankey-diagram.json' },
  { kind: 'quadrant', title: 'Cuadrantes', tag: 'iswc-quadrant-chart', file: 'quadrant-chart', preview: 'quadrant-chart.json' },
  { kind: 'venn', title: 'Venn', tag: 'iswc-venn-diagram', file: 'venn-diagram', preview: 'venn-diagram.json' },
  { kind: 'usecase', title: 'Casos de uso', tag: 'iswc-use-case-diagram', file: 'use-case-diagram', preview: 'use-case-diagram.json' },
  { kind: 'swimlane', title: 'Carriles', tag: 'iswc-swimlane-diagram', file: 'swimlane-diagram', preview: 'swimlane-diagram.json' },
  { kind: 'journey', title: 'Recorrido', tag: 'iswc-journey-map', file: 'journey-map', preview: 'journey-map.json' },
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

function moduleHref(stem: string): string {
  const name = import.meta.url.includes('.min.js') ? `${stem}.min.js` : `${stem}.ts`;
  const href = new URL(`./${name}`, import.meta.url).href;
  const loader = (globalThis as { ISWebComponentsLoader?: { assetUrl?: (h: string) => string } }).ISWebComponentsLoader;
  return loader?.assetUrl ? loader.assetUrl(href) : href;
}

function kitHref(category: string, stem: string): string {
  const name = import.meta.url.includes('.min.js') ? `${stem}.min.js` : `${stem}.ts`;
  // Desde dist/cdn/diagrams/ → ../{cat}/{stem}.min.js
  // Desde src/components/diagrams/ → ../{cat}/{stem}.ts
  const href = new URL(`../${category}/${name}`, import.meta.url).href;
  const loader = (globalThis as { ISWebComponentsLoader?: { assetUrl?: (h: string) => string } }).ISWebComponentsLoader;
  return loader?.assetUrl ? loader.assetUrl(href) : href;
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
  // Los previews escriben `html` como cadena o como lista de líneas.
  const html = Array.isArray(rec.html)
    ? rec.html.filter((x): x is string => typeof x === 'string').join('\n')
    : rec.html;
  if (typeof html === 'string') {
    const m = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/i);
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

async function ensureStudioKit(): Promise<void> {
  await Promise.all([
    import(kitHref('layout', 'split-panel')),
    import(kitHref('navigation', 'tab-group')),
    import(kitHref('code', 'code')),
    import(kitHref('actions', 'share-button')),
    import(kitHref('actions', 'button')),
    import(kitHref('media', 'icon')),
    import(kitHref('feedback', 'theme-toggle')),
  ]);
}

function iconBtn(opts: {
  icon: string;
  title: string;
  act?: string;
  color?: string;
}): HTMLElement {
  const btn = document.createElement('iswc-button');
  btn.setAttribute('variant', 'plain');
  btn.setAttribute('color', opts.color || 'text');
  btn.setAttribute('pill', '');
  btn.setAttribute('type', 'button');
  btn.setAttribute('title', opts.title);
  btn.setAttribute('aria-label', opts.title);
  if (opts.act) btn.dataset.act = opts.act;
  btn.className = 'studio-icon-btn';
  const ic = document.createElement('iswc-icon');
  ic.setAttribute('icon', opts.icon);
  ic.setAttribute('slot', 'start');
  ic.setAttribute('aria-hidden', 'true');
  btn.append(ic);
  return btn;
}

export async function bootDiagramStudio(mode: 'view' | 'edit'): Promise<void> {
  const root = document.getElementById('studio');
  if (!root) return;
  await ensureStudioKit();

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
  kindSelect.className = 'studio-kind';
  for (const kind of DIAGRAM_KINDS) {
    const opt = document.createElement('option');
    opt.value = kind.kind;
    opt.textContent = kind.title;
    kindSelect.append(opt);
  }
  kindSelect.value = initialKind.kind;

  const recoverBtn = iconBtn({ icon: 'mdi:file-restore-outline', title: 'Recuperar JSON del diagrama', act: 'recover' });
  const viewLinkBtn = iconBtn({
    icon: mode === 'edit' ? 'mdi:eye-outline' : 'mdi:pencil-outline',
    title: mode === 'edit' ? 'Enlace de solo vista' : 'Enlace del editor',
    act: 'view-link',
  });
  const themeToggle = document.createElement('iswc-theme-toggle');
  themeToggle.setAttribute('aria-label', 'Cambiar tema claro/oscuro');

  const share = document.createElement('iswc-share-button') as ShareEl;
  share.setAttribute('share-title', 'Diagrama ISWC');
  share.setAttribute('text', 'Mira este diagrama');
  share.url = location.href;

  bar.append(kindSelect, recoverBtn, share, viewLinkBtn, themeToggle);

  const status = document.createElement('p');
  status.className = 'studio-status';
  status.textContent = statusText || 'La dirección no cambia al editar. Compartir copia un enlace nuevo.';

  const stage = document.createElement('div');
  stage.className = 'studio-stage';

  let codeEl: CodeEl | null = null;
  let applyTimer = 0;
  let applyingFromCode = false;
  let syncingToCode = false;

  let work: HTMLElement;
  if (mode === 'edit') {
    const split = document.createElement('iswc-split-panel');
    split.setAttribute('orientation', 'horizontal');
    split.setAttribute('position', '68');
    split.setAttribute('storage-key', 'diagram-studio-edit');
    split.className = 'studio-work studio-work--edit';

    const start = document.createElement('div');
    start.slot = 'start';
    start.className = 'studio-pane studio-pane--stage';
    start.append(stage);

    const end = document.createElement('div');
    end.slot = 'end';
    end.className = 'studio-pane studio-pane--side';

    const tabs = document.createElement('iswc-tab-group');
    tabs.setAttribute('active', 'json');
    tabs.setAttribute('placement', 'top');

    const tabJson = document.createElement('iswc-tab');
    tabJson.setAttribute('slot', 'nav');
    tabJson.setAttribute('panel', 'json');
    tabJson.textContent = 'JSON';
    const tabHelp = document.createElement('iswc-tab');
    tabHelp.setAttribute('slot', 'nav');
    tabHelp.setAttribute('panel', 'help');
    tabHelp.textContent = 'Ayuda';

    const panelJson = document.createElement('iswc-tab-panel');
    panelJson.setAttribute('name', 'json');
    codeEl = document.createElement('iswc-code') as CodeEl;
    codeEl.setAttribute('lang', 'json');
    codeEl.setAttribute('min-height', '100%');
    codeEl.value = pretty(live);
    panelJson.append(codeEl);

    const panelHelp = document.createElement('iswc-tab-panel');
    panelHelp.setAttribute('name', 'help');
    panelHelp.innerHTML = `
      <div class="studio-help">
        <p><strong>JSON en vivo</strong> — al editar se aplica al diagrama (debounce).</p>
        <p><strong>Ctrl + rueda</strong> — zoom. Rueda / arrastre — pan (sin cambiar escala).</p>
        <p><strong>Compartir</strong> — usa el botón nativo del kit (Web Share / clipboard).</p>
      </div>`;

    tabs.append(tabJson, tabHelp, panelJson, panelHelp);
    end.append(tabs);
    split.append(start, end);
    work = split;
  } else {
    work = document.createElement('div');
    work.className = 'studio-work';
    work.append(stage);
  }

  root.append(bar, status, work);

  let current = initialKind;
  let host: Host | null = null;

  const syncCode = () => {
    if (!codeEl || applyingFromCode) return;
    if (document.activeElement === codeEl || codeEl.contains(document.activeElement)) return;
    syncingToCode = true;
    codeEl.value = pretty(live);
    syncingToCode = false;
  };

  const applyCode = () => {
    if (!codeEl || syncingToCode) return;
    try {
      live = JSON.parse(codeEl.value);
      applyingFromCode = true;
      if (host) host.payload = live;
      applyingFromCode = false;
      status.textContent = 'JSON aplicado al diagrama. La dirección no cambió.';
      refreshShareUrl();
    } catch {
      status.textContent = 'Ese texto no es JSON válido.';
    }
  };

  const refreshShareUrl = () => {
    const page = new URL(mode === 'edit' ? 'edit.html' : 'view.html', location.href).href;
    share.url = buildShareUrl(page, current.kind, readLive(host, live));
  };

  const mount = async (kind: DiagramKind) => {
    current = kind;
    const useEditor = mode === 'edit' && kind.editor;
    await import(moduleHref(kind.file));
    if (useEditor) await import(moduleHref(kind.editor!.file));
    const tag = useEditor ? kind.editor!.tag : kind.tag;
    const el = document.createElement(tag) as Host;
    // DER sample suele traer theme insoft en el wrapper.
    const theme = (() => {
      if (!live || typeof live !== 'object') return null;
      const o = live as Record<string, unknown>;
      const nested = (o.erDiagram ?? o.er) as Record<string, unknown> | undefined;
      const t = nested?.theme ?? o.theme;
      return typeof t === 'string' ? t : null;
    })();
    if (theme) el.setAttribute('theme', theme);
    el.payload = live;
    host = el;
    stage.replaceChildren(el);
    if (useEditor) {
      el.addEventListener('iswc-state-change', () => {
        if (applyingFromCode) return;
        live = readLive(el, live);
        syncCode();
        refreshShareUrl();
      });
    }
    refreshShareUrl();
  };

  kindSelect.addEventListener('change', () => {
    void mount(kindById(kindSelect.value));
  });

  recoverBtn.addEventListener('click', async () => {
    live = readLive(host, live);
    if (codeEl) codeEl.value = pretty(live);
    try {
      await navigator.clipboard.writeText(pretty(live));
      status.textContent = 'JSON copiado. La dirección de esta página sigue igual.';
    } catch {
      status.textContent = 'JSON en el panel. La dirección de esta página sigue igual.';
    }
  });

  viewLinkBtn.addEventListener('click', async () => {
    live = readLive(host, live);
    const target = mode === 'edit' ? 'view' : 'edit';
    const page = new URL(target === 'view' ? 'view.html' : 'edit.html', location.href).href;
    const href = buildShareUrl(page, current.kind, live);
    share.url = href;
    try {
      await navigator.clipboard.writeText(href);
      status.textContent = 'Enlace copiado con el JSON actual. Esta dirección no se modificó.';
    } catch {
      status.textContent = 'No se pudo copiar el enlace automáticamente.';
    }
  });

  if (codeEl) {
    const scheduleApply = () => {
      clearTimeout(applyTimer);
      applyTimer = window.setTimeout(applyCode, 420);
    };
    codeEl.addEventListener('iswc-input', scheduleApply);
    codeEl.addEventListener('iswc-change', scheduleApply);
  }

  await mount(initialKind);
}
