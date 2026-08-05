/**
 * Behavior migrado desde HTML inline de is-ui.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const ready = () => typeof globalThis.IsUi?.html === 'function';
  
      const paintIntro = () => {
        const stage = document.getElementById('introStage');
        const { html, esc } = IsUi;
        stage.replaceChildren(html`
          <div class="ui-stage__meta">
            <code>typeof IsUi.html</code> = <strong>${typeof IsUi.html}</strong>
            · alias <code>Ui</code> = <strong>${globalThis.Ui === IsUi ? 'mismo objeto' : '—'}</strong>
          </div>
          <is-button color="brand" variant="soft">
            <is-icon slot="start" icon="mdi:check"></is-icon>
            Kit listo
          </is-button>
          <is-tag color="info">${esc('helpers/ui.min.js')}</is-tag>
        `);
      };
  
      const paintHtml = () => {
        const stage = document.getElementById('htmlStage');
        const { html } = IsUi;
        let n = 0;
        const counter = html`<is-badge color="brand">${String(n)}</is-badge>`;
        const bump = () => {
          n += 1;
          counter.textContent = String(n);
        };
        stage.replaceChildren(html`
          <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
            <is-button color="brand" onclick=${bump}>Incrementar</is-button>
            ${counter}
            <is-format type="relative" date=${new Date().toISOString()} sync></is-format>
          </div>
        `);
      };
  
      const registerDemoCard = () => {
        const { define, html, css } = IsUi;
        define('demo-card', class extends HTMLElement {
          #root = this.attachShadow({ mode: 'open' });
          connectedCallback() {
            css(this.#root, `
              :host { display: block; }
              .box {
                padding: 0.85rem 1rem;
                border-radius: 8px;
                border: 1px solid var(--is-border);
                background: var(--is-bg);
                color: var(--is-text);
              }
              :host([data-tone="brand"]) .box {
                border-color: color-mix(in srgb, var(--is-accent) 55%, var(--is-border));
              }
            `);
            this.#root.append(html`<div class="box"><slot></slot></div>`);
          }
        });
      };
  
      const boot = () => {
        if (!ready()) {
          requestAnimationFrame(boot);
          return;
        }
        registerDemoCard();
        paintIntro();
        paintHtml();
      };
      boot();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
