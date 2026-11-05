import type { PreviewMountContext } from '@jeff-aporta/iswc-base/previews/_kit/schemas/preview.schemas.ts';
import type { FlexOptionsLike } from "@jeff-aporta/iswc-base/components/isp/schemas/flex-options.preview.schemas.js";

export function mount(ctx: PreviewMountContext): void {
  const root = ctx.main;
  const demo = root.querySelector<FlexOptionsLike>('#foDemo');
  if (demo) {
    demo.actions = [
      { icon: 'mdi:plus', title: 'Agregar', label: 'Agregar', onClick: () => {} },
      { icon: 'mdi:pencil-outline', title: 'Editar', label: 'Editar', onClick: () => {} },
    ];
    demo.more = [{ icon: 'mdi:delete-outline', title: 'Eliminar', color: 'danger', onClick: () => {} }];
  }
  const compact = root.querySelector<FlexOptionsLike>('#foCompact');
  if (compact) {
    compact.actions = [
      { icon: 'mdi:arrow-up-down', title: 'Mover', onClick: () => {} },
      { icon: 'mdi:plus', title: 'Agregar hijo', onClick: () => {} },
    ];
  }
}

export function unmount(): void {}
