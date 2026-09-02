# Spec — CDN y build

Empaquetado esbuild, layout `dist/cdn/` y loader de consumo.

Diario: [`AGENTS.md`](../../LLM.md) (publicación, loader).

## Contexto

El kit se consume desde jsDelivr/GitHub Pages como módulos por tag. La galería local sirve `dist/cdn/` vía `scripts/serve.mjs`.

## S-C1 Layout de salida

- Solo `dist/cdn/<categoria>/<tag>.min.js` (+ `.min.css` si el componente tiene estilos).
- `dist/cdn/core/loader.min.js` + `core/loader.md` (banner con rutas MD).
- **No** `dist/cdn/all.min.js`, **no** `category.*.min.js`, **no** `.js` sueltos en `dist/` raíz.
- Build: `npm run build` → `node scripts/build.mjs`.

## S-C2 Loader

- API: `L.load(tag | tags[] | { categories })` con deduplicación (anti-redundancia).
- Plan de carga documentado en código; categoría no implica todos los tags si ya se pidió el tag.
- Consumidor externo: preferir ruta directa `dist/cdn/<cat>/<tag>.min.js` además del agregado cacheado.

## S-C3 Metadatos

- UI de pesos en galería: `<is-format-bytes autofit>` cuando haya bytes conocidos (p. ej. fuente TS en `_shared`).

## S-C4 Publicación

- Pages: `jeff-aporta.github.io/is-webcomponents/`
- jsDelivr: `@main` (pin por SHA puede fallar >50 MB por iconos en dist).
- `robots.txt` en raíz. Sin `sitemap.xml` ni HTML SEO en `docs/`: la galería es
  una SPA de una sola URL y esas 178 páginas no se alcanzaban (31-ago-2026).

## Contratos

| Pieza | Contrato |
|---|---|
| Build | `npm run build` |
| Dev CDN local | `node scripts/serve.mjs` |
| Carga | `core/loader.min.js` + `L.load(...)` |
| Iconos en dist | `dist/assets/icons/` (fuente versionada, fuera de `dist/cdn/`) |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Solo `dist/cdn/` + `dist/assets/` | sin huérfanos sueltos en `dist/` | `tests/dist-cdn-layout.test.ts` |
| Carpetas CDN | una carpeta por categoría manifest | `tests/cdn-folders.test.ts` |
| Loader y plan | sin doble fetch categoría+tag | `tests/cdn-loader.test.ts`, `tests/load-plan.test.ts` |
| Snippet match preview | paths coherentes con manifest | `tests/cdn-snippet-match.test.ts` |
| Iconos vía CDN local | fetch OK con server :8391 | `tests/cdn-icons.test.ts` (requiere `PORT=8391`) |
