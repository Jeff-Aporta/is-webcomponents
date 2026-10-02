// gen-child-previews.ts — genera la página de preview propia de los
// componentes "hijo" que hasta ahora compartían la del padre.
//
// Cada hijo es un componente publico del manifest y el index debe poder
// abrir SU demo, no el del padre. El demo se muestra en el contexto minimo
// del padre (un <iswc-tab-panel> solo tiene sentido dentro de <iswc-tab-group>),
// pero la pagina documenta la API DEL HIJO.
//
// La documentacion de atributos NO se inventa: se extrae del bloque de
// comentario de cabecera del modulo fuente.
//
// Uso:  deno run -A --no-check scripts/gen-child-previews.ts [--force]

import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FORCE = process.argv.includes('--force');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Cada entrada define el contexto minimo del padre para que el hijo se vea
 * funcionando, y los modulos extra que la pagina necesita cargar.
 */
const CHILDREN = {
  'iswc-dropdown-item': {
    modules: ['actions/dropdown.js', 'actions/dropdown-item.js', 'actions/button.js'],
    lede: 'Item de un <code class="code">&lt;iswc-dropdown&gt;</code>. Aporta el estado (activo, deshabilitado), el slot de icono y el valor que viaja en el evento de selección.',
    demo: `<iswc-dropdown placement="bottom-start">
  <iswc-button slot="trigger" color="brand">Acciones</iswc-button>
  <iswc-dropdown-item value="edit"><iswc-icon slot="start" icon="mdi:pencil"></iswc-icon>Editar</iswc-dropdown-item>
  <iswc-dropdown-item value="dup"><iswc-icon slot="start" icon="mdi:content-copy"></iswc-icon>Duplicar</iswc-dropdown-item>
  <iswc-dropdown-item value="del" color="danger"><iswc-icon slot="start" icon="mdi:trash-can"></iswc-icon>Eliminar</iswc-dropdown-item>
  <iswc-dropdown-item value="off" disabled>No disponible</iswc-dropdown-item>
</iswc-dropdown>`,
  },
  'iswc-toast-item': {
    modules: ['feedback/toast.js', 'actions/button.js'],
    lede: 'Ítem individual de notificación. Se crea normalmente con <code class="code">toaster.create()</code>, pero también se puede declarar suelto para controlar su ciclo de vida a mano.',
    demo: `<iswc-toast-item color="success" open duration="0">
  <iswc-icon slot="icon" icon="mdi:check-circle"></iswc-icon>
  Guardado correctamente
</iswc-toast-item>
<iswc-toast-item color="danger" open duration="0">
  <iswc-icon slot="icon" icon="mdi:alert-circle"></iswc-icon>
  No se pudo guardar
</iswc-toast-item>`,
  },
  'iswc-breadcrumb-item': {
    modules: ['navigation/breadcrumb.js', 'navigation/breadcrumb-item.js'],
    lede: 'Cada eslabón de un <code class="code">&lt;iswc-breadcrumb&gt;</code>. Puede ser enlace (<code class="code">href</code>) o texto plano cuando es la página actual.',
    demo: `<iswc-breadcrumb>
  <iswc-breadcrumb-item href="#"><iswc-icon slot="start" icon="mdi:home"></iswc-icon>Inicio</iswc-breadcrumb-item>
  <iswc-breadcrumb-item href="#">Contabilidad</iswc-breadcrumb-item>
  <iswc-breadcrumb-item href="#">Comprobantes</iswc-breadcrumb-item>
  <iswc-breadcrumb-item>Detalle</iswc-breadcrumb-item>
</iswc-breadcrumb>`,
  },
  'iswc-tab': {
    modules: ['navigation/tab-group.js'],
    lede: 'Pestaña de un <code class="code">&lt;iswc-tab-group&gt;</code>. El atributo <code class="code">panel</code> la enlaza con su <code class="code">&lt;iswc-tab-panel&gt;</code>.',
    demo: `<iswc-tab-group>
  <iswc-tab slot="nav" panel="a"><iswc-icon slot="start" icon="mdi:chart-line"></iswc-icon>Resumen</iswc-tab>
  <iswc-tab slot="nav" panel="b">Movimientos</iswc-tab>
  <iswc-tab slot="nav" panel="c" disabled>Cierre</iswc-tab>
  <iswc-tab-panel name="a">Panel de resumen.</iswc-tab-panel>
  <iswc-tab-panel name="b">Panel de movimientos.</iswc-tab-panel>
  <iswc-tab-panel name="c">Panel de cierre.</iswc-tab-panel>
</iswc-tab-group>`,
  },
  'iswc-tab-panel': {
    modules: ['navigation/tab-group.js'],
    lede: 'Contenido asociado a una <code class="code">&lt;iswc-tab&gt;</code>. Solo se muestra el panel cuyo <code class="code">name</code> coincide con el <code class="code">panel</code> de la pestaña activa.',
    demo: `<iswc-tab-group>
  <iswc-tab slot="nav" panel="uno">Uno</iswc-tab>
  <iswc-tab slot="nav" panel="dos">Dos</iswc-tab>
  <iswc-tab-panel name="uno">
    <p>El panel es un contenedor normal: acepta cualquier contenido.</p>
    <iswc-tag color="brand">Contenido rico</iswc-tag>
  </iswc-tab-panel>
  <iswc-tab-panel name="dos">Segundo panel.</iswc-tab-panel>
</iswc-tab-group>`,
    extra: ['feedback/tag.js'],
  },
  'iswc-carousel-item': {
    modules: ['navigation/carousel.js'],
    lede: 'Cada diapositiva de un <code class="code">&lt;iswc-carousel&gt;</code>.',
    demo: `<iswc-carousel style="max-width:520px">
  <iswc-carousel-item><div class="slide">Diapositiva 1</div></iswc-carousel-item>
  <iswc-carousel-item><div class="slide">Diapositiva 2</div></iswc-carousel-item>
  <iswc-carousel-item><div class="slide">Diapositiva 3</div></iswc-carousel-item>
</iswc-carousel>`,
    styles: `.slide { display:grid; place-items:center; height:180px; border-radius:.6rem;
      background: color-mix(in srgb, var(--iswc-accent) 14%, var(--iswc-bg-elev)); font-weight:600; }`,
  },
  'iswc-tree-item': {
    modules: ['navigation/tree.js'],
    lede: 'Nodo de un <code class="code">&lt;iswc-tree&gt;</code>. Anidando items se construye la jerarquía; <code class="code">expanded</code> controla el pliegue.',
    demo: `<iswc-tree>
  <iswc-tree-item expanded><iswc-icon slot="start" icon="mdi:folder"></iswc-icon>Contabilidad
    <iswc-tree-item><iswc-icon slot="start" icon="mdi:file-document"></iswc-icon>Balance</iswc-tree-item>
    <iswc-tree-item><iswc-icon slot="start" icon="mdi:file-document"></iswc-icon>Estado de resultados</iswc-tree-item>
  </iswc-tree-item>
  <iswc-tree-item><iswc-icon slot="start" icon="mdi:folder"></iswc-icon>Inventario</iswc-tree-item>
</iswc-tree>`,
  },
  'iswc-stepper-step': {
    modules: ['navigation/stepper.js'],
    lede: 'Paso de un <code class="code">&lt;iswc-stepper&gt;</code>, con su título, descripción y estado.',
    demo: `<iswc-stepper current="1">
  <iswc-stepper-step title="Datos" description="Identificación"></iswc-stepper-step>
  <iswc-stepper-step title="Detalle" description="Líneas del comprobante"></iswc-stepper-step>
  <iswc-stepper-step title="Revisión" description="Confirmar y guardar"></iswc-stepper-step>
</iswc-stepper>`,
  },
  'iswc-option': {
    modules: ['forms/combobox.js', 'forms/option.js'],
    lede: 'Opción de un <code class="code">&lt;iswc-combobox&gt;</code> o <code class="code">&lt;iswc-select&gt;</code>. El <code class="code">value</code> es lo que expone el control; el contenido es lo que ve el usuario.',
    demo: `<iswc-combobox label="Ciudad" placeholder="Elige una" style="max-width:320px">
  <iswc-option value="bog">Bogotá</iswc-option>
  <iswc-option value="mde">Medellín</iswc-option>
  <iswc-option value="cal">Cali</iswc-option>
  <iswc-option value="brr" disabled>Barranquilla (sin cobertura)</iswc-option>
</iswc-combobox>`,
  },
  'iswc-radio-group': {
    modules: ['forms/radio-group.js', 'forms/radio.js'],
    lede: 'Agrupa varios <code class="code">&lt;iswc-radio&gt;</code> bajo un mismo nombre y expone el valor seleccionado como un único control de formulario.',
    demo: `<iswc-radio-group label="Forma de pago" value="credito" name="pago">
  <iswc-radio value="contado">Contado</iswc-radio>
  <iswc-radio value="credito">Crédito</iswc-radio>
  <iswc-radio value="mixto">Mixto</iswc-radio>
</iswc-radio-group>`,
  },
  'iswc-month-calendar': {
    modules: ['forms/month-calendar.js'],
    lede: 'Calendario de un mes, suelto. Es la pieza que <code class="code">&lt;iswc-date-picker&gt;</code> usa por dentro, y sirve por sí sola para vistas de agenda.',
    demo: `<iswc-month-calendar value="2026-08-12"></iswc-month-calendar>`,
  },
  'iswc-year-calendar': {
    modules: ['forms/year-calendar.js'],
    lede: 'Vista de los 12 meses de un año para saltar rápido de periodo.',
    demo: `<iswc-year-calendar value="2026-08"></iswc-year-calendar>`,
  },
  'iswc-digital-clock': {
    modules: ['forms/digital-clock.js'],
    lede: 'Reloj digital: muestra la hora en formato numérico y admite selección por teclado.',
    demo: `<iswc-digital-clock value="14:30"></iswc-digital-clock>`,
  },
  'iswc-time-field': {
    modules: ['forms/time-field.js'],
    lede: 'Campo de hora con máscara y validación, asociable a formularios.',
    demo: `<iswc-time-field label="Hora de ingreso" value="08:30" style="max-width:280px"></iswc-time-field>`,
  },
  'iswc-date-time-field': {
    modules: ['forms/date-time-field.js'],
    lede: 'Campo combinado de fecha y hora en un solo control.',
    demo: `<iswc-date-time-field label="Inicio del turno" value="2026-08-01T08:30" style="max-width:320px"></iswc-date-time-field>`,
  },
  'iswc-time-input': {
    modules: ['forms/time-input.js'],
    lede: 'Entrada de hora con selector desplegable.',
    demo: `<iswc-time-input label="Hora" value="09:15" style="max-width:280px"></iswc-time-input>`,
  },
  'iswc-date-time-input': {
    modules: ['forms/date-time-input.js'],
    lede: 'Entrada de fecha y hora con calendario y reloj en el mismo desplegable.',
    demo: `<iswc-date-time-input label="Vencimiento" value="2026-08-15T17:00" style="max-width:340px"></iswc-date-time-input>`,
  },
  'iswc-date-range-input': {
    modules: ['forms/date-range-input.js'],
    lede: 'Entrada de rango de fechas: una sola caja para inicio y fin.',
    demo: `<iswc-date-range-input label="Periodo" start="2026-08-01" end="2026-08-31" style="max-width:360px"></iswc-date-range-input>`,
  },
  'iswc-transfer-item': {
    modules: ['data/transfer.js'],
    lede: 'Elemento movible entre las dos listas de un <code class="code">&lt;iswc-transfer&gt;</code>.',
    demo: `<iswc-transfer>
  <iswc-transfer-item value="a">Cuentas por cobrar</iswc-transfer-item>
  <iswc-transfer-item value="b" selected>Cuentas por pagar</iswc-transfer-item>
  <iswc-transfer-item value="c">Inventario</iswc-transfer-item>
</iswc-transfer>`,
  },
  'iswc-kanban-column': {
    modules: ['data/kanban.js'],
    lede: 'Columna de un tablero <code class="code">&lt;iswc-kanban&gt;</code>: título, acento de color y contador de tarjetas.',
    demo: `<iswc-kanban>
  <iswc-kanban-column title="Pendiente" accent="#f59f00">
    <iswc-kanban-card heading="Conciliar banco"></iswc-kanban-card>
  </iswc-kanban-column>
  <iswc-kanban-column title="En curso" accent="#228be6">
    <iswc-kanban-card heading="Cierre de mes"></iswc-kanban-card>
  </iswc-kanban-column>
  <iswc-kanban-column title="Listo" accent="#40c057"></iswc-kanban-column>
</iswc-kanban>`,
  },
  'iswc-kanban-card': {
    modules: ['data/kanban.js'],
    lede: 'Tarjeta de un tablero. Es arrastrable entre columnas y admite encabezado, meta, etiqueta y pie.',
    demo: `<iswc-kanban>
  <iswc-kanban-column title="Tareas">
    <iswc-kanban-card heading="Conciliar banco" meta="Vence hoy" tag="Urgente" tag-variant="danger">
      Revisar extracto de agosto.
    </iswc-kanban-card>
    <iswc-kanban-card heading="Cierre de mes" meta="3 días" tag="Normal">
      Cuadrar cuentas de resultado.
    </iswc-kanban-card>
  </iswc-kanban-column>
  <iswc-kanban-column title="Hechas"></iswc-kanban-column>
</iswc-kanban>`,
  },
  'iswc-speed-dial-action': {
    modules: ['actions/speed-dial.js', 'actions/fab.js'],
    lede: 'Cada acción que despliega un <code class="code">&lt;iswc-speed-dial&gt;</code>, con su icono y su etiqueta.',
    demo: `<div class="sd-stage">
  <iswc-speed-dial direction="up" open>
    <iswc-speed-dial-action icon="mdi:file-document" label="Documento"></iswc-speed-dial-action>
    <iswc-speed-dial-action icon="mdi:image" label="Imagen"></iswc-speed-dial-action>
    <iswc-speed-dial-action icon="mdi:link" label="Enlace"></iswc-speed-dial-action>
  </iswc-speed-dial>
</div>`,
    styles: `.sd-stage { position:relative; transform:translateZ(0); height:320px;
      border:1px dashed var(--iswc-border); border-radius:.6rem; }`,
  },
  'iswc-dock-item': {
    modules: ['layout/dock.js'],
    lede: 'Icono de un <code class="code">&lt;iswc-dock&gt;</code>, con su etiqueta y estado activo.',
    demo: `<div class="dock-stage">
  <iswc-dock>
    <iswc-dock-item icon="mdi:home" label="Inicio" active></iswc-dock-item>
    <iswc-dock-item icon="mdi:chart-box" label="Reportes"></iswc-dock-item>
    <iswc-dock-item icon="mdi:cog" label="Ajustes"></iswc-dock-item>
  </iswc-dock>
</div>`,
    styles: `.dock-stage { position:relative; transform:translateZ(0); height:200px;
      border:1px dashed var(--iswc-border); border-radius:.6rem; }`,
  },
  'iswc-map-marker': {
    modules: ['data-viz/maps.js'],
    lede: 'Marcador posicionado por longitud y latitud dentro de un <code class="code">&lt;iswc-maps&gt;</code>.',
    demo: `<iswc-maps viewbox="-80,-5,-66,13" style="height:320px">
  <iswc-map-marker lon="-74.07" lat="4.71" label="Bogotá"></iswc-map-marker>
  <iswc-map-marker lon="-75.56" lat="6.25" label="Medellín"></iswc-map-marker>
  <iswc-map-marker lon="-76.53" lat="3.45" label="Cali"></iswc-map-marker>
</iswc-maps>`,
  },
};

