# Spec — Galería y previews

Shell de demostración, estado en URL y previews controlados por JSON.

Diario: [`lessons.md`](../../specs/lessons.md) · [`constraints.md`](../../specs/constraints.md) (previews, URL, boot).

## Contexto

La galería (`index.html` + `src/previews/`) es el laboratorio visual del kit. Cada tag tiene un preview homogéneo; el consumidor real usa CDN, no copia estos JSON.

## S-G1 Previews JSON

- Archivo: `src/previews/<categoria>/<tag>.json` con `$schema: "iswc-preview/v1"`.
- `src/manifest.ts` → `page` apunta al `.json`, no a HTML por tag.
- Único HTML bajo previews: `src/previews/_shell.html` (fullscreen).
- Comportamiento dinámico: `src/previews/behaviors/<tag>.js` (`mount` / `unmount`). **Prohibido** `eval` o listeners en strings del JSON.

## S-G2 Chrome

- Componente: `<iswc-preview-component>` (`src/components/layout/preview-component.js`).
- Catálogo: `src/previews/catalog.ts` + `registry.loadPreview(tag)`.
- Utilerías públicas en `helpers/`: tab en nav + JSON + MD (`tests/gobernanza/helpers-homogeneity.test.ts`).
- Playground de producto: `<iswc-playground>` ([`playground.md`](../../src/components/preview/playground.md)).
  Si el JSON trae seccion playground, va **primera**. Knobs = contrato `controls`;
  no HTML nativo de formularios en el chrome.

## S-G3 Estado en URL

- Un solo query: `?s=<b64url JSON>`. Claves internas (`component`, `docs`, `cdnTab`, `theme`, `palette`, …) viven **dentro** de `s`.
- Módulo: `src/components/_shared/url-nav.js` (`readUrlNav` / `writeUrlNav`).
- Al cambiar `component`, merge del resto de keys (no borrar `docs` / `cdnTab`).

## S-G4 Boot de galería

- CSS en `<link>` estático; shell mínimo con `await`; resto on-demand (`GALLERY_CHROME_TAGS` + tags del JSON activo).
- `setHostPreview`: borrar own-property `.preview` antes de asignar al CE.
- Dev server oficial: `deno run -A --no-check scripts/serve.mjs` (puerto 8391, `Cache-Control: no-store`).

## Contratos

| Pieza | Contrato |
|---|---|
| Manifest | `page: "<cat>/<tag>.json"` |
| Schema | `$schema: "iswc-preview/v1"` |
| URL | `?s=` único; sin params sueltos |
| Servidor dev | `scripts/serve.mjs` :8391 |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| JSON válido por tag con page | schema + chrome montado | `tests/gobernanza/preview-json-contract.test.ts` |
| Controller sin eval | behaviors aislados | `tests/componentes/preview-controller.test.ts` |
| Paths de assets en preview | 0 links rotos | `tests/gobernanza/preview-paths.test.ts` |
| Solo `?s=` en nav | sin query huérfanos | `tests/gobernanza/url-nav.test.ts` |
| Boot sin FOUC crítico | shell + deps ordenadas | `tests/componentes/gallery-boot.test.ts` |
| Invariantes UX galería | tabs, meta, fuentes | `tests/gobernanza/ux-gallery-invariants.test.ts` |
