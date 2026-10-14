---
name: iswc-foundation
description: >-
  Estándar de creación y mantenimiento de APPS sobre el kit iswc-root (el «create-react-app» de
  iswc, vanilla + web components + Deno). Usar al crear una app nueva (create-iswc-app), al añadir
  componentes, vistas o demos a una app iswc, al escribir sus specs y pruebas WHAT, al actualizar
  pines o vendor del kit, al configurar build, gate de pruebas (Stagehand) o sync a entregable, o al
  alinear una app existente (ISW…) con el estándar. Todas las apps iswc deben ser
  homogéneas: misma estructura, mismas tareas, mismas reglas.
---
<!-- @vendor 2026-10-14T06:21:55.173Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/SKILL.md -->

# iswc-foundation — el estándar de las apps iswc

Una app iswc es una app estática (HTML + módulos ES servidos tal cual) hecha con el kit **iswc-root**
(`iswc-*`) y componentes propios `<prefijo>-*`, en **Deno**, sin framework ni bundler en runtime.
Este estándar es el que siguen todas (ISW-TestPatyIA y las nuevas) para que se mantengan,
actualicen y escalen igual, por cualquier agente en cualquier sesión.

## 1. Crear una app: `create-iswc-app`

Se ejecuta **directo desde la URL** (Deno no necesita descargar ni clonar nada) o desde un checkout
local del kit. Pin = SHA de 40 hex publicado (el mismo que quedará fijo en la app):

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs mi-app --prefijo=mia --titulo="Mi App"
# o, con el kit clonado:
# (dentro del kit, para probar plantillas sin publicar: deno run -A skills/iswc-foundation/tools/create-iswc-app.ts ../mi-app --prefijo=mia)
cd mi-app && deno install && deno task build && deno task serve
```

Crea el esqueleto COMPLETO con un hola mundo vivo y el pin fijo: shell `<mia-app>`, vista `hola`
con `<mia-hola>`, registro de tags, base de componentes, Zod, SCSS, build con `?v=<hash>`, galería
de demos, gate de pruebas con Stagehand, sync a entregable, specs WHAT sembradas (`specs/` y
`specs/iswc/`), los casos base de prueba (e2e determinista del modal, e2e con `act()` de MiniMax
si hay `dev-token.json`, dominio) y `.gitignore` con `node_modules/` y `dev-token.json`. Las herramientas del kit quedan vendorizadas al **mismo SHA** del
pin. Opciones: `--prefijo`, `--titulo`, `--puerto`, `--sha`, `--repo`. Detalle: [references/13-crear-app.md](references/13-crear-app.md).

## 2. HOW STRONG obligatorios (no se negocian)

| # | Regla |
| --- | --- |
| 1 | **Deno** (`deno.json` con `imports` fijados); vanilla + Web Components. Cero React/MUI/JSX/Babel/bundler en runtime |
| 2 | **Kit por CDN pineado**: un único SHA de 40 hex en toda la app. Nunca `@main`, `@latest`, SHA corto, GitHub Pages ni ramas en raw |
| 3 | **Protocolo de pines del kit** (`deno task pin` / `pin --nuevo=<sha40\|ultimo>` / `vendor:iswc`): vendor = pin |
| 4 | **UI con `iswc-*`** y colores solo con tokens `--iswc-*`; no reinventar lo que el [catálogo](../iswc-root/catalog.md) trae |
| 5 | **Componente = 4 archivos hermanos**: `.ts` + `.scss` + `.md` (6 secciones) + `.json` (`iswc-preview/v1`) |
| 6 | **Registro único** en `src/js/kit-tags.ts` (`KIT_TAGS`, `APP_TAGS`, `VIEW_TAGS`) → registrador `L.registerApp` |
| 7 | **Vista = `view/<v>/`** con `index.html` aislado, `README.md`, `demo/`, `components/`, `utils/`; un shell por vista |
| 8 | **Zod** para todos los tipos; schemas en `src/js/consts/schemas/*.schemas.ts`; datos externos con `safeParse`, nunca `as` |
| 9 | **SCSS** anidado con `_tokens`/`_mixins`; build → `.css` hermana del módulo; hojas adoptadas (sin flicker) |
| 10 | **Cache busting** `?v=<hash de contenido>`; una sola URL por módulo |
| 11 | **Specs WHAT** (`specs/foundation/NN-*.md`, 7 secciones, IDs `[W-|HW-|HS-]`) y **pruebas de caja negra** (`definirPruebas`, cooldown x1440; `factorCooldown` x3 a las que gastan OpenAI, MiniMax x1 cuando el test inyecta el cliente) |
| 12 | **Gate** `deno task test:all` en verde = hecho; sync a entregable solo con el gate en verde |
| 13 | **Íconos: localStorage → web publicada → API (sin mapa)**: `assets/dl.js` (rutas y `extra`) → `assets/iconify/<set>/<n>.svg` con `deno task icons` (dentro de `build`); `<html data-icons>` = `deno.json` → `iswc.host` + `assets/iconify/` (lo declara el registrador; `initApp({ icons: { host } })`); lo que falta sale de la API con el aviso `[iswc-icon] falta en local: <id>`; ids `set:nombre` literales |
| 14 | **Toda estructura es un componente**: toda pieza de UI, por pequeña que sea (figura, fila de metadatos, pie, paginador, caja vacía, fila de acciones), es un web component: `iswc-*` del catálogo o `<prefijo>-*` propio. Prohibido armar HTML suelto en renders, vistas, `index.html` o visores (`innerHTML`/plantillas con estructura, `createElement('div')` que compone UI); solo cabe el markup interno mínimo dentro del shadow de un componente |
| 15 | **Todo componente tiene demo con playground**: su `.json` `iswc-preview/v1` trae ≥1 bloque `demo` con `controls` y está en la galería de la app (`view/demo/manifest.json`); un `iswc-*` además en la galería del kit (`src/manifest.ts`). Un guardián falla si un tag registrado no tiene demo |
| 16 | **Candidatos a iswc-root**: un componente de app sin dominio (útil a otras apps) se marca en su `.json` con `"reuso": { "candidato": "iswc-root", "motivo": "…", "propuesta": "iswc-…" }` (validado por `ReusoCandidatoSchema`). Se revisan periódicamente y se suben al kit; el kit es el sistema de reuso entre apps |

## 3. Mapa de referencias

| Tema | Referencia |
| --- | --- |
| Estructura de carpetas y responsabilidades | [01-estructura.md](references/01-estructura.md) |
| Deno, tareas y build a `dist/cdn` (hashes, registrador) | [02-deno-y-build.md](references/02-deno-y-build.md) |
| Registro y carga de componentes (kit-tags, loader, arranque) | [03-registro-y-carga.md](references/03-registro-y-carga.md) |
| Crear un componente | [templates/specs/iswc/nuevo-componente.md](templates/specs/iswc/nuevo-componente.md) |
| Demos: playground `.json` y galería | [templates/specs/iswc/demo-componente.md](templates/specs/iswc/demo-componente.md) |
| Crear una vista | [templates/specs/iswc/nueva-vista.md](templates/specs/iswc/nueva-vista.md) |
| Estilos SCSS | [04-estilos.md](references/04-estilos.md) |
| Íconos: `assets/dl.js`, `data-icons` (web publicada), localStorage `iswc:`, aviso «falta en local», API | [10-iconos.md](references/10-iconos.md) |
| Zod y tipos | [05-zod-y-tipos.md](references/05-zod-y-tipos.md) |
| Pines y vendor del kit | [06-pines-y-vendor.md](references/06-pines-y-vendor.md) · [actualizar-pin.md](templates/specs/iswc/actualizar-pin.md) |
| Pruebas, Stagehand y gate | [07-pruebas-y-gate.md](references/07-pruebas-y-gate.md) |
| Stagehand compartido: proveedores LLM, generador con fallback, destino por protocolo | [11-stagehand.md](references/11-stagehand.md) |
| Jueces de calidad JEV y LLM (capa extra de pruebas, aviso nunca error, cooldown 24 h por llave, nunca en el entregable) | [12-jueces.md](references/12-jueces.md) |
| Specs y pruebas WHAT | [templates/specs/especificar-what.md](templates/specs/especificar-what.md) |
| Sync a entregable (mirror) | [08-sync-entregable.md](references/08-sync-entregable.md) |
| Alinear una app existente al estándar | [09-alinear-app.md](references/09-alinear-app.md) |
| `create-iswc-app` en detalle | [13-crear-app.md](references/13-crear-app.md) |
| Herramientas de test: qué usar y cuándo (guía única para agentes) | [14-herramientas-de-test.md](references/14-herramientas-de-test.md) |

## 4. Flujo de trabajo de un agente en una app iswc

1. `AGENTS.md` de la app → `specs/README.md` → `specs/especificar-what.md`.
2. WHAT primero en la spec del área; después el código; después las pruebas que nombran sus `[W-*]`.
3. Componente / vista / demo / pin: la skill correspondiente de `specs/iswc/`.
4. `deno task test:all` en verde. Nada en rojo al cerrar.

## 5. Mantener el estándar

El estándar vive aquí (`iswc-root/skills/iswc-foundation`). Las plantillas (`templates/`) son la
verdad ejecutable: lo que dicen las referencias, las plantillas lo cumplen y `create-iswc-app` lo
siembra. Al cambiar una regla: plantilla + referencia en el mismo commit, `deno run -A
skills/iswc-foundation/tools/manifest.ts` y regenerar una app de prueba con `deno task test:all` en
verde. Las apps existentes se alinean con [09-alinear-app.md](references/09-alinear-app.md).
## Scripts online (Deno, siempre `@main` con `--reload`)

Regla (Jeff, 2026-10-13): los scripts de `tools/` de una skill y los CLI de `vendor-distributions/` (`vendor.ts`,
`pin-update.mjs`, `download-iconify.ts`, `render-lote.ts`) NO se descargan nunca al consumidor: se ejecutan online con
Deno desde `@main` del kit, y lo que se ejecuta es un BUNDLE autocontenido en `dist/cdn/…` (`scripts/build-online.mjs`:
schemas y pin-update inlineados, `zod` como `npm:`; sin imports relativos). `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`
es obligatorio (Deno cachea los módulos remotos para siempre). Nunca una ruta local del checkout ni un SHA en estos
comandos: el pin del proyecto gobierna lo vendorizado, no los scripts.

### `create-iswc-app` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/skills/iswc-foundation/tools/create-iswc-app.mjs <carpeta> [--prefijo=<p>] [--titulo=<t>] [--puerto=<n>] [--sha=<sha40>] [--repo=<o/n>] [--host=<url>]
```

- **Qué hace y cuándo**: crea una app iswc nueva con el estándar (shell, registro de tags, base de componentes, Zod, SCSS, build, galería, vista `hola`, gate de pruebas, sync, specs WHAT). Al fundar un proyecto front; para alinear uno existente ver 09-alinear-app.
- **Entradas**: argumento `<carpeta>` (se crea); flags de arriba (`--sha` default: el pin publicado del kit, `--repo` default `Jeff-Aporta/iswc-root`, `--host` default GitHub Pages del dueño). Lee `templates/manifest.json` y `templates/**` del kit por HTTPS; no lee nada del consumidor.
- **Escribe**: el árbol completo de la app bajo `<carpeta>` (sin `deno install`); deja la app lista para `deno install` + `deno task build`.
- **Salida y errores típicos**: 0 ok · lanza (exit 1) si la carpeta existe y no está vacía, si `--sha` no es un sha40 o si una plantilla no se puede bajar (sin red). Siguiente paso: `deno install && deno task build && deno task test:all`.

### `probar-foundation` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/skills/iswc-foundation/tools/probar-foundation.mjs [--sha=<sha40>] [--repo=<o/n>] [--conservar]
```

- **Qué hace y cuándo**: guardián del estándar: crea una app temporal con create-iswc-app y le corre el gate completo. Se usa en el kit (`deno task test:foundation`) tras cambiar plantillas o referencias; un consumidor no lo necesita.
- **Entradas**: flags; sin `--sha` usa `origin/main` del checkout del kit (necesita git): online conviene pasar `--sha=<sha40 publicado>`. Env `TEST_COOLDOWN=0` dentro de la app temporal.
- **Escribe**: una app en un directorio temporal (se borra salvo `--conservar`).
- **Salida y errores típicos**: 0 verde · 1 si `templates/manifest.json` está desactualizado o el gate de la app falla · lanza si no puede leer `origin/main` sin `--sha`.

### `manifest` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/skills/iswc-foundation/tools/manifest.mjs [--check]
```

- **Qué hace y cuándo**: regenera `templates/manifest.json` (la lista de plantillas que copia create-iswc-app; por HTTPS no se puede listar una carpeta). SOLO tiene sentido dentro del checkout del kit, tras tocar `templates/`; online solo sirve `--check` contra la copia local.
- **Entradas**: la carpeta `templates/` junto al script (`new URL("../templates/", import.meta.url)`).
- **Escribe**: `templates/manifest.json`.
- **Salida y errores típicos**: 0 ok · 1 con `--check` si está desactualizado (mensaje con el comando para regenerarlo).
