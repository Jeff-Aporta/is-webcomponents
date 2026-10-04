---
tag: iswc-pivot-table
tags:
  - iswc-pivot-table
category: data
status: public
source: ./pivot-table.ts
style: ./pivot-table.css
preview: ./pivot-table.json
---
# `<iswc-pivot-table>`

## PropÃ³sito

Tabla dinÃ¡mica (pivot) 100% en cliente: toma una colecciÃ³n JSON, la agrupa por
un campo de filas Ã— un campo de columnas, agrega una medida numÃ©rica y arma la
tabla con totales por fila, por columna y gran total. Los nÃºmeros se formatean
con `Intl.NumberFormat` en `es-CO` por defecto.

Este mÃ³dulo registra `<iswc-pivot-table>`.

## CuÃ¡ndo usarlo

- Cruzar dos dimensiones de un mismo conjunto de datos (ventas por vendedor Ã—
  mes, cartera por sucursal Ã— estado) sin ir al servidor por cada cambio.
- ResÃºmenes de tamaÃ±o moderado que caben en memoria: los datos se entregan
  incrustados en un `<script type="application/json">`.
- Cuando necesitas totales automÃ¡ticos en los tres ejes sin calcularlos tÃº.

## CuÃ¡ndo no usarlo

- Listados planos con muchas columnas y sin cruce: usa
  [`<iswc-data-grid>`](./data-grid.md) o [`<iswc-ag-grid>`](./ag-grid.md).
- VolÃºmenes grandes o paginados desde servidor: el componente re-renderiza la
  tabla completa en cada cambio de atributo y no vitualiza filas.
- Cuando el usuario debe reordenar, filtrar o exportar interactivamente: aquÃ­
  la configuraciÃ³n vive solo en los atributos, no hay UI de configuraciÃ³n.
- Cuando necesitas editar celdas: eso es [`<iswc-spreadsheet>`](./spreadsheet.md).

## ImportaciÃ³n

