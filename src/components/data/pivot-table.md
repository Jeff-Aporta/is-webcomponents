---
tag: is-pivot-table
tags:
  - is-pivot-table
category: data
status: public
source: ./pivot-table.js
style: ./pivot-table.css
preview: ../../previews/data/is-pivot-table.json
---
# `<is-pivot-table>`

## Propósito

Tabla dinámica (pivot) 100% en cliente: toma una colección JSON, la agrupa por
un campo de filas × un campo de columnas, agrega una medida numérica y arma la
tabla con totales por fila, por columna y gran total. Los números se formatean
con `Intl.NumberFormat` en `es-CO` por defecto.

Este módulo registra `<is-pivot-table>`.

## Cuándo usarlo

- Cruzar dos dimensiones de un mismo conjunto de datos (ventas por vendedor ×
  mes, cartera por sucursal × estado) sin ir al servidor por cada cambio.
- Resúmenes de tamaño moderado que caben en memoria: los datos se entregan
  incrustados en un `<script type="application/json">`.
- Cuando necesitas totales automáticos en los tres ejes sin calcularlos tú.

## Cuándo no usarlo

- Listados planos con muchas columnas y sin cruce: usa
  [`<is-data-grid>`](./data-grid.md) o [`<is-ag-grid>`](./ag-grid.md).
- Volúmenes grandes o paginados desde servidor: el componente re-renderiza la
  tabla completa en cada cambio de atributo y no vitualiza filas.
- Cuando el usuario debe reordenar, filtrar o exportar interactivamente: aquí
  la configuración vive solo en los atributos, no hay UI de configuración.
- Cuando necesitas editar celdas: eso es [`<is-spreadsheet>`](./spreadsheet.md).

## Importación

```js
import './pivot-table.js';
```

## Ejemplo mínimo

```html
<is-pivot-table rows="vendedor" cols="mes" measure="total" agg="sum">
  <script type="application/json">
    [
      { "vendedor": "Ana",  "mes": "Enero",   "total": 1200000 },
      { "vendedor": "Ana",  "mes": "Febrero", "total": 980000 },
      { "vendedor": "Luis", "mes": "Enero",   "total": 1450000 }
    ]
  </script>
</is-pivot-table>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `rows` | string | ninguno (requerido) | Nombre del campo de cada objeto que define las filas. Sin él se muestra el aviso «Faltan `rows` o `cols`». |
| `cols` | string | ninguno (requerido) | Nombre del campo que define las columnas. Mismo aviso si falta. |
| `measure` | string | ninguno | Campo numérico a agregar. Si se omite, cada registro aporta `1`, de modo que con `agg="sum"` la tabla cuenta ocurrencias. |
| `agg` | `sum` \| `avg` \| `count` \| `min` \| `max` | `sum` | Función de agregación. Un valor desconocido cae de vuelta a `sum` sin error. |
| `format` | string (locale BCP-47) | `es-CO` | Locale que recibe `Intl.NumberFormat`. Pese al nombre, no es un patrón de formato. |
| `decimals` | number | `0` mínimo / `2` máximo | Dígitos decimales. Se aplica como `minimumFractionDigits` y `maximumFractionDigits` a la vez, con la salvedad descrita en «Comportamiento». |

#### Propiedades públicas

No expone. La clase no declara getters ni setters; toda la configuración pasa
por atributos. Asignar `el.rows = 'x'` antes del upgrade crea una propiedad
plana que `upgradeProperties` reasigna sobre la instancia, pero no llega al
atributo ni dispara render.

### Slots

No expone. El shadow root no contiene ningún `<slot>`. Los hijos en light DOM
solo se usan como fuente de datos: se busca el primer hijo `<script>` cuyo
`type` contenga «json» y se parsea su `textContent`. Cualquier otro contenido
proyectado no se muestra.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-cell-click` | `{ row, col, value }` — valor de la fila, de la columna y el agregado de la celda (`null` si la celda está vacía) | sí | sí | no |

Solo las celdas de datos (`td.cell`) emiten el evento; las cabeceras, los
totales de fila/columna y el gran total no.

### Métodos y propiedades públicas

No expone métodos propios. Hereda de
[`ElementBase`](../_shared/element-base.js) los accesores `shadow` (alias de
`shadowRoot`), `mounted` y el helper `setBooleanAttr(name, value)`.

