---
tag: iswc-context-menu
tags:
  - iswc-context-menu
category: actions
status: public
source: ./context-menu.ts
style: ./context-menu.css
preview: ./context-menu.json
---
# `<iswc-context-menu>`

## PropÃ³sito

MenÃº emergente anclado al clic derecho del ratÃ³n sobre un elemento
`target` externo (o sobre el propio host si no se define `for`). Coloca el
panel en el punto del cursor, lo voltea si no cabe y lo pega al borde como
Ãºltimo recurso.

Este mÃ³dulo registra `<iswc-context-menu>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './context-menu.js';
```

## Ejemplo mÃ­nimo

```html
<div id="zona">Clic derecho aquÃ­</div>
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
| `for` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `distance` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `scroll-lock` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isOpen` | lectura | Declarada por clase. |
| `scrollLock` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-open` | Evento personalizado del componente (open). |
| `iswc-close` | Evento personalizado del componente (close). |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-open` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-close` | no | sÃ­ | sÃ­ | no |
| `iswc-select` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-context-menu');
el.addEventListener('iswc-open', (e) => {
  console.log('iswc-open', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `openAt(x, y)` | Abre el menÃº anclado a un punto del viewport. |
| `openAtElement(el)` | Abre el menÃº anclado a un elemento. |
| `close()` | Cierra el menÃº. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-popover-radius` | Token leÃ­do o definido por componente. |
| `--iswc-popover-shadow` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-context-menu> â€” MenÃº emergente anclado al clic derecho del ratÃ³n sobre
> un `target` externo (o sobre el propio host si no se da `for`).
> Atributos
>   for                CSS selector â€” selector del elemento que recibe el
>                      contextmenu. Si falta, el host mismo.
>   placement          bottom-start (default) | bottom-end | top-start |
>                      top-end  (alias CSS-ish del placement del popup)
>   distance           pÃ­xeles desde el cursor (default 2)
>   disabled           boolean â€” desactiva el menÃº
>   scroll-lock        boolean â€” si estÃ¡, bloquea el scroll del documento
>                      mientras el menÃº estÃ¡ abierto. Sin Ã©l (default),
>                      cualquier scroll fuera del panel cierra el menÃº
>                      (no "persigue" el scroll del viewport/contenedor).
> Slots
>   default â€” hijos renderizados dentro del panel; usar <button class="item">
>             o <a class="item"> para tener acciones. Cada item emite
>             `iswc-select` y se cierra el menÃº.
> Eventos
>   iswc-select       detalle: { item, value }  â€” al elegir un item
>   iswc-open, iswc-close
> Custom states: open, closed

El atributo `open` se refleja en el host mientras el menÃº estÃ¡ abierto. El
valor de `iswc-select` sale de `data-value` del item y, si falta, del texto del
item.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js) â€” mismo ciclo
  de cierre (Escape, click fuera, scroll) que usa `<iswc-dropdown>`.

Tags del mÃ³dulo: `<iswc-context-menu>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. El panel es un `<dialog>`
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

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./context-menu.ts)
- [CSS](./context-menu.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./context-menu.json)
