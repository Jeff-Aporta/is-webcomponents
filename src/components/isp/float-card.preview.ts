import './flex-options.js';
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface FloatCardLike extends HTMLElement {
  open: boolean;
  locked?: boolean;
  _fcOff?: () => void;
}

interface FlexOptionsLike extends HTMLElement {
  actions: unknown[];
}

export function mount(ctx: PreviewMountContext): void {
  const root = ctx.main;
  const fc = root.querySelector<FloatCardLike>('#fcDemo');
  const opts = root.querySelector<FlexOptionsLike>('#fcOpts');
  if (!fc || !opts) return;
  opts.actions = [
    { icon: 'mdi:arrow-up-down', title: 'Mover', onClick: () => {} },
    { icon: 'mdi:plus', title: 'Agregar hijo', onClick: () => {} },
  ];
  const enter = (): void => { fc.open = true; };
  const leave = (): void => { if (!fc.locked) fc.open = false; };
  fc.addEventListener('pointerenter', enter);
  fc.addEventListener('pointerleave', leave);
  fc._fcOff = () => {
    fc.removeEventListener('pointerenter', enter);
    fc.removeEventListener('pointerleave', leave);
  };
}

export function unmount(ctx: PreviewMountContext): void {
  ctx.main.querySelector<FloatCardLike>('#fcDemo')?._fcOff?.();
}
