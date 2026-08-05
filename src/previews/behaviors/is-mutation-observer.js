import { paint } from '../../components/_shared/highlight-code.js';

/**
 * Behavior migrado desde HTML inline de is-mutation-observer.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const target = document.getElementById('moTarget');
      const htmlPre = document.getElementById('moHtml');
      const stamp = document.getElementById('moStamp');
      const explain = document.getElementById('moExplain');
      const log = document.getElementById('moLog');
      let childN = 0;
  
      const pretty = (html) => {
        const flat = html.replace(/>\s+</g, '>\n<').trim();
        const lines = flat.split('\n');
        let depth = 0;
        const out = [];
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          if (/^<\//.test(t)) depth = Math.max(0, depth - 1);
          out.push(`${'  '.repeat(depth)}${t}`);
          if (/^<[^/!][^>]*[^/]>$/.test(t) && !/^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(t)) {
            depth += 1;
          }
        }
        return out.join('\n');
      };
  
      const paintHtml = () => {
        const src = pretty(target.outerHTML);
        htmlPre.textContent = src;
        delete htmlPre.dataset.cm;
        delete htmlPre.dataset.filled;
        paint(htmlPre);
        stamp.textContent = new Date().toLocaleTimeString();
      };
  
      const describe = (records) => {
        const parts = [];
        for (const r of records) {
          if (r.type === 'childList') {
            if (r.addedNodes.length) {
              parts.push({
                cls: 'type-child',
                text: `childList: +${r.addedNodes.length} hijo(s) dentro de <${r.target.nodeName.toLowerCase()}>`
              });
            }
            if (r.removedNodes.length) {
              parts.push({
                cls: 'type-child',
                text: `childList: -${r.removedNodes.length} hijo(s) de <${r.target.nodeName.toLowerCase()}>`
              });
            }
          } else if (r.type === 'attributes') {
            const v = r.target.getAttribute?.(r.attributeName) ?? '';
            parts.push({
              cls: 'type-attr',
              text: `attributes: ${r.attributeName}="${v.slice(0, 24)}${v.length > 24 ? '…' : ''}"`
            });
          } else if (r.type === 'characterData') {
            parts.push({ cls: 'type-text', text: 'characterData: texto cambió' });
          }
        }
        return parts;
      };
  
      document.getElementById('moAdd').addEventListener('click', () => {
        childN += 1;
        const chip = document.createElement('span');
        chip.dataset.chip = '';
        chip.textContent = `#${childN}`;
        target.appendChild(chip);
        explain.innerHTML = `Acción: <code class="code">moTarget.appendChild(span)</code> → mutación <strong>childList</strong>.`;
      });
  
      document.getElementById('moAttr').addEventListener('click', () => {
        const v = String(Date.now()).slice(-6);
        target.dataset.x = v;
        explain.innerHTML = `Acción: <code class="code">moTarget.dataset.x = "${v}"</code> → atributo <strong>data-x</strong> en el HTML.`;
      });
  
      document.getElementById('moReset').addEventListener('click', () => {
        target.textContent = 'Contenido editable';
        target.removeAttribute('data-x');
        childN = 0;
        explain.innerHTML = `Reset: se vació el nodo y se quitó <code class="code">data-x</code> (varias mutaciones).`;
      });
  
      document.getElementById('mo').addEventListener('is-mutate', (e) => {
        paintHtml();
        log.querySelector('.hint')?.closest('.row')?.remove();
        const t = new Date().toLocaleTimeString();
        for (const part of describe(e.detail.records)) {
          const row = document.createElement('div');
          row.className = 'row';
          const time = document.createElement('span');
          time.className = 't';
          time.textContent = t;
          const msg = document.createElement('span');
          msg.className = part.cls;
          msg.textContent = ' ' + part.text;
          row.append(time, msg);
          log.prepend(row);
        }
        while (log.children.length > 10) log.lastElementChild.remove();
      });
  
      // primer pintado tras load (CM puede llegar tarde)
      const bootPaint = () => {
        paintHtml();
        if (!htmlPre.dataset.cm) setTimeout(bootPaint, 120);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(bootPaint, 50));
      } else {
        setTimeout(bootPaint, 50);
      }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
