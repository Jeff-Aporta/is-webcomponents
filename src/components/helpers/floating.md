---
tag: iswc-floating
tags:
  - iswc-floating
category: helpers
status: internal
source: ./floating.ts
style: ./floating.css
---
# `<iswc-floating>` (interno)

## PropÃ³sito

Building block de posicionamiento anclado: coloca un panel respecto de un
ancla resolviendo `flip`, `shift`, `auto-size`, flecha y hover bridge sobre
`_shared/position.js`.

**No es API pÃºblica.** Existe para consumo interno de `<iswc-popover>` y
`<iswc-tooltip>`.

## CuÃ¡ndo usarlo

Solo al construir un componente de la librerÃ­a que necesite anclaje flotante y
no pueda componer `<iswc-popover>`.

## CuÃ¡ndo no usarlo

En cÃ³digo de aplicaciÃ³n: ahÃ­ siempre `<iswc-popover>` o `<iswc-tooltip>`. Tampoco
registrar ni documentar `iswc-popup`: ese tag fue eliminado.

## ImportaciÃ³n

```js
import './floating.js';
```

## Ejemplo mÃ­nimo

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
| `placement` | string | Uno de `PLACEMENTS`; valor invÃ¡lido cae a `top`. |
| `distance` | number | SeparaciÃ³n del ancla, en px. |
| `skidding` | number | Desplazamiento a lo largo del ancla, en px. |
| `strategy` | `absolute` \| `fixed` | Estrategia de posicionamiento. |
| `flip` | boolean | Permite voltear cuando no cabe. |
| `shift` | boolean | Permite deslizar dentro del boundary. |
| `arrow` | boolean | Dibuja la flecha. |
| `arrow-placement` | string | UbicaciÃ³n de la flecha respecto del panel. |
| `arrow-padding` | number | Margen mÃ­nimo de la flecha a la esquina. |
| `auto-size` | string | Limita ancho y/o alto disponible. |
| `boundary` | string | Elemento de recorte para `flip` / `shift`. |
| `hover-bridge` | boolean | Puente invisible entre ancla y panel para no perder el hover. |
| `flip-fallback-placements` | string | Lista de alternativas para `flip`. |
| `flip-fallback-strategy` | string | Estrategia cuando ninguna alternativa cabe. |
| `flip-padding` | number | Margen para el cÃ¡lculo de `flip`. |
| `shift-padding` | number | Margen para el cÃ¡lculo de `shift`. |
| `auto-size-padding` | number | Margen para el cÃ¡lculo de `auto-size`. |
| `anchor` | string | Id de un ancla externa al componente. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `anchor` | lectura/escritura | `Element`, `string` (id) o virtual element. Al asignarlo se reposiciona si estÃ¡ activo. |

### Slots

| Slot | Uso |
| --- | --- |
| `anchor` | Elemento de anclaje cuando no se usa el atributo `anchor`. |
| (default) | Contenido del panel flotante. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-reposition` | Evento personalizado del componente (reposition). |
| `iswc-hover-bridge` | Evento personalizado del componente (hover bridge). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-reposition` | `{ placement, x, y }` | sÃ­ | sÃ­ | no |
| `iswc-hover-bridge` | `{ hovering }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-floating');
el.addEventListener('iswc-reposition', (e) => {
  console.log('iswc-reposition', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `reposition()` | Recalcula la posiciÃ³n de inmediato. |

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
| `--arrow-size` | TamaÃ±o de la flecha; se lee en px respetando `rem` y `em`. |
| `--arrow-color` | Relleno de la flecha. |
| `--arrow-border-color` | Borde de la flecha. |
| `--auto-size-available-width` | Escrita por el componente con el ancho disponible. |
| `--auto-size-available-height` | Escrita por el componente con el alto disponible. |
| `--show-duration` | DuraciÃ³n de la apariciÃ³n. |
| `--hide-duration` | DuraciÃ³n del ocultamiento. |
| `--iswc-bg-elev` | Fondo del panel. |
| `--iswc-border` | Borde del panel. |
| `--iswc-color-brand-500` | Realce de marca. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.

## Comportamiento

- Mientras `active` estÃ¡ presente, el reposicionamiento se agenda en
  `requestAnimationFrame` ante scroll y cambios de tamaÃ±o.
- `placement` se valida contra `PLACEMENTS` de `_shared/position.js`; un valor
  desconocido se degrada a `top`.
- `--arrow-size` se resuelve a px teniendo en cuenta `rem` y `em`; un
  `parseFloat` directo de `0.375rem` rompÃ­a la flecha.
- `auto-size` publica el espacio disponible en `--auto-size-available-width` /
  `--auto-size-available-height` para que el contenido se limite por CSS.
- `hover-bridge` emite `iswc-hover-bridge` al entrar y salir del puente.

## Dependencias y componentes relacionados

- [`../_shared/position.js`](../_shared/position.js) â€” `computePosition`, `PLACEMENTS`, `isVirtualElement`.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- Consumidores: `<iswc-popover>`, `<iswc-tooltip>`.

Tags del mÃ³dulo: `<iswc-floating>`.

## Accesibilidad

No aporta semÃ¡ntica: el rol, el foco y las relaciones ARIA los define el
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

- Usarlo en cÃ³digo de aplicaciÃ³n en vez de `<iswc-popover>` / `<iswc-tooltip>`.
- Asignar `anchor` sin `active`: no se reposiciona hasta activarse.
- Definir `--arrow-size` sin unidad esperando px: se admite nÃºmero, `rem` y `em`.
- Esperar semÃ¡ntica ARIA propia del panel.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No exponer este tag en documentaciÃ³n de producto: es interno.

## Fuentes

- [JavaScript](./floating.ts)
- [CSS](./floating.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
