/**
 * Behavior migrado desde HTML inline de is-speed-dial.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const logBody = document.querySelector('#logTable tbody');
      // Los diales que arrancan con `open` emiten is-toggle al montarse: eso no
      // es interaccion del usuario y solo llenaba la bitacora de lineas
      // identicas ("toggle: open=false" repetido), asi que se ignora.
      let userInteracted = false;
      document.addEventListener('pointerdown', () => { userInteracted = true; }, true);
  
      const MAX_ROWS = 12;
      function append(dial, evento, detalle) {
        if (!userInteracted) return;
        logBody.querySelector('.log-empty')?.remove();
        const tr = document.createElement('tr');
        const hora = new Date().toLocaleTimeString('es', { hour12: false });
        for (const value of [hora, dial, evento, detalle]) {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        }
        logBody.prepend(tr);
        while (logBody.rows.length > MAX_ROWS) logBody.deleteRow(-1);
      }
  
      document.querySelectorAll('is-speed-dial').forEach((d, i) => {
        const nombre = d.id || d.getAttribute('data-layout') || d.getAttribute('direction') || ('dial ' + (i + 1));
        d.addEventListener('is-select', (e) => append(nombre, 'is-select', e.detail.action.getAttribute('label') || '-'));
        d.addEventListener('is-toggle', (e) => append(nombre, 'is-toggle', e.detail.open ? 'abierto' : 'cerrado'));
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
