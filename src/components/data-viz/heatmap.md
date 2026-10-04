---
tag: iswc-heatmap
tags:
  - iswc-heatmap
category: data-viz
status: public
source: ./heatmap.ts
style: ./heatmap.css
preview: ./heatmap.json
---
# `<iswc-heatmap>`

## PropÃ³sito

Mapa de calor en SVG: una matriz de celdas coloreadas segÃºn su valor
numÃ©rico, con etiquetas de eje X/Y y una leyenda de gradiente vertical.
Dibuja todo a mano (sin librerÃ­a de grÃ¡ficas) y se redimensiona solo con
un `ResizeObserver`.

Este mÃ³dulo registra `<iswc-heatmap>`.

## CuÃ¡ndo usarlo

Cuando hay que comparar una magnitud sobre dos dimensiones categÃ³ricas al
mismo tiempo: ventas por mes y por lÃ­nea de producto, cartera por edad y
por vendedor, ocupaciÃ³n por dÃ­a y por hora.

## CuÃ¡ndo no usarlo

- Una sola dimensiÃ³n: usa `<iswc-bar-chart>` o `<iswc-sparkline>`.
- Series temporales continuas donde importa la tendencia y no la
  intensidad: usa `<iswc-line-chart>`.
- Pocos datos (3 o 4 nÃºmeros): una tabla o `<iswc-stat>` se lee mejor.

## ImportaciÃ³n

```js
import './heatmap.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-heatmap>
  <script type="application/json">
  {
    "xLabels": ["Ene", "Feb", "Mar"],
    "yLabels": ["Norte", "Sur"],
    "data": [[12, 30, 18], [7, 22, 40]]
  }
  </script>
</iswc-heatmap>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `x-label` | string | sin tÃ­tulo | TÃ­tulo del eje X, dibujado centrado al pie del SVG. Su presencia reserva 18 px de alto. |
| `y-label` | string | sin tÃ­tulo | TÃ­tulo del eje Y, rotado âˆ’90Â°. Su presencia reserva 14 px de ancho. |
| `color` | `brand` \| `neutral` \| `success` \| `warning` \| `danger` \| `red-blue` | `brand` | Paleta de 6 pasos. `red-blue` es divergente (azul â†’ rojo); un valor desconocido cae en `brand`. |
| `cell-radius` | nÃºmero (px) | `2` | Radio `rx`/`ry` de cada celda. `0` o texto no numÃ©rico tambiÃ©n resuelven a `2` (`Number(...) || 2`). |
| `show-values` | booleano (presencia) | ausente | Escribe el nÃºmero dentro de la celda, formateado en `es-CO` (compacto desde 10.000). |
| `legend-position` | `top` \| `bottom` \| `start` \| `end` \| `none` | `end` | Coloca la leyenda vÃ­a `data-legend` en el contenedor. `none` la oculta y libera los 70 px reservados. |

Cualquier cambio en un atributo observado dispara un re-render completo;
`attributeChangedCallback` no discrimina por nombre.

#### Propiedades pÃºblicas

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

No expone. El shadow root no contiene ningÃºn `<slot>`, asÃ­ que el contenido
en light DOM no se proyecta: el `<script type="application/json">` hijo se
lee como dato (y se vigila con `MutationObserver`), no se renderiza.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-cell-hover` | Evento personalizado del componente (cell hover). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | `{ svg }` â€” referencia al `<svg>` del shadow root | sÃ­ | sÃ­ | no |
| `iswc-cell-hover` | `{ x, y, value }` â€” `x`/`y` son las etiquetas (string) e `value` es nÃºmero | sÃ­ | sÃ­ | no |

`iswc-cell-hover` se dispara en cada `pointermove` sobre una celda, no solo
al entrar en ella: si el listener es costoso, conviene un throttle.
Cuando el puntero sale de las celdas no hay evento de salida, solo se
limpia el resaltado.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-heatmap');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone mÃ©todos. La Ãºnica API pÃºblica es la propiedad `config` de la
tabla anterior.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor grid que reparte lienzo y leyenda. |
| `canvas` | El `<svg>` donde se dibuja la matriz (`role="img"`). |
| `legend` | Caja de la leyenda; queda con `hidden` cuando no hay espacio o `legend-position="none"`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

No expone. El resaltado de celda usa la clase interna `.iswc-hover`, no
`ElementInternals`.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color de texto del host y base de `--chart-text`, `--grid-color` y el borde de la leyenda. |
| `--iswc-text-soft` | Color de las cifras de la leyenda. |
| `--chart-text` | Definido en `:host` como alias de `--iswc-text`; el JS lo lee para pintar tÃ­tulos y etiquetas de eje. |
| `--grid-color` | Definido en `:host`; el JS lo lee, pero en la versiÃ³n actual no se usa para dibujar nada. |
| `--iswc-bg-elev` | Base del `color-mix` de la paleta y color del nÃºmero dentro de celdas oscuras. |

### IntegraciÃ³n con formularios

No es form-associated: no usa `formAssociated`, no expone `value`/`name`
ni participa en el envÃ­o de un `<form>`. Es un componente de solo
visualizaciÃ³n.

## Comportamiento

- **Carga de datos.** En `connectedCallback` busca el primer hijo `<script>`
  con `type` que contenga `json` y lo parsea. Un JSON invÃ¡lido se ignora en
  silencio (queda la Ãºltima configuraciÃ³n vÃ¡lida).
