# Demo Audit: files

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos de la categoría `files`. Esta categoría se distribuye en dos estructuras distintas en el repo:

- `src/components/files/`: 4 componentes principales (cada uno con `.ts`, `.md`, `.json`, `.css`):
  1. **csv-edit** + **csv-view** (editores/visores CSV).
  2. **file-edit** + **file-view** (editores/visores de archivos genéricos).
  3. **txt-edit** + **txt-view** (editores/visores de texto plano).
  4. **docx-view** + **pptx-view** (visores de Office; no tienen editor).

- `demos/files/`: **NO existe**. La carpeta no fue creada.

Total de demos: **0**. El brief lista "~8 demos" pero **no hay demos HTML** para esta categoría.

> **Gap crítico:** 8 componentes con bundle compilado en `dist/cdn/files/*.min.{js,css}` + documentación en `.md` + preview-config en `.json` **no tienen un solo demo HTML**. Es la categoría con la peor cobertura del repo.

## Demos auditados

**Ninguno.** Esta categoría carece de demos.

## Criterios del brief

1. ¿Tiene **1 playground interactivo**? — **N/A** (no hay demos).
2. ¿Cada prop tiene al menos 1 ejemplo? — **N/A**.
3. ¿Usa tokens `--iswc-*` (no hex literales)? — **N/A**.
4. ¿Funciona como esperado? — **N/A** para demos; los bundles sí existen.
5. ¿Coherente con la documentación? — **N/A**.

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| (ninguno) | n/a | n/a | n/a | n/a | n/a |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | n/a | n/a | 0 demos |
| Cobertura de props | n/a | n/a | 0 demos |
| Tokens `--iswc-*` | n/a | n/a | 0 demos |
| Funciona | n/a | n/a | 0 demos (pero los bundles `dist/cdn/files/<x>.min.js` SÍ existen) |
| Coherente con docs | n/a | n/a | 0 demos |

## 1. Hallazgo crítico: categoría sin demos

Esta es la **única categoría** (de las auditadas) **completamente sin demos**. Las 4 categorías con peor cobertura en el repo tienen:

- `files`: 0 demos / 8 componentes → ratio 0.00.
- `preview`: 0 demos / 1 componente (`iswc-playground`).
- `navigation`: 2 demos / ~13 componentes → ratio 0.15.
- `helpers`: 5 demos / ~16 componentes → ratio 0.31.

### Componentes sin demo

Verificado en `src/components/files/`:

| Componente | .ts | .md | .json | .css | bundle en dist/cdn/files/ |
|------------|-----|-----|-------|------|--------------------------|
| `iswc-csv-edit`     | ✅ | ✅ | ✅ | ✅ | ✅ `csv-edit.min.js/css` |
| `iswc-csv-view`     | ✅ | ✅ | ✅ | ✅ | ✅ `csv-view.min.js/css` |
| `iswc-file-edit`    | ✅ | ✅ | ✅ | ✅ | ✅ `file-edit.min.js/css` |
| `iswc-file-view`    | ✅ | ✅ | ✅ | ✅ | ✅ `file-view.min.js/css` |
| `iswc-txt-edit`     | ✅ | ✅ | ✅ | ✅ | ✅ `txt-edit.min.js/css` |
| `iswc-txt-view`     | ✅ | ✅ | ✅ | ✅ | ✅ `txt-view.min.js/css` |
| `iswc-docx-view`    | ✅ | ✅ | ✅ | ✅ | ✅ `docx-view.min.js/css` |
| `iswc-pptx-view`    | ✅ | ✅ | ✅ | ✅ | ✅ `pptx-view.min.js/css` |

**Todos los 8 componentes tienen:**

- Fuente TypeScript (`*.ts`).
- Documentación (`*.md`).
- Config de preview (`*.json`) — con `controls` listos para `preview-chrome.js`.
- Estilos (`*.css`).
- Bundle minificado compilado (`dist/cdn/files/<x>.min.{js,css}`).

**Pero ninguno tiene demo HTML en `demos/files/`.**

Esto significa que **no hay forma de probar manualmente** ninguno de estos 8 componentes en el repo sin:
1. Generar el demo desde el JSON de preview (que sí existe).
2. O escribir un HTML ad-hoc en cualquier otra carpeta.

## 2. ¿Por qué no hay demos?

Posibles razones:

1. **Decisión de scope**: la categoría `files` es para componentes de carga/visualización de archivos. El equipo priorizó las categorías con UI cotidiana (forms, layout, helpers).
2. **Dependencia de input externo**: cargar archivos CSV/TXT/DOCX/PPTX requiere un `<input type="file">` o un `FileReader`. Estos demos pueden ser más complejos que un "1 payload hardcodeado".
3. **Workaround con `<iswc-cdn-snippet>`**: el JSON de preview define los controles. El `preview-chrome.js` puede generar el demo a partir del JSON. **Esto significa que los demos existen "virtualmente"** pero no como archivo.