```js
import './pivot-table.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-pivot-table rows="vendedor" cols="mes" measure="total" agg="sum">
  <script type="application/json">
    [
      { "vendedor": "Ana",  "mes": "Enero",   "total": 1200000 },
      { "vendedor": "Ana",  "mes": "Febrero", "total": 980000 },
      { "vendedor": "Luis", "mes": "Enero",   "total": 1450000 }
    ]
  </script>
</iswc-pivot-table>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | DescripciÃ³n |
| --- | --- | --- | --- |
| `rows` | string | ninguno (requerido) | Nombre del campo de cada objeto que define las filas. Sin Ã©l se muestra el aviso Â«Faltan `rows` o `cols`Â». |
| `cols` | string | ninguno (requerido) | Nombre del campo que define las columnas. Mismo aviso si falta. |
| `measure` | string | ninguno | Campo numÃ©rico a agregar. Si se omite, cada registro aporta `1`, de modo que con `agg="sum"` la tabla cuenta ocurrencias. |
| `agg` | `sum` \| `avg` \| `count` \| `min` \| `max` | `sum` | FunciÃ³n de agregaciÃ³n. Un valor desconocido cae de vuelta a `sum` sin error. |
| `format` | string (locale BCP-47) | `es-CO` | Locale que recibe `Intl.NumberFormat`. Pese al nombre, no es un patrÃ³n de formato. |
| `decimals` | number | `0` mÃ­nimo / `2` mÃ¡ximo | DÃ­gitos decimales. Se aplica como `minimumFractionDigits` y `maximumFractionDigits` a la vez, con la salvedad descrita en Â«ComportamientoÂ». |

#### Propiedades pÃºblicas

No expone. La clase no declara getters ni setters; toda la configuraciÃ³n pasa
por atributos. Asignar `el.rows = 'x'` antes del upgrade crea una propiedad
plana que `upgradeProperties` reasigna sobre la instancia, pero no llega al
atributo ni dispara render.

### Slots

No expone. El shadow root no contiene ningÃºn `<slot>`. Los hijos en light DOM
solo se usan como fuente de datos: se busca el primer hijo `<script>` cuyo
`type` contenga Â«jsonÂ» y se parsea su `textContent`. Cualquier otro contenido
proyectado no se muestra.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-cell-click` | Evento personalizado del componente (cell click). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-cell-click` | `{ row, col, value }` â€” valor de la fila, de la columna y el agregado de la celda (`null` si la celda estÃ¡ vacÃ­a) | sÃ­ | sÃ­ | no |

Solo las celdas de datos (`td.cell`) emiten el evento; las cabeceras, los
totales de fila/columna y el gran total no.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-pivot-table');
el.addEventListener('iswc-cell-click', (e) => {
  console.log('iswc-cell-click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone mÃ©todos propios. Hereda de
[`ElementBase`](../_shared/element-base.js) los accesores `shadow` (alias de
`shadowRoot`), `mounted` y el helper `setBooleanAttr(name, value)`.

Para refrescar la tabla, cambia cualquiera de los atributos observados.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor con scroll, borde, radio y `max-height: 60vh`. Ajusta aquÃ­ la altura o quita el borde. |
| `table` | El `<table>` de la pivote. Ãštil para cambiar `font-size` o `border-collapse`. |

Las celdas internas no exponen `part`, asÃ­ que no se pueden estilizar desde
fuera una a una.

### Custom states

No expone. El componente no usa `ElementInternals` ni `CustomStateSet`.

### CSS custom properties

El componente no define tokens propios; solo lee los del tema (incluidos los
que hereda de [`_sticky.css`](./_sticky.css)).

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color de texto del host. |
| `--iswc-bg-elev` | Fondo del contenedor, de la cabecera pegada y base del `color-mix` de la esquina y las cabeceras de fila. |
| `--iswc-border` | Borde del contenedor y lÃ­nea superior del `tfoot` (2px). |
| `--iswc-border-soft` | LÃ­neas internas entre celdas. |
| `--iswc-radius` | Radio de las esquinas del contenedor. |
| `--iswc-accent` | Base del `color-mix` para el hover de celda (14%) y el fondo de los totales (8%). |
| `--iswc-text-soft` | Color del mensaje de estado vacÃ­o. |

### IntegraciÃ³n con formularios

No es form-associated. No declara `static formAssociated`, no llama a
`attachInternals()` y no aporta ningÃºn valor al `FormData` del formulario que
lo contenga. Si necesitas enviar el resultado, lÃ©elo en `iswc-cell-click` o
recalcula el agregado en tu propio cÃ³digo y escrÃ­belo en un `<input type="hidden">`.

## Comportamiento

- **Lectura de datos una sola vez.** `#readData()` se ejecuta Ãºnicamente en
  `onConnected()`. Cambiar el contenido del `<script type="application/json">`
  despuÃ©s no actualiza nada: hay que desconectar y reconectar el elemento (por
  ejemplo `el.remove()` seguido de `parent.append(el)`) o reemplazarlo. Los
  cambios de atributo sÃ­ re-renderizan, pero sobre los datos ya cargados.
- **JSON invÃ¡lido = tabla vacÃ­a.** El `JSON.parse` va dentro de un `try/catch`
  que deja los datos en `[]` sin avisar por consola. Se pinta Â«Sin datosÂ».
- **Estados de aviso.** Sin `rows` o sin `cols` se pinta Â«Faltan `rows` o
  `cols`Â»; con datos vacÃ­os, Â«Sin datosÂ». Ambos se renderizan dentro de un
  `<tfoot>` sin `thead` ni `tbody`.
- **Filas y columnas por orden de apariciÃ³n.** Los valores Ãºnicos salen de un
  `Set` sobre los datos, asÃ­ que el orden es el de la colecciÃ³n original. No
  hay ordenamiento alfabÃ©tico ni numÃ©rico.
