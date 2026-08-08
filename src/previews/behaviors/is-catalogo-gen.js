import { createCatalogController } from '../../components/isp/controller-from-config.js';

/**
 * Demo <is-catalogo-gen> con controller JSON (acciones CRUD completas).
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  const cat = root.querySelector('#catDemo') || root.querySelector('is-catalogo-gen');
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
    //   local: { host: 'localhost', port: 20040, https: false, restcontext: '' },
    //   remote: { host: 'clientesis-contapymeu.azurewebsites.net', port: 443, https: true, restcontext: '' },
    // },
    // endpoints: { recurso: 'curso', recursos: 'cursos' },
    // token: () => localStorage.getItem('token'),
  });

  const log = root.querySelector('#catLog');
  const paint = (msg) => {
    if (!log) return;
    const code = log.querySelector('code') || log;
    code.textContent = msg;
  };
  cat.addEventListener('is-action', (e) => paint(e.detail?.action || '—'));
  cat.addEventListener('is-selection-change', (e) => {
    paint(`selección ×${e.detail?.records?.length ?? 0}`);
  });
}

export function unmount() {
  /* teardown no crítico */
}
