// ranuras.ts — ranuras reactivas (opt-in).
//
// Un componente puede declarar que slot quiere repintar cuando cambia su contenido:
//
//   class Mi extends IswcReactive {
//     static ranuras = ['cuerpo'];
//     render() { return html`<slot name="cuerpo"></slot>`; }
//   }
//
// `conectarRanuras(this)` se llama desde `connectedCallback` y deja un MutationObserver por cada
// slot declarado: cuando el contenido cambia, el componente se repinta. Sin esto, el texto que
// llega por un slot es estatico (el molde solo repinta cuando cambian sus props).
//
// Vive fuera del nucleo a proposito: son ~150 B br que solo paga quien usa ranuras reactivas.

const observadores = new WeakMap<HTMLElement, MutationObserver>();

/** Los nombres de los slots reactivos que declara la clase del componente. */
export function ranurasDe(componente: HTMLElement): string[] {
  const clase = (componente.constructor as { ranuras?: readonly string[] }).ranuras;
  return Array.isArray(clase) ? [...clase] : [];
}

/** El slot reactivo pedido, si el shadow lo tiene. */
export function ranura(componente: HTMLElement, nombre: string): HTMLSlotElement | null {
  const raiz = componente.shadowRoot;
  if (!raiz) return null;
  const slot = raiz.querySelector(`slot[name="${nombre}"]`) as HTMLSlotElement | null;
  return slot ?? (nombre === 'default' ? (raiz.querySelector('slot:not([name])') as HTMLSlotElement | null) : null);
}

/** Repinta el componente si su molde lo permite. */
function repinta(componente: HTMLElement): void {
  const r = (componente as { actualizarAhora?: () => void }).actualizarAhora;
  if (typeof r === 'function') r.call(componente);
}

/**
 * Conecta los slots reactivos declarados por el componente. Es idempotente: llamarla dos veces
 * no duplica los observadores.
 */
export function conectarRanuras(componente: HTMLElement): number {
  if (observadores.has(componente)) return 0;
  const nombres = ranurasDe(componente);
  if (!nombres.length) return 0;
  const obs = new MutationObserver(() => repinta(componente));
  for (const nombre of nombres) {
    const slot = ranura(componente, nombre);
    if (!slot) continue;
    obs.observe(slot, { childList: true, subtree: true, characterData: true });
  }
  observadores.set(componente, obs);
  return nombres.length;
}

/** Desconecta los observadores de las ranuras (al desconectar el componente). */
export function desconectarRanuras(componente: HTMLElement): void {
  const obs = observadores.get(componente);
  if (!obs) return;
  obs.disconnect();
  observadores.delete(componente);
}
