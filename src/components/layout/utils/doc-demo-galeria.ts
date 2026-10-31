/**
 * doc-demo-galeria.ts — explorador de demos para cualquier app: el mismo `<iswc-doc-demo>` del kit alimentado por un
 * manifest, con los playground `iswc-preview/v1` de la app.
 *
 *   <script type="module" src="…/dist/cdn/preview/doc-demo-host.min.js"></script>
 *   <iswc-doc-demo brand="MiApp" sheets-cache="mi-app-sheets"></iswc-doc-demo>
 *
 *   await L.load(...tagsDeLaApp);
 *   const { montarGaleria } = await import(`${cdn}preview/doc-demo-galeria.min.js`);
 *   await montarGaleria({ manifest: new URL('manifest.json', location.href), categorias: { panel: 'Panel' } });
 *
 * `manifest.json` es `[{ tag, file }]`, con `file` relativo al manifest. Cada `file` es la definición del componente:
 * el nav se agrupa por su `category` y el demo lo pinta `<iswc-preview-component>`. Un `props` en un bloque `demo` se
 * asigna a `target.props` al montar; sus `controls` los aplica `<iswc-playground>`. Lo que no cumple se avisa y no se lista.
 */
import { collectIsTags, GALLERY_CHROME_TAGS } from '../../../cdn/collect-iswc-tags.js';
import { codificarEstado, leerEstado, readPanelsCompactPref, writePanelsCompactPref } from './doc-demo-estado.js';

type Bloque = { kind?: string; target?: string; props?: Record<string, unknown>; controls?: unknown[] };
type Definicion = { tag: string; navTitle?: string; title?: string; category?: string; sections: Array<{ id?: string; blocks?: Bloque[] }> };
type Montaje = { main?: ParentNode };
type Previsualizable = { definition: Definicion; mount(ctx: Montaje): void; unmount(): void };
type HostPreview = HTMLElement & { preview: Previsualizable | null };
type Loader = { load(...tags: string[]): Promise<unknown>; catalog?: { tags?: Record<string, unknown>; categories?: Record<string, unknown>; aliases?: Record<string, string> } };
type Cajon = HTMLElement & { show?(): void; hide?(): void };
type EstadoGaleria = { component?: string; panelsCompact?: boolean };

export type OpcionesGaleria = {
  /** URL de `[{ tag, file }]`. */
  manifest: string | URL;
  /** id de categoría → rótulo; el orden de las claves es el del nav. Las demás van después, por orden alfabético. */
  categorias?: Record<string, string>;
};

const TAGS_PLAYGROUND = ['iswc-playground', 'iswc-preview-controls', 'iswc-select', 'iswc-option', 'iswc-input', 'iswc-details'];

/** Mismo `?s=` que la galería del kit: un enlace conserva el componente abierto. */
function guardarEstado(cambio: EstadoGaleria): void {
  const estado = { ...leerEstado<EstadoGaleria>(), ...cambio };
  const dest = new URL(location.href);
  dest.hash = '';
  dest.search = `?s=${codificarEstado(estado)}`;
  history.replaceState(null, '', dest);
}

async function leerDefiniciones(manifest: string | URL): Promise<Definicion[]> {
  const base = new URL(manifest, location.href);
  const indice = await fetch(base).then((r) => r.json()) as Array<{ tag: string; file: string }>;
  const leidas = await Promise.all(indice.map(async (item) => {
    try {
      const def = await fetch(new URL(item.file, base)).then((r) => r.json()) as Definicion;
      if (def.tag === item.tag && Array.isArray(def.sections)) return def;
      console.warn(`[galería] ${item.file}: no cumple iswc-preview/v1`);
    } catch (e) {
      console.warn(`[galería] ${item.file}: no se pudo leer`, e);
    }
    return null;
  }));
  return leidas.filter((d): d is Definicion => d !== null);
}

/** Tags del kit que pinta el demo, sin los que el loader no resuelve (rechazarlos tumbaría toda la carga). */
function tagsDe(def: Definicion, L: Loader): string[] {
  const conControles = def.sections.some((s) => s.blocks?.some((b) => b.target && b.controls?.length));
  const tags = [...GALLERY_CHROME_TAGS, ...collectIsTags(def), ...(conControles ? TAGS_PLAYGROUND : [])];
  return [...new Set<string>(tags)].filter((t) => L.catalog?.tags?.[t] || L.catalog?.categories?.[L.catalog?.aliases?.[t] ?? t]);
}

