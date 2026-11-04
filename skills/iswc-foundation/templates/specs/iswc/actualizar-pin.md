---
name: actualizar-pin
description: Subir el kit iswc-base a otro SHA en una app iswc (pin congelado + vendor + gate). Úsala para alinear la app con la última versión del kit, periódicamente.
---
<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/templates/specs/iswc/actualizar-pin.md -->

# Actualizar el pin del kit

Los pines son **fijos**: un único SHA de 40 hex ya publicado, igual en todo HTML/TS. Nunca `@main`,
`@latest`, SHA corto, GitHub Pages ni ramas en raw. El kit no escribe en la app: la app se actualiza a sí misma.

```bash
deno task pin                                   # inventario; exit 1 si hay >1 SHA, refs mutables o nombre viejo del repo
deno task pin --nuevo=ultimo --dry-run          # qué cambiaría (ultimo = HEAD de main del kit)
deno task pin --nuevo=<sha40|ultimo>            # verifica en jsDelivr y reemplaza en lote (exit 3 si no está publicado)
deno task vendor:iswc                           # tools del kit al MISMO SHA del pin
deno task build && deno task test:all           # el gate decide si el pin nuevo se queda
```

- `pin-update.mjs` reconoce los otros nombres del kit en un pin (`iswc-base@…`, el canónico, y el histórico) y los
  reescribe al nombre real del repo en GitHub (`is-webcomponents@…`, hasta que se renombre) en el mismo paso.
- El pin canónico es `src/js/iswc.ts`; los HTML lo repiten y el inventario los audita.
- El alias `@jeff-aporta/iswc-base/` de `deno.json` y del import map de cada HTML se fija a
  `https://cdn.jsdelivr.net/gh/<repo>@<sha40>/dist/cdn/` en el mismo paso.
- Las URL de módulos del kit con la extensión anterior a F3 (`<ruta>.min.js` en `core/`, `lib/`, `<cat>/<tag>`) pasan
  a `.min.mjs`; terceros y `*.classic.js` no se tocan. Un SHA anterior a F3 se rechaza con un mensaje que lo dice.
- `--nuevo` también baja `dist/cdn/deps.json` del SHA nuevo a `src/vendor/iswc-base/deps.json` (`--sin-deps` lo
  apaga): el build saca de ahí los `<link rel="modulepreload">` del shell crítico (`SHELL_CRITICO`).
- `deno.json` (`@iswc/component-schemas`, `@iswc/loader-schemas`) también va por SHA: lo cubre el inventario.
- Si el gate queda en rojo con el pin nuevo: se arregla la app o se vuelve al SHA anterior con
  `--nuevo=<sha anterior>`; no se deja la app a medias.
