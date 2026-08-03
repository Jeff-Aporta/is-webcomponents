// gen-child-previews.mjs — genera la página de preview propia de los
// componentes "hijo" que hasta ahora compartían la del padre.
//
// Cada hijo es un componente publico del manifest y el index debe poder
// abrir SU demo, no el del padre. El demo se muestra en el contexto minimo
// del padre (un <is-tab-panel> solo tiene sentido dentro de <is-tab-group>),
// pero la pagina documenta la API DEL HIJO.
//
// La documentacion de atributos NO se inventa: se extrae del bloque de
// comentario de cabecera del modulo fuente.
//
// Uso:  node scripts/gen-child-previews.mjs [--force]

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
  'is-dropdown-item': {
    modules: ['actions/dropdown.js', 'actions/dropdown-item.js', 'actions/button.js'],
    lede: 'Item de un <code class="code">&lt;is-dropdown&gt;</code>. Aporta el estado (activo, deshabilitado), el slot de icono y el valor que viaja en el evento de selección.',
    demo: `<is-dropdown placement="bottom-start">
  <is-button slot="trigger" color="brand">Acciones</is-button>
  <is-dropdown-item value="edit"><is-icon slot="start" icon="mdi:pencil"></is-icon>Editar</is-dropdown-item>
  <is-dropdown-item value="dup"><is-icon slot="start" icon="mdi:content-copy"></is-icon>Duplicar</is-dropdown-item>
  <is-dropdown-item value="del" color="danger"><is-icon slot="start" icon="mdi:trash-can"></is-icon>Eliminar</is-dropdown-item>
  <is-dropdown-item value="off" disabled>No disponible</is-dropdown-item>
</is-dropdown>`,
  },
  'is-toast-item': {
    modules: ['feedback/toast.js', 'actions/button.js'],
    lede: 'Ítem individual de notificación. Se crea normalmente con <code class="code">toaster.create()</code>, pero también se puede declarar suelto para controlar su ciclo de vida a mano.',
    demo: `<is-toast-item color="success" open duration="0">
  <is-icon slot="icon" icon="mdi:check-circle"></is-icon>
  Guardado correctamente
</is-toast-item>
<is-toast-item color="danger" open duration="0">
  <is-icon slot="icon" icon="mdi:alert-circle"></is-icon>
  No se pudo guardar
</is-toast-item>`,
  },
  'is-breadcrumb-item': {
    modules: ['navigation/breadcrumb.js', 'navigation/breadcrumb-item.js'],
    lede: 'Cada eslabón de un <code class="code">&lt;is-breadcrumb&gt;</code>. Puede ser enlace (<code class="code">href</code>) o texto plano cuando es la página actual.',
    demo: `<is-breadcrumb>
  <is-breadcrumb-item href="#"><is-icon slot="start" icon="mdi:home"></is-icon>Inicio</is-breadcrumb-item>
  <is-breadcrumb-item href="#">Contabilidad</is-breadcrumb-item>
  <is-breadcrumb-item href="#">Comprobantes</is-breadcrumb-item>
  <is-breadcrumb-item>Detalle</is-breadcrumb-item>
</is-breadcrumb>`,
  },
  'is-tab': {
    modules: ['navigation/tab-group.js'],
    lede: 'Pestaña de un <code class="code">&lt;is-tab-group&gt;</code>. El atributo <code class="code">panel</code> la enlaza con su <code class="code">&lt;is-tab-panel&gt;</code>.',
    demo: `<is-tab-group>
  <is-tab slot="nav" panel="a"><is-icon slot="start" icon="mdi:chart-line"></is-icon>Resumen</is-tab>
  <is-tab slot="nav" panel="b">Movimientos</is-tab>
  <is-tab slot="nav" panel="c" disabled>Cierre</is-tab>
  <is-tab-panel name="a">Panel de resumen.</is-tab-panel>
  <is-tab-panel name="b">Panel de movimientos.</is-tab-panel>
  <is-tab-panel name="c">Panel de cierre.</is-tab-panel>
</is-tab-group>`,
  },
  'is-tab-panel': {
    modules: ['navigation/tab-group.js'],
    lede: 'Contenido asociado a una <code class="code">&lt;is-tab&gt;</code>. Solo se muestra el panel cuyo <code class="code">name</code> coincide con el <code class="code">panel</code> de la pestaña activa.',
    demo: `<is-tab-group>
  <is-tab slot="nav" panel="uno">Uno</is-tab>
  <is-tab slot="nav" panel="dos">Dos</is-tab>
  <is-tab-panel name="uno">
    <p>El panel es un contenedor normal: acepta cualquier contenido.</p>
    <is-tag color="brand">Contenido rico</is-tag>
  </is-tab-panel>
  <is-tab-panel name="dos">Segundo panel.</is-tab-panel>
</is-tab-group>`,
    extra: ['feedback/tag.js'],
  },
  'is-carousel-item': {
    modules: ['navigation/carousel.js'],
    lede: 'Cada diapositiva de un <code class="code">&lt;is-carousel&gt;</code>.',
    demo: `<is-carousel style="max-width:520px">
  <is-carousel-item><div class="slide">Diapositiva 1</div></is-carousel-item>
  <is-carousel-item><div class="slide">Diapositiva 2</div></is-carousel-item>
  <is-carousel-item><div class="slide">Diapositiva 3</div></is-carousel-item>
</is-carousel>`,
    styles: `.slide { display:grid; place-items:center; height:180px; border-radius:.6rem;
      background: color-mix(in srgb, var(--is-accent) 14%, var(--is-bg-elev)); font-weight:600; }`,
  },
  'is-tree-item': {
    modules: ['navigation/tree.js'],
    lede: 'Nodo de un <code class="code">&lt;is-tree&gt;</code>. Anidando items se construye la jerarquía; <code class="code">expanded</code> controla el pliegue.',
    demo: `<is-tree>
  <is-tree-item expanded><is-icon slot="start" icon="mdi:folder"></is-icon>Contabilidad
    <is-tree-item><is-icon slot="start" icon="mdi:file-document"></is-icon>Balance</is-tree-item>
    <is-tree-item><is-icon slot="start" icon="mdi:file-document"></is-icon>Estado de resultados</is-tree-item>
  </is-tree-item>
  <is-tree-item><is-icon slot="start" icon="mdi:folder"></is-icon>Inventario</is-tree-item>
</is-tree>`,
  },
  'is-stepper-step': {
    modules: ['navigation/stepper.js'],
    lede: 'Paso de un <code class="code">&lt;is-stepper&gt;</code>, con su título, descripción y estado.',
    demo: `<is-stepper current="1">
  <is-stepper-step title="Datos" description="Identificación"></is-stepper-step>
  <is-stepper-step title="Detalle" description="Líneas del comprobante"></is-stepper-step>
  <is-stepper-step title="Revisión" description="Confirmar y guardar"></is-stepper-step>
</is-stepper>`,
  },
  'is-option': {
    modules: ['forms/combobox.js', 'forms/option.js'],
    lede: 'Opción de un <code class="code">&lt;is-combobox&gt;</code> o <code class="code">&lt;is-select&gt;</code>. El <code class="code">value</code> es lo que expone el control; el contenido es lo que ve el usuario.',
    demo: `<is-combobox label="Ciudad" placeholder="Elige una" style="max-width:320px">
  <is-option value="bog">Bogotá</is-option>
  <is-option value="mde">Medellín</is-option>
  <is-option value="cal">Cali</is-option>
  <is-option value="brr" disabled>Barranquilla (sin cobertura)</is-option>
</is-combobox>`,
  },
  'is-radio-group': {
    modules: ['forms/radio-group.js', 'forms/radio.js'],
    lede: 'Agrupa varios <code class="code">&lt;is-radio&gt;</code> bajo un mismo nombre y expone el valor seleccionado como un único control de formulario.',
    demo: `<is-radio-group label="Forma de pago" value="credito" name="pago">
  <is-radio value="contado">Contado</is-radio>
  <is-radio value="credito">Crédito</is-radio>
  <is-radio value="mixto">Mixto</is-radio>
</is-radio-group>`,
  },
  'is-month-calendar': {
    modules: ['forms/month-calendar.js'],
    lede: 'Calendario de un mes, suelto. Es la pieza que <code class="code">&lt;is-date-picker&gt;</code> usa por dentro, y sirve por sí sola para vistas de agenda.',
    demo: `<is-month-calendar value="2026-08-12"></is-month-calendar>`,
  },
  'is-year-calendar': {
    modules: ['forms/year-calendar.js'],
    lede: 'Vista de los 12 meses de un año para saltar rápido de periodo.',
    demo: `<is-year-calendar value="2026-08"></is-year-calendar>`,
  },
  'is-digital-clock': {
    modules: ['forms/digital-clock.js'],
    lede: 'Reloj digital: muestra la hora en formato numérico y admite selección por teclado.',
    demo: `<is-digital-clock value="14:30"></is-digital-clock>`,
  },
  'is-time-field': {
    modules: ['forms/time-field.js'],
    lede: 'Campo de hora con máscara y validación, asociable a formularios.',
    demo: `<is-time-field label="Hora de ingreso" value="08:30" style="max-width:280px"></is-time-field>`,
  },
  'is-date-time-field': {
    modules: ['forms/date-time-field.js'],
    lede: 'Campo combinado de fecha y hora en un solo control.',
    demo: `<is-date-time-field label="Inicio del turno" value="2026-08-01T08:30" style="max-width:320px"></is-date-time-field>`,
  },
  'is-time-input': {
    modules: ['forms/time-input.js'],
    lede: 'Entrada de hora con selector desplegable.',
    demo: `<is-time-input label="Hora" value="09:15" style="max-width:280px"></is-time-input>`,
  },
  'is-date-time-input': {
    modules: ['forms/date-time-input.js'],
    lede: 'Entrada de fecha y hora con calendario y reloj en el mismo desplegable.',
    demo: `<is-date-time-input label="Vencimiento" value="2026-08-15T17:00" style="max-width:340px"></is-date-time-input>`,
  },
  'is-date-range-input': {
    modules: ['forms/date-range-input.js'],
    lede: 'Entrada de rango de fechas: una sola caja para inicio y fin.',
    demo: `<is-date-range-input label="Periodo" start="2026-08-01" end="2026-08-31" style="max-width:360px"></is-date-range-input>`,
  },
  'is-transfer-item': {
    modules: ['data/transfer.js'],
    lede: 'Elemento movible entre las dos listas de un <code class="code">&lt;is-transfer&gt;</code>.',
    demo: `<is-transfer>
  <is-transfer-item value="a">Cuentas por cobrar</is-transfer-item>
  <is-transfer-item value="b" selected>Cuentas por pagar</is-transfer-item>
  <is-transfer-item value="c">Inventario</is-transfer-item>
</is-transfer>`,
  },
  'is-kanban-column': {
    modules: ['data/kanban.js'],
    lede: 'Columna de un tablero <code class="code">&lt;is-kanban&gt;</code>: título, acento de color y contador de tarjetas.',
    demo: `<is-kanban>
  <is-kanban-column title="Pendiente" accent="#f59f00">
    <is-kanban-card heading="Conciliar banco"></is-kanban-card>
  </is-kanban-column>
  <is-kanban-column title="En curso" accent="#228be6">
    <is-kanban-card heading="Cierre de mes"></is-kanban-card>
  </is-kanban-column>
  <is-kanban-column title="Listo" accent="#40c057"></is-kanban-column>
</is-kanban>`,
  },
  'is-kanban-card': {
    modules: ['data/kanban.js'],
    lede: 'Tarjeta de un tablero. Es arrastrable entre columnas y admite encabezado, meta, etiqueta y pie.',
    demo: `<is-kanban>
  <is-kanban-column title="Tareas">
    <is-kanban-card heading="Conciliar banco" meta="Vence hoy" tag="Urgente" tag-variant="danger">
      Revisar extracto de agosto.
    </is-kanban-card>
    <is-kanban-card heading="Cierre de mes" meta="3 días" tag="Normal">
      Cuadrar cuentas de resultado.
    </is-kanban-card>
  </is-kanban-column>
  <is-kanban-column title="Hechas"></is-kanban-column>
</is-kanban>`,
  },
  'is-speed-dial-action': {
    modules: ['actions/speed-dial.js', 'actions/fab.js'],
    lede: 'Cada acción que despliega un <code class="code">&lt;is-speed-dial&gt;</code>, con su icono y su etiqueta.',
    demo: `<div class="sd-stage">
  <is-speed-dial direction="up" open>
    <is-speed-dial-action icon="mdi:file-document" label="Documento"></is-speed-dial-action>
    <is-speed-dial-action icon="mdi:image" label="Imagen"></is-speed-dial-action>
    <is-speed-dial-action icon="mdi:link" label="Enlace"></is-speed-dial-action>
  </is-speed-dial>
</div>`,
    styles: `.sd-stage { position:relative; transform:translateZ(0); height:320px;
      border:1px dashed var(--is-border); border-radius:.6rem; }`,
  },
  'is-dock-item': {
    modules: ['layout/dock.js'],
    lede: 'Icono de un <code class="code">&lt;is-dock&gt;</code>, con su etiqueta y estado activo.',
    demo: `<div class="dock-stage">
  <is-dock>
    <is-dock-item icon="mdi:home" label="Inicio" active></is-dock-item>
    <is-dock-item icon="mdi:chart-box" label="Reportes"></is-dock-item>
    <is-dock-item icon="mdi:cog" label="Ajustes"></is-dock-item>
  </is-dock>
</div>`,
    styles: `.dock-stage { position:relative; transform:translateZ(0); height:200px;
      border:1px dashed var(--is-border); border-radius:.6rem; }`,
  },
  'is-map-marker': {
    modules: ['data-viz/maps.js'],
    lede: 'Marcador posicionado por longitud y latitud dentro de un <code class="code">&lt;is-maps&gt;</code>.',
    demo: `<is-maps viewbox="-80,-5,-66,13" style="height:320px">
  <is-map-marker lon="-74.07" lat="4.71" label="Bogotá"></is-map-marker>
  <is-map-marker lon="-75.56" lat="6.25" label="Medellín"></is-map-marker>
  <is-map-marker lon="-76.53" lat="3.45" label="Cali"></is-map-marker>
</is-maps>`,
  },
};