/** Vuelca el shell como SPA: nav por categorías y selección en `?s=`; tema y paleta los pone el propio shell. */
export async function montarGaleria({ manifest, categorias = {} }: OpcionesGaleria): Promise<void> {
  const L = (globalThis as unknown as { iswcLoader: Loader }).iswcLoader;
  await customElements.whenDefined('iswc-doc-demo');
  const shell = document.querySelector('iswc-doc-demo') as HTMLElement & { whenReady(): Promise<unknown> };
  await shell.whenReady();
  await customElements.whenDefined('iswc-preview-component');

  const nav = document.getElementById('shellNav')!;
  const host = document.getElementById('previewHost') as HostPreview;
  const marco = document.getElementById('previewFrame');
  const marca = shell.getAttribute('brand') ?? '';
  if (marco) marco.hidden = true;
  host.hidden = false;
  // Los componentes de una app son de página, no botones sueltos: el escenario les da todo el ancho.
  const estilo = document.createElement('style');
  estilo.textContent = 'iswc-playground > [slot="stage"], iswc-demo.demo { inline-size: 100%; } iswc-demo.demo > * { flex: 1 1 auto; min-inline-size: 0; }';
  document.head.append(estilo);
  document.getElementById('fullscreenBtn')?.toggleAttribute('hidden', true);

  const defs = await leerDefiniciones(manifest);
  const seleccionar = async (def: Definicion): Promise<void> => {
    (document.getElementById('navDrawer') as Cajon | null)?.hide?.();
    await L.load(...tagsDe(def, L));
    if (Object.prototype.hasOwnProperty.call(host, 'preview')) Reflect.deleteProperty(host, 'preview');
    host.preview = {
      definition: def,
      unmount() {},
      mount({ main }) {
        for (const seccion of def.sections) {
          for (const b of seccion.blocks ?? []) {
            const destino = b.props && b.target ? (main as ParentNode | undefined)?.querySelector(b.target) : null;
            if (destino) (destino as HTMLElement & { props: unknown }).props = { ...b.props };
          }
        }
      },
    };
    for (const n of nav.querySelectorAll<HTMLElement>('.shell-nav__item')) n.setAttribute('aria-current', String(n.dataset.tag === def.tag));
    nav.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    document.title = `${def.navTitle ?? def.tag} | ${marca}`;
    guardarEstado({ component: def.tag });
  };

  const grupos = new Map<string, Definicion[]>();
  for (const def of defs) grupos.set(def.category ?? '', [...(grupos.get(def.category ?? '') ?? []), def]);
  const conocidas = Object.keys(categorias).filter((c) => grupos.has(c));
  const resto = [...grupos.keys()].filter((c) => !conocidas.includes(c)).sort((a, b) => a.localeCompare(b, 'es'));
  for (const categoria of [...conocidas, ...resto]) {
    const grupo = document.createElement('div');
    grupo.className = 'shell-nav__group';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', categorias[categoria] ?? categoria);
    const titulo = document.createElement('div');
    titulo.className = 'shell-nav__heading';
    titulo.textContent = categorias[categoria] ?? categoria;
    grupo.append(titulo);
    const lista = [...grupos.get(categoria)!].sort((a, b) => (a.navTitle ?? a.tag).localeCompare(b.navTitle ?? b.tag, 'es', { sensitivity: 'base' }));
    for (const def of lista) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'shell-nav__item';
      item.dataset.tag = def.tag;
      item.setAttribute('aria-label', `${def.navTitle ?? def.tag} ${def.tag}`);
      const nombre = document.createElement('span');
      nombre.className = 'shell-nav__title';
      nombre.textContent = def.navTitle ?? def.tag;
      const tag = document.createElement('span');
      tag.className = 'shell-nav__tag';
      tag.textContent = `<${def.tag}>`;
      item.append(nombre, tag);
      item.addEventListener('click', () => void seleccionar(def));
      grupo.append(item);
    }
    nav.append(grupo);
  }

  montarCompacto(nav);
  const pedido = leerEstado<EstadoGaleria>()?.component;
  const inicial = defs.find((d) => d.tag === pedido) ?? defs[0];
  if (inicial) await seleccionar(inicial);
  document.documentElement.setAttribute('data-app-ready', '');
}

/** En móvil, o con el botón de compactar, el catálogo se muda al cajón (mismo contrato que la galería del kit). */
function montarCompacto(nav: HTMLElement): void {
  const division = document.getElementById('mainSplit');
  const cajon = document.getElementById('navDrawer') as Cajon | null;
  const abrir = document.getElementById('navToggle');
  const boton = document.getElementById('panelsCompactBtn');
  if (!division || !cajon || !abrir) return;
  const movil = matchMedia('(max-width: 640px)');
  let compacto = leerEstado<EstadoGaleria>()?.panelsCompact === true || readPanelsCompactPref();
  const aplicar = (): void => {
    const enCajon = movil.matches || compacto;
    abrir.hidden = !enCajon;
    document.body.dataset.navLayout = enCajon ? 'drawer' : 'split';
    if (compacto) document.body.dataset.panelsCompact = '1';
    else delete document.body.dataset.panelsCompact;
    document.dispatchEvent(new Event('iswc-panels-compact-change'));
    boton?.setAttribute('aria-pressed', String(compacto));
    boton?.querySelector('iswc-icon')?.setAttribute('icon', compacto ? 'mdi:arrow-expand-horizontal' : 'mdi:arrow-collapse-horizontal');
    if (enCajon && nav.parentElement !== cajon) {
      nav.removeAttribute('slot');
      cajon.append(nav);
      division.setAttribute('collapse', 'start');
    } else if (!enCajon && nav.parentElement !== division) {
      cajon.hide?.();
      nav.setAttribute('slot', 'start');
      division.prepend(nav);
      division.removeAttribute('collapse');
    }
  };
  movil.addEventListener('change', aplicar);
  abrir.addEventListener('click', () => cajon.show?.());
  boton?.addEventListener('click', () => {
    compacto = !compacto;
    writePanelsCompactPref(compacto);
    guardarEstado({ panelsCompact: compacto || undefined });
    aplicar();
  });
  aplicar();
}
