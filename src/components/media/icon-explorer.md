---
tag: iswc-icon-explorer
tags:
  - iswc-icon-explorer
category: media
status: public
source: ./utils/icon-explorer.preview.ts
preview: ./icon-explorer.json
---
# `<iswc-icon-explorer>`

## Propósito

Explorador de las familias e íconos de Iconify: buscar, filtrar por familia y copiar el nombre para `<iswc-icon>`.

## Importación

Es una página de la galería: no se importa.

## Ejemplo mínimo

```html
<iswc-icon icon="mdi:home"></iswc-icon>
```

El explorador te da el nombre `mdi:home`; lo que va en tu vista es `<iswc-icon>`.

## Cuándo usarlo

- Elegir un ícono mientras se construye una vista.

## Cuándo no usarlo

- Mostrar un ícono en una app: `iswc-icon`.
- Dentro de un producto: es una página de la galería, no un componente para reusar.

## API

Sin atributos: es una meta-página de la galería, no un custom element. No tiene `.ts` ni `.scss` propios; su código está en `utils/icon-explorer.preview.ts` y sus estilos en el `.json` de la definición.

## Comportamiento

Busca por nombre, filtra por familia y copia el identificador. Desde el 4-nov-2026 ninguna colección completa viaja en el repo: todo sale de la API de Iconify vía `core/icon-loader`, cacheado en localStorage con el mismo TTL que los SVG (15 días):

- familias y metadatos (filtros): `https://api.iconify.design/collections` (`listIconFamilies`);
- nombres de una familia: `https://api.iconify.design/collection?prefix=<set>` (`listIconNames`);
- búsqueda en todas las familias: `https://api.iconify.design/search?query=…` (`searchIconNames`);
- SVG del grid POR LOTES, un fetch por página (240 íconos): `https://api.iconify.design/<set>.json?icons=a,b,c` (`prefetchIcons`); los `<iswc-icon>` los encuentran ya en memoria.

Sin API (sin red, bloqueada o caída) muestra un aviso en vez de romperse. Medido (Edge headless, 4-nov-2026): la primera página de `mdi` hace 3 peticiones a la API (catálogo, nombres y un lote) y pinta los 240 íconos en ~2 s; al recargar, 0 peticiones.

## Accesibilidad

Cada resultado tiene el nombre del ícono como texto; el buscador se usa con teclado.

## Reglas para LLM

- No es un custom element.
- Copia el id `set:nombre` tal cual y úsalo literal en el código.

## Fuentes

- [`./utils/icon-explorer.preview.ts`](./utils/icon-explorer.preview.ts)
- [`icon-explorer.json`](./icon-explorer.json)
