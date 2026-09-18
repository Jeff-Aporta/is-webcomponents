import './flex-options.js';

interface FloatCardLike extends HTMLElement {
  open: boolean;
  locked?: boolean;
  _fcOff?: () => void;
}

interface FlexOptionsLike extends HTMLElement {
  actions: unknown[];
}

export function mount(root: HTMLElement): void {
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

export function unmount(root: HTMLElement): void {
  root.querySelector<FloatCardLike>('#fcDemo')?._fcOff?.();
}
