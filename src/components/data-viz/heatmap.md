---
tag: is-heatmap
tags:
  - is-heatmap
category: data-viz
status: public
source: ./heatmap.js
style: ./heatmap.css
preview: ../../previews/data-viz/is-heatmap.json
---
# `<is-heatmap>`

## Propósito

Mapa de calor en SVG: una matriz de celdas coloreadas según su valor
numérico, con etiquetas de eje X/Y y una leyenda de gradiente vertical.
Dibuja todo a mano (sin librería de gráficas) y se redimensiona solo con
un `ResizeObserver`.

Este módulo registra `<is-heatmap>`.

## Cuándo usarlo

Cuando hay que comparar una magnitud sobre dos dimensiones categóricas al
mismo tiempo: ventas por mes y por línea de producto, cartera por edad y
por vendedor, ocupación por día y por hora.

## Cuándo no usarlo

- Una sola dimensión: usa `<is-bar-chart>` o `<is-sparkline>`.
- Series temporales continuas donde importa la tendencia y no la
  intensidad: usa `<is-line-chart>`.
- Pocos datos (3 o 4 números): una tabla o `<is-stat>` se lee mejor.

## Importación

```js
import './heatmap.js';
```

## Ejemplo mínimo

```html
<is-heatmap>
  <script type="application/json">
  {
    "xLabels": ["Ene", "Feb", "Mar"],
    "yLabels": ["Norte", "Sur"],
    "data": [[12, 30, 18], [7, 22, 40]]
  }
  </script>
</is-heatmap>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `x-label` | string | sin título | Título del eje X, dibujado centrado al pie del SVG. Su presencia reserva 18 px de alto. |
| `y-label` | string | sin título | Título del eje Y, rotado −90°. Su presencia reserva 14 px de ancho. |
| `color` | `brand` \| `neutral` \| `success` \| `warning` \| `danger` \| `red-blue` | `brand` | Paleta de 6 pasos. `red-blue` es divergente (azul → rojo); un valor desconocido cae en `brand`. |
| `cell-radius` | número (px) | `2` | Radio `rx`/`ry` de cada celda. `0` o texto no numérico también resuelven a `2` (`Number(...) || 2`). |
| `show-values` | booleano (presencia) | ausente | Escribe el número dentro de la celda, formateado en `es-CO` (compacto desde 10.000). |
| `legend-position` | `top` \| `bottom` \| `start` \| `end` \| `none` | `end` | Coloca la leyenda vía `data-legend` en el contenedor. `none` la oculta y libera los 70 px reservados. |

Cualquier cambio en un atributo observado dispara un re-render completo;
`attributeChangedCallback` no discrimina por nombre.

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `config` | lectura/escritura | Objeto de datos. Al asignarlo se vuelve a dibujar de inmediato. Un valor falsy lo deja en `null`. |

Forma aceptada por `config` (y por el `<script type="application/json">` hijo):

```js
{ xLabels: ['Ene', 'Feb'], yLabels: ['Norte'], data: [[12, 30]] }
// o bien
{ xLabels: ['Ene'], yLabels: ['Norte'], points: [{ x: 'Ene', y: 'Norte', v: 12 }] }
```

Con `points`, el emparejamiento es por igualdad estricta contra los textos
de `xLabels`/`yLabels`; los pares sin coincidencia quedan en `null` y su
celda no se dibuja.

### Slots

No expone. El shadow root no contiene ningún `<slot>`, así que el contenido
en light DOM no se proyecta: el `<script type="application/json">` hijo se
lee como dato (y se vigila con `MutationObserver`), no se renderiza.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | `{ svg }` — referencia al `<svg>` del shadow root | sí | sí | no |
| `is-cell-hover` | `{ x, y, value }` — `x`/`y` son las etiquetas (string) e `value` es número | sí | sí | no |

`is-cell-hover` se dispara en cada `pointermove` sobre una celda, no solo
al entrar en ella: si el listener es costoso, conviene un throttle.
Cuando el puntero sale de las celdas no hay evento de salida, solo se
limpia el resaltado.

### Métodos y propiedades públicas

No expone métodos. La única API pública es la propiedad `config` de la
tabla anterior.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor grid que reparte lienzo y leyenda. |
| `canvas` | El `<svg>` donde se dibuja la matriz (`role="img"`). |
| `legend` | Caja de la leyenda; queda con `hidden` cuando no hay espacio o `legend-position="none"`. |

### Custom states

No expone. El resaltado de celda usa la clase interna `.is-hover`, no
`ElementInternals`.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-text` | Color de texto del host y base de `--chart-text`, `--grid-color` y el borde de la leyenda. |
| `--is-text-soft` | Color de las cifras de la leyenda. |
| `--chart-text` | Definido en `:host` como alias de `--is-text`; el JS lo lee para pintar títulos y etiquetas de eje. |
| `--grid-color` | Definido en `:host`; el JS lo lee, pero en la versión actual no se usa para dibujar nada. |
| `--is-bg-elev` | Base del `color-mix` de la paleta y color del número dentro de celdas oscuras. |

### Integración con formularios

