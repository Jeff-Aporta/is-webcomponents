# `data-viz` para LLM

## Propósito

Visualizaciones que no son gráficas cartesianas: mapas y matrices de intensidad.

La categoría lógica `data-viz` del manifest se reparte en DOS carpetas: la
mayoría de las gráficas vive en [`../charts/`](../charts/LLM.md) y aquí quedan
las que no son gráficas de series. Al buscar la documentación de un tag hay que
seguir su `script` en `manifest.js`, no el nombre de la categoría.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-heatmap>` | [heatmap.js](heatmap.js) | Matriz de intensidad |
| `<is-maps>`, `<is-map-marker>` | [maps.js](maps.js) | Mapa con marcadores |

## Errores conocidos y prevención

Los colores de la rampa de intensidad de `<is-heatmap>` son valores de dato, no
de tema: no se sustituyen por tokens `--is-*`.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

`maps.js` registra dos tags (`is-maps` y `is-map-marker`): un solo módulo, un
solo documento.

## Navegación

- [Índice global](../LLM.md)
- [Gráficas de la misma categoría](../charts/LLM.md)
