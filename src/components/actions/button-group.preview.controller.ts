/**
 * Preview controlador de <iswc-button-group>.
 * Estructura = definition (datos). Comportamiento = mount() con funciones reales.
 */
import { ISComponentPreview } from '../../previews/_kit/ISComponentPreview.js';
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface ButtonGroupEl extends HTMLElement {
  orientation: 'horizontal' | 'vertical';
  variant: 'joined' | 'segmented' | 'separated';
  pill: boolean;
  value: string | string[] | null;
}

interface GroupChangeDetail { value: string | string[] | null }

const STYLES = /* css */ `
  .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
  .stack { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
  .field { display: grid; gap: 0.4rem; justify-items: start; }
  .field > .cap {
    font-family: "JetBrains Mono", var(--iswc-mono);
    font-size: 0.7rem;
    color: var(--iswc-text-dim);
  }
  .native-demo {
    font: inherit;
    padding: 0.55em 1em;
    border: 1px solid var(--iswc-border);
    background: var(--iswc-control-bg);
    color: var(--iswc-text);
    cursor: pointer;
  }
`;

export class ButtonGroupPreview extends ISComponentPreview {
  constructor() {
    super({
      $schema: 'iswc-preview/v1',
      tag: 'iswc-button-group',
      category: 'actions',
      title: '<iswc-button-group>',
      titleHtml: true,
      description: 'Documentación y demos del componente iswc-button-group de InSoft.',
      storageKey: 'docs-iswc-button-group',
      styles: STYLES,
      sections: [
        {
          id: 'intro',
          title: '<iswc-button-group>',
          titleHtml: true,
          lede: 'Agrupa botones relacionados en una sola unidad visual y, si se lo pides, gestiona cuál está activo. Sirve para controles segmentados, toolbars y split buttons.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <div class="field">
                    <span class="cap">appearance="segmented" · select="single" · <code class="code">hue</code> por botón</span>
                    <iswc-button-group label="Vista" variant="segmented" select="single" value="lista">
                      <iswc-button variant="plain" value="lista" hue="210">
                        <iswc-icon slot="start" icon="mdi:format-list-bulleted"></iswc-icon>
                        Lista
                      </iswc-button>
                      <iswc-button variant="plain" value="tabla" hue="160">
                        <iswc-icon slot="start" icon="mdi:table"></iswc-icon>
                        Tabla
                      </iswc-button>
                      <iswc-button variant="plain" value="tarjetas" hue="35">
                        <iswc-icon slot="start" icon="mdi:view-grid-outline"></iswc-icon>
                        Tarjetas
                      </iswc-button>
                    </iswc-button-group>
                  </div>
                  <p class="lede" id="introLog">vista: <code class="code">lista</code></p>
                </div>`,
            },
            {
              kind: 'callout',
              html: '<strong>Dale siempre un <code class="code">label</code>.</strong> No se muestra en pantalla, pero los lectores de pantalla lo anuncian.',
            },
            {
              kind: 'code',
              lang: 'html',
              code: `<iswc-button-group label="Vista" variant="segmented" select="single" value="lista">
  <iswc-button variant="plain" value="lista" hue="210">Lista</iswc-button>
  <iswc-button variant="plain" value="tabla" hue="160">Tabla</iswc-button>
  <iswc-button variant="plain" value="tarjetas" hue="35">Tarjetas</iswc-button>
</iswc-button-group>`,
            },
          ],
        },
        {
          id: 'appearance',
          title: 'Appearance',
          lede: '<code class="code">joined</code> fusiona los bordes en una sola pieza (default), <code class="code">segmented</code> hunde la pista y eleva el segmento activo, y <code class="code">separated</code> deja los botones sueltos con separación.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <div class="field">
                    <span class="cap">joined</span>
                    <iswc-button-group label="Alineación" select="single" value="Centro">
                      <iswc-button variant="outlined">Izquierda</iswc-button>
                      <iswc-button variant="outlined">Centro</iswc-button>
                      <iswc-button variant="outlined">Derecha</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">segmented</span>
                    <iswc-button-group label="Alineación" variant="segmented" select="single" value="Centro">
                      <iswc-button variant="plain">Izquierda</iswc-button>
                      <iswc-button variant="plain">Centro</iswc-button>
                      <iswc-button variant="plain">Derecha</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">separated</span>
                    <iswc-button-group label="Alineación" variant="separated" select="single" value="Centro">
                      <iswc-button variant="outlined">Izquierda</iswc-button>
                      <iswc-button variant="outlined">Centro</iswc-button>
                      <iswc-button variant="outlined">Derecha</iswc-button>
                    </iswc-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: '<iswc-button-group variant="segmented" select="single">…</iswc-button-group>',
            },
          ],
        },
        {
          id: 'orientation',
          title: 'Orientation',
          lede: 'Con <code class="code">orientation="vertical"</code> los botones se apilan y los radios se reordenan a los extremos de arriba y abajo.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="bar" style="align-items: flex-start;">
                  <div class="field">
                    <span class="cap">joined</span>
                    <iswc-button-group orientation="vertical" label="Opciones" select="single" value="Medio">
                      <iswc-button variant="outlined">Arriba</iswc-button>
                      <iswc-button variant="outlined">Medio</iswc-button>
                      <iswc-button variant="outlined">Abajo</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">segmented</span>
                    <iswc-button-group orientation="vertical" variant="segmented" label="Opciones" select="single" value="Medio">
                      <iswc-button variant="plain">Arriba</iswc-button>
                      <iswc-button variant="plain">Medio</iswc-button>
                      <iswc-button variant="plain">Abajo</iswc-button>
                    </iswc-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: `<iswc-button-group orientation="vertical" label="Opciones">
  <iswc-button variant="outlined">Arriba</iswc-button>
  …
</iswc-button-group>`,
            },
          ],
        },
        {
          id: 'select',
          title: 'Selección',
          lede: '<code class="code">select="single"</code> se comporta como un grupo de radios; <code class="code">select="multiple"</code> como casillas. Añade <code class="code">allow-empty</code> para poder deseleccionar el activo en modo single. El grupo escribe <code class="code">selected</code> y <code class="code">aria-pressed</code> en cada botón, y emite <code class="code">iswc-change</code>.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <div class="field">
                    <span class="cap">single</span>
                    <iswc-button-group id="selSingle" label="Periodo" variant="segmented" select="single" value="mes">
                      <iswc-button variant="plain" value="dia">Día</iswc-button>
                      <iswc-button variant="plain" value="semana">Semana</iswc-button>
                      <iswc-button variant="plain" value="mes">Mes</iswc-button>
                      <iswc-button variant="plain" value="anio">Año</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">multiple</span>
                    <iswc-button-group id="selMulti" label="Formato" select="multiple" value="bold">
                      <iswc-button variant="outlined" value="bold" aria-label="Negrita">
                        <iswc-icon icon="mdi:format-bold" label="Negrita"></iswc-icon>
                      </iswc-button>
                      <iswc-button variant="outlined" value="italic" aria-label="Cursiva">
                        <iswc-icon icon="mdi:format-italic" label="Cursiva"></iswc-icon>
                      </iswc-button>
                      <iswc-button variant="outlined" value="underline" aria-label="Subrayado">
                        <iswc-icon icon="mdi:format-underline" label="Subrayado"></iswc-icon>
                      </iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">single + allow-empty</span>
                    <iswc-button-group id="selEmpty" label="Prioridad" select="single" allow-empty>
                      <iswc-button variant="outlined" value="baja">Baja</iswc-button>
                      <iswc-button variant="outlined" value="media">Media</iswc-button>
                      <iswc-button variant="outlined" value="alta">Alta</iswc-button>
                    </iswc-button-group>
                  </div>
                  <p class="lede" id="selLog">Sin cambios todavía.</p>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'javascript',
              code: `group.addEventListener('iswc-change', (e: Event) => {
  e.detail.value;   // 'mes'  ·  ['bold', 'italic'] en multiple
  e.detail.values;  // siempre array
});`,
            },
          ],
        },
        {
          id: 'modifiers',
          title: 'Pill y stretch',
          lede: '<code class="code">pill</code> redondea los extremos del grupo completo sin tocar cada botón. <code class="code">stretch</code> reparte el ancho disponible en partes iguales.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack" style="align-self: stretch;">
                  <div class="field">
                    <span class="cap">pill</span>
                    <iswc-button-group label="Alineación" pill select="single" value="Centro">
                      <iswc-button variant="outlined">Izquierda</iswc-button>
                      <iswc-button variant="outlined">Centro</iswc-button>
                      <iswc-button variant="outlined">Derecha</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">pill + segmented</span>
                    <iswc-button-group label="Alineación" pill variant="segmented" select="single" value="Centro">
                      <iswc-button variant="plain">Izquierda</iswc-button>
                      <iswc-button variant="plain">Centro</iswc-button>
                      <iswc-button variant="plain">Derecha</iswc-button>
                    </iswc-button-group>
                  </div>
                  <div class="field" style="justify-items: stretch; width: 100%;">
                    <span class="cap">stretch + segmented</span>
                    <iswc-button-group label="Plan" stretch variant="segmented" select="single" value="pro">
                      <iswc-button variant="plain" value="free">Free</iswc-button>
                      <iswc-button variant="plain" value="pro">Pro</iswc-button>
                      <iswc-button variant="plain" value="empresa">Empresa</iswc-button>
                    </iswc-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: '<iswc-button-group pill stretch variant="segmented" select="single">…</iswc-button-group>',
            },
          ],
        },
        {
          id: 'split',
          title: 'Split button',
          lede: 'Empareja un botón primario con uno de caret para acciones secundarias. (Con <code class="code">iswc-dropdown</code>: usa <code class="code">with-caret</code> en el trigger.)',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="bar">
                  <iswc-button-group label="Guardar">
                    <iswc-button variant="filled" color="brand">Guardar</iswc-button>
                    <iswc-button variant="filled" color="brand" aria-label="Más opciones de guardado">
                      <iswc-icon icon="mdi:chevron-down" label="Más opciones de guardado"></iswc-icon>
                    </iswc-button>
                  </iswc-button-group>
                  <iswc-button-group label="Exportar" variant="joined">
                    <iswc-button variant="outlined">Exportar</iswc-button>
                    <iswc-button variant="outlined" aria-label="Formatos de exportación">
                      <iswc-icon icon="mdi:chevron-down" label="Formatos de exportación"></iswc-icon>
                    </iswc-button>
                  </iswc-button-group>
                </div>`,
            },
          ],
        },
        {
          id: 'toolbar',
          title: 'Toolbar',
          lede: 'Varios grupos en una barra: los de acción sin selección y los de estado con <code class="code">select</code>.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="bar">
                  <iswc-button-group label="Historial">
                    <iswc-button variant="outlined" aria-label="Deshacer">
                      <iswc-icon icon="mdi:undo" label="Deshacer"></iswc-icon>
                    </iswc-button>
                    <iswc-button variant="outlined" aria-label="Rehacer">
                      <iswc-icon icon="mdi:redo" label="Rehacer"></iswc-icon>
                    </iswc-button>
                  </iswc-button-group>
                  <iswc-button-group label="Formato" select="multiple">
                    <iswc-button variant="outlined" value="bold" aria-label="Negrita">
                      <iswc-icon icon="mdi:format-bold" label="Negrita"></iswc-icon>
                    </iswc-button>
                    <iswc-button variant="outlined" value="italic" aria-label="Cursiva">
                      <iswc-icon icon="mdi:format-italic" label="Cursiva"></iswc-icon>
                    </iswc-button>
                    <iswc-button variant="outlined" value="underline" aria-label="Subrayado">
                      <iswc-icon icon="mdi:format-underline" label="Subrayado"></iswc-icon>
                    </iswc-button>
                  </iswc-button-group>
                  <iswc-button-group label="Alineación" select="single" value="left">
                    <iswc-button variant="outlined" value="left" aria-label="Izquierda">
                      <iswc-icon icon="mdi:format-align-left" label="Izquierda"></iswc-icon>
                    </iswc-button>
                    <iswc-button variant="outlined" value="center" aria-label="Centro">
                      <iswc-icon icon="mdi:format-align-center" label="Centro"></iswc-icon>
                    </iswc-button>
                    <iswc-button variant="outlined" value="right" aria-label="Derecha">
                      <iswc-icon icon="mdi:format-align-right" label="Derecha"></iswc-icon>
                    </iswc-button>
                  </iswc-button-group>
                </div>`,
            },
          ],
        },
        {
          id: 'native',
          title: 'Botones nativos',
          lede: 'También funciona con <code class="code">&lt;button&gt;</code> nativos.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="bar">
                  <iswc-button-group label="Alineación">
                    <button type="button" class="native-demo">Izquierda</button>
                    <button type="button" class="native-demo">Centro</button>
                    <button type="button" class="native-demo">Derecha</button>
                  </iswc-button-group>
                </div>`,
            },
          ],
        },
        {
          id: 'keyboard',
          title: 'Teclado',
          blocks: [
            {
              kind: 'table',
              columns: ['Tecla', 'Acción'],
              rows: [
                ['<code>→</code> <code>↓</code>', 'Foco al botón siguiente (envuelve al final)'],
                ['<code>←</code> <code>↑</code>', 'Foco al botón anterior (envuelve al principio)'],
                ['<code>Home</code> <code>End</code>', 'Primer / último botón habilitado'],
                ['<code>Enter</code> <code>Space</code>', 'Activa el botón enfocado (lo aporta el propio botón)'],
              ],
            },
            {
              kind: 'lede',
              html: 'En orientación vertical las flechas verticales son las que navegan; en horizontal, las laterales. Los botones deshabilitados se saltan.',
            },
          ],
        },
        {
          id: 'api',
          title: 'API live',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <iswc-button-group id="apiGroup" label="Demo" select="single" value="B">
                    <iswc-button variant="outlined">A</iswc-button>
                    <iswc-button variant="outlined">B</iswc-button>
                    <iswc-button variant="outlined">C</iswc-button>
                  </iswc-button-group>
                  <div class="bar">
                    <iswc-button id="apiOrient" variant="outlined">Toggle orientation</iswc-button>
                    <iswc-button id="apiAppear" variant="outlined">Ciclar appearance</iswc-button>
                    <iswc-button id="apiPill" variant="outlined">Toggle pill</iswc-button>
                    <iswc-button id="apiValue" variant="outlined">value = 'C'</iswc-button>
                  </div>
                </div>
                <div class="log" id="apiLog"><div class="row"><span class="hint">Acciones de API aparecerán aquí.</span></div></div>`,
            },
          ],
        },
        {
          id: 'reference',
          title: 'Referencia',
          blocks: [
            {
              kind: 'table',
              columns: ['Attr', 'Tipo', 'Default', 'Notas'],
              rows: [
                ['<code>label</code>', 'string', "''", 'Nombre accesible del grupo'],
                ['<code>orientation</code>', 'horizontal | vertical', 'horizontal', 'Reflejado'],
                ['<code>appearance</code>', 'joined | segmented | separated', 'joined', 'Reflejado'],
                ['<code>select</code>', 'none | single | multiple', 'none', 'Activa la gestión de selección'],
                ['<code>value</code>', 'string', '—', 'En <code>multiple</code>, valores separados por coma'],
                ['<code>pill</code>', 'boolean', 'false', 'Extremos redondeados en todo el grupo'],
                ['<code>stretch</code>', 'boolean', 'false', 'Los botones reparten el ancho'],
                ['<code>allow-empty</code>', 'boolean', 'false', 'En <code>single</code>, permite deseleccionar'],
                ['<code>disabled</code>', 'boolean', 'false', 'Bloquea el grupo completo'],
              ],
            },
            {
              kind: 'table',
              columns: ['API', 'Detalle'],
              rows: [
                ['propiedades', '<code>value</code> · <code>values</code> · <code>items</code> · <code>selectedItems</code>'],
                ['eventos', '<code>iswc-change</code> con <code>{ value, values }</code>'],
                ['slot', 'default: uno o más <code class="code">iswc-button</code> o <code class="code">button</code>'],
                ['part', '<code>base</code>'],
                ['en los hijos', 'el grupo escribe <code>selected</code> y <code>aria-pressed</code>'],
                ['valor de un hijo', 'atributo <code>value</code>; si falta, texto; si vacío, índice'],
                ['tokens', '<code>--iswc-button-group-radius</code> <code>--iswc-button-group-gap</code> <code>--iswc-button-group-pad</code> <code>--iswc-button-group-accent</code>'],
              ],
            },
          ],
        },
      ],
    });
  }

  /**
   * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
   */
  async mount(ctx: PreviewMountContext): Promise<void> {
    const { main } = ctx;
    await this.whenDefined('iswc-button-group');

    const introLog = main.querySelector<HTMLElement>('#introLog');
    const introGroup = main.querySelector<HTMLElement>('#intro iswc-button-group');
    if (introLog && introGroup) {
      this.on(introGroup, 'iswc-change', (e: Event) => {
        const value = (e as CustomEvent<GroupChangeDetail>).detail?.value;
        introLog.innerHTML = `vista: <code class="code">${value || '—'}</code>`;
      });
    }

    const selLog = main.querySelector<HTMLElement>('#selLog');
    const paintSel = (): void => {
      if (!selLog) return;
      const single = (main.querySelector<HTMLElement>('#selSingle') as (HTMLElement & { value?: string }) | null)?.value;
      const multi = (main.querySelector<HTMLElement>('#selMulti') as (HTMLElement & { values?: string[] }) | null)?.values ?? [];
      const empty = (main.querySelector<HTMLElement>('#selEmpty') as (HTMLElement & { value?: string }) | null)?.value;
      selLog.innerHTML =
        `single: <code class="code">${single || '—'}</code> · ` +
        `multiple: <code class="code">[${multi.join(', ') || ' '}]</code> · ` +
        `allow-empty: <code class="code">${empty || '—'}</code>`;
    };
    for (const id of ['selSingle', 'selMulti', 'selEmpty']) {
      const el = main.querySelector<HTMLElement>(`#${id}`);
      if (el) this.on(el, 'iswc-change', paintSel);
    }
    paintSel();

