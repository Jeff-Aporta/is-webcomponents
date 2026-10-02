---
tag: iswc-floating
tags:
  - iswc-floating
category: helpers
status: internal
source: ./floating.js
style: ./floating.css
---
# `<iswc-floating>` (interno)

## Propósito

Building block de posicionamiento anclado: coloca un panel respecto de un
ancla resolviendo `flip`, `shift`, `auto-size`, flecha y hover bridge sobre
`_shared/position.js`.

**No es API pública.** Existe para consumo interno de `<iswc-popover>` y
`<iswc-tooltip>`.

## Cuándo usarlo

Solo al construir un componente de la librería que necesite anclaje flotante y
no pueda componer `<iswc-popover>`.

## Cuándo no usarlo

En código de aplicación: ahí siempre `<iswc-popover>` o `<iswc-tooltip>`. Tampoco
registrar ni documentar `iswc-popup`: ese tag fue eliminado.

## Importación

```js
import './floating.js';
```

## Ejemplo mínimo

```html
<iswc-floating active placement="top" arrow>
  <iswc-button slot="anchor">Ancla</iswc-button>
  <div>Contenido flotante</div>
</iswc-floating>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Muestra el panel y activa el reposicionamiento continuo. |
| `placement` | string | Uno de `PLACEMENTS`; valor inválido cae a `top`. |
| `distance` | number | Separación del ancla, en px. |
| `skidding` | number | Desplazamiento a lo largo del ancla, en px. |
| `strategy` | `absolute` \| `fixed` | Estrategia de posicionamiento. |
| `flip` | boolean | Permite voltear cuando no cabe. |
| `shift` | boolean | Permite deslizar dentro del boundary. |
| `arrow` | boolean | Dibuja la flecha. |
| `arrow-placement` | string | Ubicación de la flecha respecto del panel. |
| `arrow-padding` | number | Margen mínimo de la flecha a la esquina. |
| `auto-size` | string | Limita ancho y/o alto disponible. |
| `boundary` | string | Elemento de recorte para `flip` / `shift`. |
| `hover-bridge` | boolean | Puente invisible entre ancla y panel para no perder el hover. |
| `flip-fallback-placements` | string | Lista de alternativas para `flip`. |
| `flip-fallback-strategy` | string | Estrategia cuando ninguna alternativa cabe. |
| `flip-padding` | number | Margen para el cálculo de `flip`. |
| `shift-padding` | number | Margen para el cálculo de `shift`. |
| `auto-size-padding` | number | Margen para el cálculo de `auto-size`. |
| `anchor` | string | Id de un ancla externa al componente. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `anchor` | lectura/escritura | `Element`, `string` (id) o virtual element. Al asignarlo se reposiciona si está activo. |

### Slots

| Slot | Uso |
| --- | --- |
| `anchor` | Elemento de anclaje cuando no se usa el atributo `anchor`. |
| (default) | Contenido del panel flotante. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-reposition` | `{ placement, x, y }` | sí | sí | no |
| `iswc-hover-bridge` | `{ hovering }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `reposition()` | Recalcula la posición de inmediato. |

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Contenedor. |
| `anchor` | Slot del ancla. |
| `popup` | Panel flotante. |
| `arrow` | Flecha. |
| `hover-bridge` | Puente de hover. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--arrow-size` | Tamaño de la flecha; se lee en px respetando `rem` y `em`. |
| `--arrow-color` | Relleno de la flecha. |
| `--arrow-border-color` | Borde de la flecha. |
| `--auto-size-available-width` | Escrita por el componente con el ancho disponible. |
| `--auto-size-available-height` | Escrita por el componente con el alto disponible. |
| `--show-duration` | Duración de la aparición. |
| `--hide-duration` | Duración del ocultamiento. |
| `--iswc-bg-elev` | Fondo del panel. |
| `--iswc-border` | Borde del panel. |
| `--iswc-color-brand-500` | Realce de marca. |

### Integración con formularios

No declara integración form-associated.

## Comportamiento

- Mientras `active` está presente, el reposicionamiento se agenda en
  `requestAnimationFrame` ante scroll y cambios de tamaño.
- `placement` se valida contra `PLACEMENTS` de `_shared/position.js`; un valor
  desconocido se degrada a `top`.
- `--arrow-size` se resuelve a px teniendo en cuenta `rem` y `em`; un
  `parseFloat` directo de `0.375rem` rompía la flecha.
- `auto-size` publica el espacio disponible en `--auto-size-available-width` /
  `--auto-size-available-height` para que el contenido se limite por CSS.
- `hover-bridge` emite `iswc-hover-bridge` al entrar y salir del puente.

## Dependencias y componentes relacionados

- [`../_shared/position.js`](../_shared/position.js) — `computePosition`, `PLACEMENTS`, `isVirtualElement`.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- Consumidores: `<iswc-popover>`, `<iswc-tooltip>`.

Tags del módulo: `<iswc-floating>`.

## Accesibilidad

No aporta semántica: el rol, el foco y las relaciones ARIA los define el
componente que lo compone (`<iswc-popover>`, `<iswc-tooltip>`).

## Ejemplo avanzado

```html
<iswc-floating id="flotante" placement="bottom-start" strategy="fixed"
             flip shift arrow distance="8" hover-bridge>
  <div>Panel anclado a un elemento externo</div>
</iswc-floating>

<script type="module">
  const flotante = document.getElementById('flotante');
  flotante.anchor = document.getElementById('boton-externo');
  flotante.setAttribute('active', '');
  flotante.addEventListener('iswc-reposition', (e) => console.log(e.detail.placement));
</script>
```

## Errores comunes

- Usarlo en código de aplicación en vez de `<iswc-popover>` / `<iswc-tooltip>`.
- Asignar `anchor` sin `active`: no se reposiciona hasta activarse.
- Definir `--arrow-size` sin unidad esperando px: se admite número, `rem` y `em`.
- Esperar semántica ARIA propia del panel.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No exponer este tag en documentación de producto: es interno.

## Fuentes

- [JavaScript](./floating.js)
- [CSS](./floating.css)
- [Índice de categoría](./LLM.md)
