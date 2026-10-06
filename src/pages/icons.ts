/**
 * Behavior del catálogo de componentes (`#icons` / tag `icons`).
 * Cada categoría = <iswc-demo-section>: título flotante + card neon-glass.
 */
import type { PreviewMountContext, ISComponentPreviewLike } from '../previews/_kit/types.d.ts';
import components from '../manifest.js';
import type { ComponentManifestItem } from "../manifest.schemas.js";

const CAT_META: Record<string, { label: string; icon: string }> = {
  actions: { label: 'Acciones', icon: 'mdi:gesture-tap-button' },
  media: { label: 'Media', icon: 'mdi:image-outline' },
  feedback: { label: 'Feedback', icon: 'mdi:message-badge-outline' },
  layout: { label: 'Layout', icon: 'mdi:view-dashboard-outline' },
  navigation: { label: 'Navegación', icon: 'mdi:compass-outline' },
  forms: { label: 'Formularios', icon: 'mdi:form-select' },
  code: { label: 'Código', icon: 'mdi:code-tags' },
  data: { label: 'Datos', icon: 'mdi:table' },
  'data-viz': { label: 'Gráficos', icon: 'mdi:chart-bar' },
  diagrams: { label: 'Diagramas', icon: 'mdi:graph-outline' },
  files: { label: 'Archivos', icon: 'mdi:file-outline' },
  overlays: { label: 'Overlays', icon: 'mdi:layers-outline' },
  preview: { label: 'Preview', icon: 'mdi:eye-outline' },
  helpers: { label: 'Utilerías', icon: 'mdi:tools' },
  isp: { label: 'ISP-SvelteComponents', icon: 'mdi:puzzle-outline' },
};

const CAT_ORDER = Object.keys(CAT_META);

/** Icono por tag: heurística simple sobre el nombre. */
function iconForTag(tag: string, catIcon: string): string {
  const t = tag.replace(/^iswc-/, '');
  if (t.includes('button')) return 'mdi:button-cursor';
  if (t.includes('chart') || t.includes('sparkline')) return 'mdi:chart-areaspline';
  if (t.includes('diagram') || t.includes('flowchart') || t.includes('sequence')) return 'mdi:sitemap-outline';
  if (t.includes('icon')) return 'mdi:emoticon-outline';
  if (t.includes('input') || t.includes('select') || t.includes('checkbox') || t.includes('switch')) {
    return 'mdi:form-textbox';
  }
  if (t.includes('dialog') || t.includes('drawer') || t.includes('modal')) return 'mdi:window-maximize';
  if (t.includes('toast') || t.includes('tooltip') || t.includes('badge')) return 'mdi:bell-outline';
  if (t.includes('code')) return 'mdi:code-braces';
  if (t.includes('tree')) return 'mdi:file-tree-outline';
  if (t.includes('tab')) return 'mdi:tab';
  if (t.includes('table') || t.includes('grid') || t.includes('data')) return 'mdi:table';
  return catIcon;
}

function seleccionar(tag: string): void {
  window.parent.postMessage({ type: 'iswc-select', tag }, location.origin);
}

function buildMap(host: HTMLElement): void {
  host.innerHTML = '';
  const byCat = new Map<string, ComponentManifestItem[]>();
  for (const key of CAT_ORDER) byCat.set(key, []);
  for (const c of components as ComponentManifestItem[]) {
    if (c.module) continue;
    const key = CAT_META[c.category] ? c.category : 'helpers';
    byCat.get(key)!.push(c);
  }

  for (const key of CAT_ORDER) {
    const list = byCat.get(key) ?? [];
    if (!list.length) continue;
    const meta = CAT_META[key]!;

    // Título flotante + body en card: mismo contrato que el resto de demos.
    const section = document.createElement('iswc-demo-section');
    section.className = 'imap__cat section';
    section.id = `imap-${key}`;
    section.dataset.cat = key;

    const head = document.createElement('h2');
    head.slot = 'title';
    head.className = 'imap__cat-head';
    const ic = document.createElement('iswc-icon');
    ic.setAttribute('icon', meta.icon);
    ic.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = meta.label;
    const count = document.createElement('span');
    count.className = 'imap__cat-count';
    count.textContent = String(list.length);
    const rule = document.createElement('span');
    rule.className = 'imap__cat-rule';
    rule.setAttribute('aria-hidden', 'true');
    head.append(ic, label, count, rule);
    section.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'imap__grid';
    for (const c of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'imap__card';
      btn.dataset.tag = c.tag;
      btn.dataset.title = c.title;
      btn.setAttribute('aria-label', `${c.title} — ${c.tag}`);

      const icon = document.createElement('iswc-icon');
      icon.setAttribute('icon', iconForTag(c.tag, meta.icon));
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('p');
      title.className = 'imap__card-title';
      title.textContent = c.title;

      const tag = document.createElement('p');
      tag.className = 'imap__card-tag';
      tag.textContent = c.tag;

      btn.append(icon, title, tag);
      btn.addEventListener('click', () => seleccionar(c.tag));
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    host.appendChild(section);
  }
}

function wireFilter(raiz: HTMLElement): void {
  const input = raiz.querySelector<HTMLElement & { value: string }>('#imapFilter');
  const map = raiz.querySelector<HTMLElement>('#iconsMap');
  if (!input || !map) return;

  const apply = (): void => {
    const q = (input.value || '').trim().toLowerCase();
    for (const cat of map.querySelectorAll<HTMLElement>('.imap__cat')) {
      let visible = 0;
      for (const card of cat.querySelectorAll<HTMLElement>('.imap__card')) {
        const hay = !q
          || (card.dataset.tag || '').includes(q)
          || (card.dataset.title || '').toLowerCase().includes(q);
        card.hidden = !hay;
        if (hay) visible += 1;
      }
      cat.hidden = visible === 0;
      const count = cat.querySelector('.imap__cat-count');
      if (count) count.textContent = String(visible);
    }
  };

  input.addEventListener('iswc-input', apply);
  input.addEventListener('input', apply);
}

export async function mount(ctx: PreviewMountContext, _preview: ISComponentPreviewLike) {
  const raiz = ctx.main;
  const host = raiz.querySelector<HTMLElement>('#iconsMap');
  if (!host) return;
  await Promise.all([
    customElements.whenDefined('iswc-icon').catch(() => {}),
    customElements.whenDefined('iswc-demo-section').catch(() => {}),
  ]);
  buildMap(host);
  wireFilter(raiz);
}

export function unmount() { /* signal del preview corta listeners si los hubiera */ }
