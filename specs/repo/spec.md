# Spec — El repo y cómo se trabaja en él

Contrato operativo del kit: qué es, dónde vive cada cosa, cómo se compila y
qué convenciones no se rompen. La carta de invariantes está en
[`../constitution.md`](../constitution.md); el diario de errores, en
[`../lessons.md`](../lessons.md).

Guardián de layout: [`tests/gobernanza/src-layout.test.ts`](../../tests/gobernanza/src-layout.test.ts).
Guardián de nomenclatura: [`tests/gobernanza/nomenclatura.test.ts`](../../tests/gobernanza/nomenclatura.test.ts).

## R1 Qué es este repo

Galería de Web Components vanilla de ISWC (`iswc-*`). Todo escrito a mano con
Custom Elements + Shadow DOM, sin frameworks, empaquetado con esbuild.

- Demo publicada: <https://jeff-aporta.github.io/is-webcomponents/>
- Nombre del kit: **`iswc-base`** en prosa, rutas, carpetas y nombres. El repo de GitHub sigue con su nombre
  actual solo dentro de las URLs (y en `REPO_GITHUB` de `src/core/cdn-ref.ts`) hasta que se renombre.
- Repo: `Jeff-Aporta/is-webcomponents`
- Se sirve por CDN jsDelivr con el SHA del commit en la URL (nunca `@main`).

## R2 Estructura — no inventar, sigue esto

Las fuentes viven en `src/`. En la raíz del repo **no** se recrean `components/`,
`styles/`, `previews/` ni `skills/` (guardián `src-layout`).

```
<repo>/
├── src/
│   ├── components/<categoria>/   # un modulo por tag (actions, charts, code, data, data-viz,
│   │                             #   diagrams, feedback, files, forms, helpers, isp, layout,
│   │                             #   media, navigation, overlays, preview)
│   ├── core/                     # IswcElement, IswcReactive, IswcFormControl, i18n, cdn-ref, code.js
│   ├── styles/                   # is-base.scss (tokens), palettes.scss, presentation.scss,
│   │                             #   shell.scss, system.scss y kit/ (mixins y funciones)
│   ├── previews/                 # un preview por tag (JSON iswc-preview/v1) + behaviours/
│   ├── pages/                    # HTML de la galeria
│   ├── app/                      # armazon de la app (shell, pestanas, sesion)
│   ├── cdn/                      # loader, refs y build del CDN
│   ├── utils/                    # utilidades compartidas (testing, auditor)
│   ├── ai/                       # motores y contratos de IA
│   └── vendor-distributions/     # lo que se vendoriza a los consumidores (client/server/shared)
├── skills/                       # 6 skills vigentes + 2 alias (ver skills/README.md)
├── specs/                        # contrato vigente (esta carpeta)
├── tests/                        # guardianes (gobernanza/) y motor de pruebas (.audit/)
├── scripts/                      # build, serve, sondas, codemods
├── assets/                       # iconify (solo los iconos que usa el kit) + dl.js
├── demos/                        # demos de negocio
├── dist/cdn/                     # artefactos generados (no editar a mano)
├── deno.json                     # tareas y dependencias
├── AGENTS.md                     # reglas vigentes, en corto
└── INDICE.md                     # mapa de documentos (generado)
```

`docs/`, `.superpowers/`, `.impeccable/` y `dist/` se regeneran o son notas
personales: no los toques a menos que sea explícito.

## R3 Comandos

```bash
deno install                 # dependencias (esbuild, typescript, playwright)
deno task dev                # dev server (puerto 8391, canonico)
deno task build              # iconos + scss + bundle en dist/cdn
deno task bundle             # bundles de los scripts online
deno task typecheck          # tsc --noEmit (baseline en deno.json)
deno task test               # guardianes (runner tests/.audit/run.ts)
deno task test:all           # typecheck + test + audit  <-- el gate
deno task audit              # auditor del repo (JSON)
deno task icons              # baja a assets/iconify/ los iconos que el codigo usa
deno task indice             # regenera INDICE.md
deno task readmes            # regenera los README de componentes
deno task css:equivalente    # compara el CSS antes/despues de un cambio de SCSS
deno task medir              # cascada, web vitals y SEO en Edge headless
deno task test:foundation    # comprueba que las skills siguen siendo ciertas
```