No es form-associated: no usa `formAssociated`, no expone `value`/`name`
ni participa en el envío de un `<form>`. Es un componente de solo
visualización.

## Comportamiento

- **Carga de datos.** En `connectedCallback` busca el primer hijo `<script>`
  con `type` que contenga `json` y lo parsea. Un JSON inválido se ignora en
  silencio (queda la última configuración válida).
- **Reactividad.** Un `MutationObserver` con `childList`, `characterData` y
  `subtree` reprocesa el JSON al cambiar; un `ResizeObserver` redibuja al
  cambiar el tamaño del host.
- **Dominio de color.** Se toma el mínimo y máximo de los valores finitos y
  se redondea con `niceTicks(min, max, 5)`. Si todos los valores son
  iguales, todas las celdas usan el color central de la paleta.
- **Corte temprano.** Si no hay ningún valor finito, `#render` sale antes de
  dibujar y **no** emite `is-render`; el SVG queda vacío.
- **Tamaño mínimo de matriz.** Cada columna reserva al menos 14 px de ancho
  y cada fila 14 px de alto, así que una matriz grande puede desbordar el
  `viewBox` en un host estrecho.
- **Leyenda.** Se dibuja como gradiente CSS de arriba (máximo) a abajo
  (mínimo) más 4 cifras de referencia. Si el ancho disponible es ≤ 12 px se
  oculta con `hidden`.

Notas de la cabecera del módulo que no coinciden con el código:

- La cabecera anuncia `legend-position` con default `right`; el código usa
  `end` y no reconoce `right` (cae en el grid por defecto).
- El comentario de `intensitySteps` menciona opacidades 0.15–0.9; los
  valores reales son 0.18, 0.36, 0.55, 0.75 y 0.95.
- Las paletas no divergentes arrancan con un `#0f172a` fijo, que no sigue
  el tema claro/oscuro como el resto de pasos.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) (`niceTicks`, `svgEl`; `scaleLinear` se importa pero no se usa)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- Relacionados: [`../charts/bar-chart.md`](../charts/bar-chart.md), [`./maps.md`](./maps.md)

Tags del módulo: `<is-heatmap>`.

## Accesibilidad

El `<svg>` lleva `role="img"` y `aria-label="Mapa de calor"` fijo, así que
para un lector de pantalla la matriz es una sola imagen sin descripción del
contenido. Recomendaciones:

- Poner `aria-label` o `aria-labelledby` en el propio `<is-heatmap>` con lo
  que representa la matriz.
- Acompañar el mapa con una tabla equivalente (aunque sea visualmente
  oculta) cuando el dato sea la información principal de la pantalla.
- El hover no tiene equivalente por teclado: las celdas no son focusables.
  Si el detalle por celda es esencial, expónlo también fuera del SVG.
- No comunicar información solo por color: activa `show-values` cuando haya
  espacio.

## Ejemplo avanzado

```html
<is-heatmap
  id="ocupacion"
  x-label="Hora"
  y-label="Día"
  color="red-blue"
  cell-radius="4"
  show-values
  legend-position="bottom"
></is-heatmap>

<script type="module">
  import './heatmap.js';

  const el = document.getElementById('ocupacion');
  el.config = {
    xLabels: ['8', '10', '12', '14', '16'],
    yLabels: ['Lun', 'Mar', 'Mié'],
    data: [
      [12, 28, 41, 33, 19],
      [15, 31, 47, 38, 22],
      [ 9, 24, 39, 30, 17],
    ],
  };

  el.addEventListener('is-cell-hover', (e) => {
    const { x, y, value } = e.detail;
    console.log(`${y} a las ${x}: ${value}`);
  });
</script>
```

## Errores comunes

- Usar el tag sin importar el módulo primero.
- Esperar que el `<script type="application/json">` se vea: no hay `<slot>`,
  solo se lee como dato.
- Pasar la matriz por atributo. Los datos van por `config` o por el JSON hijo.
- Dar filas de `data` con menos columnas que `xLabels`: las celdas faltantes
  no se dibujan, sin aviso.
- Usar `points` con etiquetas que no son idénticas a las de `xLabels`/`yLabels`
  (tipo distinto o espacios de más): la celda queda vacía.
- Usar `legend-position="right"` o `"left"`: no existen; son `end` y `start`.
- Poner el host sin altura útil en un contenedor flex: el mínimo de 16rem
  del CSS es lo único que evita un lienzo de 0 px.
- Copiar el preview contra la fuente actual; JS/CSS prevalecen.
- Crear variantes de tamaño; usar `font-size` contextual y `em`.

## Reglas para LLM

- Reusar el componente y sus dependencias antes de escribir otro heatmap.
- Mantener nombres exactos de tag, atributos y eventos.
- `show-values` es booleano por presencia; no usar `show-values="false"`.
- Los datos se entregan por `config` o por JSON hijo, nunca por atributo.
- No documentar `is-cell-hover` como evento de entrada/salida: se repite en
  cada `pointermove`.
- Leer callers y `_shared` antes de cambiar; corregir en la raíz común.
- No modificar la API basándose solo en el preview.

## Fuentes

- [JavaScript](./heatmap.js)
- [CSS](./heatmap.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-heatmap.json)
