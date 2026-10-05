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
 * <iswc-cdn-snippet> — panel copy-paste del snippet mínimo de uso.
 *
 * Un solo bloque:
 *   <script type="module" src="…/loader.min.js"></script>
 *   <script type="module"> … loadCSS* + load(…) …</script>
 *
 * Más fila Skill simple (enlaces + ver): sin visor MD embebido.
 *
 *   tag / category / base / title / dependencies / config
 *
 * Las deps (p. ej. patyLoader) van EN EL MISMO snippet, justo después del
 * `<script>` del loader — no en filas "Dependencia · …" sueltas.
 *
 * La carga es siempre el tag: un componente por L.load. No hay radio de alcance.
 */

/**
 * Normaliza el tag que va al `L.load("…")` del snippet para que SIEMPRE use
 * el prefijo canónico `iswc-`. Si llega con el legacy `is-` (ej. `is-button`)
 * se reescribe a `iswc-button`; si ya viene con `iswc-` se pasa tal cual;
 * cualquier otro valor (categoría, `all`, vacío) no se toca.
 */
const normalizeIswcTag = (tag: string): string => {
  const t = String(tag || '').trim();
  if (!t) return '';
  if (t.startsWith('iswc-')) return t;
  if (t.startsWith('is-')) return `iswc-${t.slice(3)}`;
  return t;
};

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <section class="cdn" aria-label="snippet">
      <header class="cdn__head">
        <h3 class="cdn__title">snippet</h3>
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
        <p class="cdn__dep-note" data-slot="deps-note" hidden></p>
      </div>

      <section class="cdn__agents" aria-label="Skill">
        <header class="cdn__head">
          <h4 class="cdn__docs-title">Skill</h4>
        </header>
        <div class="cdn__skill" data-slot="skills" role="list"></div>
      </section>
    </section>
  `;

  class IswcCdnSnippet extends withStyleAttrs(HTMLElement) {
    

    static get observedAttributes(): string[] {
      return ['tag', 'category', 'base', 'title', 'dependencies', 'config'];
    }

    #mounted = false;
    #urls: { loader: string; loadArg: string } = { loader: '', loadArg: '' };
    #onHighlightReady = () => this.#render();
    #deps: { name: string; version: string; css: string; js: string; note: string; module: boolean }[] = [];
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
      return normalizeIswcTag(tag);
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
      // Orden fijo: 1) módulo (config) · 2) skill general (SKILL_DOCS).
      const seen = new Set<string>();
      this.#docs = [];
      let cfg = null;
      if (raw?.trim()) {
        try { cfg = JSON.parse(raw) || {}; } catch { cfg = null; }
      }
      if (Array.isArray(cfg?.docs)) {
        for (const d of cfg.docs) {
          if (!d?.url) continue;
          const url = String(d.url);
          const key = this.#docKey(url);
          if (seen.has(key)) continue;
          seen.add(key);
          this.#docs.push({ label: String(d.label || 'Módulo'), url });
        }
      }
      for (const d of SKILL_DOCS) {
        if (!d?.url) continue;
        const key = this.#docKey(d.url);
        if (seen.has(key)) continue;
        seen.add(key);
        this.#docs.push({ label: d.label, url: d.url });
      }
      return cfg;
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
            .map((d: Record<string, unknown>) => {
              const js = d['js'] ? String(d['js']) : '';
              const name = String(d['name'] || 'dependencia');
              // ES module si lo piden, o si es patyLoader (usa import.meta.url).
              const module = d['module'] === true
                || (d['module'] !== false && /patyLoader/i.test(`${name} ${js}`));
              return {
                name,
                version: d['version'] ? String(d['version']) : '',
                css: d['css'] ? String(d['css']) : '',
                js,
                note: d['note'] ? String(d['note']) : '',
                module,
              };
            })
          : [];
      } catch { this.#deps = []; }
    }

    /** Tags link/script de una dep (van embebidos en el snippet principal). */
    #buildDepLines(dep: { css: string; js: string; module: boolean }): string[] {
      const lines: string[] = [];
      if (dep.css) lines.push(`<link rel="stylesheet" href="${dep.css}">`);
      if (dep.js) {
        lines.push(dep.module
          ? `<script type="module" src="${dep.js}"><\/script>`
          : `<script src="${dep.js}"><\/script>`);
      }
      return lines;
    }

    #buildLoaderSnippet() {
      const href = this.#loaderHref();
      const arg = this.#loadArg();
      const loadLine = arg ? `  await L.load(${JSON.stringify(arg)});` : '';
      // Orden canónico: loader kit → deps (patyLoader, chart.js, …) → boot.
      const depLines = this.#deps.flatMap((d) => this.#buildDepLines(d));
      return [
        `<script type="module" src="${href}"><\/script>`,
        ...depLines,
        `<script type="module">`,
        `  const L = globalThis.ISWebComponentsLoader;`,
        `  // is-base.min.css se auto-carga al inicializar el loader (W52).`,
        `  await L.loadCSSPalettesDefault();`,
        loadLine,
        `<\/script>`,
      ].filter(Boolean).join('\n');
    }

    /** Notas de deps bajo el snippet único (sin filas sueltas). */
    #renderDepsNote() {
      const note = this.shadowRoot?.querySelector<HTMLElement>('[data-slot="deps-note"]');
      if (!note) return;
      const texts = this.#deps.map((d) => d.note).filter(Boolean);
      if (!texts.length) {
        note.hidden = true;
        note.textContent = '';
        return;
      }
      note.hidden = false;
      note.textContent = texts.join(' · ');
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

      this.#parseDeps();
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
      this.#renderDepsNote();
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
      if (kind !== 'loader') return;
      const text = this.#urls.loader || this.#buildLoaderSnippet();
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
