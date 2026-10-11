import { adoptCss, defineElement } from '../../core/element.js';
import { createSpaState } from '../../core/spa-state.js';
import type { EstadoSpa, SpaState } from '../../core/spa-state.schemas.js';
// Solo tipos: el schema Zod (`DocsVaultListaSchema`) queda para tests y consumidores; en el bundle
// del CDN sumaría ~330 KB al lector, así que la lista se valida aquí con un guard equivalente.
import type {
  DocsVaultHoja as Hoja,
  DocsVaultIndice as Indice,
  DocsVaultLayout as Layout,
  DocsVaultListaMeta as ListaMeta,
  DocsVaultMeta,
  DocsVaultPageDetail,
  DocsVaultRender as Render,
  DocsVaultRenderers,
} from './docs-vault.schemas.js';
import './doc-layout.js';
import '../navigation/doc-index.js';
import '../navigation/pager.js';
import '../media/figure.js';
import '../data/meta-list.js';
import '../helpers/md-render.js';
import '../actions/copy-button.js';
import '../actions/button.js';
import '../actions/button-group.js';
import '../media/icon.js';
import '../feedback/spinner.js';
import './dialog.js';
import './callout.js';

export type * from './docs-vault.schemas.js';

/**
 * <iswc-docs-vault> — lector de una documentación modular (norma `documentacion-modular`) como un
 * libro: cada `.md` es una hoja y el README es la portada. Se monta sobre `<iswc-doc-layout>`
 * (navegación | hoja | índice de la hoja con scroll-spy).
 *
 * Entrada: la lista de `.md` en orden de lectura, en un `<script type="application/json">` hijo (rutas
 * relativas a la página o a `base`). `main` (default `README.md`) es la vista principal.
 * Hojas embebidas: `<script type="text/markdown" data-path="README.md">` hijos; se leen sin red (demos,
 * libros sin servidor) y, sin lista JSON, su orden es el del libro.
 *
 * Attributes
 *   main   hoja principal (default README.md); sin `?s=` se abre ella
 *   base   carpeta de las rutas (default la de la página)
 *
 * Slots: brand (marca de la barra), actions (acciones de la app: tema, paleta, escoba).
 * Eventos: `iswc-docs-vault-page` { ruta, titulo, meta } al abrir una hoja.
 * Propiedades: `renderers` (se suman a los del lector), `layout` (el `<iswc-doc-layout>`), `irA(ruta, ancla?)`.
 * CSS parts (re-exportados del layout): bar, toc, content.
 */

/** Estilos que el lector agrega dentro del shadow de cada iswc-md-render (código inline). */
const CSS_RENDER = `
code.vault-code { font: 0.86em/1.4 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; padding: .12em .45em; border-radius: 6px; background: color-mix(in srgb, var(--iswc-color-brand) 10%, transparent); color: var(--iswc-text); border: 1px solid color-mix(in srgb, var(--iswc-color-brand) 22%, transparent); white-space: break-spaces; overflow-wrap: anywhere; }
`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <iswc-doc-layout storage-key="iswc-docs-vault" toc-title="En esta hoja" exportparts="bar, toc, content">
    <slot name="brand" slot="brand"></slot>
    <iswc-button-group class="acciones-hoja" slot="actions" variant="separated" label="Acciones de la hoja">
      <iswc-copy-button class="copiar" copy-label="Copiar enlace a esta hoja" success-label="Enlace copiado" tooltip="Copiar enlace"></iswc-copy-button>
      <iswc-button class="info" variant="plain" color="brand" pill aria-label="Información de la hoja" title="Información de la hoja"><iswc-icon slot="start" icon="mdi:information-outline"></iswc-icon></iswc-button>
    </iswc-button-group>
    <slot name="actions" slot="actions"></slot>
    <iswc-doc-index class="indice" slot="start" placeholder="Buscar…  ( / )"></iswc-doc-index>
    <article class="hoja" aria-live="polite"><p class="cargando" role="status"><iswc-spinner></iswc-spinner>Cargando documentación…</p></article>
  </iswc-doc-layout>
  <iswc-dialog class="info-hoja" label="Información de la hoja" light-dismiss backdrop-variant="basic"><iswc-meta-list class="info-cuerpo"></iswc-meta-list></iswc-dialog>
