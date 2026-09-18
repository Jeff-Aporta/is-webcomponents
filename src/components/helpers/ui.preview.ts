/**
 * Behavior migrado desde HTML inline de is-ui.
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
    IsUi?: IsUiApi;
    Ui?: IsUiApi;
  }
}

const getIsUi = (): IsUiApi | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const w = globalThis as { IsUi?: IsUiApi };
  return w.IsUi;
};

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const ready = (): IsUiApi | undefined => {
    const ui = getIsUi();
    return ui && typeof ui.html === 'function' ? ui : undefined;
  };

  const paintIntro = (IsUi: IsUiApi): void => {
    const stage = document.getElementById('introStage');
    if (!stage) return;
    const { html, esc } = IsUi;
    stage.replaceChildren(html`
      <div class="ui-stage__meta">
        <code>typeof IsUi.html</code> = <strong>${typeof IsUi.html}</strong>
        · alias <code>Ui</code> = <strong>${(globalThis as { Ui?: IsUiApi }).Ui === IsUi ? 'mismo objeto' : '—'}</strong>
      </div>
      <is-button color="brand" variant="soft">
        <is-icon slot="start" icon="mdi:check"></is-icon>
        Kit listo
      </is-button>
      <is-tag color="info">${esc('helpers/ui.min.js')}</is-tag>
    `);
  };

  const paintHtml = (IsUi: IsUiApi): void => {
    const stage = document.getElementById('htmlStage');
    if (!stage) return;
    const { html } = IsUi;
    let n = 0;
    const counter = html`<is-badge color="brand">${String(n)}</is-badge>`;
    const counterEl = (counter as unknown as HTMLElement);
    const bump = (): void => {
      n += 1;
      counterEl.textContent = String(n);
    };
    stage.replaceChildren(html`
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
        <is-button color="brand" onclick=${bump}>Incrementar</is-button>
        ${counter}
        <is-format type="relative" date=${new Date().toISOString()} sync></is-format>
      </div>
    `);
  };

  const registerDemoCard = (IsUi: IsUiApi): void => {
    const { define, html, css } = IsUi;
    define('demo-card', class extends HTMLElement {
      #root = this.attachShadow({ mode: 'open' });
      connectedCallback(): void {
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

  const boot = (): void => {
    const IsUi = ready();
    if (!IsUi) {
      requestAnimationFrame(boot);
      return;
    }
    registerDemoCard(IsUi);
    paintIntro(IsUi);
    paintHtml(IsUi);
  };
  boot();
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