Filtrar una suite: `deno task test -- --solo=<id>` (el id es el prefijo del
nombre de la prueba). El cooldown es obligatorio: no se salta con
`--sin-cooldown` (para forzar, edita `.tmp/test-cooldown.json`).

> **NO uses VS Code Live Server en este proyecto.** No transpila TypeScript ni
> mapea specifiers `.js` -> `.ts`, asi que cualquier import de `*.ts` da 404 y la
> galeria se queda en loading eterno.

## R4 Convenciones del repo

### R4.1 Nombres y categorias

- Cada componente es `<iswc-{nombre}>` (siempre prefijo `iswc-`).
- Categorias validas (en `src/manifest.ts`): `actions`, `feedback`, `forms`, `data`,
  `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `code`,
  `overlays`, `files`, `preview`, `isp`. `data-viz` figura en el manifest como
  **legacy alias** de `charts/` (solo conserva `heatmap` + `maps`); si ves
  `data-viz` en un preview, la categoria logica sigue siendo `charts`.
- Los sub-componentes (`iswc-kanban-card`, `iswc-tab-panel`) no aparecen en el
  sidebar; el manifest los lista pero comparten `page` con su padre.

### R4.2 Previews

- Un preview por tag = JSON `iswc-preview/v1` en `src/previews/<cat>/<tag>.json`
  + chrome `<iswc-preview-component>`. No hay HTML por tag.
- El comportamiento va en `src/previews/behaviors/<tag>.js`.
- Los paths de un preview se resuelven contra la raiz del repo: `../` en `home`,
  `../../` en `previews/<categoria>/`. Si equivocas el nivel, el script de carga
  da 404 y la pagina queda en blanco sin error visible.
- `<base href>` cambia la resolucion de **todas** las rutas relativas: los iconos
  locales requieren `rootFromBaseURI()` para seguir viendo el `pathname`.

### R4.3 Tema y paleta

- `data-theme="light|dark"` en `<html>`.
- `data-palette="delfin|cardenal|turquesa|..."` (25 paletas, `src/styles/palettes.json`)
  y `data-panda` opcional en el nodo con `data-theme`. `palettes.scss` se GENERA
  (`scripts/gen-palettes.mjs`).
- Tokens: `--iswc-bg`, `--iswc-text`, `--iswc-border`, `--iswc-color-brand-500`,
  etc. El prefijo `--iswc-*` es el canonico. **No uses `--pg-*`** (legacy).
- API de tamano en componentes: `size="sm|md|lg"` o por CSS — **nunca mezcles
  `size=...` con `pgSize=...`**. Si encuentras `pgSize` es deuda, eliminalo.
- Contrato AA: `scripts/verify-theme-contract.cjs`.

### R4.4 Iconos

Solo se usa `<iswc-icon icon="mdi:home">` (prefijo Iconify) o
`<iswc-icon src="...">` (SVG/imagen custom). **Nunca uses `<iconify-icon>`
directamente en light DOM**: es API interna del componente.

### R4.5 Commits

Conventional commits en espanol, scope corto, mensajes concisos:

```
feat(icons): 13k iconos locales + loader local-first
chore(previews): ajustar paths un nivel arriba + build copia icons
refactor(previews): folderizar por categoria
build(cdn): regenerar bundles despues de folderize
```

**No mezcles cambios no relacionados en un commit.**

## R5 Capas de composicion (bases compartidas)

El repo tiene una jerarquia clara de bases para evitar duplicacion. Cada
componente nuevo usa la capa mas especifica que le aplique.

| Capa | Ubicacion | Aplica a | Que te da |
|---|---|---|---|
| **1. Base de formulario** | `src/core/iswc-form-control.ts` (`IswcFormControl`) | form-controls (input, select, checkbox, ...) | `label`, `hint`, `error-text`, `disabled`, `readonly`, `required`, `aria-describedby`, `aria-invalid` |
| **2. Base de familia** | `src/components/layout/utils/modal-base.ts` (`ModalBase`) | `<iswc-dialog>`, `<iswc-drawer>` | open/close animado cancelable, focus trap, light-dismiss, slots label/footer, events `iswc-show`/`iswc-hide` |
| **3. Base generica** | `src/core/iswc-reactive.ts` (`IswcReactive`) | todos los demas | initShadow, `#mounted`, upgradeProperties, hooks `onConnected`/`onDisconnected`/`onAttributeChanged` |
| **4. Base minima** | `src/core/iswc-element.ts` (`IswcElement`) | cuando el componente no necesita reactividad | `defineElement`, `emit`, helpers de shadow |
| **5. Helpers sueltos** | `src/components/helpers/ui.ts` (`adoptCss`), `src/core/` | cuando aplica | Una sola cosa, importada bajo demanda |

