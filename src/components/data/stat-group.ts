import { adoptCss, defineElement } from '../../core/element.js';
import { crearNodo } from '../../core/dom-utils.js';
import { atributosDe, PropsElement } from '../../core/props-element.js';
import { StatGroupPropsSchema } from './schemas/stat-group.schemas.js';
import type { StatGroupItem, StatGroupProps } from './schemas/stat-group.schemas.js';
import './stat.js';
import '../isp/grid-layout.js';
import '../feedback/skeleton.js';

/**
 * <iswc-stat-group> — fila de indicadores: `iswc-stat` en una rejilla que se acomoda al ancho. Con `items: null` pinta
 * esqueletos. Un refresco con los mismos `id` en el mismo orden solo actualiza los atributos: ni repinta ni parpadea.
 *
 * CSS parts: rejilla, kpi.
 * CSS custom properties: --iswc-stat-group-radius, --iswc-stat-group-border, --iswc-stat-group-tint,
 *   --iswc-stat-group-shadow, --iswc-stat-group-value-font, --iswc-stat-group-value-spacing, --iswc-stat-group-value-glow.
 */

const INICIAL: StatGroupProps = { items: null, esqueletos: 4 };
const CELDAS = 'repeat(auto-fit, minmax(min(100%, 9.5em), 1fr))';

function aplicar(el: Element, k: StatGroupItem): void {
  const atributos = { label: k.label, value: k.value, helper: k.helper, icon: k.icon, color: k.color, trend: k.trend, 'trend-direction': k.trendDirection };
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (!valor) el.removeAttribute(nombre);
    else if (el.getAttribute(nombre) !== valor) el.setAttribute(nombre, valor);
  }
}

class IswcStatGroup extends PropsElement<StatGroupProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #root: ShadowRoot;

  constructor() {
    super(INICIAL, StatGroupPropsSchema.partial());
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
  }

  protected override pintar(): void {
    const { items, esqueletos } = this.props;
    const stats = [...this.#root.querySelectorAll<HTMLElement>('.kpi')];
    if (items && stats.length === items.length && stats.every((s, i) => s.dataset.id === items[i]!.id)) {
      items.forEach((k, i) => aplicar(stats[i]!, k));
      return;
    }
    const celdas = items
      ? items.map((k) => {
          const stat = crearNodo('iswc-stat', { class: 'kpi', part: 'kpi', 'data-id': k.id });
          aplicar(stat, k);
          return stat;
        })
      : Array.from({ length: esqueletos }, () => crearNodo('iswc-skeleton', { class: 'esqueleto' }));
    this.#root.replaceChildren(crearNodo('iswc-grid-layout', { class: 'rejilla', part: 'rejilla', cells: CELDAS, 'aria-busy': items ? null : 'true' }, ...celdas));
  }
}

defineElement('iswc-stat-group', IswcStatGroup, 'IswcStatGroup');
