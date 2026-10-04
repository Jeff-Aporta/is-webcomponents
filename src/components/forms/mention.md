---
tag: iswc-mention
tags:
  - iswc-mention
category: forms
status: public
source: ./mention.js
style: ./mention.css
preview: ./mention.json
---
# `<iswc-mention>`

## Propósito

Campo de texto con autocompletado disparado por caracteres trigger (`@`
usuario, `#` etiqueta). Al escribir un trigger se abre un popup filtrado; al
elegir, el texto se inserta en línea y el `value` sigue siendo texto plano.

Este módulo registra `<iswc-mention>`.

## Cuándo usarlo

Comentarios, notas y descripciones donde el usuario menciona personas o
etiqueta contenido.

## Cuándo no usarlo

Para elegir de un catálogo cerrado usar `<iswc-combobox>` o `<iswc-select>`; para
texto enriquecido con formato usar `<iswc-rte>`.

## Importación

```js
import './mention.js';
```

## Ejemplo mínimo

```html
<iswc-mention placeholder="Escribe @ para mencionar">
  <script type="application/json">
    { "@": ["Ana", "Pedro", "Sofía"], "#": ["urgente", "bug"] }
  </script>
</iswc-mention>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string | Texto completo del campo. |
| `name` | string | Nombre lógico del campo. |
| `placeholder` | string | Texto de ayuda. |
| `disabled` | boolean | Deshabilita el input interno. |
| `readonly` | boolean | Solo lectura. |
| `trigger` | string | Caracteres que abren el popup, default `@#`. |
| `max-items` | number | Tope de sugerencias mostradas, default `8`. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Texto plano; escribirlo refleja el atributo. |
| `suggestions` | lectura/escritura | Objeto `{ [trigger]: string[] }`. Sustituye al `<script>` del slot. |
| `isOpen` | lectura | `true` mientras el popup está visible. |

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Un `<script type="application/json">` con el diccionario de sugerencias. Se lee una vez al conectar. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-select` | Emitido al seleccionar un elemento. |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sin detail | sí | sí | no |
| `iswc-select` | `{ trigger, item, range: [start, end] }` | sí | sí | no |
| `iswc-change` | `{ value }` | sí | sí | no |

`iswc-change` se emite al seleccionar una sugerencia, no en cada pulsación.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-mention');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone métodos públicos; la interacción es por teclado y puntero.
Las propiedades públicas figuran en la tabla anterior.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `input` | Input interno. |
| `popup` | Panel de sugerencias. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-control-bg` | Fondo del campo. |
| `--iswc-control-border` | Borde del campo. |
| `--iswc-control-radius` | Radio del campo. |
| `--iswc-bg-soft` | Fondo de reserva. |
| `--iswc-bg-elev` | Fondo del popup. |
| `--iswc-border` | Borde del popup. |
| `--iswc-radius` | Radio del popup. |
| `--iswc-shadow` | Sombra del popup. |
| `--iswc-accent` | Realce de la opción activa. |
| `--iswc-focus` | Anillo de foco. |
| `--iswc-text-soft` | Carácter trigger en la opción. |

### Integración con formularios

No es form-associated: `name` es descriptivo y el valor no llega a `FormData`
por sí solo. Reflejarlo en un campo oculto desde `iswc-input` si se envía por
formulario nativo.

## Comportamiento

- En cada pulsación se busca hacia atrás el último carácter trigger antes del
  caret; si el texto entre trigger y caret contiene un espacio, el popup se
  cierra.
- El filtro es `includes` sin distinguir mayúsculas, recortado a `max-items`.
- Teclado con popup abierto: `ArrowDown` / `ArrowUp` mueven, `Enter` o `Tab`
  seleccionan, `Escape` cierra.
- Al seleccionar se reemplaza el rango `[trigger, caret]` por
  `` `${trigger}${item} ` `` y el caret queda tras el espacio.
- El popup se cierra al perder foco y con `pointerdown` fuera del componente.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)

Tags del módulo: `<iswc-mention>`.

## Accesibilidad

El popup usa `role="listbox"` y sus opciones `role="option"`. Las opciones son
botones alcanzables con teclado y la navegación ocurre con flechas sin mover
el foco fuera del input.

## Ejemplo avanzado

```html
<iswc-mention id="comentario" trigger="@" max-items="5"
            placeholder="Comenta y menciona con @"></iswc-mention>

<script type="module">
  const campo = document.getElementById('comentario');
  campo.suggestions = { '@': ['ana.gil', 'pedro.ruiz', 'sofia.mesa'] };
  campo.addEventListener('iswc-select', (e) => {
    console.log(e.detail.trigger, e.detail.item, e.detail.range);
  });
</script>
```

## Errores comunes

- Cambiar el `<script type="application/json">` tras conectar el componente:
  solo se lee al conectar; después usar la propiedad `suggestions`.
- Esperar chips u objetos: el `value` es siempre texto plano.
- Esperar `iswc-change` en cada tecla: ahí se emite `iswc-input`.
- Definir `trigger` con más de un carácter por token: cada carácter de la
  cadena es un trigger independiente.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./mention.js)
- [CSS](./mention.css)
- [Índice de categoría](./LLM.md)
- [Preview](./mention.json)
