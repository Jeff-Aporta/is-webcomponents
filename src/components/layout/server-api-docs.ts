import { adoptCss, defineElement, emit, upgradeProperties } from '../../core/element.js';
import { createSpaState } from '../../core/spa-state.js';
import { readIswc, removeIswc, writeIswc } from '../../core/iswc-storage.js';
import type { EstadoSpa, SpaState } from '../../core/schemas/spa-state.schemas.js';
import {
  ServerApiDocsLoginRespuestaSchema,
  ServerApiDocsSesionSchema,
  type ServerApiDocsCampo,
  type ServerApiDocsEstricto,
  type ServerApiDocsIndice,
  type ServerApiDocsLayout,
  type ServerApiDocsModelo,
  type ServerApiDocsOperacion,
  type ServerApiDocsPageDetail,
  type ServerApiDocsResponseDetail,
  type ServerApiDocsSesion,
  type ServerApiDocsValidacion,
} from './schemas/server-api-docs.schemas.js';
import {
  aOpenApi,
  COLOR_METODO,
  colorDeCodigo,
  curlDe,
  esMaterializable,
  ITERCERO_POR_DEFECTO,
  normalizarDocumentoApi,
  peticionLogin,
  secuenciaDeOperacion,
  urlDeOperacion,
  validarDocumentoApi,
  validarEstricto,
} from './utils/server-api-docs-md.js';
import './doc-layout.js';
import '../navigation/doc-index.js';
import '../navigation/pager.js';
import '../diagrams/sequence-diagram.js';
import '../code/code.js';
import '../feedback/tag.js';
import '../feedback/spinner.js';
import '../actions/copy-button.js';
import '../actions/button.js';
import '../actions/button-group.js';
import '../media/icon.js';
import '../forms/input.js';
import './dialog.js';
import './callout.js';

/**
 * <iswc-server-api-docs> — endpoints de la API de un SERVER al estilo Swagger (solo para servers: el
 * ISS la sirve en `GET /api/docs`). No es documentación en prosa: expone cada endpoint con su método,
 * ruta, sesión y permiso, parámetros, cuerpo y respuestas con sus schemas y ejemplos. Recibe el documento
 * que el server publica (InSoft `kind:"config"` u OpenAPI 3), lo valida con Zod, dice si admite el parse
 * estricto (InSoft v2, `server-api-docs-md.schemas.ts`) y lo pinta sobre `<iswc-doc-layout>`: la portada
 * es la tabla de endpoints con filtro, cada endpoint abre su detalle (con su diagrama de secuencia en
 * estilo InSoft) y «Probar» ejecuta la petición real con sesión.
 *
 * Entrada (la primera que haya): propiedad `doc` (`el.doc = obj`), `<script type="application/json">`
 * hijo, o atributo `src` (URL del JSON, p. ej. `/api/docs?v=json`).
 *
 * Attributes
 *   src        URL del documento (si no llega por propiedad ni por script hijo)
 *   api-base   base de «Probar» (default: `location.origin + "/api"`; sin http, el primer servidor del documento)
 *
 * Slots: brand (marca; default la del documento), actions (acciones de la app: tema, paleta).
 * Eventos: `iswc-server-api-docs-page` { id, titulo, metodo, ruta }, `iswc-server-api-docs-response`
 *   { id, url, status, ms }.
 * Propiedades: `doc`, `validacion` y `estricto` (solo lectura), `modelo` (solo lectura), `layout`, `irA(id)`.
 * CSS parts (del layout): bar, toc, content.
 */

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <iswc-doc-layout storage-key="iswc-server-api-docs" toc-title="En esta página" exportparts="bar, toc, content">
    <div slot="brand" class="marca"><slot name="brand"><iswc-icon class="marca-icono" icon="mdi:api"></iswc-icon><strong class="marca-titulo">API</strong></slot></div>
    <iswc-button-group class="acciones" slot="actions" variant="separated" label="Acciones de la documentación">
      <iswc-copy-button class="copiar" copy-label="Copiar enlace a esta página" success-label="Enlace copiado" tooltip="Copiar enlace"></iswc-copy-button>
      <iswc-button class="bajar-doc" variant="plain" color="brand" pill aria-label="Descargar el documento (JSON)" title="Descargar el documento (JSON)"><iswc-icon slot="start" icon="mdi:code-json"></iswc-icon></iswc-button>
      <iswc-button class="bajar-openapi" variant="plain" color="brand" pill aria-label="Descargar OpenAPI 3" title="Descargar OpenAPI 3"><iswc-icon slot="start" icon="mdi:file-export-outline"></iswc-icon></iswc-button>
      <iswc-button class="sesion" variant="plain" color="brand" pill aria-label="Sesión para Probar" title="Sesión para Probar"><iswc-icon slot="start" icon="mdi:account-key-outline"></iswc-icon><span class="sesion-texto">Sesión</span></iswc-button>
    </iswc-button-group>
    <slot name="actions" slot="actions"></slot>
    <iswc-doc-index class="indice" slot="start" placeholder="Buscar endpoint…  ( / )"></iswc-doc-index>
    <article class="pagina" aria-live="polite"><p class="cargando" role="status"><iswc-spinner></iswc-spinner>Esperando el documento…</p></article>
  </iswc-doc-layout>
  <iswc-dialog class="login" label="Sesión para «Probar»" light-dismiss backdrop-variant="basic">
    <div class="login-cuerpo">
      <p class="login-estado"></p>
      <iswc-input class="usuario" label="Usuario" autocomplete="username"></iswc-input>
      <iswc-input class="clave" label="Contraseña" type="password" password-toggle autocomplete="current-password"></iswc-input>
      <iswc-input class="token" label="… o pegue un token JWT"></iswc-input>
      <iswc-callout class="login-error" color="danger" icon="mdi:alert-octagon-outline" hidden></iswc-callout>
    </div>
    <div slot="footer" class="login-pie">
      <iswc-button class="salir" variant="plain" color="danger">Cerrar sesión</iswc-button>
      <iswc-button class="entrar" color="brand">Entrar</iswc-button>
    </div>
  </iswc-dialog>
