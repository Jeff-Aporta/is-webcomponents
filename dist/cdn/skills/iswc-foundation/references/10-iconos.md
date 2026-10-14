<!-- @vendor 2026-10-14T13:21:59.537Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/references/10-iconos.md -->
# 10 — Íconos: localStorage, web publicada o API (sin mapa)

Un ícono se resuelve por esta **cadena**, en orden (Jeff, 2026-10-13). No hay mapa (`iconify.json` ya no
existe): la app declara UNA vez dónde publica sus íconos y `<iswc-icon>` los pide ahí.

0. **Memoria** de la página (`globalThis.__iswcIcons`, compartida por todas las copias del módulo): un id
   se pide una sola vez por página, incluido el fallo (caché negativo), y hay **un solo fetch en vuelo por
   ícono** aunque lo pidan muchos componentes a la vez.
1. **localStorage** (`iswc:icon:<set>:<nombre>` → `{ t, s }`: fecha de guardado y texto SVG): sin ningún
   fetch. Todo SVG resuelto por cualquier vía se guarda aquí (tope 32 KB por ícono), también el que vino
   de la API: así la API es solo el fallback de la primera vez. Vida máxima 15 días (`LS_TTL_MS`): vencido
   se vuelve a pedir y se renueva; un barrido perezoso a los 60 s retira lo vencido (`purgarIconosVencidos()`).
   Un fallo nunca se persiste. Por qué localStorage y no IndexedDB: textos de ~1 KB, lectura síncrona al
   pintar, sin esquema. Y por qué NO se cachea así el JS/CSS de los componentes: los pines inmutables ya
   viven en la caché HTTP (y en el service worker de la app); un `<script>` desde storage pierde la
   compilación en streaming y el bytecode, rompe los `import` ES y obliga a abrir la CSP.
2. **Web publicada de la app** (su propio CDN): `<data-icons><set>/<nombre>.svg`, donde `data-icons` es una
   **URL absoluta** en `<html>`: host publicado + carpeta. Nunca relativa (sin líos de rutas por vista ni
   por `<base>`). Un 404 aquí no genera errores en código (el navegador puede anotar el 404 en su panel de red).
3. **API de Iconify** (`https://api.iconify.design/<set>/<nombre>.svg`). Si había `data-icons` y el ícono no
   estaba publicado, **un aviso por ícono** con formato fijo (grep del e2e):

   ```
   [iswc-icon] falta en local: mdi:home
   ```

   El e2e (Stagehand/Playwright) lo lee de la consola, añade el id a `extra` de `assets/dl.js` si el
   barrido no lo ve, y corre `deno task icons`. Una CSP de producción que no permita la API (ISW en
   Azure) convierte este paso en fallo: por eso `deno task icons` dentro de `build` debe dejarlo TODO publicado.

## Declarar la base (una sola vez)

La base es el sitio publicado de la app (`deno.json` → `"iswc": { "host": "https://…/" }`) + `assets/iconify/`.
Va junto a tema y paleta, en la config inicial de la app (`core/app-init`):

```ts
import { initApp } from '<kit>/dist/cdn/core/app-init.min.js';
initApp({
  theme: 'light',
  palette: 'contapyme',
  icons: { host: 'https://mi-app.azurestaticapps.net/' },   // folder por defecto: 'assets/iconify/'
});
// → <html data-icons="https://mi-app.azurestaticapps.net/assets/iconify/">
```

- `icons: { host, folder? }` (`IconosApp` de `core/app-init.schemas.ts`): `host` absoluto http(s) (un
  relativo lanza `TypeError`); `folder` relativo a `host`, default `ICONS_FOLDER_DEFAULT = 'assets/iconify/'`.
  `iconsBase(icons)` devuelve la URL resultante.
- Sin `initApp`, el atributo va directo en el HTML, junto a los otros dos: `<html data-theme="dark"
  data-palette="contapyme" data-icons="https://mi-app…/assets/iconify/">`.
- Apps de `create-iswc-app`: el registrador `<prefijo>Loader.min.js` que genera el build lo declara solo
  desde `deno.json` → `iswc.host` (si la página no trae otro `data-icons`). No hay nada que repetir. Si la
  página se sirve desde otro origen (dev en localhost, e2e), usa la carpeta `assets/iconify/` de ese mismo
  servidor (URL absoluta derivada del registrador): sin CORS contra el sitio publicado.
- El sitio publicado debe servir los SVG con CORS si la app se abre desde otro origen (dev en localhost
  contra el host publicado): en Azure Static Web Apps, `globalHeaders` con `Access-Control-Allow-Origin`
  para `/assets/iconify/*`. Sin CORS el fetch falla, sale el aviso y el ícono viene de la API.
- Páginas del propio kit sin `data-icons`: si el kit se sirve en el mismo origen que la página, usan
  `<kit>/assets/iconify/`.

## Limpiar (volver a la primera carga)

