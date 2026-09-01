/**
 * Demo <is-block-layout>: breakpoint + json2html/html2json.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;

  const intro = root.querySelector<HTMLElement>('#bl-intro');
  const out = root.querySelector<HTMLElement>('#bl-out');
  if (intro && out) {
    const paint = () => {
      out.textContent = `${intro.sizew} (${Math.round(intro.clientWidthMeasured)}px)`;
    };
    intro.addEventListener('is-breakpoint', paint);
    paint();
  }

  const block = root.querySelector<HTMLElement>('#blJson');
  const jsonOut = root.querySelector<HTMLElement>('#blJsonOut');
  const body = [
    ['p', { style: 'margin:0 0 0.5rem' }, 'Contenido montado desde JSON'],
    ['strong', `sizew vive en data-sizew del host`],
  ];

  const paintJson = (data) => {
    if (jsonOut) jsonOut.textContent = JSON.stringify(data, null, 2);
  };

  if (block) {
    block.fromJSON({ body });
    paintJson(block.toJSON());
  }

  root.querySelector<HTMLElement>('#blBtnToJson')?.addEventListener('click', () => {
    if (!block) return;
    paintJson(block.html2json());
  });

  root.querySelector<HTMLElement>('#blBtnFromJson')?.addEventListener('click', () => {
    if (!block) return;
    block.fromJSON({
      body: [
        ['p', 'Remontado ✓'],
        ['em', 'html2json → BD → fromJSON'],
      ],
    });
    paintJson(block.toJSON());
  });
}

export function unmount() {
  /* no-op */
}
