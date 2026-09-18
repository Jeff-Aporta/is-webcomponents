/**
 * Behavior del preview <is-observer>.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
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

  // ── intersection ──────────────────────────────────────────────────────────
  const io = root.querySelector<HTMLElement>('#io');
  const ioLog = root.querySelector<HTMLElement>('#ioLog');
  io?.addEventListener('is-intersect', (e: Event) => {
    const detail = (e as CustomEvent<{ entry?: IntersectionObserverEntry }>).detail;
    const entry = detail?.entry;
    const el = entry?.target;
    if (!(el instanceof Element)) return;
    const label = el.getAttribute('data-label') || el.tagName.toLowerCase();
    const badge = el.querySelector<HTMLElement>('[data-badge]');
    if (badge && entry) badge.textContent = entry.isIntersecting ? 'en vista' : 'fuera';
    if (entry) {
      pushLog(
        ioLog,
        entry.isIntersecting ? 'type-in' : 'type-out',
        `${label} → ${entry.isIntersecting ? 'entra' : 'sale'} (${Math.round((entry.intersectionRatio || 0) * 100)}%)`,
      );
    }
  });

  // ── mutation ──────────────────────────────────────────────────────────────
  const mo = root.querySelector<HTMLElement>('#mo');
  const moTarget = root.querySelector<HTMLElement>('#moTarget');
  const moLog = root.querySelector<HTMLElement>('#moLog');
  const moExplain = root.querySelector<HTMLElement>('#moExplain');
  let childN = 0;

  root.querySelector<HTMLElement>('#moAdd')?.addEventListener('click', () => {
    if (!moTarget) return;
    childN += 1;
    const chip = document.createElement('span');
    chip.dataset.chip = '';
    chip.textContent = `#${childN}`;
    moTarget.appendChild(chip);
    if (moExplain) {
      moExplain.innerHTML = `Acción: <code class="code">appendChild(span)</code> → <strong>childList</strong>.`;
    }
  });

  root.querySelector<HTMLElement>('#moAttr')?.addEventListener('click', () => {
    if (!moTarget) return;
    const v = String(Date.now()).slice(-6);
    moTarget.dataset.tag = v;
    if (moExplain) {
      moExplain.innerHTML = `Acción: <code class="code">dataset.tag = "${v}"</code> → atributo <strong>data-tag</strong>.`;
    }
  });

  root.querySelector<HTMLElement>('#moReset')?.addEventListener('click', () => {
    if (!moTarget) return;
    moTarget.textContent = 'Contenido editable';
    moTarget.dataset.tag = 'init';
    childN = 0;
    if (moExplain) {
      moExplain.innerHTML = `Reset: texto restaurado y <code class="code">data-tag="init"</code>.`;
    }
  });

  mo?.addEventListener('is-mutate', (e: Event) => {
    const records = (e as CustomEvent<{ records?: MutationRecord[] }>).detail?.records || [];
    for (const r of records) {
      if (r.type === 'childList') {
        if (r.addedNodes.length) {
          pushLog(moLog, 'type-mut', `childList +${r.addedNodes.length} hijo(s)`);
        }
        if (r.removedNodes.length) {
          pushLog(moLog, 'type-mut', `childList −${r.removedNodes.length} hijo(s)`);
        }
      } else if (r.type === 'attributes') {
        const v = (r.target as Element).getAttribute?.(r.attributeName as string) ?? '';
        pushLog(moLog, 'type-mut', `attr ${r.attributeName}="${v}"`);
      }
    }
  });

  // ── resize ────────────────────────────────────────────────────────────────
  const ro = root.querySelector<HTMLElement>('#ro');
  const roBox = root.querySelector<HTMLElement>('#roBox');
  const roSize = root.querySelector<HTMLElement>('#roSize');
  const roLog = root.querySelector<HTMLElement>('#roLog');

  const paintSize = (entry: Partial<ResizeObserverEntry> | undefined): { w: number | null; h: number | null } => {
    const cb = entry?.contentBoxSize;
    const bb = entry?.borderBoxSize;
    const box = (cb && cb[0]) || (bb && bb[0]) || null;
    let w: number | null = null;
    let h: number | null = null;
    if (box) {
      w = Math.round(box.inlineSize);
      h = Math.round(box.blockSize);
    } else if (entry?.contentRect) {
      w = Math.round(entry.contentRect.width);
      h = Math.round(entry.contentRect.height);
    } else if (roBox) {
      w = Math.round(roBox.clientWidth);
      h = Math.round(roBox.clientHeight);
    }
    if (roSize && w != null && h != null) roSize.textContent = `${w} × ${h} px`;
    return { w, h };
  };

  if (roBox) {
    paintSize({ contentRect: roBox.getBoundingClientRect() });
  }

  ro?.addEventListener('is-resize', (e: Event) => {
    const entry = (e as CustomEvent<{ entries?: ResizeObserverEntry[] }>).detail?.entries?.[0];
    const { w, h } = paintSize(entry);
    if (w != null && h != null) pushLog(roLog, 'type-res', `resize → ${w} × ${h} px`);
  });
}

export function unmount() {
  /* listeners viven en el preview hasta desmontar la página */
}