Para refrescar la tabla, cambia cualquiera de los atributos observados.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor con scroll, borde, radio y `max-height: 60vh`. Ajusta aquí la altura o quita el borde. |
| `table` | El `<table>` de la pivote. Útil para cambiar `font-size` o `border-collapse`. |

Las celdas internas no exponen `part`, así que no se pueden estilizar desde
fuera una a una.

### Custom states

No expone. El componente no usa `ElementInternals` ni `CustomStateSet`.

### CSS custom properties

El componente no define tokens propios; solo lee los del tema (incluidos los
que hereda de [`_sticky.css`](./_sticky.css)).

| Token | Uso |
| --- | --- |
| `--is-text` | Color de texto del host. |
| `--is-bg-elev` | Fondo del contenedor, de la cabecera pegada y base del `color-mix` de la esquina y las cabeceras de fila. |
| `--is-border` | Borde del contenedor y línea superior del `tfoot` (2px). |
| `--is-border-soft` | Líneas internas entre celdas. |
| `--is-radius` | Radio de las esquinas del contenedor. |
| `--is-accent` | Base del `color-mix` para el hover de celda (14%) y el fondo de los totales (8%). |
| `--is-text-soft` | Color del mensaje de estado vacío. |

### Integración con formularios

No es form-associated. No declara `static formAssociated`, no llama a
`attachInternals()` y no aporta ningún valor al `FormData` del formulario que
lo contenga. Si necesitas enviar el resultado, léelo en `is-cell-click` o
recalcula el agregado en tu propio código y escríbelo en un `<input type="hidden">`.

## Comportamiento

- **Lectura de datos una sola vez.** `#readData()` se ejecuta únicamente en
  `onConnected()`. Cambiar el contenido del `<script type="application/json">`
  después no actualiza nada: hay que desconectar y reconectar el elemento (por
  ejemplo `el.remove()` seguido de `parent.append(el)`) o reemplazarlo. Los
  cambios de atributo sí re-renderizan, pero sobre los datos ya cargados.
- **JSON inválido = tabla vacía.** El `JSON.parse` va dentro de un `try/catch`
  que deja los datos en `[]` sin avisar por consola. Se pinta «Sin datos».
- **Estados de aviso.** Sin `rows` o sin `cols` se pinta «Faltan `rows` o
  `cols`»; con datos vacíos, «Sin datos». Ambos se renderizan dentro de un
  `<tfoot>` sin `thead` ni `tbody`.
- **Filas y columnas por orden de aparición.** Los valores únicos salen de un
  `Set` sobre los datos, así que el orden es el de la colección original. No
  hay ordenamiento alfabético ni numérico.
- **Celdas sin datos.** Una combinación fila×columna sin registros se pinta
  como `—` y viaja en el evento con `value: null`.
- **Totales agregados sobre agregados.** Los totales de fila, de columna y el
  gran total aplican la misma función `agg` sobre los valores ya agregados de
  las celdas, no sobre los datos crudos. Con `sum`, `min` y `max` el resultado
  coincide con el cálculo directo; con `avg` obtienes un promedio de promedios
  (ponderado distinto) y con `count` cuentas celdas con dato, no registros.
  Tenlo presente antes de mostrar esos totales como cifra contable.
- **`decimals` y el cero.** El valor se lee como `Number(attr) || 0` para el
  mínimo y `Number(attr) || 2` para el máximo. Como `0` es falsy, poner
  `decimals="0"` da el mismo resultado que omitirlo: entre 0 y 2 decimales.
  Para forzar cero decimales, formatea los valores antes de pasarlos o usa
  `agg="count"`, que produce enteros.
- **Cabeceras pegadas.** La primera fila (`thead th`) queda pegada arriba y la
  primera columna (`.corner`, `.row-head`) pegada a la izquierda, con
  apilamiento `z-index` 3/2/1 para que la esquina quede encima. El fondo se
  repite en `pivot-table.css` a propósito, porque `.pivot thead th` gana en
  especificidad al `.corner` de `_sticky.css`.
- **Re-render completo.** Cada cambio de atributo reconstruye `thead`, `tbody`
  y `tfoot` desde cero y vuelve a enganchar los listeners de clic.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js) — carga `pivot-table.css`
  en el shadow root.
- [`../_shared/define.js`](../_shared/define.js) — registro idempotente del tag.
- [`../_shared/element-base.js`](../_shared/element-base.js) — ciclo de vida y
  hooks `onConnected` / `onAttributeChanged`.
