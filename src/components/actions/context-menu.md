---
tag: is-context-menu
tags:
  - is-context-menu
category: actions
status: public
source: ./context-menu.js
style: ./context-menu.css
preview: ../../previews/actions/is-context-menu.json
---
# `<is-context-menu>`

## Propósito

Menú emergente anclado al clic derecho del ratón sobre un elemento
`target` externo (o sobre el propio host si no se define `for`). Coloca el
panel en el punto del cursor, lo voltea si no cabe y lo pega al borde como
último recurso.

Este módulo registra `<is-context-menu>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './context-menu.js';
```

## Ejemplo mínimo

```html
<div id="zona">Clic derecho aquí</div>
<is-context-menu for="#zona">
  <button class="item" data-value="editar">Editar</button>
  <button class="item" data-value="borrar">Borrar</button>
</is-context-menu>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/según contrato | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `distance` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `scroll-lock` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isOpen` | lectura | Declarada por clase. |
| `scrollLock` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-open` | sí | sí | sí | no |
| `is-close` | no | sí | sí | no |
| `is-select` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `openAt(x, y)` | Abre el menú anclado a un punto del viewport. |
| `openAtElement(el)` | Abre el menú anclado a un elemento. |
| `close()` | Cierra el menú. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `panel` | Personalizable con `::part(panel)`. |
| `items` | Personalizable con `::part(items)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-popover-radius` | Token leído o definido por componente. |
| `--is-popover-shadow` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-context-menu> — Menú emergente anclado al clic derecho del ratón sobre
> un `target` externo (o sobre el propio host si no se da `for`).
> Atributos
>   for                CSS selector — selector del elemento que recibe el
>                      contextmenu. Si falta, el host mismo.
>   placement          bottom-start (default) | bottom-end | top-start |
>                      top-end  (alias CSS-ish del placement del popup)
>   distance           píxeles desde el cursor (default 2)
>   disabled           boolean — desactiva el menú
>   scroll-lock        boolean — si está, bloquea el scroll del documento
>                      mientras el menú está abierto. Sin él (default),
>                      cualquier scroll fuera del panel cierra el menú
>                      (no "persigue" el scroll del viewport/contenedor).
> Slots
>   default — hijos renderizados dentro del panel; usar <button class="item">
>             o <a class="item"> para tener acciones. Cada item emite
>             `is-select` y se cierra el menú.
> Eventos
>   is-select       detalle: { item, value }  — al elegir un item
>   is-open, is-close
> Custom states: open, closed

El atributo `open` se refleja en el host mientras el menú está abierto. El
valor de `is-select` sale de `data-value` del item y, si falta, del texto del
item.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js) — mismo ciclo
  de cierre (Escape, click fuera, scroll) que usa `<is-dropdown>`.

Tags del módulo: `<is-context-menu>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. El panel es un `<dialog>`
mostrado con `show()`; los items se detectan por `[role="menuitem"]`, `.item`,
`button` o `a`.

## Ejemplo avanzado

```html
<is-context-menu for="#tabla" scroll-lock>
  <button class="item" data-value="copiar">Copiar fila</button>
  <a class="item" href="/detalle">Ver detalle</a>
</is-context-menu>
<script>
  document.querySelector('is-context-menu')
    .addEventListener('is-select', (e) => console.log(e.detail.value));
</script>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./context-menu.js)
- [CSS](./context-menu.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-context-menu.json)
