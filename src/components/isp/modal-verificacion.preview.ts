/**
 * Playground <iswc-modal-verificacion>: mock controller + botón Verificar.
 */
import type { PreviewMountContext, ISComponentPreviewLike } from '../../previews/_kit/types.d.ts';
import type { MensajeItem, VerificationController, ModalVerificacionEl } from "./modal-verificacion.preview.schemas.js";

export async function mount(ctx: PreviewMountContext, preview: ISComponentPreviewLike): Promise<void> {
  const root = ctx.main;
  const signal = preview?.signal;
  const opts = signal ? { signal } : undefined;

  const modal = root.querySelector<ModalVerificacionEl>('#mvDemo');
  const btn = root.querySelector<HTMLElement>('#mvBtn');
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

export function unmount(): void {
  /* AbortSignal del preview limpia listeners */
}