- [`../_shared/emit.js`](../_shared/emit.js) — emisión de `is-cell-click` con
  `bubbles: true, composed: true`.
- [`./_sticky.css`](./_sticky.css) — cabeceras de fila y esquina pegadas,
  compartido con [`<is-spreadsheet>`](./spreadsheet.md).

Relacionados: [`<is-spreadsheet>`](./spreadsheet.md) para edición de celdas,
[`<is-data-grid>`](./data-grid.md) y [`<is-ag-grid>`](./ag-grid.md) para
listados tabulares, [`<is-stat>`](./stat.md) para un único KPI.

Tags del módulo: `<is-pivot-table>`.

## Accesibilidad

- La tabla lleva `role="table"` explícito (redundante sobre un `<table>` nativo,
  pero inofensivo) y usa `<thead>`, `<tbody>` y `<tfoot>` reales, así que los
  lectores de pantalla navegan la estructura de forma nativa.
- Las celdas de datos son clicables pero **no** son focalizables por teclado:
  no tienen `tabindex` ni manejador de `Enter`/`Space`. Si `is-cell-click`
  dispara una acción importante en tu pantalla, ofrece una vía alternativa
  accesible por teclado.
- Las cabeceras de columna y la esquina son `<th>`; las cabeceras de fila se
  generan como `<td class="row-head">`, no como `<th scope="row">`, así que la
  relación fila-encabezado no se anuncia. Considérelo al describir la tabla.
- El contenedor tiene scroll propio (`overflow: auto`, `max-height: 60vh`) pero
  no `tabindex="0"`, por lo que no es alcanzable por teclado en navegadores que
  no lo hacen automáticamente.

## Ejemplo avanzado

```html
<is-pivot-table
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
      { "sucursal": "Medellín", "linea": "Software", "valor": 8400000 },
      { "sucursal": "Medellín", "linea": "Soporte",  "valor": 2100000 },
      { "sucursal": "Bogotá",   "linea": "Software", "valor": 11250000 },
      { "sucursal": "Bogotá",   "linea": "Soporte",  "valor": 1750000 },
      { "sucursal": "Cali",     "linea": "Software", "valor": 5600000 }
    ]
  </script>
</is-pivot-table>

<script type="module">
  import './pivot-table.js';

  const pivot = document.getElementById('ventas');

  pivot.addEventListener('is-cell-click', (e) => {
    const { row, col, value } = e.detail;
    if (value == null) return;            // celda sin datos
    console.log(`${row} / ${col}: ${value}`);
  });

  // Cambiar la agregación re-renderiza sobre los mismos datos.
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
  Ninguna de las dos existe; el único canal es el `<script type="application/json">`
  hijo.
- Usar `format` como si fuera una máscara (`format="#,##0"`). Es un locale de
  `Intl.NumberFormat`; un valor inválido hace que `Intl` lance.
- Poner `decimals="0"` creyendo que fuerza enteros: se comporta igual que
  omitirlo.
- Leer los totales con `agg="avg"` o `agg="count"` como si fueran calculados
  sobre los registros originales.
- Olvidar `rows` o `cols` y confundir el aviso con un fallo de datos.
- Esperar interacción por teclado en las celdas.
- Copiar la API desde el preview en vez de la fuente; el JS y el CSS mandan.

## Reglas para LLM

- El tag exacto es `<is-pivot-table>` y se registra al importar `./pivot-table.js`.
- No inventes atributos: solo existen `rows`, `cols`, `measure`, `agg`, `format`
  y `decimals`. No hay `data`, `title`, `sortable` ni `sticky`.
- No hay slots ni propiedades públicas; los datos siempre van en un hijo
  `<script type="application/json">`.
- El único evento emitido es `is-cell-click`. No generes código que escuche
  `is-change` ni `is-select` sobre este componente.
- Para estilizar usa `::part(root)` y `::part(table)` o redefine los tokens
  `--is-*` del tema; no crees variantes de tamaño, escala con `font-size`
  contextual y unidades `em`.
- Reusa los helpers de `../_shared/` antes de escribir lógica paralela.
- Si el requisito incluye editar celdas, el componente correcto es
  `<is-spreadsheet>`, no este.

## Fuentes

- [JavaScript](./pivot-table.js)
- [CSS](./pivot-table.css)
- [Partial de cabeceras pegadas](./_sticky.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data/is-pivot-table.json)
