---
tag: is-mention
tags:
  - is-mention
category: forms
status: public
source: ./mention.js
style: ./mention.css
preview: ../../previews/forms/is-mention.json
---
# `<is-mention>`

## Propósito

Campo de texto con autocompletado disparado por caracteres trigger (`@`
usuario, `#` etiqueta). Al escribir un trigger se abre un popup filtrado; al
elegir, el texto se inserta en línea y el `value` sigue siendo texto plano.

Este módulo registra `<is-mention>`.

## Cuándo usarlo

Comentarios, notas y descripciones donde el usuario menciona personas o
etiqueta contenido.

## Cuándo no usarlo

Para elegir de un catálogo cerrado usar `<is-combobox>` o `<is-select>`; para
texto enriquecido con formato usar `<is-rte>`.

## Importación

```js
import './mention.js';
```

## Ejemplo mínimo

```html
<is-mention placeholder="Escribe @ para mencionar">
  <script type="application/json">
    { "@": ["Ana", "Pedro", "Sofía"], "#": ["urgente", "bug"] }
  </script>
</is-mention>
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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-input` | sin detail | sí | sí | no |
| `is-select` | `{ trigger, item, range: [start, end] }` | sí | sí | no |
| `is-change` | `{ value }` | sí | sí | no |

`is-change` se emite al seleccionar una sugerencia, no en cada pulsación.

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
| `--is-control-bg` | Fondo del campo. |
| `--is-control-border` | Borde del campo. |
| `--is-control-radius` | Radio del campo. |
| `--is-bg-soft` | Fondo de reserva. |
| `--is-bg-elev` | Fondo del popup. |
| `--is-border` | Borde del popup. |
| `--is-radius` | Radio del popup. |
| `--is-shadow` | Sombra del popup. |
| `--is-accent` | Realce de la opción activa. |
| `--is-focus` | Anillo de foco. |
| `--is-text-soft` | Carácter trigger en la opción. |

### Integración con formularios

No es form-associated: `name` es descriptivo y el valor no llega a `FormData`
por sí solo. Reflejarlo en un campo oculto desde `is-input` si se envía por
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

Tags del módulo: `<is-mention>`.

## Accesibilidad

El popup usa `role="listbox"` y sus opciones `role="option"`. Las opciones son
botones alcanzables con teclado y la navegación ocurre con flechas sin mover
el foco fuera del input.

## Ejemplo avanzado

```html
<is-mention id="comentario" trigger="@" max-items="5"
            placeholder="Comenta y menciona con @"></is-mention>

<script type="module">
  const campo = document.getElementById('comentario');
  campo.suggestions = { '@': ['ana.gil', 'pedro.ruiz', 'sofia.mesa'] };
  campo.addEventListener('is-select', (e) => {
    console.log(e.detail.trigger, e.detail.item, e.detail.range);
  });
</script>
```

## Errores comunes

- Cambiar el `<script type="application/json">` tras conectar el componente:
  solo se lee al conectar; después usar la propiedad `suggestions`.
- Esperar chips u objetos: el `value` es siempre texto plano.
- Esperar `is-change` en cada tecla: ahí se emite `is-input`.
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
- [Preview](../../previews/forms/is-mention.json)
