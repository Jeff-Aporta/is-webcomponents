import { adoptCss, defineElement } from '../../core/element.js';
import { crearNodo } from '../../core/dom-utils.js';
import { atributosDe, PropsElement } from '../../core/props-element.js';
import { SemanticSearchPropsSchema } from './schemas/semantic-search.schemas.js';
import type { SemanticComando, SemanticPaletaEl, SemanticSearchProps } from './schemas/semantic-search.schemas.js';
import './command-palette.js';
import '../actions/button.js';
import '../media/icon.js';

/**
 * <iswc-semantic-search> — búsqueda global: un botón que abre `iswc-command-palette` (Ctrl+K) con orden por significado.
 * No sabe de embeddings ni de ningún API: el consumidor inyecta por `props` el `ranker` (reordena los comandos) y `buscar`
 * (trae resultados extra). Sin ellos, o si fallan, queda el orden léxico de la paleta.
 *
 * Evento: `iswc-select { id, command }` (lo emite la paleta y cruza el shadow).
 * Métodos: open(), close().
 * CSS parts: abrir, texto, atajo.
 */

const INICIAL: SemanticSearchProps = {
  comandos: [],
  ranker: null,
  buscar: null,
  boton: 'Buscar…',
  etiqueta: 'Buscar',
  atajo: 'Ctrl K',
  hotkey: 'mod+k',
  placeholder: 'Busca lo que necesitas…',
  vacio: 'Nada coincide. Prueba con otras palabras.',
  maxResultados: 10,
};

/** Coincidencia léxica: el respaldo cuando hay `buscar` pero no `ranker`. */
const coincide = (c: SemanticComando, q: string): boolean => [c.title, c.hint ?? '', ...(c.keywords ?? [])].join(' ').toLowerCase().includes(q.toLowerCase());

class IswcSemanticSearch extends PropsElement<SemanticSearchProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #root: ShadowRoot;
  #paleta: SemanticPaletaEl | null = null;

  constructor() {
    super(INICIAL, SemanticSearchPropsSchema.partial());
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
  }

  open(): void { this.#paleta?.open(); }
  close(): void { this.#paleta?.close(); }

  #ordenar = async (q: string, comandos: SemanticComando[]): Promise<SemanticComando[]> => {
    const { ranker, buscar } = this.props;
    const [ordenados, extra] = await Promise.all([
      ranker ? Promise.resolve(ranker(q, comandos)).catch(() => []) : comandos.filter((c) => coincide(c, q)),
      buscar ? buscar(q).catch(() => []) : [],
    ]);
    return [...ordenados, ...extra];
  };

  /** La paleta lee sus comandos al conectarse, de un `<script type="application/json">` (texto plano: sin escapar como HTML). */
  #crearPaleta(): SemanticPaletaEl {
    const { comandos, hotkey, placeholder, vacio, maxResultados } = this.props;
    const datos = document.createElement('script');
    datos.type = 'application/json';
    datos.textContent = JSON.stringify(comandos);
    const paleta = crearNodo('iswc-command-palette', { hotkey, placeholder, 'max-results': maxResultados, 'empty-text': vacio }, datos) as SemanticPaletaEl;
    paleta.ranker = this.#ordenar;
    return paleta;
  }

  protected override pintar(): void {
    const { boton, etiqueta, atajo } = this.props;
    this.#paleta?.close();
    const abrir = crearNodo(
      'iswc-button',
      { class: 'abrir', part: 'abrir', variant: 'outlined', color: 'neutral', 'aria-label': etiqueta },
      crearNodo('iswc-icon', { slot: 'start', icon: 'mdi:magnify' }),
      crearNodo('span', { class: 'texto', part: 'texto' }, boton),
      atajo ? crearNodo('kbd', { part: 'atajo' }, atajo) : null,
    );
    abrir.addEventListener('iswc-click', () => this.open());
    this.#paleta = this.#crearPaleta();
    this.#root.replaceChildren(abrir, this.#paleta);
  }
}

defineElement('iswc-semantic-search', IswcSemanticSearch, 'IswcSemanticSearch');
