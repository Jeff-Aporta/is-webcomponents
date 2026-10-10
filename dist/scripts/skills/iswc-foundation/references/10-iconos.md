# 10 — Íconos: local o API

Un ícono se carga de **dos** sitios, nada más:

1. **Local**: si está en el mapa de la app (`assets/iconify.json`), se pide a `assets/iconify/<set>/<nombre>.svg`
   de la propia app (en dev y desplegada es un fetch al mismo sitio: rápido).
2. **API de Iconify** (`https://api.iconify.design/<set>/<nombre>.svg`): todo lo que no está en el mapa,
   y también si el archivo local no responde.

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
import { descargarIconos } from 'https://raw.githubusercontent.com/<owner>/<repo>/<sha40>/src/cdn/tools/download-iconify.ts';
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

## `iconify.json` (contrato: `IconifyMapSchema`, `src/cdn/tools/download-iconify.schemas.ts`)

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
  nada a la API.

## Cuándo NO

- No commitear sets enteros: solo lo que la app usa y lo que consume (el barrido lo decide).
- No pedir íconos por `fetch` a mano ni usar `<iconify-icon>`: siempre `<iswc-icon icon="set:nombre">`.
- No editar `assets/iconify.json` a mano: se regenera.