- **Reactividad.** Un `MutationObserver` con `childList`, `characterData` y
  `subtree` reprocesa el JSON al cambiar; un `ResizeObserver` redibuja al
  cambiar el tamaÃ±o del host.
- **Dominio de color.** Se toma el mÃ­nimo y mÃ¡ximo de los valores finitos y
  se redondea con `niceTicks(min, max, 5)`. Si todos los valores son
  iguales, todas las celdas usan el color central de la paleta.
- **Corte temprano.** Si no hay ningÃºn valor finito, `#render` sale antes de
  dibujar y **no** emite `iswc-render`; el SVG queda vacÃ­o.
- **TamaÃ±o mÃ­nimo de matriz.** Cada columna reserva al menos 14 px de ancho
  y cada fila 14 px de alto, asÃ­ que una matriz grande puede desbordar el
  `viewBox` en un host estrecho.
- **Leyenda.** Se dibuja como gradiente CSS de arriba (mÃ¡ximo) a abajo
  (mÃ­nimo) mÃ¡s 4 cifras de referencia. Si el ancho disponible es â‰¤ 12 px se
  oculta con `hidden`.

Notas de la cabecera del mÃ³dulo que no coinciden con el cÃ³digo:

- La cabecera anuncia `legend-position` con default `right`; el cÃ³digo usa
  `end` y no reconoce `right` (cae en el grid por defecto).
- El comentario de `intensitySteps` menciona opacidades 0.15â€“0.9; los
  valores reales son 0.18, 0.36, 0.55, 0.75 y 0.95.
- Las paletas no divergentes arrancan con un `#0f172a` fijo, que no sigue
  el tema claro/oscuro como el resto de pasos.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) (`niceTicks`, `svgEl`; `scaleLinear` se importa pero no se usa)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- Relacionados: [`../charts/bar-chart.md`](../charts/bar-chart.md), [`./maps.md`](./maps.md)

Tags del mÃ³dulo: `<iswc-heatmap>`.

## Accesibilidad

El `<svg>` lleva `role="img"` y `aria-label="Mapa de calor"` fijo, asÃ­ que
para un lector de pantalla la matriz es una sola imagen sin descripciÃ³n del
contenido. Recomendaciones:

- Poner `aria-label` o `aria-labelledby` en el propio `<iswc-heatmap>` con lo
  que representa la matriz.
- AcompaÃ±ar el mapa con una tabla equivalente (aunque sea visualmente
  oculta) cuando el dato sea la informaciÃ³n principal de la pantalla.
- El hover no tiene equivalente por teclado: las celdas no son focusables.
  Si el detalle por celda es esencial, expÃ³nlo tambiÃ©n fuera del SVG.
- No comunicar informaciÃ³n solo por color: activa `show-values` cuando haya
  espacio.

## Ejemplo avanzado

```html
<iswc-heatmap
  id="ocupacion"
  x-label="Hora"
  y-label="DÃ­a"
  color="red-blue"
  cell-radius="4"
  show-values
  legend-position="bottom"
></iswc-heatmap>

<script type="module">
  import './heatmap.js';

  const el = document.getElementById('ocupacion');
  el.config = {
    xLabels: ['8', '10', '12', '14', '16'],
    yLabels: ['Lun', 'Mar', 'MiÃ©'],
    data: [
      [12, 28, 41, 33, 19],
      [15, 31, 47, 38, 22],
      [ 9, 24, 39, 30, 17],
    ],
  };

  el.addEventListener('iswc-cell-hover', (e) => {
    const { x, y, value } = e.detail;
    console.log(`${y} a las ${x}: ${value}`);
  });
</script>
```

## Errores comunes

- Usar el tag sin importar el mÃ³dulo primero.
- Esperar que el `<script type="application/json">` se vea: no hay `<slot>`,
  solo se lee como dato.
- Pasar la matriz por atributo. Los datos van por `config` o por el JSON hijo.
- Dar filas de `data` con menos columnas que `xLabels`: las celdas faltantes
  no se dibujan, sin aviso.
- Usar `points` con etiquetas que no son idÃ©nticas a las de `xLabels`/`yLabels`
  (tipo distinto o espacios de mÃ¡s): la celda queda vacÃ­a.
- Usar `legend-position="right"` o `"left"`: no existen; son `end` y `start`.
- Poner el host sin altura Ãºtil en un contenedor flex: el mÃ­nimo de 16rem
  del CSS es lo Ãºnico que evita un lienzo de 0 px.
- Copiar el preview contra la fuente actual; JS/CSS prevalecen.
- Crear variantes de tamaÃ±o; usar `font-size` contextual y `em`.

## Reglas para LLM

- Reusar el componente y sus dependencias antes de escribir otro heatmap.
- Mantener nombres exactos de tag, atributos y eventos.
- `show-values` es booleano por presencia; no usar `show-values="false"`.
- Los datos se entregan por `config` o por JSON hijo, nunca por atributo.
- No documentar `iswc-cell-hover` como evento de entrada/salida: se repite en
  cada `pointermove`.
- Leer callers y `_shared` antes de cambiar; corregir en la raÃ­z comÃºn.
- No modificar la API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./heatmap.ts)
- [CSS](./heatmap.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./heatmap.json)