Todo lo que el kit guarda lleva el prefijo `iswc:` (`core/iswc-storage`). `clearIswcStorage()` borra todas
las `iswc:` de localStorage y sessionStorage y vacía las cachés en memoria (SVG resueltos, fetches en vuelo,
avisos dados); `listIswcKeys()` las lista. `<iswc-prefs-clear>` lo usa: un clic y los íconos se vuelven a pedir.

## Archivos

| Ruta | Qué es | Quién lo escribe |
| --- | --- | --- |
| `assets/dl.js` | Configuración: **solo rutas** (`roots`, `extra`) | La persona; `create-iswc-app` lo siembra |
| `assets/iconify/<set>/<nombre>.svg` | Un SVG por ícono (con `currentColor`) | `deno task icons` |
| `deno.json` → `"iswc": { "host": "https://…/" }` | Sitio donde se publica la app (base de `data-icons`) | La persona (`create-iswc-app --host`) |

`assets/dl.js` importa la herramienta del kit **online, siempre desde `@main`** (Jeff, 2026-10-13: es un CLI que corre
Deno y cuyos tipos nadie importa; ver «Scripts online» en [06-pines-y-vendor.md](06-pines-y-vendor.md)). Como Deno
cachea los módulos remotos para siempre, la tarea `icons` lleva `--reload` del origen; `deno task pin` no cuenta esa
URL como ref mutable (es la forma canónica):

```js
import { descargarIconos } from 'https://raw.githubusercontent.com/<owner>/<repo>/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs';
await descargarIconos({ raiz: new URL('..', import.meta.url), roots: ['index.html', 'src', 'view'], extra: ['mdi:broom'] });
```

```json
"icons": "deno run -A --reload=https://raw.githubusercontent.com/<owner>/<repo>/ assets/dl.js"
```

## Qué hace `deno task icons` (dentro de `deno task build`)

1. **Extrae** de `roots` (.ts/.js/.mjs/.html/.json, sin `node_modules`/`dist`/`vendor`) los ids `set:nombre`
   **entre comillas** (`icon="mdi:home"`, `icono: 'mdi:home'`). Los ejemplos en comentarios no cuentan.
   Suma `extra`: ids armados en ejecución y los que pintan por dentro los componentes del kit (el aviso
   `[iswc-icon] falta en local:` los nombra).
2. **Filtra** con la lista de colecciones de Iconify: `node:fs` o `z-index:1` no son íconos.
3. **Descarga en lote** lo que falta (`<set>.json?icons=a,b,…`, 80 por petición, reintentos ante 429/5xx);
   lo existente no se vuelve a pedir. Un nombre que no existe se reporta.
4. **Poda** los SVG que ya nadie usa. Un `assets/iconify.json` viejo (del mapa) se retira.

Sin red no rompe el build: conserva lo que hay en disco, no poda y avisa.

## Pruebas (plantilla)

- `tests/iconos/iconos.test.ts`: [W-ICO-01] todo ícono usado está como archivo en `assets/iconify/` (y no
  queda `iconify.json`); [W-ICO-02] `deno.json` declara `iswc.host`; [W-ICO-03] el registrador publicado
  declara `<html data-icons>` = host + `assets/iconify/`.
- `tests/e2e/00.bienvenida.test.ts`: [W-ICO-04] `data-icons` es absoluto, los íconos se pintan y quedan en
  localStorage (`iswc:icon:*`); [W-ICO-05] la consola no registra violaciones de CSP.

## Cuándo NO

- No commitear sets enteros: solo lo que la app usa (el barrido y `extra` lo deciden).
- No pedir íconos por `fetch` a mano ni usar `<iconify-icon>`: siempre `<iswc-icon icon="set:nombre">`.
- No declarar `data-icons` relativo: se ignora (la base es la web publicada, absoluta).
- No escribir en localStorage sin el prefijo `iswc:` desde el kit (guardián `meta/iswc-storage.test.ts`).

## Ficha del script online

### `download-iconify` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/vendor-distributions/client/tools/download-iconify.mjs (se importa desde `assets/dl.js`; la tarea es `deno run -A --reload=… assets/dl.js`)
```

- **Qué hace y cuándo**: descarga a `assets/iconify/<set>/<n>.svg` los íconos que la app usa (más `extra`) y poda los que nadie usa. Dentro de `deno task build` (`icons`); a mano tras añadir íconos o tras un aviso `[iswc-icon] falta en local:`.
- **Entradas**: la config de `assets/dl.js` (`raiz`, `roots`, `extra`, `salida`, `podar`, `offline`…) y la API de Iconify (red). El bundle no necesita import map.
- **Escribe**: los SVG de `assets/iconify/`; poda los que nadie usa y retira un `assets/iconify.json` viejo.
- **Salida y errores típicos**: sin red no rompe: conserva lo que hay, no poda y avisa; un id inexistente se reporta (exit 1 en CLI); `descargarIconos` lanza si `roots` está vacío o `raiz` no existe.
