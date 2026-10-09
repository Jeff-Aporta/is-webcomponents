# 10 — Íconos: descarga, mapa y cadena entre apps

Cada app iswc lleva **sus propios íconos** en `assets/`, como lleva sus propios componentes. No depende
de que la API de Iconify responda (limita peticiones: 429) ni de que el kit publique sets enteros.

## Archivos

| Ruta | Qué es | Quién lo escribe |
| --- | --- | --- |
| `assets/dl.js` | Configuración: **solo rutas** (`roots`, `extra`) | La persona; `create-iswc-app` lo siembra |
| `assets/iconify.json` | Mapa `IconifyMap` v1 | `deno task icons` |
| `assets/iconify/<set>/<nombre>.svg` | Un SVG por ícono (con `currentColor`) | `deno task icons` |
| `deno.json` → `"iswc": { "host": "https://…/" }` | Sitio donde se publica la app | La persona (`create-iswc-app --host`) |

`assets/dl.js` importa la herramienta del kit **por URL fijada al SHA del pin** (Deno la corre sin
descargar nada). `deno task pin` la incluye en el inventario y `pin --nuevo` la sube con el resto:

```js
import { descargarIconos } from 'https://raw.githubusercontent.com/<owner>/<repo>/<sha40>/src/cdn/tools/download-iconify.ts';
await descargarIconos({ raiz: new URL('..', import.meta.url), roots: ['index.html', 'src', 'view'] });
```

Opciones útiles (todas opcionales salvo `raiz`/`roots`): `extra` (ids armados en ejecución que el barrido
no ve), `mapas` (otros `iconify.json` cuyos tags reusa la app; por defecto el del kit al mismo SHA),
`incrustar` (default `true`), `podar` (default `true`), `offline`, `tagDeArchivo` (default `'{stem}'`).

## Qué hace `deno task icons` (dentro de `deno task build`)

1. **Extrae** de `roots` (.ts/.js/.mjs/.html/.json, sin `node_modules`/`dist`/`vendor`) los ids `set:nombre`
   **entre comillas** (`icon="mdi:home"`, `icono: 'mdi:home'`) y los tags con guion que la app pinta. Los
   ejemplos en JSDoc y comentarios de línea no cuentan.
2. **Suma los íconos de los `iswc-*` que la app usa**: el `iconify.json` del kit trae `tags` (qué íconos
   pinta cada componente, cerrando por los módulos que importa y los tags que pinta). Usar `<iswc-dialog>`
   trae su `mdi:close` aunque la app nunca lo escriba.
3. **Filtra** con la lista de colecciones de Iconify: `node:fs`, `http:x` o `z-index:1` no son íconos.
4. **Descarga en lote** lo que falta (`<set>.json?icons=a,b,…`, 80 por petición, reintentos ante 429/5xx);
   lo que ya está en disco no se vuelve a pedir. Un nombre que no existe se reporta y no entra al mapa.
5. **Poda** los SVG que ya nadie usa y escribe `iconify.json` **determinista** (sin fecha).

Sin red no rompe el build: conserva lo que hay en disco, no poda y avisa.

## `iconify.json` (contrato: `IconifyMapSchema`, `src/cdn/tools/download-iconify.schemas.ts`)

```json
{
  "v": 1,
  "app": "mi-app",
  "host": "https://jeff-aporta.github.io/mi-app/",
  "ruta": "assets/iconify.json",
  "base": "iconify/",
  "icons": { "mdi": ["close", "home"] },
  "svg": { "mdi": { "close": "<svg …>", "home": "<svg …>" } },
  "tags": { "mi-panel": ["mdi:close", "mdi:home"] }
}
```

- `svg` incrustado: la app pinta **todos** sus íconos con una sola petición (el propio json). Medido en
  `labs/icon-cdn-bench`: un json en Pages llega en 35–250 ms para 25–300 íconos; SVG por SVG tarda 1–7 s.
- `tags`: lo usan **otras apps** (y el kit) para llevarse los íconos de los componentes que reusan.

## Registro y cadena entre apps

El build agrega al registrador `<prefijo>Loader.min.js`:

```js
(globalThis.__ISWC_ICONS__ ??= []).push(new URL('../../assets/iconify.json?v=<hash>', raiz).href);
```

Es una cola global (como `registerApp` para los tags): sirve antes o después de que cargue el kit, y
cada app que se monta encadena la suya. Desde código: `registerIcons(url | mapa)` de
`_shared/icon-loader`. `<iswc-icon>` busca así:

1. mapas registrados, **en orden de registro** (la primera app que tiene el ícono gana): SVG incrustado;
   si no, el archivo junto al json; si esa carpeta no es accesible, la misma ruta bajo su `host`;
2. el mapa del kit (`<raíz del kit>/assets/iconify.json`, mismo SHA que el loader);
3. los sets que aún viajan en el kit (`dist/assets/icons/{mdi,solar,tabler}`);
4. la **API de Iconify** (`https://api.iconify.design/<set>/<nombre>.svg`).

Una base que falla por red/CORS/5xx se descarta para el resto de la sesión; un 404 solo descarta ese ícono.

## Pruebas (plantilla)

- `tests/iconos/iconos.test.ts`: [W-ICO-01] todo ícono usado está en el mapa, incrustado y como archivo;
  [W-ICO-02] `host` = `deno.json`; [W-ICO-03] el registrador publicado encadena el mapa con `?v=`.
- `tests/e2e/00.bienvenida.test.ts`: [W-ICO-04] la bienvenida pinta sus íconos sin pedir nada a la API.

## Cuándo NO

- No commitear sets enteros: solo lo que la app usa (el barrido lo decide).
- No pedir íconos por `fetch` a mano ni usar `<iconify-icon>`: siempre `<iswc-icon icon="set:nombre">`.
- No editar `assets/iconify.json` a mano: se regenera. Un id dinámico va en `extra` de `assets/dl.js`.
