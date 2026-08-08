import { prettyHtml, repaint } from '../../components/_shared/highlight-code.js';

/**
 * Behavior migrado desde HTML inline de is-mutation-observer.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  const target = root.querySelector('#moTarget');
  const htmlPre = root.querySelector('#moHtml');
  const stamp = root.querySelector('#moStamp');
  const explain = root.querySelector('#moExplain');
  const log = root.querySelector('#moLog');
  const mo = root.querySelector('#mo');
  if (!target || !htmlPre || !mo) return;

  let childN = 0;

  const paintHtml = () => {
    const src = prettyHtml(target.outerHTML);
    htmlPre.textContent = src;
    htmlPre.setAttribute('data-lang', 'html');
    // repaint borra cm/cmSource — paint() solo reutilizaría cmSource vacío
    // y dejaría el panel en blanco.
    repaint(htmlPre);
    if (stamp) stamp.textContent = new Date().toLocaleTimeString();
  };

  const describe = (records) => {
    const parts = [];
    for (const r of records) {
      if (r.type === 'childList') {
        if (r.addedNodes.length) {
          parts.push({
            cls: 'type-child',
            text: `childList: +${r.addedNodes.length} hijo(s) dentro de <${r.target.nodeName.toLowerCase()}>`,
          });
        }
        if (r.removedNodes.length) {
          parts.push({
            cls: 'type-child',
            text: `childList: -${r.removedNodes.length} hijo(s) de <${r.target.nodeName.toLowerCase()}>`,
          });
        }
      } else if (r.type === 'attributes') {
        const v = r.target.getAttribute?.(r.attributeName) ?? '';
        parts.push({
          cls: 'type-attr',
          text: `attributes: ${r.attributeName}="${v.slice(0, 24)}${v.length > 24 ? '…' : ''}"`,
        });
      } else if (r.type === 'characterData') {
        parts.push({ cls: 'type-text', text: 'characterData: texto cambió' });
      }
    }
    return parts;
  };

  root.querySelector('#moAdd')?.addEventListener('click', () => {
    childN += 1;
    const chip = document.createElement('span');
    chip.dataset.chip = '';
    chip.textContent = `#${childN}`;
    target.appendChild(chip);
    if (explain) {
      explain.innerHTML = `Acción: <code class="code">moTarget.appendChild(span)</code> → mutación <strong>childList</strong>.`;
    }
  });

  root.querySelector('#moAttr')?.addEventListener('click', () => {
    const v = String(Date.now()).slice(-6);
    target.dataset.x = v;
    if (explain) {
      explain.innerHTML = `Acción: <code class="code">moTarget.dataset.x = "${v}"</code> → atributo <strong>data-x</strong> en el HTML.`;
    }
  });

  root.querySelector('#moReset')?.addEventListener('click', () => {
    target.textContent = 'Contenido editable';
    target.dataset.x = 'init';
    childN = 0;
    if (explain) {
      explain.innerHTML = `Reset: se restauró el texto y <code class="code">data-x="init"</code>.`;
    }
  });

  mo.addEventListener('is-mutate', (e) => {
    paintHtml();
    log?.querySelector('.hint')?.closest('.row')?.remove();
    const t = new Date().toLocaleTimeString();
    for (const part of describe(e.detail.records)) {
      const row = document.createElement('div');
      row.className = 'row';
      const time = document.createElement('span');
      time.className = 't';
      time.textContent = t;
      const msg = document.createElement('span');
      msg.className = part.cls;
      msg.textContent = ` ${part.text}`;
      row.append(time, msg);
      log?.prepend(row);
    }
    while (log && log.children.length > 10) log.lastElementChild.remove();
  });

  // Primer pintado: CM puede llegar tarde → reintentar hasta colorear.
  const bootPaint = () => {
    paintHtml();
    if (!htmlPre.dataset.cm) setTimeout(bootPaint, 120);
  };
  setTimeout(bootPaint, 50);
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
