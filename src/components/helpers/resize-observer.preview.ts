/**
 * Behavior del preview <is-resize-observer>.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */

interface ResizeObserverEntryLike {
  contentBoxSize?: readonly { inlineSize: number; blockSize: number }[];
  borderBoxSize?: readonly { inlineSize: number; blockSize: number }[];
  contentRect?: { width: number; height: number };
}

interface ResizeDetail {
  entries?: readonly ResizeObserverEntryLike[];
}

interface BoxSize { w: number | null; h: number | null }

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;

  const pushLog = (logEl: HTMLElement | null, cls: string, text: string): void => {
    if (!logEl) return;
    logEl.querySelector<HTMLElement>('.hint')?.closest('.row')?.remove();
    const row = document.createElement('div');
    row.className = 'row';
    const time = document.createElement('span');
    time.className = 't';
    time.textContent = new Date().toLocaleTimeString();
    const msg = document.createElement('span');
    msg.className = cls;
    msg.textContent = ` ${text}`;
    row.append(time, msg);
    logEl.prepend(row);
    while (logEl.children.length > 8) logEl.lastElementChild?.remove();
  };

  const readSize = (
    entry: ResizeObserverEntryLike | null | undefined,
    fallbackEl: HTMLElement | null,
  ): BoxSize => {
    const box = entry?.contentBoxSize?.[0] || entry?.borderBoxSize?.[0] || null;
    if (box) {
      return { w: Math.round(box.inlineSize), h: Math.round(box.blockSize) };
    }
    if (entry?.contentRect) {
      return {
        w: Math.round(entry.contentRect.width),
        h: Math.round(entry.contentRect.height),
      };
    }
    if (fallbackEl) {
      return {
        w: Math.round(fallbackEl.clientWidth),
        h: Math.round(fallbackEl.clientHeight),
      };
    }
    return { w: null, h: null };
  };

  const paintSize = (el: HTMLElement | null, w: number | null, h: number | null): void => {
    if (el && w != null && h != null) el.textContent = `${w} × ${h} px`;
  };

  // ── Demo principal ────────────────────────────────────────────────────────
  const ro = root.querySelector<HTMLElement>('#ro');
  const roBox = root.querySelector<HTMLElement>('#roBox');
  const roSize = root.querySelector<HTMLElement>('#roSize');
  const roLog = root.querySelector<HTMLElement>('#roLog');

  if (roBox) {
    const { w, h } = readSize(null, roBox);
    paintSize(roSize, w, h);
  }

  ro?.addEventListener('is-resize', (e: Event) => {
    const entry = (e as CustomEvent<ResizeDetail>).detail?.entries?.[0];
    const { w, h } = readSize(entry, roBox);
    paintSize(roSize, w, h);
    if (w != null && h != null) pushLog(roLog, 'type-res', `is-resize → ${w} × ${h} px`);
  });

  // ── Demo disabled ─────────────────────────────────────────────────────────
  const ro2 = root.querySelector<HTMLElement>('#ro2');
  const roBox2 = root.querySelector<HTMLElement>('#roBox2');
  const roSize2 = root.querySelector<HTMLElement>('#roSize2');
  const roLog2 = root.querySelector<HTMLElement>('#roLog2');
  const roToggle = root.querySelector<HTMLElement>('#roToggle');
  const ro2Status = root.querySelector<HTMLElement>('#ro2Status');

  if (roBox2) {
    const { w, h } = readSize(null, roBox2);
    paintSize(roSize2, w, h);
  }

  const syncToggleUi = (): void => {
    const off = ro2?.hasAttribute('disabled');
    if (roToggle) roToggle.textContent = off ? 'Activar observer' : 'Desactivar observer';
    if (ro2Status) {
      ro2Status.textContent = off ? 'desactivado' : 'activo';
      ro2Status.classList.toggle('is-off', !!off);
    }
  };
  syncToggleUi();

  roToggle?.addEventListener('click', () => {
    if (!ro2) return;
    ro2.toggleAttribute('disabled');
    syncToggleUi();
    const off = ro2.hasAttribute('disabled');
    pushLog(
      roLog2,
      off ? 'type-off' : 'type-res',
      off ? 'observer desactivado — no emite' : 'observer activo — escucha resize',
    );
  });

  ro2?.addEventListener('is-resize', (e: Event) => {
    const entry = (e as CustomEvent<ResizeDetail>).detail?.entries?.[0];
    const { w, h } = readSize(entry, roBox2);
    paintSize(roSize2, w, h);
    if (w != null && h != null) pushLog(roLog2, 'type-res', `is-resize → ${w} × ${h} px`);
  });
}

export function unmount(): void {
  /* listeners viven en el preview hasta desmontar la página */
}