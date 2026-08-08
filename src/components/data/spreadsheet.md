---
tag: is-spreadsheet
tags:
  - is-spreadsheet
category: data
status: public
source: ./spreadsheet.js
style: ./spreadsheet.css
preview: ../../previews/data/is-spreadsheet.json
---
# `<is-spreadsheet>`

## Propósito

Hoja de cálculo mínima en un web component: rejilla de celdas editables con
referencias estilo A1, fórmulas (`=SUM`, `=AVERAGE`, `=MIN`, `=MAX`, `=COUNT`,
aritmética y paréntesis), navegación con flechas y atajos de Excel para
confirmar y moverse. Todo en cliente, sin dependencias externas.

Este módulo registra `<is-spreadsheet>`.

## Cuándo usarlo

- Capturas rápidas de datos tabulares donde el usuario espera comportarse como
  en Excel: escribir, tabular, sumar rangos.
- Simuladores y calculadoras sencillas (presupuesto, prorrateo, cuadre) donde
  la fórmula la escribe el propio usuario.
- Rejillas pequeñas: decenas de filas y hasta 26 columnas.

## Cuándo no usarlo

- Cuando los datos vienen del servidor y solo hay que mostrarlos:
  [`<is-data-grid>`](./data-grid.md) o [`<is-ag-grid>`](./ag-grid.md).
- Cuando necesitas cruzar dimensiones y totalizar:
  [`<is-pivot-table>`](./pivot-table.md).
- Rejillas grandes: cada edición reconstruye el `innerHTML` completo de la
  tabla y recalcula todas las celdas, así que el costo crece con filas × columnas.
- Más de 26 columnas: la cabecera solo conoce las letras A–Z (ver
  «Comportamiento»).
- Cuando la fórmula debe ser confiable como cálculo contable definitivo: el
  motor es deliberadamente simple y no cubre el juego completo de Excel.

## Importación

```js
import './spreadsheet.js';
```

## Ejemplo mínimo

