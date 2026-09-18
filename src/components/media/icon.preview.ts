/**
 * Cablea el iframe del explorador de iconos dentro del preview is-icon.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const frame = ctx.main.querySelector<HTMLIFrameElement>('#xpFrame');
  const openBtn = ctx.main.querySelector<HTMLElement>('#xpOpen');
  if (!frame) return;

  const params = new URLSearchParams(location.search);
  const s = params.get('s') || '';
  // El iframe embebido usa /src/previews/_shell.html (servido por serve.mjs).
  // Los paths internos del HTML son relativos a su propia carpeta (../styles/...,
  // ./registry.js, ../../src/cdn/...), así que debe vivir en src/previews/ —
  // copiarlo a dist/ rompe los paths. Para producción, el bundle reemplaza
  // esta ruta por la del CDN (no aplica al tour local).
  const shell = new URL('/src/previews/_shell.html', location.origin);
  shell.searchParams.set('tag', 'is-icon-explorer');
  if (s) shell.searchParams.set('s', s);
  frame.src = shell.pathname + shell.search;

  if (openBtn) {
    openBtn.setAttribute('href', shell.pathname + shell.search);
  }
}

export function unmount() {}
