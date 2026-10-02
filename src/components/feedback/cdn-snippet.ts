import { adoptCss, defineElement } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { copyText } from '../_shared/dom-utils.js';

import {
  resolveRef,
  jsdelivrBase,
} from '../_shared/cdn-ref.js';
import { paint } from '../_shared/highlight-code.js';
import { SKILL_DOCS } from '../_shared/llm-agent-prompt.js';
import type { SkillDoc } from '../_shared/llm-agent-prompt.js';
import '../media/icon.js';
import '../actions/button.js';
import '../code/code.js';

/**
 * <iswc-cdn-snippet> — panel CDN copy-paste vía loader.min.js (sin npm/npx).
 *
 * Un solo bloque:
 *   <script type="module" src="…/loader.min.js"></script>
 *   <script type="module"> … loadCSS* + load(…) …</script>
 *
 * Más fila Skill simple (enlaces + ver): sin visor MD embebido.
 *
 *   tag / category / base / title / dependencies / config
 *
 * La carga es siempre el tag: un componente por L.load. No hay radio de alcance.
 */
(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="Consumo por CDN">
      <header class="cdn__head">
        <h3 class="cdn__title">Consumo por CDN</h3>
        <p class="cdn__hint">
          Estrategia única: <code>loader.min.js</code>. Pegá los dos
          <code>&lt;script&gt;</code> en el <code>&lt;head&gt;</code>
          (o al final del <code>&lt;body&gt;</code>). El primero carga el
          loader; el segundo pide CSS + el componente de <code>tag</code>.
        </p>
      </header>

      <div class="cdn__row" data-kind="loader">
        <div class="cdn__row-head">
          <span class="cdn__label">Copy-paste · loader</span>
          <button type="button" class="cdn__copy iswc-focus-ring" data-copy="loader"
                  aria-label="Copiar snippet del loader">
            <iswc-icon icon="mdi:content-copy" aria-hidden="true"></iswc-icon>
            Copiar
          </button>
        </div>
        <iswc-code class="cdn__pre code iswc-code-view" data-slot="loader" readonly compact wrap
                 line-numbers="false" lang="html"></iswc-code>
      </div>

      <ol class="cdn__list" data-slot="deps-list">
        <li class="cdn__row cdn__row--dep" data-kind="dep" hidden>
          <div class="cdn__row-head">
            <span class="cdn__label cdn__dep-name">Dependencia · <code data-slot="dep-name"></code></span>
            <button type="button" class="cdn__copy iswc-focus-ring" data-copy="dep"
                    aria-label="Copiar enlaces de la dependencia">
              <iswc-icon icon="mdi:content-copy" aria-hidden="true"></iswc-icon>
              Copiar
            </button>
          </div>
          <iswc-code class="cdn__pre code iswc-code-view" data-slot="dep-pre" readonly compact wrap
                   line-numbers="false" lang="html"></iswc-code>
          <p class="cdn__dep-note" data-slot="dep-note" hidden></p>
        </li>
      </ol>

      <section class="cdn__agents" aria-label="Skill">
        <header class="cdn__head">
          <h4 class="cdn__docs-title">Skill</h4>
        </header>
        <div class="cdn__skill" data-slot="skills" role="list"></div>
      </section>
    </section>
  `;

  class IswcCdnSnippet extends withStyleAttrs(HTMLElement) {
    static styleAttrs = {
      radius: '--iswc-cdn-snippet-radius',
      'border-color': '--iswc-cdn-snippet-border',
      'pre-bg': '--iswc-cdn-snippet-pre-bg',
    };

    static get observedAttributes(): string[] {
      return ['tag', 'category', 'base', 'title', 'dependencies', 'config', ...IswcCdnSnippet.styleAttrNames];
    }

    #mounted = false;
    #urls: { loader: string; loadArg: string } = { loader: '', loadArg: '' };
    #onHighlightReady = () => this.#render();
    #deps: { name: string; version: string; css: string; js: string; note: string }[] = [];
    #docs: SkillDoc[] = [];
    #resolvedRef = 'main';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      shadow.addEventListener('click', this.#onClick);
      shadow.addEventListener('iswc-click', this.#onClick);
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      this.#render();
      resolveRef().then((ref) => {
        if (!this.#mounted) return;
        this.#resolvedRef = ref;
        this.#render();
      }).catch(() => { /* sin red: se queda en main */ });
      document.addEventListener('iswc-theme-change', this.#onHighlightReady);
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      document.removeEventListener('iswc-theme-change', this.#onHighlightReady);
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      this.#render();
    }

    #cdnBase() {
      if (this.hasAttribute('base')) return String(this.getAttribute('base') || '').replace(/\/?$/, '/');
      return `${jsdelivrBase(this.#resolvedRef || 'main').replace(/\/?$/, '/')}`;
    }

    #loaderHref() {
      return `${this.#cdnBase()}core/loader.min.js`;
    }

    #loadArg() {
      const tag = (this.getAttribute('tag') || '').trim();
      return tag;
    }

    /** Huella estable del doc (ignora blob/raw/host). */
    #docKey(url: string): string {
      let u = String(url || '').split(/[?#]/)[0] || '';
      u = u.replace(/^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\//i, '');
      u = u.replace(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|raw)\/[^/]+\//i, '');
      u = u.replace(/^https?:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+@[^/]+\//i, '');
      u = u.replace(/^(?:dist\/cdn\/|src\/)/i, '');
      return u.toLowerCase();
    }

    #parseConfig() {
      let raw = this.getAttribute('config');
      if (!raw) {
        const script = this.querySelector<HTMLElement>('script[type="application/json"][slot="config"]');
        raw = script?.textContent || '';
      }
      const seen = new Set<string>();
      this.#docs = [];
      for (const d of SKILL_DOCS) {
        if (!d?.url) continue;
        const key = this.#docKey(d.url);
        if (seen.has(key)) continue;
        seen.add(key);
        this.#docs.push({ label: d.label, url: d.url });
      }
      if (!raw?.trim()) return null;
      try {
        const cfg = JSON.parse(raw) || {};
        if (Array.isArray(cfg.docs)) {
          for (const d of cfg.docs) {
            if (!d?.url) continue;
            const url = String(d.url);
            const key = this.#docKey(url);
            if (seen.has(key)) continue;
            seen.add(key);
            this.#docs.push({ label: String(d.label || 'Documentación'), url });
          }
        }
        return cfg;
      } catch {
        return null;
      }
    }

    /** Lista Skill tipo Paty: enlace + botón ojo (abre MD en pestaña). */
    #renderSkills() {
      const host = this.shadowRoot?.querySelector<HTMLElement>('[data-slot="skills"]');
      if (!host) return;
      host.replaceChildren();
      const docs = this.#docs.filter((d) => d?.url);
      if (!docs.length) {
        host.hidden = true;
        return;
      }
      host.hidden = false;
      docs.forEach((doc, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'cdn__skill-sep';
          sep.setAttribute('aria-hidden', 'true');
          sep.textContent = '·';
          host.append(sep);
        }
        const item = document.createElement('span');
        item.className = 'cdn__skill-item';
        item.setAttribute('role', 'listitem');

        const a = document.createElement('a');
        a.className = 'cdn__skill-link';
        a.href = doc.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = doc.label || 'Documentación';

        const btn = document.createElement('iswc-button');
        btn.setAttribute('variant', 'soft');
        btn.setAttribute('color', 'neutral');
        btn.setAttribute('size', 'sm');
        btn.setAttribute('data-ver-md', '');
        btn.setAttribute('data-href', doc.url);
        btn.setAttribute('aria-label', `Ver ${doc.label || 'markdown'}`);
        btn.setAttribute('title', 'Ver');
        const ico = document.createElement('iswc-icon');
        ico.setAttribute('icon', 'mdi:eye-outline');
        ico.setAttribute('aria-hidden', 'true');
        btn.append(ico);

        item.append(a, btn);
        host.append(item);
      });
    }

    #parseDeps() {
      let raw = this.getAttribute('dependencies');
      if (!raw) {
        const script = this.querySelector<HTMLElement>('script[type="application/json"][slot="deps"]');
        raw = script?.textContent || '';
      }
      if (!raw?.trim()) { this.#deps = []; return; }
      try {
        const data: unknown = JSON.parse(raw);
        this.#deps = Array.isArray(data)
          ? data.filter((d: unknown): d is Record<string, unknown> =>
              !!d && typeof d === 'object' && (Boolean((d as Record<string, unknown>)['js']) || Boolean((d as Record<string, unknown>)['css'])))
            .map((d: Record<string, unknown>) => ({
              name: String(d['name'] || 'dependencia'),
              version: d['version'] ? String(d['version']) : '',
              css: d['css'] ? String(d['css']) : '',
              js: d['js'] ? String(d['js']) : '',
              note: d['note'] ? String(d['note']) : '',
            }))
          : [];
      } catch { this.#deps = []; }
    }

    #buildDepSnippet(dep: { css: string; js: string }): string {
      const lines: string[] = [];
      if (dep.css) lines.push(`<link rel="stylesheet" href="${dep.css}">`);
      if (dep.js) lines.push(`<script src="${dep.js}"><\/script>`);
      return lines.join('\n');
    }

    #buildLoaderSnippet() {
      const href = this.#loaderHref();
      const arg = this.#loadArg();
      const loadLine = arg ? `  await L.load(${JSON.stringify(arg)});` : '';
      return [
        `<script type="module" src="${href}"><\/script>`,
        `<script type="module">`,
        `  const L = globalThis.ISWebComponentsLoader;`,
        `  await L.loadCSSBase();`,
        `  await L.loadCSSPalettesDefault();`,
        loadLine,
        `<\/script>`,
      ].filter(Boolean).join('\n');
    }

    #renderDeps() {
      const root = this.shadowRoot!;
      const list = root.querySelector<HTMLElement>('[data-slot="deps-list"]');
      const template = root.querySelector<HTMLElement>('[data-kind="dep"][hidden]');
      if (!list || !template) return;
      for (const row of list.querySelectorAll<HTMLElement>('[data-kind="dep"]:not([hidden])')) row.remove();
      for (const dep of this.#deps) {
        const clone = template.cloneNode(true) as HTMLElement;
        clone.hidden = false;
        const label = clone.querySelector<HTMLElement>('[data-slot="dep-name"]');
        if (label) label.textContent = dep.version ? `${dep.name}@${dep.version}` : dep.name;
        const pre = clone.querySelector<HTMLElement>('[data-slot="dep-pre"]');
        const snippet = this.#buildDepSnippet(dep);
        this.#setCode(pre, snippet);
        const note = clone.querySelector<HTMLElement>('[data-slot="dep-note"]');
        if (note) { note.textContent = dep.note; note.hidden = !dep.note; }
        const btn = clone.querySelector<HTMLElement>('[data-copy="dep"]');
        if (btn) btn.dataset.copyValue = snippet;
        list.insertBefore(clone, template);
      }
    }

    #setCode(el: HTMLElement | null, text: string) {
      if (!el) return;
      const src = text || '';
      if (el.localName === 'iswc-code') {
        const codeEl = el as HTMLElement & { value: string };
        if (codeEl.value !== src) codeEl.value = src;
        codeEl.dataset.cmSource = src;
        delete codeEl.dataset.cm;
      } else {
        el.textContent = src;
      }
    }

    #render() {
      const root = this.shadowRoot!;
      if (!root) return;

      const loadArg = this.#loadArg();
      this.#urls = {
        loader: this.#buildLoaderSnippet(),
        loadArg,
      };

      const titleEl = root.querySelector<HTMLElement>('.cdn__title');
      const title = this.getAttribute('title');
      if (titleEl && title) titleEl.textContent = title;

      this.#setCode(root.querySelector<HTMLElement>('[data-slot="loader"]'), this.#urls.loader);

      const cfg = this.#parseConfig();
      if (cfg?.title && titleEl) titleEl.textContent = cfg.title;
      this.#renderSkills();

      this.#parseDeps();
      this.#renderDeps();
      this.#highlight();
    }

    #highlight() {
      for (const ed of this.shadowRoot!.querySelectorAll<HTMLElement & { value: string }>('iswc-code.cdn__pre')) {
        if (!(ed.value || '').trim()) continue;
        ed.dataset.cmMode = 'htmlmixed';
        delete ed.dataset.cm;
        void paint(ed);
      }
    }

    #onClick = async (e: Event) => {
      const target = e.target as Element | null;
      const ver = target?.closest('[data-ver-md]') as HTMLElement | null;
      if (ver) {
        e.preventDefault();
        e.stopPropagation();
        const href = ver.getAttribute('data-href') || '';
        if (href) window.open(href, '_blank', 'noopener');
        return;
      }
      const btn = target?.closest('.cdn__copy') as HTMLElement | null;
      if (!btn) return;
      e.preventDefault();
      const kind = btn.dataset.copy;
      let text = '';
      if (kind === 'dep') text = btn.dataset.copyValue || '';
      else if (kind === 'loader') text = this.#urls.loader || this.#buildLoaderSnippet();
      if (!text) return;
      await copyText(text);
      const original = btn.innerHTML;
      btn.innerHTML = '<iswc-icon icon="mdi:check" aria-hidden="true"></iswc-icon> Copiado';
      btn.classList.add('iswc-copied');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('iswc-copied');
      }, 1200);
    };
  }

  defineElement('iswc-cdn-snippet', IswcCdnSnippet, 'IswcCdnSnippet');
})();