### Workaround actual

`preview-chrome.js` (en `scripts/`) toma el `manifest.js` (en `src/manifest.ts`) y por cada componente genera un HTML que carga el bundle + el JSON de preview + los `controls` (inputs/selects/buttons). Es decir, **los demos existen en la gallery-app**, pero no en `demos/files/`.

Esto es exactamente el patrón que el brief flag-eaba para `actions`: "playground oficial vive en los JSON de preview". La categoría `files` **aplica este patrón al 100%** — todos los componentes tienen JSON con `controls`, pero **0 demos HTML standalone**.

## 3. Lo que existe en `dist/cdn/files/`

```
dist/cdn/files/
├── csv-edit.min.css     csv-edit.min.js
├── csv-view.min.css     csv-view.min.js
├── docx-view.min.css   docx-view.min.js
├── file-edit.min.css   file-edit.min.js
├── file-view.min.css   file-view.min.js
├── host-base.css        (CSS común del panel)
├── pptx-view.min.css   pptx-view.min.js
├── scrollbars.css       (common scrollbar styling)
├── txt-edit.min.css    txt-edit.min.js
└── txt-view.min.css    txt-view.min.js
```

Bundles compilados, listos para usarse. Pero no hay HTML que los importe.

## 4. ¿Qué falta para cumplir el brief?

| Demo | Estado | Esfuerzo |
|------|--------|----------|
| `csv-edit`   | **Crear demo desde cero** | Medio (necesita input file + drag-drop + textarea para edición) |
| `csv-view`   | **Crear demo desde cero** | Bajo (necesita parsear CSV de muestra) |
| `file-edit`  | **Crear demo desde cero** | Medio (necesita input file + editor) |
| `file-view`  | **Crear demo desde cero** | Bajo (input file + render) |
| `txt-edit`   | **Crear demo desde cero** | Bajo (textarea + textarea preview) |
| `txt-view`   | **Crear demo desde cero** | Bajo (textarea read-only + render) |
| `docx-view`  | **Crear demo desde cero** | Medio (necesita fetch de un .docx de prueba) |
| `pptx-view`  | **Crear demo desde cero** | Medio (necesita fetch de un .pptx de prueba) |

## 5. Recomendaciones

1. **Crear `demos/files/<x>/<x>.html`** para los 8 componentes, siguiendo el patrón de los demás demos:

   ```html
   <!doctype html>
   <html lang="es" class="theme-dark" data-theme="dark">
   <head>
     <meta charset="utf-8" />
     <title>&lt;iswc-csv-edit&gt; · demo</title>
     <style>
       /* chrome con tokens --iswc-* */
     </style>
     <script type="module">
       await import('../../../dist/cdn/files/csv-edit.min.js?h=...');
       await customElements.whenDefined('iswc-csv-edit');
       const el = document.createElement('iswc-csv-edit');
       el.setAttribute('value', 'a,b,c\n1,2,4\n...');
       document.querySelector('main').appendChild(el);
       document.documentElement.dataset.csvEditReady = '1';
     </script>
   </head>
   <body>
     <header><h1>&lt;iswc-csv-edit&gt;</h1><p>Editor CSV in-place.</p></header>
     <main></main>
   </body>
   </html>
   ```

2. **Aprovechar el JSON de preview** para acelerar la creación: los `controls` ya están definidos. Convertir el JSON en HTML boilerplate es trivial.

3. **Crear 1 demo compartido** con `<input type="file">` que permita cargar cualquier archivo CSV/TXT/DOCX/PPTX y demostrar todos los componentes en una sola página.

4. **Aplicar tokens `--iswc-*`** en los nuevos demos (siguiendo el patrón de `index.html:19` del charts).

## 6. Observaciones transversales

1. **`host-base.css` y `scrollbars.css` existen en `dist/cdn/files/`**: ambos archivos son compartidos por otros bundles (también están en `dist/cdn/{charts,data,helpers,isp,...}/`). Es infraestructura común.

2. **`preview-controls` y `preview-component`** son parte de la categoría `layout` (no `preview`): viven en `src/components/layout/`. Estos son los que inyectan los `controls` del JSON en el DOM.

3. **Sub-componente `iswc-cdn-snippet`** está en `feedback` (no en `files`). Es el que muestra snippets de instalación. Lo menciono porque podría confundirse con la categoría `files` por nombre.

## 7. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 0 demos auditados (la categoría `files` no tiene demos HTML); 8 componentes con fuente + docs + JSON + bundle compilado + bundle minificado en `dist/cdn/files/`; 0 demos rotos (porque no hay); 0 incoherencias demo↔doc (idem); **1 gap mayor** (toda la categoría `files` carece de demos standalone — el único lugar donde el usuario puede probar estos componentes es la gallery-app que consume los JSON de preview).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-files.md`.