---
tag: iswc-spreadsheet
tags:
  - iswc-spreadsheet
category: data
status: public
source: ./spreadsheet.ts
style: ./spreadsheet.css
preview: ./spreadsheet.json
---
# `<iswc-spreadsheet>`

## Propósito

Hoja de cálculo online completa en un web component: varias hojas, más de 380 funciones con alias
en español, referencias relativas y absolutas, nombres definidos, matrices dinámicas, formato de
celda, combinación, relleno con series, ordenar y filtrar, formato condicional, validación,
comentarios, gráficos, macros con grabadora, CSV y XLSX, todo sin dependencias externas y virtualizado
para hojas grandes.

Este módulo registra `<iswc-spreadsheet>`.

Crédito: el inventario de herramientas y comportamientos se tomó de GridCraft (ArtCraft, MIT/Apache-2.0),
reimplementación limpia de Excel en Rust, como referencia funcional. Este motor es TypeScript propio; no
embebe su WASM.

## Cuándo usarlo

- El usuario necesita calcular y dar formato como en Excel: presupuestos, cuadres, simuladores.
- Hay que abrir, editar y devolver archivos `.xlsx` o `.csv` desde el navegador.
- Se quiere automatizar una hoja con macros sin ejecutar código arbitrario.

## Cuándo no usarlo

- Datos de servidor que solo se muestran o se paginan: [`<iswc-data-grid>`](./data-grid.md) o
  [`<iswc-ag-grid>`](./ag-grid.md).
- Cruzar dimensiones y totalizar: [`<iswc-pivot-table>`](./pivot-table.md).
- Una tabla pequeña sin fórmulas: un `<iswc-data-grid>` pesa mucho menos.

## Importación

```js
import './spreadsheet.js';
```

## Ejemplo mínimo

```html
<iswc-spreadsheet
  rows="5"
  cols="4"
  value='[["Producto","Cantidad","Precio","Total"],["Resma",10,18500,"=B2*C2"]]'
></iswc-spreadsheet>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `rows` | number | `20` | Filas de la hoja activa. Cambiarlo en caliente redimensiona sin perder datos. |
| `cols` | number | `26` | Columnas. Sin límite de 26: siguen AA, AB… hasta XFD. |
| `value` | string (JSON) | vacío | Matriz `[[celda, ...], ...]` o documento `iswc-spreadsheet/v1`. JSON inválido deja la hoja vacía. |
| `read-only` | boolean | ausente | Bloquea toda edición; navegar, copiar, buscar y exportar siguen activos. |
| `locale` | `es` \| `en` | `lang` del documento | Idioma de sugerencias, números escritos, fechas y lógicos. |
| `without-toolbar` | boolean | ausente | Oculta la cinta. |
| `without-formula-bar` | boolean | ausente | Oculta la barra de fórmulas. |
| `without-tabs` | boolean | ausente | Oculta las pestañas de hojas. |
| `without-status` | boolean | ausente | Oculta la barra de estado. |

`readonly` (sin guion) también bloquea, pero no se observa en caliente: usa `read-only`.

#### Propiedades públicas

| Propiedad | Acceso | Descripción |
| --- | --- | --- |
| `value` | lectura/escritura | Matriz cruda de la hoja activa en JSON. Acepta texto JSON o arreglo. |
| `workbook` | lectura/escritura | Documento `iswc-spreadsheet/v1` validado con zod. Lanza `TypeError` si no cumple. |
| `doc` | lectura | `SpreadsheetDoc`: motor y operaciones, para integraciones avanzadas. |

### Slots

No expone. Todo el contenido llega por `value` o `workbook`.

### Eventos

| Evento | Descripción |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | `{ row, col, raw, value, sheet, cells, macro? }`: índices base 0; `raw` es lo escrito, `value` el resultado, `cells` cuántas celdas cambió la operación | sí | sí | no |
| `iswc-select` | `{ row, col, value, range, sheet }` | sí | sí | no |

Los eventos de los controles internos (cinta, diálogos) no salen del componente: solo verás estos dos.
Al cancelar con `Esc` ya no se emite `iswc-change`, porque nada cambió.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `getCell(a1)` | Contenido crudo: fórmula o valor. |
| `getValue(a1)` | Valor calculado. |
| `setCell(a1, texto)` | Escribe como si lo tecleara el usuario. Emite `iswc-change`. |
| `select(a1)` | Selecciona y lleva a la vista. |
| `undo()` / `redo()` | Historial. |
| `recalc()` | Recálculo completo. |
| `runMacro(nombreOCodigo)` | Ejecuta una macro; devuelve `{ ok, error? }`. |
| `importFile(file)` | Abre `.xlsx`, `.xlsm`, `.csv` o `.tsv`. Promesa. |
| `exportXlsx()` | Promesa de `Blob` `.xlsx`. |
| `exportCsv(separador?)` | Texto CSV de la hoja activa. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor con borde y radio. |
| `toolbar` | Cinta. |
| `formula-bar` | Cuadro de nombres y barra de fórmulas. |
| `viewport` | Área con scroll de la rejilla. |
| `grid` | El `<table>` de celdas. |
| `tabs` | Pestañas de hojas. |
| `status` | Barra de estado. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-spreadsheet-height` | Alto total. Sin él, la hoja se ajusta al contenido. |
| `--iswc-spreadsheet-viewport` | Alto máximo de la rejilla (`70vh`). |
| `--iswc-text`, `--iswc-text-soft` | Texto de celdas y cabeceras. |
| `--iswc-bg`, `--iswc-bg-elev` | Superficies. |
| `--iswc-border`, `--iswc-border-soft` | Líneas. |
| `--iswc-accent` | Selección, tirador, foco. |
| `--iswc-radius` | Esquinas. |

