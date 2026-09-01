import '../../components/isp/flex-options.js';

export function mount(root) {
  const fc = root.querySelector<HTMLElement>('#fcDemo');
  const opts = root.querySelector<HTMLElement>('#fcOpts');
  if (!fc || !opts) return;
  opts.actions = [
    { icon: 'mdi:arrow-up-down', title: 'Mover', onClick: () => {} },
    { icon: 'mdi:plus', title: 'Agregar hijo', onClick: () => {} },
  ];
  const enter = () => { fc.open = true; };
  const leave = () => { if (!fc.locked) fc.open = false; };
  fc.addEventListener('pointerenter', enter);
  fc.addEventListener('pointerleave', leave);
  fc._fcOff = () => {
    fc.removeEventListener('pointerenter', enter);
    fc.removeEventListener('pointerleave', leave);
  };
}

export function unmount(root) {
  root.querySelector<HTMLElement>('#fcDemo')?._fcOff?.();
}
