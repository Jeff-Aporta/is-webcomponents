/**
 * Demo <is-block-layout>: breakpoint + json2html/html2json.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

/** `<is-block-layout>` con APIs específicas. */
interface _BlockLayoutLike extends HTMLElement {
  sizew: string;
  clientWidthMeasured: number;
  fromJSON(json: unknown): this;
  toJSON(): unknown;
  html2json(): unknown;
}

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;

  const intro = root.querySelector<HTMLElement>('#bl-intro');
  const out = root.querySelector<HTMLElement>('#bl-out');
  if (intro && out) {
    const paint = (): void => {
      out.textContent = `${(intro as _BlockLayoutLike).sizew} (${Math.round((intro as _BlockLayoutLike).clientWidthMeasured)}px)`;
    };
    intro.addEventListener('is-breakpoint', paint as EventListener);
    paint();
  }

  const block = root.querySelector<HTMLElement>('#blJson') as _BlockLayoutLike | null;
  const jsonOut = root.querySelector<HTMLElement>('#blJsonOut');
  const body: unknown[] = [
    ['p', { style: 'margin:0 0 0.5rem' }, 'Contenido montado desde JSON'],
    ['strong', `sizew vive en data-sizew del host`],
  ];

  const paintJson = (data: unknown): void => {
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

export function unmount(): void {
  /* no-op */
}