- **Celdas sin datos.** Una combinaciÃ³n filaÃ—columna sin registros se pinta
  como `â€”` y viaja en el evento con `value: null`.
- **Totales agregados sobre agregados.** Los totales de fila, de columna y el
  gran total aplican la misma funciÃ³n `agg` sobre los valores ya agregados de
  las celdas, no sobre los datos crudos. Con `sum`, `min` y `max` el resultado
  coincide con el cÃ¡lculo directo; con `avg` obtienes un promedio de promedios
  (ponderado distinto) y con `count` cuentas celdas con dato, no registros.
  Tenlo presente antes de mostrar esos totales como cifra contable.
- **`decimals` y el cero.** El valor se lee como `Number(attr) || 0` para el
  mÃ­nimo y `Number(attr) || 2` para el mÃ¡ximo. Como `0` es falsy, poner
  `decimals="0"` da el mismo resultado que omitirlo: entre 0 y 2 decimales.
  Para forzar cero decimales, formatea los valores antes de pasarlos o usa
  `agg="count"`, que produce enteros.
- **Cabeceras pegadas.** La primera fila (`thead th`) queda pegada arriba y la
  primera columna (`.corner`, `.row-head`) pegada a la izquierda, con
  apilamiento `z-index` 3/2/1 para que la esquina quede encima. El fondo se
  repite en `pivot-table.css` a propÃ³sito, porque `.pivot thead th` gana en
  especificidad al `.corner` de `_sticky.css`.
- **Re-render completo.** Cada cambio de atributo reconstruye `thead`, `tbody`
  y `tfoot` desde cero y vuelve a enganchar los listeners de clic.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js) â€” carga `pivot-table.css`
  en el shadow root.
- [`../_shared/define.js`](../_shared/define.js) â€” registro idempotente del tag.
- [`../_shared/element-base.js`](../_shared/element-base.js) â€” ciclo de vida y
  hooks `onConnected` / `onAttributeChanged`.
- [`../_shared/emit.js`](../_shared/emit.js) â€” emisiÃ³n de `iswc-cell-click` con
  `bubbles: true, composed: true`.
- [`./_sticky.css`](./_sticky.css) â€” cabeceras de fila y esquina pegadas,
  compartido con [`<iswc-spreadsheet>`](./spreadsheet.md).

Relacionados: [`<iswc-spreadsheet>`](./spreadsheet.md) para ediciÃ³n de celdas,
[`<iswc-data-grid>`](./data-grid.md) y [`<iswc-ag-grid>`](./ag-grid.md) para
listados tabulares, [`<iswc-stat>`](./stat.md) para un Ãºnico KPI.

Tags del mÃ³dulo: `<iswc-pivot-table>`.

## Accesibilidad

- La tabla lleva `role="table"` explÃ­cito (redundante sobre un `<table>` nativo,
  pero inofensivo) y usa `<thead>`, `<tbody>` y `<tfoot>` reales, asÃ­ que los
  lectores de pantalla navegan la estructura de forma nativa.
- Las celdas de datos son clicables pero **no** son focalizables por teclado:
  no tienen `tabindex` ni manejador de `Enter`/`Space`. Si `iswc-cell-click`
  dispara una acciÃ³n importante en tu pantalla, ofrece una vÃ­a alternativa
  accesible por teclado.
- Las cabeceras de columna y la esquina son `<th>`; las cabeceras de fila se
  generan como `<td class="row-head">`, no como `<th scope="row">`, asÃ­ que la
  relaciÃ³n fila-encabezado no se anuncia. ConsidÃ©relo al describir la tabla.
- El contenedor tiene scroll propio (`overflow: auto`, `max-height: 60vh`) pero
  no `tabindex="0"`, por lo que no es alcanzable por teclado en navegadores que
  no lo hacen automÃ¡ticamente.