```html
<is-spreadsheet
  rows="5"
  cols="4"
  value='[["Producto","Cantidad","Precio","Total"],["Resma",10,18500,"=B2*C2"]]'
></is-spreadsheet>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `rows` | number | `20` | Número de filas de la rejilla. Un valor no numérico o `0` cae al default. |
| `cols` | number | `26` | Número de columnas. Solo hay letras hasta la Z; valores mayores rompen la cabecera. |
| `value` | string (JSON) | vacío | Matriz `[[celda, ...], ...]` con los valores crudos: número, texto o fórmula `"=..."`. JSON inválido se ignora y la hoja queda vacía. Las posiciones faltantes quedan como cadena vacía. |
| `read-only` | boolean (presencia) | ausente | Bloquea la edición: ni clic, ni tecleo, ni `Delete` modifican celdas. |

`readonly` (sin guion) también bloquea la edición porque el chequeo interno
acepta ambos, pero **no** está en `observedAttributes`: ponerlo o quitarlo en
caliente no provoca re-render. Usa siempre `read-only`.

#### Propiedades públicas

No expone. La clase no declara getters ni setters, así que `el.value` no lee ni
escribe la hoja: asigna una propiedad plana sobre el elemento sin tocar el
atributo. Para cargar datos usa `el.setAttribute('value', JSON.stringify(matriz))`.

### Slots

No expone. El shadow root contiene solo el contenedor y la tabla; cualquier
contenido en light DOM se ignora.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | `{ row, col, raw, value }` — índices base 0, `raw` es lo que quedó en la celda (texto o fórmula) y `value` el resultado calculado | sí | sí | no |

`is-change` se emite en cada escritura de celda: al confirmar con `Enter` o
`Tab`, al borrar con `Delete`/`Backspace` y también al cancelar con `Esc`
(en ese caso `raw` es el valor original restaurado).

La cabecera del archivo fuente documenta además un evento `is-select` con
`detail: { row, col, value }`, pero **no se emite en ninguna parte del código**.
No lo escuches.

### Métodos y propiedades públicas

No expone métodos propios. Hereda de
[`ElementBase`](../_shared/element-base.js) los accesores `shadow` y `mounted`
y el helper `setBooleanAttr(name, value)`; este último sí sirve para el modo
solo lectura: `el.setBooleanAttr('read-only', true)`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor con scroll, borde, radio y `max-height: 70vh`. Ajusta aquí el alto visible. |
| `grid` | El `<table>` de la rejilla. Sirve para cambiar `font-size` o `table-layout`. |

Las celdas, la cabecera y el `input` de edición no exponen `part`.

### Custom states

No expone. No se usa `ElementInternals` ni `CustomStateSet`; el estado de
edición vive en un campo privado y el foco se refleja con `:focus` nativo.

### CSS custom properties

El componente no define tokens propios; solo lee los del tema (incluidos los
heredados de [`_sticky.css`](./_sticky.css)).

| Token | Uso |
| --- | --- |
| `--is-text` | Color de texto del host; el `input` de edición lo hereda. |
| `--is-bg-elev` | Fondo del contenedor y base del `color-mix` de la cabecera, la esquina y las cabeceras de fila. |
| `--is-border` | Borde exterior del contenedor. |
| `--is-border-soft` | Líneas internas de la rejilla. |
| `--is-radius` | Radio de las esquinas del contenedor. |
| `--is-accent` | Fondo de la celda enfocada (`color-mix` al 8%) y color de foco cuando `--is-focus` no está definido. |
| `--is-focus` | Color del `outline` de la celda enfocada; si falta, se usa `--is-accent`. |
| `--is-text-soft` | Color del texto de la cabecera de columna y de fila. |

### Integración con formularios

No es form-associated. No declara `static formAssociated`, no llama a
`attachInternals()` y no aporta valor al `FormData`. Para enviar la hoja,
escucha `is-change`, mantén tu propia matriz y serialízala en un
`<input type="hidden">` antes del submit.

## Comportamiento

**Edición y atajos**

- Un clic en una celda abre el editor con el valor crudo (la fórmula, no el
  resultado) preseleccionado.
- Con la celda enfocada: `Enter` abre el editor vacío; teclear una letra, un
  dígito, `+` o `-` abre el editor con ese carácter; `Delete`/`Backspace`
  vacía la celda; las flechas mueven el foco.
- Dentro del editor: `Enter` confirma y baja una fila, `Tab` confirma y avanza
  a la derecha, `Shift+Tab` a la izquierda, `Esc` cancela. `Esc` también se
  captura en un listener a nivel de `document` que se registra en
  `onConnected()` y se retira en `onDisconnected()`.
- Las flechas solo se limitan por abajo en `0`; si intentas salir por el borde
  derecho o inferior, no se encuentra celda destino y el foco simplemente no se
  mueve.

**Fórmulas**

- Se considera fórmula cualquier valor de texto que, tras recortar espacios a
  la izquierda, empiece por `=`.
- Antes de evaluar, la expresión se pasa a mayúsculas y se filtra con una
  lista blanca de caracteres (`A-Z 0-9 ( ) , : - + * / . ` y espacios). Todo lo
  demás se elimina de forma silenciosa, así que una fórmula con comillas o
  símbolos raros no falla: calcula otra cosa.
- Rangos: `=SUM(A1:C5)` y listas `=SUM(A1,B2,C3)`. La cabecera del fuente
  menciona también la forma `=SUM(A1..C5)`, pero el reconocedor de rangos solo
  entiende `:`; con `..` los puntos se descartan y el resultado no es el
  esperado.
- Errores: cualquier excepción o resultado no numérico produce `#ERR` en la
  celda. Las referencias circulares se marcan en caché como `#CYCLE`, valor que
  al no ser numérico termina mostrándose como `#ERR`.
- Una celda que referencia otra lee su valor **calculado**, de modo que las
  fórmulas encadenadas funcionan, pero el orden de resolución depende del
  recorrido: en cadenas largas puede hacer falta una segunda edición para que
  todo cuadre.

