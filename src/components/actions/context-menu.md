---
tag: iswc-context-menu
tags:
  - iswc-context-menu
category: actions
status: public
source: ./context-menu.js
style: ./context-menu.css
preview: ./context-menu.json
---
# `<iswc-context-menu>`

## Propósito

Menú emergente anclado al clic derecho del ratón sobre un elemento
`target` externo (o sobre el propio host si no se define `for`). Coloca el
panel en el punto del cursor, lo voltea si no cabe y lo pega al borde como
último recurso.

Este módulo registra `<iswc-context-menu>`.

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
<iswc-context-menu for="#zona">
  <button class="item" data-value="editar">Editar</button>
  <button class="item" data-value="borrar">Borrar</button>
</iswc-context-menu>
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


| Evento | Descripción |
| --- | --- |
| `iswc-open` | Evento personalizado del componente (open). |
| `iswc-close` | Evento personalizado del componente (close). |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-open` | sí | sí | sí | no |
| `iswc-close` | no | sí | sí | no |
| `iswc-select` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-context-menu');
el.addEventListener('iswc-open', (e) => {
  console.log('iswc-open', e.detail);
});
```

</details>

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
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-shadow` | Token leído o definido por componente. |
| `--iswc-popover-radius` | Token leído o definido por componente. |
| `--iswc-popover-shadow` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-context-menu> — Menú emergente anclado al clic derecho del ratón sobre
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
>             `iswc-select` y se cierra el menú.
> Eventos
>   iswc-select       detalle: { item, value }  — al elegir un item
>   iswc-open, iswc-close
> Custom states: open, closed

El atributo `open` se refleja en el host mientras el menú está abierto. El
valor de `iswc-select` sale de `data-value` del item y, si falta, del texto del
item.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js) — mismo ciclo
  de cierre (Escape, click fuera, scroll) que usa `<iswc-dropdown>`.

Tags del módulo: `<iswc-context-menu>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. El panel es un `<dialog>`
mostrado con `show()`; los items se detectan por `[role="menuitem"]`, `.item`,
`button` o `a`.

## Ejemplo avanzado

```html
<iswc-context-menu for="#tabla" scroll-lock>
  <button class="item" data-value="copiar">Copiar fila</button>
  <a class="item" href="/detalle">Ver detalle</a>
</iswc-context-menu>
<script>
  document.querySelector('iswc-context-menu')
    .addEventListener('iswc-select', (e) => console.log(e.detail.value));
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
- [Preview](./context-menu.json)