### Integración con formularios

No es form-associated. Para enviar la hoja, serializa `el.workbook` o `el.value` en un
`<input type="hidden">` antes del submit.

## Comportamiento

**Motor.** Módulos puros en `utils/spreadsheet/`, sin DOM: `tokenizer`, `parser`, `evaluator`, `engine`
(grafo de dependencias, orden topológico con Tarjan, ciclos, desbordes, volátiles), `functions/`,
`numfmt`, `fill`, `document` (transacciones y deshacer), `conditional`, `validation`, `find`, `csv`, `zip`,
`xml`, `xlsx-read`, `xlsx-write` y `macro/`.

**Recálculo incremental.** Cada fórmula registra sus precedentes; al escribir solo se evalúan las celdas
afectadas. Las volátiles (`NOW`, `RAND`, `OFFSET`, `INDIRECT`…) se reevalúan en cada recálculo. Insertar o
borrar filas, columnas u hojas reconstruye el grafo.

**Errores.** `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, `#NUM!`, `#NULL!`, `#SPILL!`, `#CALC!` y `#CYCLE!`
para referencias circulares, que señalan a todas las celdas del ciclo y se resuelven solas al romperlo.

**Lenguaje de fórmulas.**

- Referencias `A1`, `$A$1`, `A1:C3`, `A:C`, `2:5`, `Hoja!A1`, `'Mi hoja'!A1:B2` y nombres definidos.
- Operadores `+ - * / ^ & % = <> < > <= >=`, `:`, matrices `{1,2;3,4}`, `@` y `A1#` para un desborde.
- Nombres en inglés y alias de Excel en español: `SUMA`, `SI`, `BUSCARV`, `BUSCARX`, `CONTAR.SI.CONJUNTO`…
  Se conserva lo que escribiste y al exportar a XLSX se traduce al nombre canónico.
- `,` y `;` separan argumentos indistintamente. El decimal dentro de una fórmula es siempre `.`.
- Familias: matemáticas, estadística y distribuciones, condicionales (`SUMIFS`, `COUNTIFS`, `MAXIFS`…), lógica
  con `LET`, `LAMBDA`, `MAP`, `REDUCE`, `SCAN`, `BYROW`, texto con `TEXTSPLIT` y `REGEXTEST`, fecha, búsqueda
  (`VLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH`, `OFFSET`, `INDIRECT`), financieras (`PMT`, `IRR`, `XIRR`, `NPV`…),
  matrices dinámicas (`FILTER`, `SORT`, `UNIQUE`, `SEQUENCE`, `VSTACK`…), ingeniería y bases de datos (`DSUM`…).
- Al escribir aparecen sugerencias y la firma con el argumento en curso. Mientras editas una fórmula puedes
  apuntar con ratón o flechas; `F4` cicla los `$`.

**Macros.** Lenguaje propio, interpretado sobre su árbol sin `eval` ni `new Function`. Solo alcanza las
funciones de `macro/host.ts`; no hay acceso a `window`, DOM, red ni prototipos. Limita pasos (2 millones),
profundidad (128) y tiempo (10 s). Una macro es un solo paso de deshacer. Se ejecuta por botón junto a las
pestañas, por atajo (`ctrl+shift+m`) o con `runMacro`. El editor usa `<iswc-code>` y la grabadora convierte
tus acciones en código.