**Render y recálculo**

- Cada escritura de celda invalida la caché de fórmulas, recalcula la hoja
  completa y reconstruye la tabla con `innerHTML`. Tras confirmar con `Enter` o
  `Tab` el componente devuelve el foco a la celda destino; tras `Delete` el
  foco se pierde porque el nodo enfocado deja de existir.
- La ruta de recálculo incremental (`#recomputeFormula`) es código muerto en la
  práctica: la caché siempre se anula justo antes de recalcular, así que
  siempre se recorre la hoja entera.
- `onAttributeChanged` solo recarga los datos cuando cambia `value`. Cambiar
  `rows` o `cols` re-renderiza pero **no** redimensiona la matriz: el cuerpo
  conserva las filas de la matriz cargada mientras la cabecera y el `colgroup`
  se dibujan con el nuevo número de columnas, lo que produce una rejilla
  descuadrada. Cambia `rows`/`cols` y vuelve a fijar `value` en la misma
  operación.
- Más de 26 columnas: `cols="30"` deja las columnas 27 en adelante con
  cabecera `undefined` y `data-id` inválido, porque el alfabeto interno solo
  tiene A–Z. (El conversor de letra a índice sí soporta `AA`, `AB`…, pero
  nunca se generan esas cabeceras.)
- El contenido de cada celda se escapa con `escapeHtml` antes de inyectarse, de
  modo que un valor con `<` o `&` se muestra literal.

**Presentación**

- La fila de cabeceras queda pegada arriba y la columna de números de fila
  pegada a la izquierda, apoyándose en `_sticky.css`.
- `table-layout: fixed`: la columna de números mide `3rem` y el resto se
  reparten por igual; el texto largo se recorta con elipsis.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js) — carga `spreadsheet.css`
  en el shadow root.
- [`../_shared/define.js`](../_shared/define.js) — registro idempotente del tag.
- [`../_shared/element-base.js`](../_shared/element-base.js) — ciclo de vida y
  hooks `onConnected` / `onDisconnected` / `onAttributeChanged`.
- [`../_shared/emit.js`](../_shared/emit.js) — emisión de `is-change`.
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js) — `escapeHtml` para el
  contenido de las celdas.
- [`./_sticky.css`](./_sticky.css) — cabeceras pegadas, compartido con
  [`<is-pivot-table>`](./pivot-table.md).

Relacionados: [`<is-pivot-table>`](./pivot-table.md) para agregar y cruzar,
[`<is-data-grid>`](./data-grid.md) y [`<is-ag-grid>`](./ag-grid.md) para
listados de solo lectura, [`<is-stat>`](./stat.md) para el KPI resultante.

Tags del módulo: `<is-spreadsheet>`.

## Accesibilidad

- La tabla lleva `role="grid"`, pero las celdas no declaran `role="gridcell"`
  ni `aria-rowindex`/`aria-colindex`, así que el patrón ARIA de grid queda
  incompleto para lectores de pantalla.
- Cada celda es focalizable (`tabindex="0"`), lo que hace la hoja recorrible
  con `Tab` y con flechas; en rejillas grandes eso significa muchas paradas de
  tabulación, porque no se aplica el patrón de un único `tabindex="0"` móvil.
- El foco es visible: `outline` de 2px con `--is-focus` (o `--is-accent`) y
  fondo tenue.
- El `input` de edición no tiene etiqueta accesible propia; el contexto lo dan
  las cabeceras de fila y columna, que sí son `<th>`.
- Tras borrar con `Delete` el foco se pierde por el re-render; si eso afecta a
  tu flujo, devuélvelo tú desde el manejador de `is-change`.

## Ejemplo avanzado

