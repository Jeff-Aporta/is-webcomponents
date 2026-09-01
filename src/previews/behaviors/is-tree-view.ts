import { TreeCustomsBase } from '../../components/isp/tree-view.js';

class DemoCustoms extends TreeCustomsBase {
  entrie = 'contenido';
  entries = 'Plan de contenidos';
  getFlatPath = (r) => String(r?.iplan ?? r?.flatPath ?? '').trim();
  setFlatPath = (r, fp) => { r.iplan = String(fp ?? '').trim(); };
  levelName = ({ depth }) => (depth === 0 ? 'Módulo' : depth === 1 ? 'Lección' : '---');
  updateNode = (node, isNew) => {
    const depth = Number(node.depth ?? 0);
    node.topology = depth >= 1 ? 'atom' : 'group';
    if (!isNew) return;
    if (!node.titulo) node.titulo = node.topology === 'atom' ? 'Nueva lección' : 'Nuevo módulo';
  };
  onexpand = (node, tree) => { if (node.isEmpty) void tree.addChild?.(node); };
  rowActions = (node, tree) => {
    const ro = !!tree.isReadOnly;
    const isFolder = !node.isAtom;
    const move = ro ? [] : [
      { icon: 'mdi:arrow-up', title: 'Mover arriba', hotkey: 'Ctrl+ArrowUp', onClick: () => { void tree.move?.(node, 'up'); } },
      { icon: 'mdi:arrow-down', title: 'Mover abajo', hotkey: 'Ctrl+ArrowDown', onClick: () => { void tree.move?.(node, 'down'); } },
    ];
    const add = !ro && isFolder
      ? [{ icon: 'mdi:plus-circle-outline', title: tree.addChildLabel?.(node) ?? 'Agregar', hotkey: 'Insert', onClick: () => { void tree.addChild?.(node); } }]
      : [];
    return [move, add];
  };
  rowCascadeOptions = (node, tree) => {
    const ro = !!tree.isReadOnly;
    return [
      { icon: 'mdi:pencil-outline', title: 'Editar', onClick: () => tree.openEdit?.(node) },
      { icon: 'mdi:eye-outline', title: 'Ver', onClick: () => tree.openView?.(node) },
      ...(ro ? [] : [{ icon: 'mdi:trash-can-outline', title: 'Eliminar', color: 'danger', onClick: () => tree.remove?.(node) }]),
    ];
  };
}

/**
 * Demo <is-tree-view> con lista plana iplan + TreeCustomsBase.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  const tv = root.querySelector<HTMLElement>('#tvDemo') || root.querySelector<HTMLElement>('is-tree-view');
  if (!tv) return;

  tv.customs = new DemoCustoms();
  tv.list = [
    { iplan: '1', titulo: 'Módulo 1 — Fundamentos' },
    { iplan: '1.1', titulo: 'Introducción a ContaPyme' },
    { iplan: '1.2', titulo: 'Plan de cuentas' },
    { iplan: '2', titulo: 'Módulo 2 — Operación' },
    { iplan: '2.1', titulo: 'Comprobantes' },
    { iplan: '2.2', titulo: 'Informes' },
  ];

  const log = root.querySelector<HTMLElement>('#tvLog');
  const paint = (msg) => {
    if (!log) return;
    const code = log.querySelector<HTMLElement>('code') || log;
    code.textContent = msg;
  };
  tv.addEventListener('is-select', (e) => paint(e.detail?.node?.titulo || e.detail?.flatPath || '—'));
  tv.addEventListener('is-frm-open', (e) => paint(`ficha ${e.detail?.itdForm || ''} · ${e.detail?.record?.titulo || ''}`));
  tv.addEventListener('is-error', (e) => paint(e.detail?.message || 'error'));
}

export function unmount() {
  /* teardown no crítico */
}