```text
# palabras clave en español o inglés: si/if, sino/else, mientras/while, para/for,
# funcion/function, retorna/return, sea/let, corta/break, sigue/continue
funcion iva(x) { retorna x * 0.19 }
para f en 2..ultimaFila("A") {
  poner(f, 4, iva(celda(f, 3)))
  si celda(f, 3) > 100000 { formato("C" & f, {relleno: "#ffe08a", negrita: verdadero}) }
}
mensaje("Listo")
```

Biblioteca: `leer`, `escribir`, `celda`, `poner`, `calcular`, `limpiar`, `borrarFormato`, `comentario`,
`seleccion`, `seleccionar`, `filaActual`, `columnaActual`, `ultimaFila`, `ultimaColumna`, `formato`,
`formatoNumero`, `bordes`, `combinar`, `separar`, `anchoColumna`, `altoFila`, `inmovilizar`, `insertarFilas`,
`borrarFilas`, `insertarColumnas`, `borrarColumnas`, `ordenar`, `rellenar`, `copiar`, `definirNombre`,
`quitarDuplicados`, `hoja`, `hojas`, `nuevaHoja`, `mensaje`, `imprimir` y utilidades (`redondear`, `suma`,
`largo`, `dividir`, `unir`, `agregar`, `letra`, `direccion`, `rango`…). Cada una con alias en inglés.

**Teclado.**

| Atajo | Acción |
| --- | --- |
| Flechas, `Tab`, `Enter`, `Mayús+…` | Mover; dentro de una selección la recorren |
| `Ctrl+flecha`, `Ctrl+Mayús+flecha` | Saltar al borde del bloque, ampliando con Mayús |
| `Inicio`, `Ctrl+Inicio`, `Ctrl+Fin`, `RePág`, `AvPág`, `Alt+RePág` | Desplazarse |
| `Ctrl+RePág/AvPág` | Cambiar de hoja |
| `F2`, escribir | Editar; `Esc` cancela, `Alt+Enter` salto de línea, `Ctrl+Enter` llena la selección, `F4` cicla `$` |
| `Ctrl+A`, `Ctrl+Espacio`, `Mayús+Espacio`, `Ctrl+Mayús+*` | Todo, columna, fila, región |
| `Ctrl+C/X/V`, `Ctrl+Z/Y`, `Ctrl+D/R`, `Ctrl+E` | Portapapeles, historial, rellenar, relleno rápido |
| `Ctrl+B/I/U/5`, `Ctrl+1`, `Ctrl+K` | Formato, formato de celdas, vínculo |
| `Ctrl+Mayús+$ % # @ ! ^ ~` | Moneda, porcentaje, fecha, hora, número, científico, general |
| `Ctrl+F`, `Ctrl+G`, `F5`, `Ctrl+Mayús+L`, `Alt+=`, `Alt+↓` | Buscar, ir a, filtro, autosuma, lista |
| `Ctrl+;`, `Ctrl+Mayús+:`, `Ctrl+-`, `Ctrl+Mayús++`, `Ctrl+9/0` | Fecha, hora, eliminar, insertar, ocultar |
| `Mayús+F2`, `Mayús+F3`, `Mayús+F11`, `Alt+F8`, `F9`, `F4` | Comentario, función, hoja, macros, calcular, repetir |

**Rejilla.** Hasta 2 500 celdas se pinta todo; por encima se virtualizan filas y columnas, con paneles
inmovilizados, combinaciones y medidas propias. Todo tamaño vive en em: el documento guarda alto y ancho en em
y el zoom escala la fuente.

**XLSX.** Conserva valores, fórmulas (también compartidas), estilos, formatos numéricos, combinaciones, medidas,
filas y columnas ocultas, paneles, filtro, validación, formato condicional, notas, nombres y color de pestaña.
Los valores se recalculan al abrir.

**Portapapeles.** Copia TSV y tabla HTML con estilos; pegar desde Excel o Sheets conserva negrita, color y relleno.
Dentro de la hoja las fórmulas ajustan sus referencias.

**Fuera de alcance por ahora.** Tablas estructuradas (`Tabla1[Col]`), referencias 3-D, R1C1, cálculo iterativo,
tablas dinámicas (usa `iswc-pivot-table`), minigráficos, formas e imágenes, protección de hoja, grupos de esquema,
libros externos, impresión y PDF, gráficos dentro del XLSX, arrastrar celdas por el borde, intersección con espacio.

## Dependencias y componentes relacionados

