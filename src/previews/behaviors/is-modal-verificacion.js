/**
 * Playground <is-modal-verificacion>: mock controller + botón Verificar.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 * @param {import('../_kit/types.d.ts').ISComponentPreviewLike} preview
 */
export async function mount(ctx, preview) {
  const root = ctx.main;
  const signal = preview?.signal;
  const opts = signal ? { signal } : undefined;

  const modal = root.querySelector('#mvDemo');
  const btn = root.querySelector('#mvBtn');
  if (!modal || !btn) return;

  modal.controller = {
    entrie: 'tercero',
    async actVerificar(record) {
      await new Promise((r) => setTimeout(r, 600));
      return {
        mensajes: [
          { itdmensaje: 'info', mensaje: `NIT válido (${record?.nit ?? '—'}).` },
          { itdmensaje: 'warning', mensaje: 'Sin correo registrado.' },
          { itdmensaje: 'info', mensaje: 'Régimen simple activo.' },
        ],
      };
    },
  };
  modal.record = { nit: '900123456', razon: 'Demo SAS' };

  btn.addEventListener('click', () => modal.show(), opts);
}

export function unmount() {
  /* AbortSignal del preview limpia listeners */
}