/** Extrae el comentario de cabecera del modulo (la API real, sin inventar). */
async function headerDoc(scriptRel, tag) {
  const file = join(root, scriptRel.replace(/^\.\.\/\.\.\//, ''));
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

const manifestSrc = await readFile(join(root, 'manifest.js'), 'utf8');
const { default: manifest } = await import(new URL('../manifest.js', import.meta.url));

let created = 0;
let manifestOut = manifestSrc;

for (const [tag, cfg] of Object.entries(CHILDREN)) {
  const entry = manifest.find((c) => c.tag === tag);
  if (!entry) { console.log(`[skip] ${tag}: no está en el manifest`); continue; }

  const short = tag.replace(/^is-/, '');
  const page = `${entry.category}/${tag}.html`;
  const out = join(root, 'previews', page);

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

  <link rel="stylesheet" href="../../styles/is-base.css" />
  <link rel="stylesheet" href="../../styles/palettes.css" />
  <link rel="stylesheet" href="../../styles/presentation.css" />
${moduleTags}
  <script type="module" src="../../components/layout/split-panel.js"></script>
  <script type="module" src="../../components/layout/main.js"></script>
  <script type="module" src="../../components/layout/scrollspy.js"></script>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/theme/material-darker.min.css">
  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.js"></script>
  <script src="../../scripts/highlight-pre.js" defer></script>
  <script src="../../scripts/demo-code.js" defer></script>
  <script src="../../scripts/docs-chrome.js" defer></script>
  <script type="module" src="../../scripts/preview-chrome.js"></script>${styles}
</head>
<body>

  <is-split-panel class="page" orientation="horizontal" position-in-pixels="220" primary="end" storage-key="docs-toc">
    <is-main class="main" slot="start" remember-scroll storage-key="docs-${tag}">

      <section class="section" id="intro">
        <h2>&lt;${tag}&gt;</h2>
        <p class="lede">${cfg.lede}</p>

        <is-demo class="demo">
${cfg.demo.split('\n').map((l) => '          ' + l).join('\n')}
        </is-demo>

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

    </is-main>

    <aside class="sidebar" slot="end">
      <h1>${tag}</h1>
      <is-scrollspy target="is-main">
        <a href="#intro">Introducción</a>
        <a href="#reference">Referencia</a>
      </is-scrollspy>
    </aside>
  </is-split-panel>
</body>
</html>
`;

  await writeFile(out, html, 'utf8');
  created += 1;
  console.log(`[new]  previews/${page}`);

  // Registrar la page en el manifest (la entrada existe pero sin `page` propia).
  const re = new RegExp(`(\\{ tag: '${tag}',[^}]*?)(, page: '[^']*')?( \\})`);
  if (re.test(manifestOut)) {
    manifestOut = manifestOut.replace(re, (_m, head, _old, tail) => `${head}, page: '${page}'${tail}`);
  }
}

if (manifestOut !== manifestSrc) {
  await writeFile(join(root, 'manifest.js'), manifestOut, 'utf8');
  console.log('manifest.js actualizado');
}
console.log(`\n${created} previews generadas`);