Compone [`<iswc-button>`](../actions/button.md), [`<iswc-context-menu>`](../actions/context-menu.md),
[`<iswc-tab-group>`](../navigation/tab-group.md), [`<iswc-select>`](../forms/select.md),
[`<iswc-input>`](../forms/input.md), [`<iswc-checkbox>`](../forms/checkbox.md),
[`<iswc-color-picker>`](../forms/color-picker.md), [`<iswc-textarea>`](../forms/textarea.md),
[`<iswc-dialog>`](../layout/dialog.md) e [`<iswc-icon>`](../media/icon.md). Carga bajo demanda
[`<iswc-chart>`](../charts/chart.md) al insertar un gráfico e [`<iswc-code>`](../code/code.md) al abrir macros.

Tags del módulo: `<iswc-spreadsheet>`.

## Accesibilidad

- `role="grid"` con `aria-rowcount`, `aria-colcount`, cabeceras e índices; cada celda anuncia `A1: valor`.
- Foco móvil real: un único `tabindex="0"` en la celda activa, resto `-1`.
- La cinta usa `role="toolbar"` y `aria-pressed`; los mensajes pasan por `role="status"`.
- Todo lo del ratón tiene atajo o comando en la cinta, salvo redimensionar a mano, que tiene diálogo.

## Ejemplo avanzado

```html
<iswc-spreadsheet id="libro" locale="es"></iswc-spreadsheet>

<script type="module">
  import './spreadsheet.js';

  const hoja = document.getElementById('libro');

  hoja.workbook = {
    sheets: [{
      name: 'Presupuesto',
      rows: 200,
      cols: 12,
      freeze: { rows: 1, cols: 0 },
      cells: {
        A1: { v: 'Concepto', s: { bold: true, bg: '#1f6f8b', color: '#ffffff' } },
        B1: { v: 'Valor', s: { bold: true, bg: '#1f6f8b', color: '#ffffff' } },
        A2: { v: 'Resmas' },
        B2: { v: 185000, s: { numFmt: '$#,##0' } },
        A3: { v: 'Total', s: { bold: true } },
        B3: { f: '=SUMA(B2:B2)', s: { numFmt: '$#,##0', bold: true } },
      },
      cf: [{ id: 'r1', range: 'B2:B2', type: 'dataBar', colors: ['#5b9bd5'] }],
    }],
    macros: [{ name: 'Marcar', code: 'formato(seleccion(), {relleno: "#ffe08a"})', button: true }],
  };

  hoja.addEventListener('iswc-change', () => {
    localStorage.setItem('iswc:presupuesto', JSON.stringify(hoja.workbook));
  });

  document.getElementById('descargar').addEventListener('click', async () => {
    const blob = await hoja.exportXlsx();
    window.open(URL.createObjectURL(blob));
  });
</script>
```

## Errores comunes

- Pasar la matriz sin serializar en HTML: `value` es JSON con comillas dobles; usa comillas simples por fuera.
- Asignar `workbook` con un objeto mal formado: lanza `TypeError`; `value` en cambio deja la hoja vacía.
- Esperar que un clic de ratón abra el editor: como en Excel, selecciona; edita con doble clic, `F2` o tecleando.
  Un `el.click()` programático sí abre el editor, por compatibilidad.
- Escribir `1,5` dentro de una fórmula: el decimal es `.`; la coma separa argumentos.
- Medir en px por fuera: escala con `font-size` en el contenedor y con `--iswc-spreadsheet-viewport`.

## Reglas para LLM

- El tag exacto es `<iswc-spreadsheet>` y se registra al importar `./spreadsheet.js`.
- Atributos válidos: los de la tabla. No hay `disabled`, `columns`, `data` ni `formulas`.
- Carga datos con `value` (matriz o documento en JSON) o `el.workbook`; el contrato está en
  `schemas/spreadsheet.schemas.ts`.
- Para lógica de negocio usa el motor sin DOM (`utils/spreadsheet/document.ts`) en vez de automatizar clics.
- Las macros son texto en su propio lenguaje. No inventes funciones: la lista es `macro/host.ts`.
- Una función de hoja nueva se registra en `functions/` con `def(cat, NOMBRE, firma, descripción, fn)`; la firma
  da aridad y ayuda, y su alias español va en `functions/aliases-es.ts`.
- Nunca `eval` ni `new Function`; todo tamaño en em; colores de usuario por `safeColor`.

## Fuentes

- [TypeScript](./spreadsheet.ts)
- [SCSS](./spreadsheet.scss)
- [Motor](./utils/spreadsheet/)
- [Schemas](./schemas/spreadsheet.schemas.ts)
- [Preview](./spreadsheet.json)
