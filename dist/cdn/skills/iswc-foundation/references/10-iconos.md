<!-- @vendor 2026-10-13T13:43:10.250Z Jeff-Aporta/is-webcomponents@local dist/cdn/skills/iswc-foundation/references/10-iconos.md -->
# 10 — Íconos: localStorage, local o API

Un ícono se resuelve por esta **cadena**, en orden (Jeff, 2026-10-13):

0. **Memoria** de la página (`rawCache`): un id se pide una sola vez por página, incluido el fallo
   (caché negativo: un ícono irresoluble no se vuelve a pedir aunque el componente se repinte por timer).
1. **localStorage** (`iswc-icon:<set>:<nombre>` → `{ t, s }`: fecha de guardado y texto SVG): sin ningún
   fetch. Todo SVG resuelto por cualquier vía se guarda aquí (tope 32 KB por ícono), también el que vino
   de la API: así la API es solo el fallback de la primera vez y después el ícono se pinta directo. Vida
   máxima 15 días (`LS_TTL_MS`): vencido se vuelve a pedir y se renueva; un barrido perezoso a los 60 s de
   cargar la página retira lo vencido (`purgarIconosVencidos()`). Un fallo nunca se persiste.
   `clearPersistedIcons()` lo vacía. Por qué localStorage y no IndexedDB: textos de ~1 KB, lectura
   síncrona al pintar, sin esquema; IndexedDB no aporta nada aquí. Y por qué NO se cachea así el JS/CSS
   de los componentes: los pines inmutables ya viven en la caché HTTP del navegador (y en el service
   worker de la app); un `<script>` inline desde storage pierde compilación en streaming y caché de
   bytecode, rompe los `import` de módulos ES y obliga a abrir la CSP. Para arranque offline/rápido, lo
   correcto es un service worker con Cache API precargando el pin.
2. **Local**: si está en el mapa de la app (`assets/iconify.json`), se pide a `assets/iconify/<set>/<nombre>.svg`
   de la propia app (en dev y desplegada es un fetch al mismo sitio: rápido).
3. **API de Iconify** (`https://api.iconify.design/<set>/<nombre>.svg`): todo lo que no está en el mapa,
   y también si el archivo local no responde. Una CSP de producción que no la permita (ISW en Azure)
   convierte este paso en fallo: por eso `deno task icons` dentro de `build` debe dejar TODO en local.

No se enlazan rutas de otras apps en ejecución. Lo que otras apps aportan se resuelve **al construir**:
el registro de consumos.

## Archivos

| Ruta | Qué es | Quién lo escribe |
| --- | --- | --- |
| `assets/dl.js` | Configuración: **solo rutas** (`roots`, `extra`, `mapas`) | La persona; `create-iswc-app` lo siembra |
| `assets/iconify.json` | Mapa `IconifyMap` v1: qué hay en local | `deno task icons` |
| `assets/iconify/<set>/<nombre>.svg` | Un SVG por ícono (con `currentColor`) | `deno task icons` |
| `deno.json` → `"iswc": { "host": "https://…/" }` | Sitio donde se publica la app | La persona (`create-iswc-app --host`) |

`assets/dl.js` importa la herramienta del kit **por URL fijada al SHA del pin** (Deno la corre sin
descargar nada); `deno task pin` la incluye en el inventario y `pin --nuevo` la sube con el resto:

```js
import { descargarIconos } from 'https://raw.githubusercontent.com/<owner>/<repo>/<sha40>/src/vendor-distributions/client/tools/download-iconify.ts';
await descargarIconos({ raiz: new URL('..', import.meta.url), roots: ['index.html', 'src', 'view'] });
```

## Qué hace `deno task icons` (dentro de `deno task build`)

1. **Extrae** de `roots` (.ts/.js/.mjs/.html/.json, sin `node_modules`/`dist`/`vendor`) los ids `set:nombre`
   **entre comillas** (`icon="mdi:home"`, `icono: 'mdi:home'`). Los ejemplos en comentarios no cuentan.
   Un id armado en ejecución va en `extra`.
2. **Registro de consumos**: suma **todos** los íconos de los `iconify.json` de lo que la app consume
   (`mapas`; por defecto el del kit al mismo SHA). Son conjuntos mínimos: que sobren unos pocos no
   importa, y así los componentes del kit u otras apps también pintan en local.
3. **Filtra** con la lista de colecciones de Iconify: `node:fs` o `z-index:1` no son íconos.
4. **Descarga en lote** lo que falta (`<set>.json?icons=a,b,…`, 80 por petición, reintentos ante 429/5xx);
   lo existente no se vuelve a pedir. Un nombre que no existe se reporta y no entra al mapa.
5. **Poda** los SVG que ya nadie usa y escribe `iconify.json` **determinista** (sin fecha).

Sin red no rompe el build: conserva lo que hay en disco, no poda y avisa.

## `iconify.json` (contrato: `IconifyMapSchema`, sección `download-iconify` de `src/vendor-distributions/shared/schemas.ts`)

```json
{
  "v": 1,
  "app": "mi-app",
  "host": "https://jeff-aporta.github.io/mi-app/",
  "ruta": "assets/iconify.json",
  "base": "iconify/",
  "icons": { "mdi": ["close", "home"], "tabler": ["heart"] }
}
```

Lo leen dos: `<iswc-icon>` (¿local o API?) y el `dl` de las apps que consumen esta (para bajarse sus íconos).

## Registro en ejecución

El build agrega al registrador `<prefijo>Loader.min.js`:

```js
(globalThis.__ISWC_ICONS__ ??= []).push(new URL('../../assets/iconify.json?v=<hash>', raiz).href);
```

Es una cola global: sirve antes o después de que cargue el kit. Desde código: `registerIcons(url)`
de `_shared/icon-loader`. El json se pide una vez, al resolver el primer ícono.

## Pruebas (plantilla)

- `tests/iconos/iconos.test.ts`: [W-ICO-01] todo ícono usado está en el mapa y como archivo;
  [W-ICO-02] `host` = `deno.json`; [W-ICO-03] el registrador publicado registra el mapa con `?v=`.
- `tests/e2e/00.bienvenida.test.ts`: [W-ICO-04] la bienvenida pide sus íconos a `assets/iconify/` y
  nada a la API; [W-ICO-05] la consola no registra violaciones de CSP (el servidor local de e2e aplica
  las cabeceras de producción de `staticwebapp.config.json`).

## Cuándo NO

- No commitear sets enteros: solo lo que la app usa y lo que consume (el barrido lo decide).
- No pedir íconos por `fetch` a mano ni usar `<iconify-icon>`: siempre `<iswc-icon icon="set:nombre">`.
- No editar `assets/iconify.json` a mano: se regenera.
