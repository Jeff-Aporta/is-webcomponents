# Spec — Iconos

Resolución de `<iswc-icon>`, íconos versionados del kit y catálogo Iconify.

Diario (errores, entorno): [`lessons.md`](lessons.md) §Iconos · [`constraints.md`](constraints.md) §CDN e iconos.

## Contexto

Los iconos usan ids Iconify (`set:nombre`). El kit sirve en local SOLO los que usa de verdad (latencia, sin 429 de la API, `currentColor`) y deja todo lo demás a la API de Iconify. Ninguna colección completa viaja en el repo (decisión del usuario, 4-nov-2026).

## S-I1 API pública

- `<iswc-icon icon="mdi:home">` o `icon="tabler:…"` (prefijo colección).
- `<iswc-icon src="…">` para SVG/imagen custom.
- **Prohibido** `<iconify-icon>` en light DOM del consumidor.

## S-I2 Cadena de resolución

Orden en `src/core/icon-loader.ts` (`resolveIconRaw`):

1. Memoria de la página y localStorage `iswc:icon:<set>:<nombre>` (TTL 15 días): sin fetch.
2. Carpeta publicada `<html data-icons>` + `<set>/<nombre>.svg` (en las páginas del propio kit, `<kit>/assets/iconify/`).
3. `https://api.iconify.design/<set>/<nombre>.svg`; si había base local, un aviso `[iswc-icon] falta en local: <set>:<nombre>`.

## S-I3 SVG inline y color

- `icon.ts` inyecta SVG **inline** (no `<img>`) para `currentColor`.
- `#normalizeInlineSvg()` fuerza `fill`/`stroke: currentColor` en hijos (salvo íconos multicolor).

## S-I4 Íconos versionados

- `assets/iconify/<set>/<nombre>.svg`: los que el kit, labs y apps usan. Los genera `deno task icons` (`assets/dl.js`): barre `src/components`, `src/core` y `labs`, suma `extra` (íconos de las apps del VPS y los que el kit arma en tiempo de ejecución, p. ej. `mdi:close`, `mdi:weather-sunny`) y poda lo que nadie usa.
- **No** se versionan colecciones completas: `dist/assets/icons/` se retiró el 4-nov-2026 (13 635 archivos, ~15 MB del tarball de jsDelivr). Guardián: `tests/gobernanza/assets-copia-unica.test.ts` (falla si reaparece o si `assets/iconify` pasa de 2 000 archivos).
- Por proyecto: cada app tiene su `assets/dl.js` y corre la herramienta `download-iconify.ts` del kit.

## S-I5 Catálogo del explorador

El explorador de la galería (`src/components/media/utils/icon-explorer.preview.ts`) lee todo de la API vía `core/icon-loader`, cacheado en localStorage (`iswc:icon-catalogo:*`, mismo TTL):

| Dato | Endpoint | Función |
|---|---|---|
| Familias y metadatos (filtros) | `/collections` | `listIconFamilies()` |
| Nombres de una familia | `/collection?prefix=<set>` | `listIconNames(prefix)` |
| Búsqueda global | `/search?query=…&prefixes=…` | `searchIconNames(term, prefixes, n)` |
| SVG del grid, POR LOTES (un fetch por página de 240) | `/<set>.json?icons=a,b,c` | `prefetchIcons(prefix, names)` |

Sin API (sin red o caída), el explorador muestra un aviso (`AVISO_SIN_API`) en vez de romperse.

## S-I6 Trampas que ya mordieron

| Trampa | Mitigacion |
|---|---|
| Hardcodear paths absolutos (`/assets/iconify/mdi/home.svg`) | Solo funciona en produccion con `base href` correcto; en local usa `rootFromBaseURI()` o un `<base href>` |
| `cache: 'force-cache'` en el fetch del SVG | El `<img>` no respeta los headers de Cache-Control del fetch programatico: el loader pre-resuelve URLs, no el `<img>` |
| `<iconify-icon>` de Iconify como fallback | Carga ~50 KB de web component solo para ser fallback: primero el `<img>` local |
| Un fallo se recuerda por pagina | El loader cachea el `null` de un icono que no resolvio y no lo reintenta hasta recargar; el mapa de fetches en vuelo evita peticiones concurrentes |
| `<iswc-icon>` en light DOM del consumidor | Prohibido: el componente `<iswc-icon>` es la API; `<iconify-icon>` es interna |

## S-I7 Descarga de iconos

```bash
deno task icons
```

Barre `src/components`, `src/core` y `labs`, suma `extra` de `assets/dl.js` (iconos de las
apps del VPS y los que el kit arma en tiempo de ejecucion), baja lo que falta a
`assets/iconify/` y poda lo que nadie usa. Es idempotente. **No** bajes colecciones
completas al repo: el guardian `assets-copia-unica` falla si `assets/iconify/` pasa
de 2 000 archivos o si reaparece `dist/assets/icons/`.

Detalle de la app (no del kit): `skills/iswc-foundation/references/10-iconos.md`.
Bench de raices: `labs/icon-cdn-bench/NOTES.md`.

## Contratos

| Pieza | Contrato |
|---|---|
| Componente | `src/components/media/icon.ts` |
| Loader | `src/core/icon-loader.ts` |
| Assets | `assets/iconify/` (solo los usados; `deno task icons`) |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Referencias icon= en los demos | todas en `assets/iconify` | `tests/componentes/icon-references.test.ts` |
| viewBox de los SVG versionados | presente y válido; grid 24 en mdi/tabler/simple-icons | `tests/componentes/icon-viewbox.test.ts` |
| currentColor en SVG | sin `<img>` para iconify | `tests/componentes/icon-currentcolor.test.ts` |
| Carpeta publicada | los íconos de un demo resuelven por `<html data-icons>` sin API | `tests/gobernanza/cdn-icons.test.ts` (fetch simulado) |
| Explorador | un lote por página, sin fetch tras el lote, API caída sin romper | `tests/componentes/icon-explorer.test.ts` (fetch simulado) |
| Sin colecciones completas | `dist/assets/icons` ausente, `assets/iconify` ≤ 2 000 | `tests/gobernanza/assets-copia-unica.test.ts` |
