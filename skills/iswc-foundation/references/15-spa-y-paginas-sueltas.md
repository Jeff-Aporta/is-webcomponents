# SPA, páginas sueltas, loader/plugin y deberes transversales de una app SaaS

Estándar de lo que una app ISWC debe cumplir cuando es un SaaS: la navegación es una SPA de verdad, las páginas
legales y las demos viven FUERA del layout, los componentes se publican como plugin del kit y los datos personales
tienen retención configurable. Referencia viva: el CRM (`Jeff-Aporta/crm`: `front-crm`, `api-crm`).

## 1. SPA de verdad (no "una página que navega")

- **Rutas reales sin `#/`**: `core/rutas.ts` con `VISTAS` (id, ruta, título, descripción, icono, tag), `baseApp()`,
  `rutaActual()`, `urlDe()`, `vistaDe()`, `navegar()` y `engancharNavegacion()`.
- **Sin recarga**: `history.pushState` + un evento propio (`crm:ruta`); los enlaces internos llevan `data-ruta` y se
  atrapan en `window` (con `composedPath()`, para que funcione dentro de shadow roots). Nunca `location.href =`.
- **Atrás/adelante**: `popstate` re-emite `crm:ruta`; el componente que pinta la vista escucha y vuelve a pintar.
- **Enlaces profundos**: una ruta que no es un archivo (Pages NO reescribe) cae en `404.html`, que guarda la ruta en
  `sessionStorage` y vuelve a la raíz; el script del `<head>` de `index.html` la restaura con `replaceState`. Las
  rutas de sección se declaran en la lista `RUTAS` de ese script (si no, la `<base>` sale mal).
- **Estado y sesión**: navegar no recarga, así que la sesión y el estado de los componentes sobreviven; lo que deba
  perderse se resetea a mano al cambiar de vista.
- **Prueba obligatoria** (`tests/vistas/spa-rutas.test.ts`): con jsdom, un contador en `window` que sobrevive a
  navegar entre dos rutas; el clic en un `data-ruta` cambia la URL; `popstate` re-emite el evento; los enlaces
  profundos resuelven su vista. Sin esta prueba, "parece SPA" no es SPA.

## 2. Páginas sueltas (fuera del layout)

- Los documentos legales (`/legal`, `/legal/terminos`, `/legal/privacidad`, `/legal/dpa`, `/legal/pagos`, alias
  `/privacidad`) y las demos (`/demo`, `/demo/<componente>`) NO se pintan dentro del shell: son páginas públicas.
- Se declaran en `VISTAS` con `enPanel: false` (título/descripción y rutas profundas) y en una lista
  `PAGINAS_SUELTAS` (`{ ruta, tag }`) con un helper `paginaSuelta(ruta)`.
- El **arranque** (`index.html`) decide el MODO antes de definir los tags: `app` (monta el shell) o `pagina`
  (quita `<crm-app>` del documento, monta solo el componente de la página y no arranca la app detrás: ni sesión ni
  websockets). Un elemento sin definir no se "upgradea", por eso el orden importa.
- Desde el shell se enlazan con **enlaces normales** (sin `data-ruta`): cambiar de documento es a propósito ahí.
- El contenido legal es DATO (`view/<v>/utils/documentos.ts`), no markup, con `version` y `actualizado` por
  documento; la aceptación (clickwrap) va en el login, con los cuatro documentos enlazados en el pie.

## 3. Loader y plugin del kit (`iswc-plugin/v1`)

- `deno task build` (`construirApp` → `plugin: { app, repo, titulo }`) publica en `dist/cdn/`: `plugin.json`
  (manifiesto: prefijo, `loader`, kit, `tags` → módulo + `deps`), `<prefijo>Loader.min.mjs` (registrador con
  `registerApp`, carga perezosa de `<prefijo>Loader.deps.json` y `<html data-icons>`) y cada componente.
- Otra app lo carga con `iswcLoader.loadPlugin({ app, repo, sha40, prefijo, tags? })`; el enrutador solo necesita
  repo + sha + prefijo. Pineado siempre a SHA de 40 hex.
- El propio kit lo consume igual: **el plugin es el mecanismo de reuso entre apps**.
- Cada componente trae sus cuatro hermanos (.ts/.scss/.md/.json) y su línea en `view/demo/manifest.json`;
  `.md` es la skill (6 H2 exactos) y `.json` el meta/preview `iswc-preview/v1` con playground (`controls`).
- **Demos folderizadas**: `/demo` lista todos los componentes y `/demo/<componente>` muestra el suyo (segmento sin
  el prefijo). Se sirven con un componente que lee el manifest y las definiciones: el contrato es el mismo del kit.
- En GitHub Pages hay que publicar los `.json` de las definiciones (solo los `.json`): Pages no sirve `view/` del
  repo. Ver `scripts/build/pages.mjs`.

## 4. Deberes transversales de un SaaS

- **Legal**: términos, política de datos (Ley 1581 de 2012 / habeas data), DPA (cliente = Responsable,
  app = Encargado), suscripciones (renovación automática con consentimiento expreso, cancelación sin fricción,
  retracto de 5 días hábiles, factura electrónica) y aviso de aceptación en el login.
- **Retención configurable por empresa** (tabla propia, p. ej. `crm_retencion`): plazos de mensajes, vectores,
  media/transcripciones y resúmenes; `GET/PUT /api/retencion`; tarea DIARIA de purga que borra lo vencido, conserva
  los resúmenes/destilado (salvo que se configure un plazo) y engancha el purgado de embeddings del kit de datos.
- **Bases SQLite versionadas** (si el dueño lo pide): se versiona una copia CONSISTENTE en `datos/repo/` sacada con
  `VACUUM INTO` (tarea `db:guardar`), nunca el archivo en vivo ni sus `-wal`/`-shm`.

## 5. Cómo se verifica

- `deno task test:all` en verde (build + check + pin + health + e2e).
- Pruebas de caja negra: la SPA con jsdom (`tests/vistas/spa-rutas.test.ts`), el API con `deno test`
  (`tests/retencion.test.ts` del CRM), y el contrato de componentes (`tests/vistas/contrato-componentes.test.ts`).
