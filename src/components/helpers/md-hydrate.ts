/**
 * md-hydrate — carga perezosa de los componentes del kit que pintó el markdown.
 *
 * Recibe los tags que anotaron los renders por defecto de md-lite (no los de los hooks
 * del consumidor) y pide al loader solo los que siguen en el árbol:
 *   - livianos (aviso, separador, tabla, casilla, copiar, imagen): al pintar;
 *   - pesados (código, diagramas, HTML embebido): cuando el elemento se acerca a la pantalla.
 * Un tag ya definido no se pide; el loader, además, no repite cargas.
 */

import type { CrearVigiaMd, HidratacionMd, LoaderLike, NodoMd, RaizMd } from './md-hydrate.schemas.js';

export type * from './md-hydrate.schemas.js';

/** Se piden apenas se pinta: pesan poco y casi siempre están a la vista. */
const AL_PINTAR: ReadonlySet<string> = new Set([
  'iswc-callout', 'iswc-divider', 'iswc-scroller', 'iswc-checkbox', 'iswc-copy-button', 'iswc-theme-img', 'iswc-icon',
]);

/** Componentes que usan otro en su shadow sin importarlo (p. ej. el ícono del aviso). */
const DEPENDENCIAS: Readonly<Record<string, readonly string[]>> = {
  'iswc-callout': ['iswc-icon'],
  'iswc-scroller': ['iswc-icon'],
  'iswc-checkbox': ['iswc-icon'],
};

/** Margen para pedir un componente pesado antes de que llegue a la pantalla. */
const MARGEN_VISTA = '400px 0px';

function loader(): LoaderLike | null {
  const L = (globalThis as { ISWebComponentsLoader?: Partial<LoaderLike> }).ISWebComponentsLoader;
  return L && typeof L.ensure === 'function' ? { ensure: (tag: string) => L.ensure!(tag) } : null;
}

function definido(tag: string): boolean {
  return typeof customElements !== 'undefined' && Boolean(customElements.get(tag));
}

/** Pide un tag al loader; si ya está definido no lo toca. */
function pedir(tag: string): Promise<boolean> {
  if (definido(tag)) return Promise.resolve(true);
  const L = loader();
  if (!L) return Promise.resolve(false);
  return L.ensure(tag).catch((err: unknown) => {
    console.warn('[md-hydrate] ensure', tag, err);
    return false;
  });
}

/** De los `candidatos`, los que siguen presentes en `root` (orden alfabético). */
export function tagsPresentes<N extends NodoMd>(root: RaizMd<N>, candidatos: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const tag of candidatos) {
    const t = String(tag).toLowerCase();
    if (/^iswc-[a-z0-9-]+$/.test(t) && root.querySelector(t)) out.add(t);
  }
  return [...out].sort();
}

/** Reparte los tags presentes en "al pintar" (con dependencias) y "en vista". */
export function planHidratacion(presentes: readonly string[]): { alPintar: string[]; enVista: string[] } {
  const alPintar = new Set<string>();
  const enVista: string[] = [];
  for (const tag of presentes) {
    if (!AL_PINTAR.has(tag)) { enVista.push(tag); continue; }
    alPintar.add(tag);
    for (const dep of DEPENDENCIAS[tag] ?? []) alPintar.add(dep);
  }
  return { alPintar: [...alPintar].sort(), enVista };
}

/** Vigía por defecto: IntersectionObserver contra la pantalla, con margen para adelantarse. */
const vigiaPantalla: CrearVigiaMd<Element> = (alVer) => {
  if (typeof IntersectionObserver === 'undefined') return null;
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) alVer(e.target);
  }, { rootMargin: MARGEN_VISTA });
  return { observar: (n) => io.observe(n), dejar: (n) => io.unobserve(n), cancelar: () => io.disconnect() };
};

/**
 * Carga los componentes que `root` necesita de entre `candidatos` (los tags que anotaron los
 * renders por defecto). `crearVigia` decide cuándo un pesado "entra en vista".
 * Llamar `cancelar()` al volver a pintar o al desconectar el host.
 */
export function hidratarMd<N extends NodoMd>(
  root: RaizMd<N>,
  candidatos: Iterable<string>,
  crearVigia: CrearVigiaMd<N>,
): HidratacionMd {
  const { alPintar, enVista } = planHidratacion(tagsPresentes(root, candidatos));
  const listo = Promise.all(alPintar.map(async (t) => ((await pedir(t)) ? t : ''))).then((xs) => xs.filter(Boolean));
  const nada = (): void => {};

  const pendientes = enVista.filter((t) => !definido(t));
  if (!pendientes.length) return { listo, enEspera: [], cancelar: nada };

  const enEspera = new Set(pendientes);
  const vigia = crearVigia((nodo) => {
    const tag = nodo.localName;
    if (!enEspera.has(tag)) return;
    enEspera.delete(tag);
    for (const el of root.querySelectorAll(tag)) vigia?.dejar(el);
    void pedir(tag);
    if (!enEspera.size) vigia?.cancelar();
  });
  if (!vigia) {
    for (const t of pendientes) void pedir(t);
    return { listo, enEspera: [], cancelar: nada };
  }
  for (const tag of pendientes) for (const el of root.querySelectorAll(tag)) vigia.observar(el);
  return { listo, enEspera: pendientes, cancelar: () => vigia.cancelar() };
}

/** `hidratarMd` sobre el DOM real: los pesados se piden al acercarse a la pantalla. */
export function hydrateMdEmbeds(root: RaizMd<Element>, candidatos: Iterable<string>): HidratacionMd {
  return hidratarMd(root, candidatos, vigiaPantalla);
}