### Como decidir que usar

- **Es un form-control** (acepta `name`/`value`/`required` y muestra label/hint/error)
  -> extiende `IswcFormControl`. Ver `<iswc-input>` y `<iswc-checkbox>`.
- **Es un modal con focus management** (overlay, backdrop, escape cierra) -> extiende
  `ModalBase`. La subclase solo aporta template + animaciones.
- **Es un Web Component normal** con shadow + atributos observados -> extiende
  `IswcReactive`. Te quita ~30 lineas de boilerplate.
- **Necesitas un unico helper** -> importalo de `src/core/` o `src/components/helpers/`.

### Jerarquia de herencia

```
HTMLElement
  ^ extends
IswcElement              (shadow + helpers + emit)
  ^ extends
IswcReactive             (props reactivas + lifecycle + observed + hooks)
  ^ extends
IswcFormControl           (atributos de formulario + sync de aria)
```

```
HTMLElement
  ^ extends
ModalBase                (open/close + focus + animaciones)
  ^ extends
IsDialog                 (template + animaciones fade/scale)
IsDrawer                 (template + animaciones slide + placement)
```

### Red flags

Si estas escribiendo uno de estos, para y reconsidera:

- `el.hasAttribute('foo')` + `el.toggleAttribute('foo', v)` -> usa `IswcReactive` y sus
  props.
- `#upgradeProperties() { for (const a of ...) ... }` -> usa el helper de `src/core/`.

## R6 Resaltado de `<pre class="code">`

El resaltado lo hace `<iswc-code>` con su **motor nativo** (`code-highlight`):
no hay CodeMirror ni sus temas (`cm-s-*`).

- La logica vive en `src/core/code.js` (`paint`, `watchDom`) para que
  `<iswc-cdn-snippet>` (un componente) pueda importarla;
  `scripts/highlight-pre.js` solo arranca el pintado en la pagina.
- Se monta `<iswc-code readonly compact>` por cada `<pre class="code">`.
- El tema son las custom properties `--iswc-code-*`: el componente reacciona al
  evento `iswc-theme-change` y vuelve a pintar solo.
- `data-cm-source` es un nombre **legacy** de la era CodeMirror: hoy es la cache
  del texto ya dedentado.
- El docs no es HTML estatico: `<iswc-preview-component>` monta cada preview
  cuando su JSON termina de bajar, asi que el arranque solo alcanza a los `<pre>`
  que ya existian. `watchDom()` encola los que aparezcan despues y
  `iswc-preview-ready` dispara el repintado.

**Errores a NO repetir:**

- **NO** introduzcas CodeMirror ni sus clases `cm-s-*`: el tema va por `--iswc-code-*`.
- **NO** pintes solo al arrancar: sin `watchDom()` y sin `iswc-preview-ready` los
  previews que llegan despues quedan sin resaltar.

Guardianes: `tests/componentes/code-highlight.test.ts` y
`tests/componentes/code-theme-native.test.ts`.
