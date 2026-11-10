// animar.ts — la animacion comun de los overlays (opt-in).
//
// Tres animaciones, las mismas para todos:
//
//   · show  — aparece (de abajo, con su sombra).
//   · hide  — se va (hacia abajo, sin dejar rastro).
//   · pulse — un pulso breve: avisa de que algo cambio sin mover la pieza.
//
// `pulse` es lo que se usa cuando se veta un cierre: el dialogo no se cierra, pero el usuario
// tiene que ver que no paso nada.

/** Las duraciones (ms) de cada animacion. */
export const DURACION: Record<'show' | 'hide' | 'pulse', number> = { show: 160, hide: 120, pulse: 220 };

/** Las keyframes de cada animacion. */
export const KEYFRAMES: Record<'show' | 'hide' | 'pulse', Keyframe[]> = {
  show: [
    { opacity: 0, transform: 'translateY(0.5em) scale(0.98)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ],
  hide: [
    { opacity: 1, transform: 'translateY(0) scale(1)' },
    { opacity: 0, transform: 'translateY(0.25em) scale(0.98)' },
  ],
  pulse: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.02)' },
    { transform: 'scale(1)' },
  ],
};

/**
 * Anima el elemento. Si el navegador no tiene Web Animations, no hace nada y resuelve.
 * Devuelve la promesa de la animacion (o una ya resuelta).
 */
export function animar(el: HTMLElement, tipo: 'show' | 'hide' | 'pulse' = 'show'): Promise<void> {
  if (typeof el.animate !== 'function') return Promise.resolve();
  const anim = el.animate(KEYFRAMES[tipo], {
    duration: DURACION[tipo],
    easing: tipo === 'pulse' ? 'ease-in-out' : 'cubic-bezier(0.2, 0, 0, 1)',
    fill: tipo === 'hide' ? 'none' : 'both',
  });
  return anim.finished.then(
    () => {
      if (tipo === 'hide') el.style.display = 'none';
    },
    () => {
      /* cancelada: se deja el elemento como estaba */
    },
  );
}
