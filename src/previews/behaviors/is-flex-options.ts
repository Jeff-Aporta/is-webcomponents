export function mount(root) {
  const demo = root.querySelector<HTMLElement>('#foDemo');
  if (demo) {
    demo.actions = [
      { icon: 'mdi:plus', title: 'Agregar', label: 'Agregar', onClick: () => {} },
      { icon: 'mdi:pencil-outline', title: 'Editar', label: 'Editar', onClick: () => {} },
    ];
    demo.more = [{ icon: 'mdi:delete-outline', title: 'Eliminar', color: 'danger', onClick: () => {} }];
  }
  const compact = root.querySelector<HTMLElement>('#foCompact');
  if (compact) {
    compact.actions = [
      { icon: 'mdi:arrow-up-down', title: 'Mover', onClick: () => {} },
      { icon: 'mdi:plus', title: 'Agregar hijo', onClick: () => {} },
    ];
  }
}

export function unmount() {}
