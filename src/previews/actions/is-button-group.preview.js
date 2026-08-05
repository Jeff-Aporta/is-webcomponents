/**
 * Preview controlador de <is-button-group>.
 * Estructura = definition (datos). Comportamiento = mount() con funciones reales.
 */
import { ISComponentPreview } from '../_kit/ISComponentPreview.js';

const STYLES = /* css */ `
  .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
  .stack { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
  .field { display: grid; gap: 0.4rem; justify-items: start; }
  .field > .cap {
    font-family: "JetBrains Mono", var(--is-mono);
    font-size: 0.7rem;
    color: var(--is-text-dim);
  }
  .native-demo {
    font: inherit;
    padding: 0.55em 1em;
    border: 1px solid var(--is-border);
    background: var(--is-control-bg);
    color: var(--is-text);
    cursor: pointer;
  }
`;

export class ButtonGroupPreview extends ISComponentPreview {
  constructor() {
    super({
      tag: 'is-button-group',
      title: '<is-button-group>',
      titleHtml: true,
      description: 'Documentación y demos del componente is-button-group de InSoft.',
      storageKey: 'docs-is-button-group',
      styles: STYLES,
      sections: [
        {
          id: 'intro',
          title: '<is-button-group>',
          titleHtml: true,
          lede: 'Agrupa botones relacionados en una sola unidad visual y, si se lo pides, gestiona cuál está activo. Sirve para controles segmentados, toolbars y split buttons.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <div class="field">
                    <span class="cap">appearance="segmented" · select="single" · <code class="code">hue</code> por botón</span>
                    <is-button-group label="Vista" variant="segmented" select="single" value="lista">
                      <is-button variant="plain" value="lista" hue="210">
                        <is-icon slot="start" icon="mdi:format-list-bulleted"></is-icon>
                        Lista
                      </is-button>
                      <is-button variant="plain" value="tabla" hue="160">
                        <is-icon slot="start" icon="mdi:table"></is-icon>
                        Tabla
                      </is-button>
                      <is-button variant="plain" value="tarjetas" hue="35">
                        <is-icon slot="start" icon="mdi:view-grid-outline"></is-icon>
                        Tarjetas
                      </is-button>
                    </is-button-group>
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
              code: `<is-button-group label="Vista" variant="segmented" select="single" value="lista">
  <is-button variant="plain" value="lista" hue="210">Lista</is-button>
  <is-button variant="plain" value="tabla" hue="160">Tabla</is-button>
  <is-button variant="plain" value="tarjetas" hue="35">Tarjetas</is-button>
</is-button-group>`,
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
                    <is-button-group label="Alineación" select="single" value="Centro">
                      <is-button variant="outlined">Izquierda</is-button>
                      <is-button variant="outlined">Centro</is-button>
                      <is-button variant="outlined">Derecha</is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">segmented</span>
                    <is-button-group label="Alineación" variant="segmented" select="single" value="Centro">
                      <is-button variant="plain">Izquierda</is-button>
                      <is-button variant="plain">Centro</is-button>
                      <is-button variant="plain">Derecha</is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">separated</span>
                    <is-button-group label="Alineación" variant="separated" select="single" value="Centro">
                      <is-button variant="outlined">Izquierda</is-button>
                      <is-button variant="outlined">Centro</is-button>
                      <is-button variant="outlined">Derecha</is-button>
                    </is-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: '<is-button-group variant="segmented" select="single">…</is-button-group>',
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
                    <is-button-group orientation="vertical" label="Opciones" select="single" value="Medio">
                      <is-button variant="outlined">Arriba</is-button>
                      <is-button variant="outlined">Medio</is-button>
                      <is-button variant="outlined">Abajo</is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">segmented</span>
                    <is-button-group orientation="vertical" variant="segmented" label="Opciones" select="single" value="Medio">
                      <is-button variant="plain">Arriba</is-button>
                      <is-button variant="plain">Medio</is-button>
                      <is-button variant="plain">Abajo</is-button>
                    </is-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: `<is-button-group orientation="vertical" label="Opciones">
  <is-button variant="outlined">Arriba</is-button>
  …
</is-button-group>`,
            },
          ],
        },
        {
          id: 'select',
          title: 'Selección',
          lede: '<code class="code">select="single"</code> se comporta como un grupo de radios; <code class="code">select="multiple"</code> como casillas. Añade <code class="code">allow-empty</code> para poder deseleccionar el activo en modo single. El grupo escribe <code class="code">selected</code> y <code class="code">aria-pressed</code> en cada botón, y emite <code class="code">is-change</code>.',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="stack">
                  <div class="field">
                    <span class="cap">single</span>
                    <is-button-group id="selSingle" label="Periodo" variant="segmented" select="single" value="mes">
                      <is-button variant="plain" value="dia">Día</is-button>
                      <is-button variant="plain" value="semana">Semana</is-button>
                      <is-button variant="plain" value="mes">Mes</is-button>
                      <is-button variant="plain" value="anio">Año</is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">multiple</span>
                    <is-button-group id="selMulti" label="Formato" select="multiple" value="bold">
                      <is-button variant="outlined" value="bold" aria-label="Negrita">
                        <is-icon icon="mdi:format-bold" label="Negrita"></is-icon>
                      </is-button>
                      <is-button variant="outlined" value="italic" aria-label="Cursiva">
                        <is-icon icon="mdi:format-italic" label="Cursiva"></is-icon>
                      </is-button>
                      <is-button variant="outlined" value="underline" aria-label="Subrayado">
                        <is-icon icon="mdi:format-underline" label="Subrayado"></is-icon>
                      </is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">single + allow-empty</span>
                    <is-button-group id="selEmpty" label="Prioridad" select="single" allow-empty>
                      <is-button variant="outlined" value="baja">Baja</is-button>
                      <is-button variant="outlined" value="media">Media</is-button>
                      <is-button variant="outlined" value="alta">Alta</is-button>
                    </is-button-group>
                  </div>
                  <p class="lede" id="selLog">Sin cambios todavía.</p>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'javascript',
              code: `group.addEventListener('is-change', (e) => {
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
                    <is-button-group label="Alineación" pill select="single" value="Centro">
                      <is-button variant="outlined">Izquierda</is-button>
                      <is-button variant="outlined">Centro</is-button>
                      <is-button variant="outlined">Derecha</is-button>
                    </is-button-group>
                  </div>
                  <div class="field">
                    <span class="cap">pill + segmented</span>
                    <is-button-group label="Alineación" pill variant="segmented" select="single" value="Centro">
                      <is-button variant="plain">Izquierda</is-button>
                      <is-button variant="plain">Centro</is-button>
                      <is-button variant="plain">Derecha</is-button>
                    </is-button-group>
                  </div>
                  <div class="field" style="justify-items: stretch; width: 100%;">
                    <span class="cap">stretch + segmented</span>
                    <is-button-group label="Plan" stretch variant="segmented" select="single" value="pro">
                      <is-button variant="plain" value="free">Free</is-button>
                      <is-button variant="plain" value="pro">Pro</is-button>
                      <is-button variant="plain" value="empresa">Empresa</is-button>
                    </is-button-group>
                  </div>
                </div>`,
            },
            {
              kind: 'code',
              lang: 'html',
              code: '<is-button-group pill stretch variant="segmented" select="single">…</is-button-group>',
            },
          ],
        },
        {
          id: 'split',
          title: 'Split button',
          lede: 'Empareja un botón primario con uno de caret para acciones secundarias. (Con <code class="code">is-dropdown</code>: usa <code class="code">with-caret</code> en el trigger.)',
          blocks: [
            {
              kind: 'demo',
              html: `
                <div class="bar">
                  <is-button-group label="Guardar">
                    <is-button variant="filled" color="brand">Guardar</is-button>
                    <is-button variant="filled" color="brand" aria-label="Más opciones de guardado">
                      <is-icon icon="mdi:chevron-down" label="Más opciones de guardado"></is-icon>
                    </is-button>
                  </is-button-group>
                  <is-button-group label="Exportar" variant="joined">
                    <is-button variant="outlined">Exportar</is-button>
                    <is-button variant="outlined" aria-label="Formatos de exportación">
                      <is-icon icon="mdi:chevron-down" label="Formatos de exportación"></is-icon>
                    </is-button>
                  </is-button-group>
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
                  <is-button-group label="Historial">
                    <is-button variant="outlined" aria-label="Deshacer">
                      <is-icon icon="mdi:undo" label="Deshacer"></is-icon>
                    </is-button>
                    <is-button variant="outlined" aria-label="Rehacer">
                      <is-icon icon="mdi:redo" label="Rehacer"></is-icon>
                    </is-button>
                  </is-button-group>
                  <is-button-group label="Formato" select="multiple">
                    <is-button variant="outlined" value="bold" aria-label="Negrita">
                      <is-icon icon="mdi:format-bold" label="Negrita"></is-icon>
                    </is-button>
                    <is-button variant="outlined" value="italic" aria-label="Cursiva">
                      <is-icon icon="mdi:format-italic" label="Cursiva"></is-icon>
                    </is-button>
                    <is-button variant="outlined" value="underline" aria-label="Subrayado">
                      <is-icon icon="mdi:format-underline" label="Subrayado"></is-icon>
                    </is-button>
                  </is-button-group>
                  <is-button-group label="Alineación" select="single" value="left">
                    <is-button variant="outlined" value="left" aria-label="Izquierda">
                      <is-icon icon="mdi:format-align-left" label="Izquierda"></is-icon>
                    </is-button>
                    <is-button variant="outlined" value="center" aria-label="Centro">
                      <is-icon icon="mdi:format-align-center" label="Centro"></is-icon>
                    </is-button>
                    <is-button variant="outlined" value="right" aria-label="Derecha">
                      <is-icon icon="mdi:format-align-right" label="Derecha"></is-icon>
                    </is-button>
                  </is-button-group>
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
                  <is-button-group label="Alineación">
                    <button type="button" class="native-demo">Izquierda</button>
                    <button type="button" class="native-demo">Centro</button>
                    <button type="button" class="native-demo">Derecha</button>
                  </is-button-group>
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
                  <is-button-group id="apiGroup" label="Demo" select="single" value="B">
                    <is-button variant="outlined">A</is-button>
                    <is-button variant="outlined">B</is-button>
                    <is-button variant="outlined">C</is-button>
                  </is-button-group>
                  <div class="bar">
                    <is-button id="apiOrient" variant="outlined">Toggle orientation</is-button>
                    <is-button id="apiAppear" variant="outlined">Ciclar appearance</is-button>
                    <is-button id="apiPill" variant="outlined">Toggle pill</is-button>
                    <is-button id="apiValue" variant="outlined">value = 'C'</is-button>
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
                ['eventos', '<code>is-change</code> con <code>{ value, values }</code>'],
                ['slot', 'default: uno o más <code class="code">is-button</code> o <code class="code">button</code>'],
                ['part', '<code>base</code>'],
                ['en los hijos', 'el grupo escribe <code>selected</code> y <code>aria-pressed</code>'],
                ['valor de un hijo', 'atributo <code>value</code>; si falta, texto; si vacío, índice'],
                ['tokens', '<code>--is-button-group-radius</code> <code>--is-button-group-gap</code> <code>--is-button-group-pad</code> <code>--is-button-group-accent</code>'],
              ],
            },
          ],
        },
      ],
    });
  }

  /**
   * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
   */
  async mount(ctx) {
    const { main } = ctx;
    await this.whenDefined('is-button-group');

    const introLog = main.querySelector('#introLog');
    const introGroup = main.querySelector('#intro is-button-group');
    if (introLog && introGroup) {
      this.on(introGroup, 'is-change', (e) => {
        const value = /** @type {CustomEvent} */ (e).detail?.value;
        introLog.innerHTML = `vista: <code class="code">${value || '—'}</code>`;
      });
    }

    const selLog = main.querySelector('#selLog');
    const paintSel = () => {
      if (!selLog) return;
      const single = /** @type {any} */ (main.querySelector('#selSingle'))?.value;
      const multi = /** @type {any} */ (main.querySelector('#selMulti'))?.values ?? [];
      const empty = /** @type {any} */ (main.querySelector('#selEmpty'))?.value;
      selLog.innerHTML =
        `single: <code class="code">${single || '—'}</code> · ` +
        `multiple: <code class="code">[${multi.join(', ') || ' '}]</code> · ` +
        `allow-empty: <code class="code">${empty || '—'}</code>`;
    };
    for (const id of ['selSingle', 'selMulti', 'selEmpty']) {
      const el = main.querySelector(`#${id}`);
      if (el) this.on(el, 'is-change', paintSel);
    }
    paintSel();

    const apiGroup = /** @type {any} */ (main.querySelector('#apiGroup'));
    const apiLog = main.querySelector('#apiLog');
    const logLine = (msg) => {
      if (!apiLog) return;
      apiLog.querySelector('.hint')?.closest('.row')?.remove();
      const t = new Date().toLocaleTimeString();
      apiLog.insertAdjacentHTML(
        'afterbegin',
        `<div class="row"><span class="t">[${t}]</span> <span class="e">${msg}</span></div>`,
      );
    };
    if (apiGroup) {
      this.on(main.querySelector('#apiOrient'), 'click', () => {
        apiGroup.orientation = apiGroup.orientation === 'vertical' ? 'horizontal' : 'vertical';
        logLine(`orientation = '${apiGroup.orientation}'`);
      });
      const APPEARANCES = ['joined', 'segmented', 'separated'];
      this.on(main.querySelector('#apiAppear'), 'click', () => {
        const next = APPEARANCES[(APPEARANCES.indexOf(apiGroup.appearance) + 1) % APPEARANCES.length];
        apiGroup.appearance = next;
        logLine(`appearance = '${next}'`);
      });
      this.on(main.querySelector('#apiPill'), 'click', () => {
        apiGroup.pill = !apiGroup.pill;
        logLine(`pill = ${apiGroup.pill}`);
      });
      this.on(main.querySelector('#apiValue'), 'click', () => {
        apiGroup.value = 'C';
        logLine(`value = 'C'`);
      });
      this.on(apiGroup, 'is-change', (e) => {
        logLine(`is-change → '${/** @type {CustomEvent} */ (e).detail?.value}'`);
      });
    }
  }
}

export default ButtonGroupPreview;