    const apiGroup = main.querySelector<HTMLElement>('#apiGroup') as ButtonGroupEl | null;
    const apiLog = main.querySelector<HTMLElement>('#apiLog');
    const logLine = (msg: string): void => {
      if (!apiLog) return;
      apiLog.querySelector<HTMLElement>('.hint')?.closest('.row')?.remove();
      const t = new Date().toLocaleTimeString();
      apiLog.insertAdjacentHTML(
        'afterbegin',
        `<div class="row"><span class="t">[${t}]</span> <span class="e">${msg}</span></div>`,
      );
    };
    if (apiGroup) {
      const apiOrient = main.querySelector<HTMLElement>('#apiOrient');
      if (apiOrient) {
        this.on(apiOrient, 'click', () => {
          apiGroup.orientation = apiGroup.orientation === 'vertical' ? 'horizontal' : 'vertical';
          logLine(`orientation = '${apiGroup.orientation}'`);
        });
      }
      const apiAppear = main.querySelector<HTMLElement>('#apiAppear');
      if (apiAppear) {
        const APPEARANCES: ButtonGroupEl['variant'][] = ['joined', 'segmented', 'separated'];
        this.on(apiAppear, 'click', () => {
          const next = APPEARANCES[(APPEARANCES.indexOf(apiGroup.variant) + 1) % APPEARANCES.length];
          apiGroup.variant = next;
          logLine(`variant = '${next}'`);
        });
      }
      const apiPill = main.querySelector<HTMLElement>('#apiPill');
      if (apiPill) {
        this.on(apiPill, 'click', () => {
          apiGroup.pill = !apiGroup.pill;
          logLine(`pill = ${apiGroup.pill}`);
        });
      }
      const apiValue = main.querySelector<HTMLElement>('#apiValue');
      if (apiValue) {
        this.on(apiValue, 'click', () => {
          apiGroup.value = 'C';
          logLine(`value = 'C'`);
        });
      }
      this.on(apiGroup, 'iswc-change', (e: Event) => {
        logLine(`iswc-change → '${(e as CustomEvent<GroupChangeDetail>).detail?.value}'`);
      });
    }
  }
}

export default ButtonGroupPreview;
