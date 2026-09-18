import { createCatalogController } from './controller-from-config.js';

interface CatalogEl extends HTMLElement {
  controller: unknown;
}

/**
 * Demo <is-catalogo-gen> con controller JSON (acciones CRUD completas).
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  const cat = (root.querySelector<CatalogEl>('#catDemo') || root.querySelector<CatalogEl>('is-catalogo-gen'));
  if (!cat) return;

  cat.controller = createCatalogController({
    entrie: 'Curso',
    primaryKeys: ['icurso'],
    labelPk: 'Código',
    columns: [
      { field: 'icurso', header: 'Código' },
      { field: 'ncurso', header: 'Nombre' },
      { field: 'bactivo', header: 'Activo' },
    ],
    // Compacto: actions:true (default) → crear/modificar/visualizar/verificar/
    // duplicar/recodificar/eliminar/consolidar
    mock: [
      { icurso: 'C001', ncurso: 'Contabilidad básica', bactivo: true },
      { icurso: 'C002', ncurso: 'Nómina electrónica', bactivo: true },
      { icurso: 'C003', ncurso: 'Inventarios', bactivo: false },
    ],
    // Ejemplo HTTP (desactivado; el mock gana si no hay server):
    // server: {
    //   useLocal: true,
    //   local: { host: 'localhost', port: <SERVER_PORT>, https: false, restcontext: '' },
    //   remote: { host: 'clientesis-contapymeu.azurewebsites.net', port: 443, https: true, restcontext: '' },
    // },
    // endpoints: { recurso: 'curso', recursos: 'cursos' },
    // token: () => localStorage.getItem('token'),
  });

  const log = root.querySelector<HTMLElement>('#catLog');
  const paint = (msg: string): void => {
    if (!log) return;
    const code = log.querySelector<HTMLElement>('code') || log;
    code.textContent = msg;
  };
  cat.addEventListener('is-action', (e: Event) => {
    const detail = (e as CustomEvent<{ action?: string }>).detail;
    paint(detail?.action || '—');
  });
  cat.addEventListener('is-selection-change', (e: Event) => {
    const detail = (e as CustomEvent<{ records?: unknown[] }>).detail;
    paint(`selección ×${detail?.records?.length ?? 0}`);
  });
}

export function unmount(): void {
  /* teardown no crítico */
}
