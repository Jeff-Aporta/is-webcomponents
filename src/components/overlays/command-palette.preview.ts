/**
 * Behavior de is-command-palette: abre la paleta desde el botón del demo y
 * registra el comando elegido.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface PaletteEl extends HTMLElement {
  open(): void;
  close(): void;
}

interface SelectDetail {
  command: { id: string };
}

let paleta: PaletteEl | null = null;
let boton: HTMLElement | null = null;
let abrir: (() => void) | null = null;
let alElegir: ((e: Event) => void) | null = null;

export async function mount(ctx: PreviewMountContext): Promise<void> {
  paleta = ctx.main.querySelector<PaletteEl>('is-command-palette');
  boton = ctx.main.querySelector<HTMLElement>('#openBtn');
  if (!paleta) return;

  alElegir = (e: Event): void => {
    const detail = (e as CustomEvent<SelectDetail>).detail;
    console.log('ejecutar:', detail.command.id);
  };
  paleta.addEventListener('is-select', alElegir);

  if (boton) {
    abrir = (): void => { paleta!.open(); };
    boton.addEventListener('click', abrir);
  }
}

export function unmount(): void {
  if (paleta && alElegir) paleta.removeEventListener('is-select', alElegir);
  if (boton && abrir) boton.removeEventListener('click', abrir);
  paleta = null;
  boton = null;
  abrir = null;
  alElegir = null;
}
