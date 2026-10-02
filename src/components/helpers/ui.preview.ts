/**
 * Behavior migrado desde HTML inline de iswc-ui.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';
import type { html as HtmlFn, esc as EscFn } from './ui.js';

interface IsUiApi {
  html: typeof HtmlFn;
  esc: typeof EscFn;
  define: (tag: string, ctor: CustomElementConstructor) => void;
  css: (shadow: ShadowRoot, cssText: string) => void;
}

declare global {
  interface Window {
    IswcUi?: IsUiApi;
    Ui?: IsUiApi;
  }
}

const getIsUi = (): IsUiApi | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const w = globalThis as { IswcUi?: IsUiApi };
  return w.IswcUi;
};

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const ready = (): IsUiApi | undefined => {
    const ui = getIsUi();
    return ui && typeof ui.html === 'function' ? ui : undefined;
  };

  const paintIntro = (IswcUi: IsUiApi): void => {
    const stage = document.getElementById('introStage');
    if (!stage) return;
    const { html, esc } = IswcUi;
    stage.replaceChildren(html`
      <div class="ui-stage__meta">
        <code>typeof IswcUi.html</code> = <strong>${typeof IswcUi.html}</strong>
        · alias <code>Ui</code> = <strong>${(globalThis as { Ui?: IsUiApi }).Ui === IswcUi ? 'mismo objeto' : '—'}</strong>
      </div>
      <iswc-button color="brand" variant="soft">
        <iswc-icon slot="start" icon="mdi:check"></iswc-icon>
        Kit listo
      </iswc-button>
      <iswc-tag color="info">${esc('helpers/ui.min.js')}</iswc-tag>
    `);
  };

  const paintHtml = (IswcUi: IsUiApi): void => {
    const stage = document.getElementById('htmlStage');
    if (!stage) return;
    const { html } = IswcUi;
    let n = 0;
    const counter = html`<iswc-badge color="brand">${String(n)}</iswc-badge>`;
    const counterEl = (counter as unknown as HTMLElement);
    const bump = (): void => {
      n += 1;
      counterEl.textContent = String(n);
    };
    stage.replaceChildren(html`
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
        <iswc-button color="brand" onclick=${bump}>Incrementar</iswc-button>
        ${counter}
        <iswc-format type="relative" date=${new Date().toISOString()} sync></iswc-format>
      </div>
    `);
  };

  const registerDemoCard = (IswcUi: IsUiApi): void => {
    const { define, html, css } = IswcUi;
    define('demo-card', class extends HTMLElement {
      #root = this.attachShadow({ mode: 'open' });
      connectedCallback(): void {
        css(this.#root, `
          :host { display: block; }
          .box {
            padding: 0.85rem 1rem;
            border-radius: 8px;
            border: 1px solid var(--iswc-border);
            background: var(--iswc-bg);
            color: var(--iswc-text);
          }
          :host([data-tone="brand"]) .box {
            border-color: color-mix(in srgb, var(--iswc-accent) 55%, var(--iswc-border));
          }
        `);
        this.#root.append(html`<div class="box"><slot></slot></div>`);
      }
    });
  };

  const boot = (): void => {
    const IswcUi = ready();
    if (!IswcUi) {
      requestAnimationFrame(boot);
      return;
    }
    registerDemoCard(IswcUi);
    paintIntro(IswcUi);
    paintHtml(IswcUi);
  };
  boot();
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