```html
<is-spreadsheet id="presupuesto" rows="6" cols="4"></is-spreadsheet>

<script type="module">
  import './spreadsheet.js';

  const hoja = document.getElementById('presupuesto');

  const matriz = [
    ['Concepto', 'Cantidad', 'Valor unitario', 'Subtotal'],
    ['Resmas',        10, 18500, '=B2*C2'],
    ['Tóner',          2, 320000, '=B3*C3'],
    ['Mantenimiento',  1, 450000, '=B4*C4'],
    ['', '', 'Total',  '=SUM(D2:D4)'],
    ['', '', 'IVA 19%', '=SUM(D2:D4)*0.19'],
  ];

  // El único canal de carga es el atributo `value` (no hay propiedad).
  hoja.setAttribute('value', JSON.stringify(matriz));

  // Mantén tu copia sincronizada para poder enviarla.
  const estado = matriz.map((f) => [...f]);

  hoja.addEventListener('is-change', (e) => {
    const { row, col, raw, value } = e.detail;
    estado[row][col] = raw;
    if (value === '#ERR') {
      console.warn(`Fórmula inválida en fila ${row + 1}, columna ${col + 1}`);
    }
    document.getElementById('payload').value = JSON.stringify(estado);
  });

  // Bloquear la hoja tras aprobar el presupuesto.
  document.getElementById('btn-aprobar').addEventListener('click', () => {
    hoja.setBooleanAttr('read-only', true);
  });
</script>

<form method="post" action="/presupuesto">
  <input type="hidden" id="payload" name="matriz">
  <button type="submit">Guardar</button>
</form>
```

## Errores comunes

- Hacer `el.value = matriz` o leer `el.value` esperando la hoja. No existe esa
  propiedad; usa `setAttribute('value', JSON.stringify(matriz))` y reconstruye
  el estado desde `is-change`.
- Pasar la matriz sin serializar en el HTML. `value` es un atributo de texto y
  debe contener JSON válido; si falla el parseo, la hoja queda vacía sin aviso.
- Escuchar `is-select`: aparece en la documentación del fuente pero nunca se
  emite.
- Usar `readonly` en lugar de `read-only` y esperar que el cambio en caliente
  surta efecto.
- Cambiar `rows` o `cols` sin volver a fijar `value` y terminar con la rejilla
  descuadrada.
- Pedir más de 26 columnas.
- Escribir `=SUM(A1..C5)` copiando la cabecera del fuente; la forma válida es
  `=SUM(A1:C5)`.
- Esperar funciones de Excel que no existen (`IF`, `VLOOKUP`, `ROUND`): solo hay
  `SUM`, `AVERAGE`, `MIN`, `MAX` y `COUNT` más aritmética.
- Dar por buenos los decimales: el componente no formatea números; muestra el
  resultado tal cual lo calcula JavaScript. Si necesitas moneda colombiana
  formateada, formatea fuera o presenta el resultado en
  [`<is-stat>`](./stat.md).

## Reglas para LLM

- El tag exacto es `<is-spreadsheet>` y se registra al importar `./spreadsheet.js`.
- Atributos válidos: `rows`, `cols`, `value`, `read-only`. Nada más. No hay
  `disabled`, `columns`, `data` ni `formulas`.
- No hay slots, no hay propiedades públicas y el único evento emitido es
  `is-change`.
- `read-only` es booleano por presencia: se activa con `read-only`, no con
  `read-only="false"`.
- Cualquier carga o recarga de datos pasa por el atributo `value` con JSON
  serializado.
- Para estilizar usa `::part(root)` y `::part(grid)` o los tokens `--is-*` del
  tema; no crees variantes de tamaño, escala con `font-size` contextual y
  unidades `em`.
- Reusa los helpers de `../_shared/` antes de escribir lógica paralela, y lee
  la fuente antes de cambiar la API: el JS y el CSS mandan sobre el preview.
- Si el requisito es solo mostrar datos o totalizarlos, usa `<is-data-grid>` o
  `<is-pivot-table>` en vez de este componente.

## Fuentes

- [JavaScript](./spreadsheet.js)
- [CSS](./spreadsheet.css)
- [Partial de cabeceras pegadas](./_sticky.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data/is-spreadsheet.json)
