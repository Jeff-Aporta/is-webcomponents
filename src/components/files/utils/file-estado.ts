/** Lo común del chrome de la familia file-preview: alto por atributo y estados vacío/error. */
import '@jeff-aporta/iswc-base/components/feedback/empty-state.js';

/** El atributo `height` llega al token que usa `:host([height]) .root`. */
export function sincronizarAlto(host: HTMLElement): void {
  const alto = host.getAttribute('height');
  if (alto) host.style.setProperty('--iswc-file-height', alto);
  else host.style.removeProperty('--iswc-file-height');
}

/** Estado vacío o de error de la familia: siempre `<iswc-empty-state>`. */
export function pintarEstado(destino: HTMLElement, titulo: string, estado: 'vacio' | 'error' = 'vacio'): void {
  const caja = document.createElement('iswc-empty-state');
  caja.setAttribute('estado', estado);
  caja.setAttribute('titulo', titulo);
  caja.setAttribute('part', 'state');
  destino.replaceChildren(caja);
}
