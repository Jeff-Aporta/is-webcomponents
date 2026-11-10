// reemitir.ts — reemitir un evento nativo como evento del componente (opt-in).
//
// Un control nativo (un input, un details, un video) dispara eventos que no se pueden
// reemitir con `emit()` (que solo lanza eventos propios). `reemitir` toma el evento nativo y
// lanza uno propio con el MISMO nombre, composed y bubbles: quien lo escucha no necesita saber
// de donde salio.
//
//   input.addEventListener('input', (e) => reemitir(e as InputEvent));
//   // ahora el componente emite 'input' como evento propio

/** El nombre del evento propio: el del nativo, o el que se le pase. */
export function reemitir(e: Event, tipo?: string, opciones?: EventInit): boolean {
  const objetivo = e.target ?? e.currentTarget;
  if (!objetivo || !('dispatchEvent' in objetivo)) return false;
  const detalle = 'detail' in e ? (e as CustomEvent).detail : undefined;
  const init: EventInit = {
    bubbles: true,
    composed: true,
    cancelable: false,
    ...opciones,
  };
  const evento = new CustomEvent(tipo ?? e.type, { ...init, detail: detalle });
  return objetivo.dispatchEvent(evento);
}
