/**
 * Behavior migrado desde HTML inline de is-speed-dial.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface CustomEventWithDetail<T = unknown> extends Event {
  detail?: T;
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  if (!root) return;

  // El bloque `kind:table` del JSON no pone id; el behavior espera #logTable.
  let table = root.querySelector<HTMLElement>('#logTable') || document.getElementById('logTable');
  if (!table) {
    const refTable = root.querySelector<HTMLTableElement>('table.ref');
    if (refTable) {
      refTable.id = 'logTable';
      table = refTable;
    }
  }
  if (!table) {
    const created = document.createElement('table');
    created.id = 'logTable';
    created.className = 'ref';
    created.innerHTML = '<thead><tr><th>Hora</th><th>Dial</th><th>Evento</th><th>Detalle</th></tr></thead><tbody></tbody>';
    (root.querySelector<HTMLElement>('[data-section="log"]') || root).append(created);
    table = created;
  }

  let logBody = table.querySelector<HTMLTableSectionElement>('tbody');
  if (!logBody) {
    logBody = document.createElement('tbody');
    table.append(logBody);
  }

  // Los diales que arrancan con `open` emiten is-toggle al montarse: eso no
  // es interaccion del usuario y solo llenaba la bitacora de lineas
  // identicas ("toggle: open=false" repetido), asi que se ignora.
  let userInteracted = false;
  document.addEventListener('pointerdown', () => { userInteracted = true; }, true);

  const MAX_ROWS = 12;
  const append = (dial: string, evento: string, detalle: string): void => {
    if (!userInteracted || !logBody) return;
    logBody.querySelector<HTMLElement>('.log-empty')?.remove();
    // Quitar fila placeholder del JSON (una sola celda de ayuda).
    const placeholder = [...logBody.querySelectorAll<HTMLTableRowElement>('tr')].find(
      (tr) => tr.cells.length === 1 && /abre un dial/i.test(tr.textContent || ''),
    );
    placeholder?.remove();

    const tr = document.createElement('tr');
    const hora = new Date().toLocaleTimeString('es', { hour12: false });
    for (const value of [hora, dial, evento, detalle]) {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.appendChild(td);
    }
    logBody.prepend(tr);
    while (logBody.rows.length > MAX_ROWS) logBody.deleteRow(-1);
  };

  root.querySelectorAll<HTMLElement>('is-speed-dial').forEach((d: HTMLElement, i: number) => {
    const nombre = d.id || d.getAttribute('data-layout') || d.getAttribute('direction') || (`dial ${i + 1}`);
    d.addEventListener('is-select', (e: Event) => {
      const detail = (e as CustomEventWithDetail<{ action?: { getAttribute?: (n: string) => string | null } }>).detail;
      append(nombre, 'is-select', detail?.action?.getAttribute?.('label') || '-');
    });
    d.addEventListener('is-toggle', (e: Event) => {
      const detail = (e as CustomEventWithDetail<{ open?: boolean }>).detail;
      append(nombre, 'is-toggle', detail?.open ? 'abierto' : 'cerrado');
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
