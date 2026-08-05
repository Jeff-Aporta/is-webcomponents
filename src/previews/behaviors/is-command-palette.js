/**
 * Behavior de is-command-palette: abre la paleta desde el botón del demo y
 * registra el comando elegido.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
let paleta = null;
let boton = null;
let abrir = null;
let alElegir = null;

export async function mount(ctx) {
  paleta = ctx.main.querySelector('is-command-palette');
  boton = ctx.main.querySelector('#openBtn');
  if (!paleta) return;

  alElegir = (e) => console.log('ejecutar:', e.detail.command.id);
  paleta.addEventListener('is-select', alElegir);

  if (boton) {
    abrir = () => paleta.open();
    boton.addEventListener('click', abrir);
  }
}

export function unmount() {
  if (paleta && alElegir) paleta.removeEventListener('is-select', alElegir);
  if (boton && abrir) boton.removeEventListener('click', abrir);
  paleta = null;
  boton = null;
  abrir = null;
  alElegir = null;
}
