// @contexto INDICE.md · src/core/README.md
// anunciar.ts — el anunciador vivo (opt-in).
//
// Una sola region `aria-live` para toda la pagina: los lectores de pantalla anuncian lo que se
// escribe ahi. Sin esto, cada componente que avisa crea su propia region y el lector repite
// (o se pisa a si mismo).
//
//   anunciar('Guardado');

let region: HTMLElement | null = null;

/** La region viva, creada la primera vez. */
export function regionViva(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  region.className = 'iswc-vivo';
  region.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
  document.body.appendChild(region);
  return region;
}

/**
 * Anuncia un texto. Espera un turno para que el lector de pantalla note el cambio (si se
 * reescribiera lo mismo, no lo diria).
 */
export function anunciar(texto: string): void {
  const r = regionViva();
  if (!r) return;
  r.textContent = '';
  setTimeout(() => {
    r.textContent = texto;
  }, 50);
}