`;


/** Quita el prefijo `NNN-`, la extensión y cambia guiones por espacios. */
const humano = (segmento: string): string => segmento.replace(/\.md$/i, '').replace(/^\d{3}-/, '').replace(/-/g, ' ');
const numero = (segmento: string): string => (segmento.match(/^(\d{3})-/) ?? [])[1] ?? '';
const escapar = (s: unknown): string => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const esExterno = (url: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url);
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === '' ? [] : [String(v)]);
/** Lista de hojas del libro (mismo contrato que `DocsVaultListaSchema`): rutas `.md` en orden de lectura. */
const esListaHojas = (v: unknown): v is string[] => Array.isArray(v) && v.every((r) => typeof r === 'string' && /\.md$/i.test(r));

/** Frontmatter YAML simple (clave: valor, listas `[a, b]`) y cuerpo. */
export function separarFrontmatter(texto: string): { meta: DocsVaultMeta; cuerpo: string } {
  const m = texto.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, cuerpo: texto };
  const meta: DocsVaultMeta = {};
  for (const linea of m[1]!.split(/\r?\n/)) {
    const kv = linea.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const valor = kv[2]!.trim();
    meta[kv[1]!] = valor.startsWith('[') ? valor.replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean) : valor;
  }
  return { meta, cuerpo: texto.slice(m[0].length) };
}

/** Texto plano aproximado de un markdown (búsqueda y tiempo de lectura). */
export const textoPlano = (md: string): string => md.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`|-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Resuelve `rel` contra la carpeta de `desde` (rutas del vault). */
export function resolverRuta(desde: string, rel: string): string {
  const partes = desde.split('/').slice(0, -1);
  for (const p of rel.split('/')) {
    if (p === '..') partes.pop();
    else if (p && p !== '.') partes.push(p);
  }
  return partes.join('/');
}

class IswcDocsVault extends HTMLElement {
  #raiz: ShadowRoot;
  #hojas: Hoja[] = [];
  #textos = new Map<string, string>();
  #actual = '';
  #nav: SpaState | null = null;
  #layout: Layout | null = null;
  /** Renderers extra del consumidor (se suman a los del lector; ver `iswc-md-render.renderers`). */
  renderers: DocsVaultRenderers | null = null;

  static get observedAttributes(): string[] {
    return ['main'];
  }