/** Extrae el comentario de cabecera del modulo (la API real, sin inventar). */
async function headerDoc(scriptRel, tag) {
  // scriptRel es ../../components/... relativo a src/previews/<cat>/;
  // en disco vive bajo src/components/.
  const file = join(root, 'src', scriptRel.replace(/^\.\.\/\.\.\//, ''));
  let src;
  try { src = await readFile(file, 'utf8'); } catch { return ''; }
  const m = /\/\*\*([\s\S]*?)\*\//.exec(src);
  if (!m) return '';
  const body = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*ְ?\s?/, '').replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
  return body;
}


/**
 * Convierte el comentario de cabecera en prosa + TABLAS.
 *
 * El volcado crudo en un <pre> se leia como un dump y no como documentacion.
 * Las secciones conocidas (Atributos, Slots, Eventos, Data props, API,
 * Metodos) pasan a <table class="ref">; el resto queda como parrafo.
 */
const SECTIONS = /^(Atributos|Data props|Slots|Eventos|API|Metodos|Métodos|Custom states|CSS Parts)/i;

function renderDoc(doc) {
  const lines = doc.split(String.fromCharCode(10));
  const intro = [];
  const groups = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { if (current) current.rows.push(null); continue; }
    if (SECTIONS.test(line.trim()) && line.trim().length < 40) {
      current = { title: line.trim(), rows: [] };
      groups.push(current);
      continue;
    }
    if (!current) { intro.push(line.trim()); continue; }
    current.rows.push(line);
  }

  const tables = groups.map((g) => {
    // Cada fila: "  nombre   resto..." -> dos columnas.
    const rows = [];
    for (const r of g.rows) {
      if (r == null) continue;
      const m = /^\s{2,}(\S+)\s{2,}(.*)$/.exec(r);
      if (m) rows.push([m[1], m[2].trim()]);
      else if (rows.length) rows[rows.length - 1][1] += ' ' + r.trim();
    }
    if (!rows.length) return '';
    const body = rows
      .map(([k, v]) => `            <tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`)
      .join(String.fromCharCode(10));
    return `        <h3>${esc(g.title)}</h3>
        <table class="ref">
          <thead><tr><th>Nombre</th><th>Descripción</th></tr></thead>
          <tbody>
${body}
          </tbody>
        </table>`;
  }).filter(Boolean).join(String.fromCharCode(10, 10));

  return { intro: intro.join(' '), tables };
}

