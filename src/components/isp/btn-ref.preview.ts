import { createBtnRefController } from './controller-from-config.js';
import type { _BtnRefLike, _SelectedDetail } from "./btn-ref.preview.schemas.js";

/** `<iswc-btn-ref>` con `controller` y eventos `iswc-selected-record`. */

/** Detalle de `iswc-selected-record`. */

/**
 * Demo <iswc-btn-ref> single + multi con controller JSON (sin acciones CRUD).
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;

  const datos: Array<{ app: string }> = [
    { app: 'ContaPyme' },
    { app: 'AgroWin' },
    { app: 'PatyIA' },
  ];

  const singleEl = root.querySelector<HTMLElement>('#btnRefDemo') || root.querySelector<HTMLElement>('iswc-btn-ref:not([multi])');
  if (singleEl) {
    const single = singleEl as _BtnRefLike;
    single.controller = createBtnRefController({
      entrie: 'Aplicación',
      primaryKeys: ['app'],
      ColumnsBtnRef: ['app'],
      columns: [{ field: 'app', header: 'Aplicación' }],
      mock: datos,
    });
    const log = root.querySelector<HTMLElement>('#btnRefLog');
    singleEl.addEventListener('iswc-selected-record', (e: Event) => {
      if (!log) return;
      const code = log.querySelector<HTMLElement>('code') || log;
      const detail = (e as CustomEvent<_SelectedDetail>).detail;
      code.textContent = detail?.value || '—';
    });
  }

  const multiEl = root.querySelector<HTMLElement>('#btnRefMulti');
  if (multiEl) {
    const multi = multiEl as _BtnRefLike;
    multi.controller = createBtnRefController({
      entrie: 'Aplicación',
      primaryKeys: ['app'],
      ColumnsBtnRef: ['app'],
      columns: [{ field: 'app', header: 'Aplicación' }],
      multiSelect: true,
      mock: datos,
    });
    const log = root.querySelector<HTMLElement>('#btnRefMultiLog');
    multiEl.addEventListener('iswc-selected-record', (e: Event) => {
      if (!log) return;
      const code = log.querySelector<HTMLElement>('code') || log;
      const detail = (e as CustomEvent<_SelectedDetail>).detail;
      code.textContent = detail?.value || '—';
    });
  }
}

export function unmount(): void {
  /* teardown no crítico */
}