  constructor() {
    super();
    this.#raiz = this.attachShadow({ mode: 'open' });
    adoptCss(this.#raiz, import.meta.url);
  }

  connectedCallback(): void {
    if (this.#nav || this.#layout) return;
    this.#raiz.append(TEMPLATE.content.cloneNode(true));
    this.#layout = this.#raiz.querySelector<Layout>('iswc-doc-layout');
    this.#raiz.querySelector('.acciones-hoja .info')?.addEventListener('click', () => {
      const dialogo = this.#raiz.querySelector('iswc-dialog.info-hoja');
      if (dialogo) Reflect.set(dialogo, 'open', true);
    });
    this.#raiz.querySelector('iswc-doc-index')?.addEventListener('iswc-doc-index-select', (e) => {
      const id = e instanceof CustomEvent ? Reflect.get(Object(e.detail), 'id') : null;
      if (typeof id === 'string') this.irA(id);
    });
    // Clic en el índice de la hoja: la URL guarda la sección (?s=) y el layout hace el scroll.
    this.#layout?.addEventListener('iswc-doc-layout-navigate', (e) => {
      const id = e instanceof CustomEvent ? Reflect.get(Object(e.detail), 'id') : null;
      if (typeof id === 'string') this.#nav?.merge({ a: id });
    });
    addEventListener('keydown', this.#teclado);
    this.#iniciar().catch((e) => this.#mostrarError(e));
  }

  /** Cambiar `main` con el lector montado abre esa hoja (p. ej. desde el playground). */
  attributeChangedCallback(nombre: string, antes: string | null, ahora: string | null): void {
    if (nombre === 'main' && antes !== ahora && this.#nav) this.#nav.navigate({ p: this.main });
  }

  disconnectedCallback(): void {
    removeEventListener('keydown', this.#teclado);
    this.#nav?.destroy();
    this.#nav = null;
  }

  /** Base de las rutas (atributo `base`, por defecto la carpeta de la página). */
  get #base(): URL {
    return new URL(this.getAttribute('base') || './', document.baseURI);
  }

  /** Vista principal (atributo `main`, por defecto `README.md`). */
  get main(): string {
    return this.getAttribute('main') || 'README.md';
  }

  /** Layout documental que aloja al lector (`<iswc-doc-layout>`). */
  get layout(): Layout | null {
    return this.#layout;
  }

  /** Abre la hoja `ruta` (relativa al vault); `ancla` = id de un encabezado. */
  irA(ruta: string, ancla = ''): void {
    if (!this.#nav) return;
    // Navegación homogénea de la SPA: solo cambia `?s=` (sin recarga ni parpadeo).
    if (ruta === this.main && !ancla) this.#nav.clearQuery();
    else this.#nav.navigate(ancla ? { p: ruta, a: ancla } : { p: ruta });
  }

  #teclado = (e: KeyboardEvent): void => {
    const enCampo = e.composedPath().some((n) => n instanceof HTMLElement && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable));
    if (enCampo || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === '/') {
      e.preventDefault();
      if (this.#layout && !this.#layout.panels.start) this.#layout.toggleStart();
      requestAnimationFrame(() => this.#raiz.querySelector<Indice>('iswc-doc-index')?.focusSearch());
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const idx = this.#hojas.findIndex((h) => h.ruta === this.#actual);
      const otra = this.#hojas[idx + (e.key === 'ArrowRight' ? 1 : -1)];
      if (otra) {
        e.preventDefault();
        this.irA(otra.ruta);
      }
    }
  };

  async #iniciar(): Promise<void> {
    const fuente = this.querySelector('script[type="application/json"]');
    const crudas: unknown = fuente ? JSON.parse(fuente.textContent || '[]') : [];
    const embebidas = this.#embebidas().map(([ruta]) => ruta);
    const listado = esListaHojas(crudas) && crudas.length ? crudas : embebidas;
    const rutas = listado.includes(this.main) ? listado : [this.main, ...listado];
    // Todas las hojas de entrada: títulos, estado, tags y texto para índice y búsqueda.
    const leidas = await Promise.all(rutas.map(async (ruta) => {
      try {
        const { meta, cuerpo } = separarFrontmatter(await this.#leer(ruta));
        return { ruta, meta, plano: textoPlano(cuerpo) };
      } catch {
        return { ruta, meta: { Titulo: humano(ruta.split('/').pop() ?? ruta) }, plano: '', falta: true };
      }
    }));
    this.#hojas = leidas.map((h) => {
      const partes = h.ruta.split('/');
      return { ...h, modulo: partes.length > 1 ? partes[0]! : '', seccion: partes.length > 2 ? partes[1]! : '', nombre: partes[partes.length - 1]! };
    });
    this.#pintarIndice();
    this.#nav = createSpaState({
      initial: { p: this.main },
      viewOf: (s: EstadoSpa) => String(s.p ?? this.main),
      normalize: (crudo: unknown) => {
        const p0: unknown = crudo && typeof crudo === 'object' ? Reflect.get(crudo, 'p') : undefined;
        const a: unknown = crudo && typeof crudo === 'object' ? Reflect.get(crudo, 'a') : undefined;
        const p = typeof p0 === 'string' && this.#hojas.some((h) => h.ruta === p0) ? p0 : this.main;
        return typeof a === 'string' ? { p, a } : { p };
      },
    });
    this.#nav.subscribe((s) => this.#mostrar(s));
    this.#mostrar(this.#nav.get());
  }

  #mostrar(s: EstadoSpa): void {
    this.#abrir(String(s.p || this.main), typeof s.a === 'string' ? s.a : '').catch((e) => this.#mostrarError(e));
  }

  /** Hojas embebidas `<script type="text/markdown" data-path>`: [ruta, texto] en orden. */
  #embebidas(): Array<[string, string]> {
    return [...this.querySelectorAll('script[type="text/markdown"][data-path]')]
      .map((s): [string, string] => [s.getAttribute('data-path') ?? '', s.textContent ?? ''])
      .filter(([ruta]) => /\.md$/i.test(ruta));
  }

  async #leer(ruta: string): Promise<string> {
    const enCache = this.#textos.get(ruta);
    if (enCache !== undefined) return enCache;
    // Una hoja embebida se lee del DOM, sin red; las líneas pierden la sangría común del bloque.
    const embebida = this.#embebidas().find(([r]) => r === ruta);
    if (embebida) {
      const lineas = embebida[1].replace(/^\n+|\s+$/g, '').split('\n');
      const sangria = Math.min(...lineas.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
      const texto = lineas.map((l) => l.slice(Number.isFinite(sangria) ? sangria : 0)).join('\n') + '\n';
      this.#textos.set(ruta, texto);
      return texto;
    }
    const r = await fetch(new URL(ruta, this.#base), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
    const texto = await r.text();
    this.#textos.set(ruta, texto);
    return texto;
  }

  #titulo(h: Hoja): string {
    return (typeof h.meta.Titulo === 'string' && h.meta.Titulo) || humano(h.nombre);
  }

  /** Hojas del libro como ítems de `<iswc-doc-index>` (módulo → sección → hoja). */
  #pintarIndice(): void {
    const indice = this.#raiz.querySelector<Indice>('iswc-doc-index');
    if (!indice) return;
    indice.items = this.#hojas.map((h) => ({
      id: h.ruta,
      title: this.#titulo(h),
      pinned: h.ruta === this.main,
      icon: h.ruta === this.main ? '📖' : undefined,
      group: h.modulo ? `${numero(h.modulo)} · ${humano(h.modulo)}` : '',
      subgroup: h.seccion && !h.seccion.endsWith('.md') ? humano(h.seccion) : '',
      number: numero(h.nombre),
      keywords: [...lista(h.meta.tags), ...lista(h.meta.aliases)],
      text: h.plano,
      hint: h.ruta,
    }));
    this.#marcarActual();
  }

  #marcarActual(): void {
    const indice = this.#raiz.querySelector<Indice>('iswc-doc-index');
    if (indice) indice.current = this.#actual;
  }

  /**
   * Renderers de iswc-md-render para la hoja `ruta`:
   * - image: `<iswc-figure>` sin marco que se abre en una pestaña nueva (el consumidor puede cambiarlo).
   * - link: los `.md` del libro y las anclas navegan dentro de la SPA (`?s=`); el resto, a su URL.
   * - code: código inline como `<code>` en línea.
   */
  #renderers(ruta: string): DocsVaultRenderers {
    const url = (rel: string): string => (esExterno(rel) ? rel : new URL(resolverRuta(ruta, rel), this.#base).href);
    const nav = this.#nav!;
    return {
      image: ({ src, alt, title }) => `<iswc-figure src="${escapar(url(src))}" alt="${escapar(alt)}" caption="${escapar(title || alt)}" link loading="lazy"></iswc-figure>`,
      link: ({ href, html, title }) => {
        if (href.startsWith('#')) return `<a href="${escapar(nav.hrefFor({ p: ruta, a: href.slice(1) }))}">${html}</a>`;
        if (esExterno(href)) return undefined;
        const [archivo = '', ancla] = href.split('#');
        const hoja = /\.md$/i.test(archivo) ? resolverRuta(ruta, archivo) : '';
        // Un .md del libro navega en la SPA; uno de fuera es un enlace normal.
        const destino = hoja && this.#hojas.some((h) => h.ruta === hoja) ? nav.hrefFor(ancla ? { p: hoja, a: ancla } : { p: hoja }) : url(archivo);
        return `<a href="${escapar(destino)}"${title ? ` title="${escapar(title)}"` : ''}>${html}</a>`;
      },
      code: ({ code }) => `<code class="vault-code">${escapar(code)}</code>`,
      ...(this.renderers ?? {}),
    };
  }

  async #abrir(ruta: string, ancla: string): Promise<void> {
    const hoja = this.#raiz.querySelector<HTMLElement>('article.hoja');
    if (!hoja || !this.#layout) return;
    if (ruta !== this.#actual) {
      // Solo se muestra «cargando» si la hoja no está en caché: así el cambio no parpadea.
      if (!this.#textos.has(ruta)) hoja.innerHTML = '<p class="cargando" role="status"><iswc-spinner></iswc-spinner>Cargando hoja…</p>';
      const { meta, cuerpo } = separarFrontmatter(await this.#leer(ruta));
      // Imágenes de la hoja revalidadas contra el servidor: un SVG regenerado no se queda en la
      // caché HTTP del navegador.
      const sinCodigo = cuerpo.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      await Promise.all([...sinCodigo.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)]
        .map((m) => (esExterno(m[1]!) ? null : new URL(resolverRuta(ruta, m[1]!), this.#base).href))
        .filter((u): u is string => !!u)
        .map((u) => fetch(u, { cache: 'reload' }).catch(() => undefined)));
      const idx = this.#hojas.findIndex((h) => h.ruta === ruta);
      const ant = this.#hojas[idx - 1];
      const sig = this.#hojas[idx + 1];
      const partes = ruta.split('/');
      this.#actual = ruta;
      hoja.innerHTML = `
        <iswc-md-render></iswc-md-render>
        <iswc-pager class="pager" label="Hojas" prev="${ant ? escapar(this.#titulo(ant)) : ''}" next="${sig ? escapar(this.#titulo(sig)) : ''}"></iswc-pager>`;
      const render = hoja.querySelector<Render>('iswc-md-render')!;
      render.renderers = this.#renderers(ruta);
      render.value = cuerpo;
      this.#estilarRender(render);
      hoja.querySelector('iswc-pager')?.addEventListener('iswc-pager-navigate', (e) => {
        const dir = e instanceof CustomEvent ? Reflect.get(Object(e.detail), 'direction') : null;
        const otra = dir === 'prev' ? ant : sig;
        if (otra) this.irA(otra.ruta);
      });
      this.#pintarInfo(ruta, meta, cuerpo, idx);
      const titulo = (typeof meta.Titulo === 'string' && meta.Titulo) || humano(partes[partes.length - 1]!);
      const detail: DocsVaultPageDetail = { ruta, titulo, meta };
      this.dispatchEvent(new CustomEvent('iswc-docs-vault-page', { detail, bubbles: true, composed: true }));
      this.#marcarActual();
      this.#layout.scrollContentTo(0);
      await customElements.whenDefined('iswc-md-render').catch(() => undefined);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      this.#layout.refreshToc();
      // Diagramas y código se hidratan después: se relee el índice cuando se asienta.
      setTimeout(() => this.#layout?.refreshToc(), 600);
    }
    if (ancla) this.#layout.scrollToHeading(ancla);
  }

  /** Datos de la hoja (frontmatter + ubicación) en el modal de info y enlace del botón copiar. */
  #pintarInfo(ruta: string, meta: DocsVaultMeta, cuerpo: string, idx: number): void {
    const partes = ruta.split('/');
    const tags = lista(meta.tags);
    const alias = lista(meta.aliases).filter(Boolean);
    const minutos = Math.max(1, Math.round(textoPlano(cuerpo).split(' ').length / 200));
    const ubicacion = partes.length > 1 ? partes.slice(0, -1).map((p) => humano(p)) : ['Portada'];
    const titulo = (typeof meta.Titulo === 'string' && meta.Titulo) || humano(partes[partes.length - 1]!);
    const extra = Object.entries(meta).filter(([k]) => !['Titulo', 'Estado', 'Autor', 'tags', 'aliases'].includes(k));
    // Ficha de la hoja como <iswc-meta-list> (grupos clave → valor; filas sin valor se omiten).
    const ficha = this.#raiz.querySelector<ListaMeta>('iswc-dialog.info-hoja iswc-meta-list');
    if (ficha) {
      ficha.setAttribute('heading', titulo);
      ficha.groups = [
        { title: 'Ubicación', rows: [
          { label: 'Módulo', value: ubicacion[0] ?? '' },
          { label: 'Sección', value: ubicacion.slice(1).join(' · ') },
          { label: 'Posición', value: idx >= 0 ? `Hoja ${idx + 1} de ${this.#hojas.length}` : '' },
        ] },
        { title: 'Nota', rows: [
          { label: 'Estado', value: meta.Estado ? String(meta.Estado).replace(/-/g, ' ') : '' },
          { label: 'Autor', value: meta.Autor ? String(meta.Autor) : '', empty: 'Sin registrar' },
          { label: 'Lectura', value: `≈ ${minutos} min` },
        ] },
        { title: 'Clasificación', rows: [
          { label: 'Tags', tags: tags.map((t) => `#${t}`) },
          { label: 'También', value: alias.join(', ') },
        ] },
        { title: 'Otros datos', rows: extra.map(([k, v]) => ({ label: k, value: lista(v).join(', ') })) },
        { title: 'Archivo', rows: [{ label: 'Ruta', value: ruta, mono: true }] },
      ];
    }
    if (this.#nav) this.#raiz.querySelector('.acciones-hoja iswc-copy-button')?.setAttribute('value', this.#nav.hrefFor({ p: ruta }));
  }

  /** Hoja de estilos del lector dentro del shadow de iswc-md-render (código inline). */
  #estilarRender(render: HTMLElement): void {
    const sr = render.shadowRoot;
    if (!sr || sr.querySelector('style[data-vault]')) return;
    const st = document.createElement('style');
    st.dataset.vault = '';
    st.textContent = CSS_RENDER;
    sr.append(st);
  }

  #mostrarError(e: unknown): void {
    const hoja = this.#raiz.querySelector('article.hoja');
    if (hoja) hoja.innerHTML = `<iswc-callout color="danger" icon="mdi:alert-octagon-outline">No se pudo cargar la documentación: ${escapar(e instanceof Error ? e.message : String(e))}. Ábrala con un servidor (p. ej. Live Server): <code>file://</code> no permite <code>fetch</code>.</iswc-callout>`;
  }
}

defineElement('iswc-docs-vault', IswcDocsVault, 'IswcDocsVault');
