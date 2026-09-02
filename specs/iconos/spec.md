# Spec — Iconos

Resolución de `<is-icon>` y corpus local Iconify.

Diario: [`AGENTS.md`](../../LLM.md) §5 y §9.

## Contexto

Los iconos usan colecciones Iconify. El kit prioriza SVG local para latencia y `currentColor`, con fallback a CDN.

## S-I1 API pública

- `<is-icon icon="mdi:home">` o `icon="tabler:…"` (prefijo colección).
- `<is-icon src="…">` para SVG/imagen custom.
- **Prohibido** `<iconify-icon>` en light DOM del consumidor.

## S-I2 Cadena de resolución

Orden en `src/components/_shared/iconify-loader.js`:

1. Índice local `assets/icons/<colección>.json`
2. SVG local `assets/icons/<colección>/<nombre>.svg`
3. jsDelivr del repo
4. `api.iconify.design`
5. Fallback interno `<iconify-icon>` solo dentro del componente

## S-I3 SVG inline y color

- `icon.js` inyecta SVG **inline** (no `<img>`) para `currentColor`.
- `#normalizeInlineSvg()` fuerza `fill`/`stroke: currentColor` en hijos.
- Guardián: `tests/icon-references.test.ts` (referencias en previews/manifest).

## S-I4 Corpus commiteado

- Default commiteado: `mdi` + `tabler` (~5 MB).
- Descarga completa: `npm run icons:download` (no commitear 231 colecciones).
- Por proyecto: `scripts/download-iconify.ts --projectRoot=…`

## Contratos

| Pieza | Contrato |
|---|---|
| Componente | `src/components/media/icon.js` |
| Loader | `src/components/_shared/iconify-loader.js` |
| Assets | `dist/assets/icons/` (única copia; no bajo `dist/cdn/`) |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Referencias icon= en repo | colección conocida o CDN | `tests/icon-references.test.ts` |
| currentColor en SVG | sin `<img>` para iconify | `tests/icon-currentcolor.test.ts` |
| Fetch local con server | iconos resuelven en galería | `tests/cdn-icons.test.ts` (PORT=8391) |