const manifestSrc = await readFile(join(root, 'src', 'manifest.js'), 'utf8');
const { default: manifest } = await import(new URL('../src/manifest.js', import.meta.url));

let created = 0;
let manifestOut = manifestSrc;

for (const [tag, cfg] of Object.entries(CHILDREN)) {
  const entry = manifest.find((c) => c.tag === tag);
  if (!entry) { console.log(`[skip] ${tag}: no está en el manifest`); continue; }

  const short = tag.replace(/^iswc-/, '');
  const page = `${entry.category}/${tag}.html`;
  const out = join(root, 'src', 'previews', page);

  if (!FORCE) {
    try { await access(out); console.log(`[skip] ${page}: ya existe`); continue; } catch { /* crear */ }
  }

  const modules = [...new Set([...(cfg.modules || []), ...(cfg.extra || []), 'media/icon.js'])];
  const moduleTags = modules
    .map((m) => `  <script type="module" src="../../components/${m}"></script>`)
    .join('\n');

  const doc = await headerDoc(entry.script, tag);
  const { intro, tables } = renderDoc(doc);
  const styles = cfg.styles ? `\n  <style>\n    ${cfg.styles}\n  </style>` : '';

  const html = `<!DOCTYPE html>
<html lang="es" class="theme-dark" data-theme="dark" data-palette="insoft">
<head>
  <meta charset="UTF-8" />
  <script src="../../scripts/preview-boot.js"></script>
  <script type="module" src="../../components/layout/demo.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${tag} · IS Web Components</title>
  <meta name="description" content="Documentación y demos de ${tag} de InSoft." />

  <link rel="stylesheet" href="../../src/styles/is-base.css" />
  <link rel="stylesheet" href="../../src/styles/palettes.css" />
  <link rel="stylesheet" href="../../src/styles/presentation.css" />
${moduleTags}
  <script type="module" src="../../components/layout/split-panel.js"></script>
  <script type="module" src="../../components/layout/main.js"></script>
  <script type="module" src="../../components/layout/scrollspy.js"></script>

  <script src="../../scripts/highlight-pre.js" defer></script>
  <script src="../../scripts/demo-code.js" defer></script>
  <script src="../../scripts/docs-chrome.js" defer></script>
  <script type="module" src="../../scripts/preview-chrome.js"></script>${styles}
</head>
<body>

  <iswc-split-panel class="page" orientation="horizontal" position-in-pixels="220" primary="end" storage-key="docs-toc">
    <iswc-main class="main" slot="start" remember-scroll storage-key="docs-${tag}">

      <section class="section" id="intro">
        <h2>&lt;${tag}&gt;</h2>
        <p class="lede">${cfg.lede}</p>

        <iswc-demo class="demo">
${cfg.demo.split('\n').map((l) => '          ' + l).join('\n')}
        </iswc-demo>

        <pre class="code" data-lang="html">${esc(cfg.demo)}</pre>
      </section>

      <section class="section" id="reference">
        <h2>Referencia</h2>
        <p class="lede">${esc(intro)}</p>
${tables}
        <p class="lede">
          API declarada en el módulo fuente
          <code class="code">${entry.script.replace(/^\.\.\/\.\.\//, '')}</code>.
        </p>
      </section>

    </iswc-main>

    <aside class="sidebar" slot="end">
      <h1>${tag}</h1>
      <iswc-scrollspy target="iswc-main">
        <a href="#intro">Introducción</a>
        <a href="#reference">Referencia</a>
      </iswc-scrollspy>
    </aside>
  </iswc-split-panel>
</body>
</html>
`;

  await writeFile(out, html, 'utf8');
  created += 1;
  console.log(`[new]  src/previews/${page}`);

  // Registrar la page en el manifest (la entrada existe pero sin `page` propia).
  const re = new RegExp(`(\\{ tag: '${tag}',[^}]*?)(, page: '[^']*')?( \\})`);
  if (re.test(manifestOut)) {
    manifestOut = manifestOut.replace(re, (_m, head, _old, tail) => `${head}, page: '${page}'${tail}`);
  }
}

if (manifestOut !== manifestSrc) {
  await writeFile(join(root, 'src', 'manifest.js'), manifestOut, 'utf8');
  console.log('manifest.js actualizado');
}
console.log(`\n${created} previews generadas`);
