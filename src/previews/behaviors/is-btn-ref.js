import { createBtnRefController } from '../../components/isp/controller-from-config.js';

/**
 * Demo <is-btn-ref> single + multi con controller JSON (sin acciones CRUD).
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;

  const datos = [
    { app: 'ContaPyme' },
    { app: 'AgroWin' },
    { app: 'PatyIA' },
  ];

  const single = root.querySelector('#btnRefDemo') || root.querySelector('is-btn-ref:not([multi])');
  if (single) {
    single.controller = createBtnRefController({
      entrie: 'Aplicación',
      primaryKeys: ['app'],
      ColumnsBtnRef: ['app'],
      columns: [{ field: 'app', header: 'Aplicación' }],
      mock: datos,
    });
    const log = root.querySelector('#btnRefLog');
    single.addEventListener('is-selected-record', (e) => {
      if (!log) return;
      const code = log.querySelector('code') || log;
      code.textContent = e.detail?.value || '—';
    });
  }

  const multi = root.querySelector('#btnRefMulti');
  if (multi) {
    multi.controller = createBtnRefController({
      entrie: 'Aplicación',
      primaryKeys: ['app'],
      ColumnsBtnRef: ['app'],
      columns: [{ field: 'app', header: 'Aplicación' }],
      multiSelect: true,
      mock: datos,
    });
    const log = root.querySelector('#btnRefMultiLog');
    multi.addEventListener('is-selected-record', (e) => {
      if (!log) return;
      const code = log.querySelector('code') || log;
      code.textContent = e.detail?.value || '—';
    });
  }
}

export function unmount() {
  /* teardown no crítico */
}