## Ejemplo avanzado

```html
<iswc-pivot-table
  id="ventas"
  rows="sucursal"
  cols="linea"
  measure="valor"
  agg="sum"
  format="es-CO"
  decimals="2"
>
  <script type="application/json">
    [
      { "sucursal": "MedellÃ­n", "linea": "Software", "valor": 8400000 },
      { "sucursal": "MedellÃ­n", "linea": "Soporte",  "valor": 2100000 },
      { "sucursal": "BogotÃ¡",   "linea": "Software", "valor": 11250000 },
      { "sucursal": "BogotÃ¡",   "linea": "Soporte",  "valor": 1750000 },
      { "sucursal": "Cali",     "linea": "Software", "valor": 5600000 }
    ]
  </script>
</iswc-pivot-table>

<script type="module">
  import './pivot-table.js';

  const pivot = document.getElementById('ventas');

  pivot.addEventListener('iswc-cell-click', (e) => {
    const { row, col, value } = e.detail;
    if (value == null) return;            // celda sin datos
    console.log(`${row} / ${col}: ${value}`);
  });

  // Cambiar la agregaciÃ³n re-renderiza sobre los mismos datos.
  document.getElementById('btn-promedio')
    .addEventListener('click', () => pivot.setAttribute('agg', 'avg'));

  // Para cambiar los DATOS hay que reconectar el elemento:
  function setData(registros) {
    pivot.querySelector('script[type="application/json"]').textContent =
      JSON.stringify(registros);
    const parent = pivot.parentNode;
    const next = pivot.nextSibling;
    pivot.remove();                        // dispara disconnected
    parent.insertBefore(pivot, next);      // vuelve a leer el JSON
  }
</script>
```

## Errores comunes

- Actualizar el `<script>` de datos y esperar que la tabla cambie sola. No hay
  `MutationObserver`: reconecta el elemento.
- Pasar los datos por atributo (`data='[...]'`) o por propiedad (`el.data = []`).
  Ninguna de las dos existe; el Ãºnico canal es el `<script type="application/json">`
  hijo.
- Usar `format` como si fuera una mÃ¡scara (`format="#,##0"`). Es un locale de
  `Intl.NumberFormat`; un valor invÃ¡lido hace que `Intl` lance.
- Poner `decimals="0"` creyendo que fuerza enteros: se comporta igual que
  omitirlo.
- Leer los totales con `agg="avg"` o `agg="count"` como si fueran calculados
  sobre los registros originales.
- Olvidar `rows` o `cols` y confundir el aviso con un fallo de datos.
- Esperar interacciÃ³n por teclado en las celdas.
- Copiar la API desde el preview en vez de la fuente; el JS y el CSS mandan.

## Reglas para LLM

- El tag exacto es `<iswc-pivot-table>` y se registra al importar `./pivot-table.js`.
- No inventes atributos: solo existen `rows`, `cols`, `measure`, `agg`, `format`
  y `decimals`. No hay `data`, `title`, `sortable` ni `sticky`.
- No hay slots ni propiedades pÃºblicas; los datos siempre van en un hijo
  `<script type="application/json">`.
- El Ãºnico evento emitido es `iswc-cell-click`. No generes cÃ³digo que escuche
  `iswc-change` ni `iswc-select` sobre este componente.
- Para estilizar usa `::part(root)` y `::part(table)` o redefine los tokens
  `--iswc-*` del tema; no crees variantes de tamaÃ±o, escala con `font-size`
  contextual y unidades `em`.
- Reusa los helpers de `../_shared/` antes de escribir lÃ³gica paralela.
- Si el requisito incluye editar celdas, el componente correcto es
  `<iswc-spreadsheet>`, no este.

## Fuentes

- [JavaScript](./pivot-table.ts)
- [CSS](./pivot-table.css)
- [Partial de cabeceras pegadas](./_sticky.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./pivot-table.json)
