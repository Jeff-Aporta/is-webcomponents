# `data-viz` para LLM

## Propósito

Visualizaciones que no son gráficas cartesianas: mapas y matrices de intensidad.

La categoría lógica `data-viz` del manifest se reparte en DOS carpetas: la
mayoría de las gráficas vive en [`../charts/`](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/charts/LLM.md) y aquí quedan
las que no son gráficas de series. Al buscar la documentación de un tag hay que
seguir su `script` en `manifest.js`, no el nombre de la categoría.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-heatmap>` | [heatmap.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data-viz/heatmap.md) | Matriz de intensidad |
| `<is-maps>`, `<is-map-marker>` | [maps.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data-viz/maps.md) | Mapa con marcadores |

## Composición y relaciones

Módulos multi-tag se documentan juntos. `<is-map-marker>` solo tiene sentido dentro de
`<is-maps>`: el padre lee los marcadores proyectados y los posiciona.

## Reusar antes de crear

- `../_shared/adopt-css.js`
- `../_shared/element-base.js`
- `../charts/` para cualquier serie cartesiana

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs` tras tocar documentación.

## Qué no hacer

- No inventar API ni copiar contrato de una gráfica de `../charts/`.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag en módulos multi-tag.

## Errores conocidos y prevención

Los colores de la rampa de intensidad de `<is-heatmap>` son valores de dato, no
de tema: no se sustituyen por tokens `--is-*`.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

`maps.js` registra dos tags (`is-maps` y `is-map-marker`): un solo módulo, un
solo documento.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
- [Gráficas de la misma categoría](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/charts/LLM.md)