`;

const CLAVE_SESION = 'server-api-docs:sesion';
const escapar = (s: unknown): string => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const idHtml = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const json = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v ?? null, null, 2));
const corto = (m: string): string => ({ delete: 'DEL', patch: 'PAT', query: 'QRY', options: 'OPT' }[m] ?? m.toUpperCase());
const tagMetodo = (m: string): string => `<iswc-tag class="metodo" color="${COLOR_METODO[m] ?? 'neutral'}" variant="filled">${escapar(m.toUpperCase())}</iswc-tag>`;
const codigo = (v: unknown, lang = 'json'): string => `<iswc-code lang="${lang}" readonly compact value="${escapar(json(v))}"></iswc-code>`;
const leerArchivo = (f: File): Promise<string> => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => mal(r.error);
  r.readAsDataURL(f);
});

class IswcServerApiDocs extends HTMLElement {
  #raiz: ShadowRoot;
  #doc: unknown = null;
  #modelo: ServerApiDocsModelo | null = null;
  #validacion: ServerApiDocsValidacion | null = null;
  #estricto: ServerApiDocsEstricto | null = null;
  #nav: SpaState | null = null;
  #layout: ServerApiDocsLayout | null = null;
  #actual: string | null = null;
  #base = '';

  static get observedAttributes(): string[] {
    return ['src', 'api-base'];
  }

  constructor() {
    super();
    this.#raiz = this.attachShadow({ mode: 'open' });
    adoptCss(this.#raiz, import.meta.url);
  }

  /** Documento del server (InSoft `kind:"config"` u OpenAPI 3). Asignarlo valida y repinta. */
  get doc(): unknown { return this.#doc; }
  set doc(v: unknown) {
    this.#doc = v;
    if (this.#layout) this.#cargar(v);
  }

  /** Resultado de validar el documento con Zod (`null` sin documento). */
  get validacion(): ServerApiDocsValidacion | null { return this.#validacion; }

  /** ¿Admite el parse estricto (InSoft v2)? `null` sin documento; `aplica: false` para OpenAPI 3. */
  get estricto(): ServerApiDocsEstricto | null { return this.#estricto; }

  /** Modelo normalizado que se está pintando (`null` si el documento no se pudo materializar). */
  get modelo(): ServerApiDocsModelo | null { return this.#modelo; }

  /** Layout documental que aloja al visor (`<iswc-doc-layout>`). */
  get layout(): ServerApiDocsLayout | null { return this.#layout; }

  /** Abre la operación `id` (`''` = portada). */
  irA(id: string): void {
    if (!this.#nav) return;
    if (!id) this.#nav.clearQuery();
    else this.#nav.navigate({ p: id });
  }

  connectedCallback(): void {
    upgradeProperties(this, ['doc']);
    if (this.#layout) return;
    this.#raiz.append(TEMPLATE.content.cloneNode(true));
    this.#layout = this.#raiz.querySelector<ServerApiDocsLayout>('iswc-doc-layout');
    this.#cablear();
    addEventListener('keydown', this.#teclado);
    if (this.#doc != null) return this.#cargar(this.#doc);
    const hijo = this.querySelector(':scope > script[type="application/json"]');
    if (hijo?.textContent?.trim()) return this.#cargarTexto(hijo.textContent);
    if (this.getAttribute('src')) this.#traer(this.getAttribute('src') ?? '');
  }

  attributeChangedCallback(nombre: string, antes: string | null, ahora: string | null): void {
    if (!this.#layout || antes === ahora) return;
    if (nombre === 'src' && ahora) this.#traer(ahora);
    if (nombre === 'api-base') this.#base = this.#baseInicial();
  }

  disconnectedCallback(): void {
    removeEventListener('keydown', this.#teclado);
    this.#nav?.destroy();
    this.#nav = null;
  }

  // ── Carga ──────────────────────────────────────────────────────────────────

  #cargarTexto(texto: string): void {
    try {
      this.#doc = JSON.parse(texto);
    } catch (e) {
      return this.#mostrarErrores([`(raíz): el JSON del documento no se puede leer: ${e instanceof Error ? e.message : String(e)}`]);
    }
    this.#cargar(this.#doc);
  }

  #traer(src: string): void {
    fetch(new URL(src, document.baseURI), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${src}: HTTP ${r.status}`))))
      .then((t) => this.#cargarTexto(t), (e: unknown) => this.#mostrarErrores([`(raíz): ${e instanceof Error ? e.message : String(e)}`]));
  }

  #cargar(doc: unknown): void {
    this.#validacion = validarDocumentoApi(doc);
    this.#estricto = validarEstricto(doc);
    if (!esMaterializable(doc)) {
      this.#modelo = null;
      return this.#mostrarErrores(this.#validacion.errores);
    }
    if (!this.#validacion.ok) console.warn(`[iswc-server-api-docs] el documento trae ${this.#validacion.errores.length} problema(s):\n${this.#validacion.errores.join('\n')}`);
    else if (this.#estricto.aplica && !this.#estricto.ok) console.warn(`[iswc-server-api-docs] el documento no admite el parse estricto (${this.#estricto.errores.length} error(es)):\n${this.#estricto.errores.join('\n')}`);
    this.#modelo = normalizarDocumentoApi(doc);
    this.#base = this.#baseInicial();
    this.#pintarMarca();
    this.#pintarIndice();
    this.#pintarSesion();
    this.#actual = null;
    if (this.#nav) return this.#mostrar(this.#nav.get());
    this.#nav = createSpaState({
      initial: {},
      viewOf: (s: EstadoSpa) => String(s.p ?? ''),
      normalize: (crudo: unknown) => {
        const p: unknown = crudo && typeof crudo === 'object' ? Reflect.get(crudo, 'p') : undefined;
        return typeof p === 'string' && this.#op(p) ? { p } : {};
      },
    });
    this.#nav.subscribe((s) => this.#mostrar(s));
    this.#mostrar(this.#nav.get());
  }

  #baseInicial(): string {
    const attr = this.getAttribute('api-base');
    if (attr) return attr.replace(/\/+$/, '');
    if (/^https?:$/.test(location.protocol)) return `${location.origin}/api`;
    return this.#modelo?.servidores[0]?.url ?? '';
  }

  /** Ids de las operaciones en el orden del índice (grupo → subgrupo): lo siguen el paginador y las flechas. */
  #orden(): string[] {
    return (this.#modelo?.grupos ?? []).flatMap((g) => g.subgrupos.flatMap((s) => s.operaciones));
  }

  #op(id: string): ServerApiDocsOperacion | undefined {
    return this.#modelo?.operaciones.find((o) => o.id === id);
  }

  // ── Pintado ────────────────────────────────────────────────────────────────

  #pintarMarca(): void {
    const m = this.#modelo;
    if (!m) return;
    this.#raiz.querySelector('.marca-titulo')!.textContent = m.marca.titulo;
    this.#raiz.querySelector('.marca-icono')?.setAttribute('icon', m.marca.icono);
  }

  #pintarIndice(): void {
    const indice = this.#raiz.querySelector<ServerApiDocsIndice>('iswc-doc-index');
    const m = this.#modelo;
    if (!indice || !m) return;
    indice.textos = { sinResultados: 'Ningún endpoint coincide.', resumen: `${m.operaciones.length} endpoints · {grupos} grupos` };
    const portada = { id: '', title: 'Endpoints', pinned: true, icon: '📋', text: m.descripcion, hint: m.titulo };
    indice.items = [portada, ...m.grupos.flatMap((g) => g.subgrupos.flatMap((s) => s.operaciones.flatMap((id) => {
      const op = this.#op(id);
      return op ? [{
        id,
        title: op.resumen,
        group: g.nombre,
        subgroup: g.subgrupos.length > 1 || s.id ? s.nombre : '',
        number: corto(op.metodo),
        keywords: [op.metodo, op.ruta, op.tag],
        text: `${op.ruta} ${op.descripcion} ${op.permiso} ${op.controller}`,
        hint: `${op.metodo.toUpperCase()} ${op.ruta}`,
      }] : [];
    })))];
    indice.current = this.#actual ?? '';
  }

  #mostrar(s: EstadoSpa): void {
    const id = typeof s.p === 'string' ? s.p : '';
    if (id === this.#actual) return;
    this.#actual = id;
    const pagina = this.#raiz.querySelector<HTMLElement>('article.pagina');
    const m = this.#modelo;
    if (!pagina || !m) return;
    const op = this.#op(id);
    pagina.innerHTML = op ? this.#htmlOperacion(op) : this.#htmlPortada(m);
    if (op) this.#cablearProbar(pagina, op);
    else this.#cablearFiltro(pagina);
    const indice = this.#raiz.querySelector<ServerApiDocsIndice>('iswc-doc-index');
    if (indice) indice.current = id;
    this.#raiz.querySelector('.acciones .copiar')?.setAttribute('value', new URL(this.#nav?.hrefFor(op ? { p: id } : {}) ?? location.href, location.href).href);
    const detail: ServerApiDocsPageDetail = { id, titulo: op?.resumen ?? m.titulo, metodo: op?.metodo ?? '', ruta: op?.ruta ?? '' };
    emit(this, 'iswc-server-api-docs-page', detail);
    this.#layout?.scrollContentTo(0);
    requestAnimationFrame(() => requestAnimationFrame(() => this.#layout?.refreshToc()));
    setTimeout(() => this.#layout?.refreshToc(), 600);
  }

  /** Estado del parse estricto: etiqueta en la cabecera y, si no lo admite, el error con su ruta JSON. */
  #htmlEstricto(): { tag: string; callout: string } {
    const e = this.#estricto;
    if (!e?.aplica) return { tag: '', callout: '' };
    if (e.ok) return { tag: '<iswc-tag class="estricto" color="success"><iswc-icon slot="start" icon="mdi:check-decagram-outline"></iswc-icon>Parse estricto</iswc-tag>', callout: '' };
    return {
      tag: '<iswc-tag class="estricto" color="danger"><iswc-icon slot="start" icon="mdi:alert-decagram-outline"></iswc-icon>Sin parse estricto</iswc-tag>',
      callout: `<iswc-callout class="estricto-errores" color="danger" icon="mdi:alert-decagram-outline"><strong>El documento no admite el parse estricto (${e.errores.length} error(es))</strong>: se muestra en modo tolerante.<ul>${e.errores.slice(0, 40).map((x) => `<li><code>${escapar(x)}</code></li>`).join('')}</ul></iswc-callout>`,
    };
  }

  /** Portada: la tabla de endpoints (método, ruta, resumen, grupo, sesión y permiso) con filtro y enlace al detalle. */
  #htmlPortada(m: ServerApiDocsModelo): string {
    const v = this.#validacion;
    const estricto = this.#htmlEstricto();
    const avisos = v && !v.ok
      ? `<iswc-callout class="avisos" color="warning" icon="mdi:alert-outline"><strong>El documento trae ${v.errores.length} aviso(s) de validación</strong> (se muestra igual):<ul>${v.errores.slice(0, 40).map((e) => `<li><code>${escapar(e)}</code></li>`).join('')}</ul></iswc-callout>`
      : '';
    const filas = this.#orden().map((id) => this.#op(id)).filter((o): o is ServerApiDocsOperacion => !!o).map((o) => {
      const buscable = [o.metodo, o.ruta, o.resumen, o.tag, o.permiso, o.controller].join(' ').toLowerCase();
      return `<tr data-buscar="${escapar(buscable)}">
          <td class="col-metodo">${tagMetodo(o.metodo)}</td>
          <td class="col-ruta"><a class="enlace" href="${escapar(this.#nav?.hrefFor({ p: o.id }) ?? '#')}" data-id="${escapar(o.id)}"><code class="ruta">${escapar(o.ruta).replace(/\//g, '/<wbr>')}</code></a></td>
          <td class="col-resumen">${escapar(o.resumen)}</td>
          <td class="col-grupo">${escapar(o.tag)}</td>
          <td class="col-auth">${o.sesion ? `<iswc-icon class="candado" icon="mdi:lock-outline" title="Requiere sesión"></iswc-icon><code class="permiso">${escapar(o.permiso || 'Bearer')}</code>` : '<span class="publico">Pública</span>'}</td>
        </tr>`;
    }).join('');
    return `
      <header class="cabecera">
        <h1 id="endpoints">${escapar(m.titulo)}</h1>
        <p class="meta">${m.version ? `<iswc-tag color="neutral">v${escapar(m.version)}</iswc-tag>` : ''}<iswc-tag color="brand">${m.operaciones.length} endpoints</iswc-tag><iswc-tag color="neutral">${m.formato === 'insoft' ? 'Documento InSoft' : 'OpenAPI 3'}</iswc-tag>${estricto.tag}</p>
        ${m.descripcion ? `<p class="lede">${escapar(m.descripcion)}</p>` : ''}
      </header>
      ${estricto.callout}
      ${avisos}
      <h2 id="tabla-endpoints">Endpoints</h2>
      <div class="filtro-linea">
        <iswc-input class="filtro" type="search" label="Filtrar endpoints" placeholder="Método, ruta, resumen, grupo o permiso"></iswc-input>
        <span class="conteo" role="status">${m.operaciones.length} de ${m.operaciones.length}</span>
      </div>
      <div class="tabla-envoltura">
        <table class="tabla endpoints">
          <thead><tr><th scope="col">Método</th><th scope="col">Ruta</th><th scope="col">Resumen</th><th scope="col">Grupo</th><th scope="col">Sesión · permiso</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <p class="sin-resultados" hidden>Ningún endpoint coincide con el filtro.</p>`;
  }

  #cablearFiltro(pagina: HTMLElement): void {
    const filtro = pagina.querySelector<ServerApiDocsCampo>('iswc-input.filtro');
    const conteo = pagina.querySelector('.conteo');
    const vacio = pagina.querySelector<HTMLElement>('.sin-resultados');
    const filas = [...pagina.querySelectorAll<HTMLElement>('table.endpoints tbody tr')];
    const aplicar = () => {
      const q = String(filtro?.value ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      let visibles = 0;
      for (const f of filas) {
        const ok = q.every((t) => (f.dataset.buscar ?? '').includes(t));
        f.hidden = !ok;
        if (ok) visibles++;
      }
      if (conteo) conteo.textContent = `${visibles} de ${filas.length}`;
      if (vacio) vacio.hidden = visibles > 0;
    };
    filtro?.addEventListener('input', aplicar);
    filtro?.addEventListener('change', aplicar);
    for (const a of pagina.querySelectorAll<HTMLAnchorElement>('table.endpoints a.enlace')) {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        this.irA(a.dataset.id ?? '');
      });
    }
  }

  #htmlOperacion(op: ServerApiDocsOperacion): string {
    const orden = this.#orden();
    const idx = orden.indexOf(op.id);
    const vecino = (d: number): string => this.#op(orden[idx + d] ?? '')?.resumen ?? '';
    const params = (en: string) => op.parametros.filter((p) => p.en === en);
    const tabla = op.parametros.length ? `
      <h2 id="parametros">Parámetros</h2>
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>En</th><th>Tipo</th><th>Descripción</th></tr></thead>
        <tbody>${op.parametros.map((p) => `<tr><td><code>${escapar(p.nombre)}</code>${p.requerido ? ' <span class="req" title="Requerido">*</span>' : ''}</td><td>${escapar(p.en)}</td><td><code>${escapar(p.tipo)}</code></td><td>${escapar(p.descripcion)}${p.ejemplo !== undefined ? ` <span class="ej">Ej.: <code>${escapar(json(p.ejemplo))}</code></span>` : ''}</td></tr>`).join('')}</tbody>
      </table>` : '';
    const cuerpo = op.cuerpo ? `
      <h2 id="cuerpo">Cuerpo de la petición${op.cuerpo.requerido ? ' <span class="req" title="Requerido">*</span>' : ''}</h2>
      <p>${escapar(op.cuerpo.descripcion)}</p>
      ${op.cuerpo.schema !== undefined ? `<h3 id="cuerpo-schema">Schema</h3>${codigo(op.cuerpo.schema)}` : ''}
      ${op.cuerpo.ejemplo !== undefined ? `<h3 id="cuerpo-ejemplo">Ejemplo</h3>${codigo(op.cuerpo.ejemplo)}` : ''}` : '';
    const respuestas = op.respuestas.map((r) => `
      <h3 id="r-${escapar(r.codigo)}"><iswc-tag color="${colorDeCodigo(r.codigo)}">${escapar(r.codigo)}</iswc-tag> ${escapar(r.descripcion)}</h3>
      ${r.schema !== undefined ? `<p class="etiqueta-bloque">Schema</p>${codigo(r.schema)}` : ''}
      ${r.ejemplo !== undefined ? `<p class="etiqueta-bloque">Ejemplo</p>${codigo(r.ejemplo, typeof r.ejemplo === 'string' ? 'plaintext' : 'json')}` : ''}`).join('');
    const secuencia = JSON.stringify(secuenciaDeOperacion(op, this.#modelo?.marca.titulo ?? 'API')).replace(/</g, '\\u003c');
    const campo = (en: string, p: { nombre: string; requerido: boolean; descripcion: string; ejemplo?: unknown }) =>
      `<iswc-input class="campo" data-en="${en}" data-nombre="${escapar(p.nombre)}" label="${escapar(p.nombre)}${p.requerido ? ' *' : ''}" hint="${escapar(p.descripcion)}" value="${p.ejemplo !== undefined ? escapar(typeof p.ejemplo === 'string' ? p.ejemplo : JSON.stringify(p.ejemplo)) : ''}"></iswc-input>`;
    const servidores = this.#modelo?.servidores ?? [];
    return `
      <header class="cabecera">
        <p class="linea">${tagMetodo(op.metodo)}<code class="ruta">${escapar(op.ruta)}</code></p>
        <h1 id="operacion">${escapar(op.resumen)}</h1>
        ${op.descripcion ? `<p class="lede">${escapar(op.descripcion)}</p>` : ''}
      </header>
      <h2 id="acceso">Acceso</h2>
      <table class="tabla ficha">
        <tbody>
          <tr><th scope="row">Grupo</th><td>${escapar(op.tag)}</td></tr>
          <tr><th scope="row">Sesión</th><td>${op.sesion ? '<iswc-tag color="warning"><iswc-icon slot="start" icon="mdi:lock-outline"></iswc-icon>Bearer JWT</iswc-tag>' : '<iswc-tag color="success"><iswc-icon slot="start" icon="mdi:lock-open-variant-outline"></iswc-icon>Pública</iswc-tag>'}</td></tr>
          ${op.permiso ? `<tr><th scope="row">Permiso</th><td><code>${escapar(op.permiso)}</code></td></tr>` : ''}
          ${op.controller ? `<tr><th scope="row">Controller</th><td><code>${escapar(op.controller)}</code></td></tr>` : ''}
        </tbody>
      </table>
      ${tabla}
      ${cuerpo}
      <h2 id="respuestas">Respuestas</h2>
      ${respuestas}
      <h2 id="flujo">Flujo</h2>
      <div class="lienzo-insoft" data-theme="light"><iswc-sequence-diagram class="secuencia" diagram-style="insoft" open-on-click><script type="application/json">${secuencia}</script></iswc-sequence-diagram></div>
      <h2 id="probar">Probar</h2>
      <form class="probar" onsubmit="return false">
        <iswc-input class="base" label="Servidor (base de la API)" value="${escapar(this.#base)}"></iswc-input>
        ${servidores.length ? `<p class="servidores">${servidores.map((s) => `<iswc-button class="servidor" size="sm" variant="outlined" data-url="${escapar(s.url)}" title="${escapar(s.url)}">${escapar(s.descripcion || s.url)}</iswc-button>`).join('')}</p>` : ''}
        ${params('path').map((p) => campo('path', p)).join('')}
        ${params('query').map((p) => campo('query', p)).join('')}
        ${op.cuerpo ? `<label class="etiqueta">Cuerpo (JSON)</label><iswc-code class="cuerpo-editor" lang="json" min-height="8rem" value="${escapar(op.cuerpo.ejemplo === undefined ? '' : json(op.cuerpo.ejemplo))}"></iswc-code>` : ''}
        ${op.adjuntos.map((a) => `<label class="adjunto">${a.tipo === 'images' ? 'Imágenes' : 'Audios'} → <code>${escapar(a.campo)}</code> (máx. ${a.max})<input type="file" multiple data-campo="${escapar(a.campo)}" data-max="${a.max}" accept="${a.tipo === 'images' ? 'image/*' : 'audio/*'}"></label>`).join('')}
        <p class="enviar-linea"><iswc-button class="enviar" color="${COLOR_METODO[op.metodo] ?? 'brand'}"><iswc-icon slot="start" icon="mdi:send"></iswc-icon>Enviar ${escapar(op.metodo.toUpperCase())}</iswc-button><span class="sesion-aviso"></span></p>
      </form>
      <div class="respuesta" hidden>
        <p class="estado-linea"><iswc-tag class="estado" color="neutral"></iswc-tag><span class="tiempo"></span></p>
        <iswc-code class="salida" lang="json" readonly></iswc-code>
      </div>
      <h3 id="curl">cURL</h3>
      <iswc-code class="curl" lang="plaintext" readonly compact></iswc-code>
      <iswc-pager class="pager" label="Operaciones" prev="${escapar(vecino(-1))}" next="${escapar(vecino(1))}"></iswc-pager>`;
  }

  #mostrarErrores(errores: string[]): void {
    const pagina = this.#raiz.querySelector('article.pagina');
    if (pagina) pagina.innerHTML = `<iswc-callout class="errores" color="danger" icon="mdi:alert-octagon-outline"><strong>El documento de la API no se puede mostrar</strong><ul>${errores.map((e) => `<li><code>${escapar(e)}</code></li>`).join('')}</ul></iswc-callout>`;
  }

  // ── «Probar» ───────────────────────────────────────────────────────────────

  #valores(form: HTMLElement): { path: Record<string, string>; query: Record<string, string>; base: string; cuerpo: string } {
    const v: { path: Record<string, string>; query: Record<string, string> } = { path: {}, query: {} };
    for (const c of form.querySelectorAll<ServerApiDocsCampo>('iswc-input.campo')) (c.dataset.en === 'path' ? v.path : v.query)[c.dataset.nombre ?? ''] = String(c.value ?? '').trim();
    const base = String(form.querySelector<ServerApiDocsCampo>('iswc-input.base')?.value ?? this.#base).trim();
    return { ...v, base, cuerpo: String(form.querySelector<ServerApiDocsCampo>('iswc-code.cuerpo-editor')?.value ?? '') };
  }

  #cablearProbar(pagina: HTMLElement, op: ServerApiDocsOperacion): void {
    const form = pagina.querySelector<HTMLElement>('form.probar');
    const curl = pagina.querySelector<ServerApiDocsCampo>('iswc-code.curl');
    if (!form || !curl) return;
    const actualizarCurl = () => {
      const v = this.#valores(form);
      curl.value = curlDe(v.base, op, { ...v, token: this.#sesion()?.token, ocultarToken: true });
    };
    actualizarCurl();
    form.addEventListener('input', actualizarCurl);
    form.addEventListener('change', actualizarCurl);
    for (const b of form.querySelectorAll<HTMLElement>('iswc-button.servidor')) {
      b.addEventListener('click', () => {
        const base = form.querySelector<ServerApiDocsCampo>('iswc-input.base');
        if (base) base.value = b.dataset.url ?? '';
        this.#base = b.dataset.url ?? this.#base;
        actualizarCurl();
      });
    }
    const aviso = form.querySelector('.sesion-aviso');
    if (aviso && op.sesion && !this.#sesion()) aviso.textContent = 'Requiere sesión: use el botón de sesión de la barra.';
    form.querySelector('iswc-button.enviar')?.addEventListener('click', () => { this.#enviar(pagina, form, op); });
    pagina.querySelector('iswc-pager')?.addEventListener('iswc-pager-navigate', (e) => {
      const orden = this.#orden();
      const dir = e instanceof CustomEvent ? Reflect.get(Object(e.detail), 'direction') : null;
      const otra = orden[orden.indexOf(op.id) + (dir === 'prev' ? -1 : 1)];
      if (otra) this.irA(otra);
    });
  }

  async #enviar(pagina: HTMLElement, form: HTMLElement, op: ServerApiDocsOperacion): Promise<void> {
    if (op.confirmar && !confirm(`${op.confirmar.titulo}\n\n${op.confirmar.mensaje}`)) return;
    const v = this.#valores(form);
    this.#base = v.base;
    const caja = pagina.querySelector<HTMLElement>('.respuesta');
    const estado = pagina.querySelector<HTMLElement>('iswc-tag.estado');
    const tiempo = pagina.querySelector<HTMLElement>('.tiempo');
    const salida = pagina.querySelector<ServerApiDocsCampo>('iswc-code.salida');
    if (!caja || !estado || !tiempo || !salida) return;
    caja.hidden = false;
    const faltan = op.parametros.filter((p) => p.en === 'path' && !v.path[p.nombre]).map((p) => p.nombre);
    if (faltan.length) return this.#estado(estado, tiempo, salida, 'neutral', 'Faltan datos', '', `Parámetros de ruta sin valor: ${faltan.join(', ')}`);
    let cuerpo: unknown = undefined;
    if (v.cuerpo.trim()) {
      try {
        cuerpo = JSON.parse(v.cuerpo);
      } catch (e) {
        return this.#estado(estado, tiempo, salida, 'danger', 'JSON inválido', '', e instanceof Error ? e.message : String(e));
      }
    }
    for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"][data-campo]')) {
      const archivos = [...(input.files ?? [])].slice(0, Number(input.dataset.max) || 5);
      if (!archivos.length) continue;
      const base = cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo) ? { ...cuerpo } : {};
      cuerpo = { ...base, [input.dataset.campo ?? 'archivos']: await Promise.all(archivos.map(leerArchivo)) };
    }
    const url = urlDeOperacion(v.base, op, v);
    const token = this.#sesion()?.token;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    this.#estado(estado, tiempo, salida, 'neutral', 'Enviando…', '', '');
    const t0 = performance.now();
    let res: Response;
    try {
      res = await fetch(url, { method: op.metodo.toUpperCase(), headers, ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}) });
    } catch (e) {
      return this.#estado(estado, tiempo, salida, 'danger', 'Sin conexión', '', `No se pudo conectar con ${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const tipo = res.headers.get('content-type') ?? '';
    let texto = '';
    const lector = res.body?.getReader();
    const dec = new TextDecoder();
    for (let r = await lector?.read(); r && !r.done; r = await lector?.read()) {
      texto += dec.decode(r.value, { stream: true });
      if (tipo.includes('event-stream')) this.#estado(estado, tiempo, salida, colorDeCodigo(res.status), `${res.status} ${res.statusText}`, `${Math.round(performance.now() - t0)} ms`, texto, 'plaintext');
    }
    if (!lector) texto = await res.text();
    const ms = Math.round(performance.now() - t0);
    let bonito = texto;
    if (tipo.includes('json')) {
      try { bonito = JSON.stringify(JSON.parse(texto), null, 2); } catch { bonito = texto; }
    }
    this.#estado(estado, tiempo, salida, colorDeCodigo(res.status), `${res.status} ${res.statusText}`, `${ms} ms`, bonito, tipo.includes('json') ? 'json' : 'plaintext');
    const detail: ServerApiDocsResponseDetail = { id: op.id, url, status: res.status, ms };
    emit(this, 'iswc-server-api-docs-response', detail);
    if (res.status === 401 && this.#modelo?.auth) this.#abrirLogin('La sesión no es válida o expiró: vuelva a iniciarla.');
  }

  #estado(estado: HTMLElement, tiempo: HTMLElement, salida: ServerApiDocsCampo, color: string, texto: string, ms: string, cuerpo: string, lang = 'plaintext'): void {
    estado.setAttribute('color', color);
    estado.textContent = texto;
    tiempo.textContent = ms;
    salida.setAttribute('lang', lang);
    salida.value = cuerpo;
  }

  // ── Sesión ─────────────────────────────────────────────────────────────────

  #sesion(): ServerApiDocsSesion | null {
    const crudo = readIswc(CLAVE_SESION, 'session');
    if (!crudo) return null;
    try {
      const r = ServerApiDocsSesionSchema.safeParse(JSON.parse(crudo));
      return r.success ? r.data : null;
    } catch {
      return null;
    }
  }

  #pintarSesion(): void {
    const s = this.#sesion();
    const texto = this.#raiz.querySelector('.sesion-texto');
    if (texto) texto.textContent = s ? (s.usuario.split(/[\s.@]+/)[0] || 'Sesión') : 'Iniciar sesión';
    this.#raiz.querySelector('iswc-button.sesion')?.setAttribute('color', s ? 'success' : 'brand');
    const salir = this.#raiz.querySelector<HTMLElement>('.login iswc-button.salir');
    if (salir) salir.hidden = !s;
  }

  #abrirLogin(mensaje = ''): void {
    const dialogo = this.#raiz.querySelector('iswc-dialog.login');
    const s = this.#sesion();
    const estado = this.#raiz.querySelector('.login-estado');
    const auth = this.#modelo?.auth;
    if (estado) estado.textContent = mensaje || (s ? `Sesión iniciada como ${s.usuario}.` : auth ? `Inicie sesión contra ${auth.loginUrl || this.#base} (${auth.proveedor}) o pegue un token.` : 'El documento no declara login: pegue un token JWT.');
    for (const c of this.#raiz.querySelectorAll<HTMLElement>('.login iswc-input.usuario, .login iswc-input.clave')) c.hidden = !auth;
    this.#raiz.querySelector<HTMLElement>('.login-error')?.setAttribute('hidden', '');
    if (dialogo) Reflect.set(dialogo, 'open', true);
  }

  async #entrar(): Promise<void> {
    const campo = (c: string) => String(this.#raiz.querySelector<ServerApiDocsCampo>(`.login iswc-input.${c}`)?.value ?? '').trim();
    const error = this.#raiz.querySelector<HTMLElement>('.login-error');
    const fallo = (msg: string) => {
      if (!error) return;
      error.textContent = msg;
      error.removeAttribute('hidden');
    };
    const pegado = campo('token').replace(/^bearer\s+/i, '');
    if (pegado) return this.#guardarSesion({ token: pegado, usuario: campo('usuario') || 'token' });
    const auth = this.#modelo?.auth;
    if (!auth) return fallo('Pegue un token JWT: el documento no declara cómo iniciar sesión.');
    if (!campo('usuario') || !campo('clave')) return fallo('Escriba usuario y contraseña.');
    let itercero = '';
    for (let intento = 0; intento < 2; intento++) {
      const pet = peticionLogin(auth, this.#base, campo('usuario'), campo('clave'), itercero);
      let res: Response;
      try {
        res = await fetch(pet.endpoint, { method: 'POST', headers: pet.headers, body: JSON.stringify(pet.body) });
      } catch {
        return fallo(`No se pudo conectar con el servicio de autenticación (${pet.endpoint}).`);
      }
      const datos: unknown = await res.json().catch(() => ({}));
      const ok = ServerApiDocsLoginRespuestaSchema.safeParse(datos);
      if (res.ok && ok.success) return this.#guardarSesion({ token: ok.data.token, usuario: campo('usuario') });
      if (Reflect.get(Object(datos), 'code') === 'MULTI_EMPRESA' && !itercero) {
        itercero = ITERCERO_POR_DEFECTO;
        continue;
      }
      const msg = Reflect.get(Object(datos), 'message') ?? Reflect.get(Object(datos), 'error') ?? Reflect.get(Object(Reflect.get(Object(datos), 'encabezado')), 'mensaje');
      return fallo(`Login rechazado (${res.status}): ${typeof msg === 'string' && msg ? msg : res.statusText || 'sin detalle'}`);
    }
  }

  /** Guarda (o, con `null`, cierra) la sesión y repinta la página actual (el cURL y los avisos la usan). */
  #guardarSesion(s: ServerApiDocsSesion | null): void {
    if (s) writeIswc(CLAVE_SESION, JSON.stringify(s), 'session');
    else removeIswc(CLAVE_SESION, 'session');
    this.#pintarSesion();
    const dialogo = this.#raiz.querySelector('iswc-dialog.login');
    if (dialogo) Reflect.set(dialogo, 'open', false);
    const actual = this.#actual;
    this.#actual = null;
    this.#mostrar(actual ? { p: actual } : {});
  }

  // ── Cableado ───────────────────────────────────────────────────────────────

  #cablear(): void {
    const q = (s: string) => this.#raiz.querySelector(s);
    q('iswc-doc-index')?.addEventListener('iswc-doc-index-select', (e) => {
      const id = e instanceof CustomEvent ? Reflect.get(Object(e.detail), 'id') : null;
      if (typeof id === 'string') this.irA(id);
    });
    q('.acciones .sesion')?.addEventListener('click', () => this.#abrirLogin());
    q('.login iswc-button.entrar')?.addEventListener('click', () => { this.#entrar(); });
    q('.login iswc-button.salir')?.addEventListener('click', () => this.#guardarSesion(null));
    q('.acciones .bajar-doc')?.addEventListener('click', () => {
      if (this.#doc != null) this.#descargar(this.#modelo?.exportes.documento ?? 'api.docs.json', this.#doc);
    });
    q('.acciones .bajar-openapi')?.addEventListener('click', () => {
      if (this.#modelo) this.#descargar(this.#modelo.exportes.openapi, aOpenApi(this.#modelo, this.#base));
    });
  }

  #descargar(nombre: string, datos: unknown): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  #teclado = (e: KeyboardEvent): void => {
    const enCampo = e.composedPath().some((n) => n instanceof HTMLElement && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable || n.tagName === 'ISWC-CODE' || n.tagName === 'ISWC-INPUT'));
    if (enCampo || e.altKey || e.ctrlKey || e.metaKey || !this.#modelo) return;
    if (e.key === '/') {
      e.preventDefault();
      if (this.#layout && !this.#layout.panels.start) this.#layout.toggleStart();
      requestAnimationFrame(() => this.#raiz.querySelector<ServerApiDocsIndice>('iswc-doc-index')?.focusSearch());
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const ids = ['', ...this.#orden()];
    const otro = ids[ids.indexOf(this.#actual ?? '') + (e.key === 'ArrowRight' ? 1 : -1)];
    if (otro === undefined) return;
    e.preventDefault();
    this.irA(otro);
  };
}

defineElement('iswc-server-api-docs', IswcServerApiDocs, 'IswcServerApiDocs');
