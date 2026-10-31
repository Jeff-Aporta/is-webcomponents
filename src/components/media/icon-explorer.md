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

Explorador sin conexión de las familias e íconos publicados en el CDN: buscar, filtrar por familia y copiar el nombre para `<iswc-icon>`.

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

Busca por nombre, filtra por familia y copia el identificador. Carga los íconos desde el CDN del kit.

## Accesibilidad

Cada resultado tiene el nombre del ícono como texto; el buscador se usa con teclado.

## Reglas para LLM

- No es un custom element.
- Copia el id `set:nombre` tal cual y úsalo literal en el código.

## Fuentes

- [`./utils/icon-explorer.preview.ts`](./utils/icon-explorer.preview.ts)
- [`icon-explorer.json`](./icon-explorer.json)
