/**
 * Cablea el iframe del explorador de iconos dentro del preview is-icon.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const frame = ctx.main.querySelector('#xpFrame');
  const openBtn = ctx.main.querySelector('#xpOpen');
  if (!frame) return;

  const params = new URLSearchParams(location.search);
  const s = params.get('s') || '';
  const shell = new URL('../_shell.html', import.meta.url);
  shell.searchParams.set('tag', 'icon-explorer');
  if (s) shell.searchParams.set('s', s);
  frame.src = shell.pathname + shell.search;

  if (openBtn) {
    openBtn.setAttribute('href', shell.pathname + shell.search);
  }
}

export function unmount() {}
