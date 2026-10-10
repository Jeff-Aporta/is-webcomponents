---
name: actualizar-pin
description: Subir el kit iswc-root a otro SHA en una app iswc (pin congelado + vendor + gate). Úsala para alinear la app con la última versión del kit, periódicamente.
---

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

- `ISPinUpdate.mjs` reconoce el nombre anterior del repo (`is-webcomponents@…`) y lo reescribe a
  `iswc-root@…` en el mismo paso.
- El pin canónico es `src/js/iswc.ts`; los HTML lo repiten y el inventario los audita.
- `deno.json` (`@iswc/component-schemas`, `@iswc/loader-schemas`) también va por SHA: lo cubre el inventario.
- Si el gate queda en rojo con el pin nuevo: se arregla la app o se vuelve al SHA anterior con
  `--nuevo=<sha anterior>`; no se deja la app a medias.
