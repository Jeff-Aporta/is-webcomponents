---
tag: iswc-button-group
tags:
  - iswc-button-group
category: actions
status: public
source: ./button-group.ts
style: ./button-group.css
preview: ./button-group.json
---
# `<iswc-button-group>`

## PropÃ³sito

Agrupa botones relacionados en una sola unidad visual y, si se lo pides, gestiona
cuÃ¡l estÃ¡ activo. Sirve para controles segmentados, toolbars y split buttons.

Este mÃ³dulo registra `<iswc-button-group>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './button-group.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button-group label="Vista" variant="segmented" select="single" value="lista">
<iswc-button variant="plain" value="lista" hue="210">Lista</iswc-button>
<iswc-button variant="plain" value="tabla" hue="160">Tabla</iswc-button>
<iswc-button variant="plain" value="tarjetas" hue="35">Tarjetas</iswc-button>
</iswc-button-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `select` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `pill` | boolean | Fuente define default/restricciÃ³n. |
| `stretch` | boolean | Fuente define default/restricciÃ³n. |
| `allow-empty` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `label` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `select` | lectura/escritura | Declarada por clase. |
| `value` | lectura/escritura | Declarada por clase. |
| `values` | lectura/escritura | Declarada por clase. |
| `pill` | lectura/escritura | Declarada por clase. |
| `stretch` | lectura/escritura | Declarada por clase. |
| `allowEmpty` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `items` | solo lectura | Declarada por clase. |
| `selectedItems` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-button-group');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-button-border-width` | Token leÃ­do o definido por componente. |
| `--iswc-control-border-width` | Token leÃ­do o definido por componente. |
| `--iswc-button-group-radius` | Token leÃ­do o definido por componente. |
| `--iswc-button-border-radius` | Token leÃ­do o definido por componente. |
| `--iswc-button-group-gap` | Token leÃ­do o definido por componente. |
| `--iswc-button-group-pad` | Token leÃ­do o definido por componente. |
| `--iswc-button-group-accent` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--_button-horizontal-indent` | Token leÃ­do o definido por componente. |
| `--_button-horizontal-indent-outlined` | Token leÃ­do o definido por componente. |
| `--_button-start-end-radius` | Token leÃ­do o definido por componente. |
| `--_button-end-end-radius` | Token leÃ­do o definido por componente. |
| `--_button-start-start-radius` | Token leÃ­do o definido por componente. |
| `--_button-end-start-radius` | Token leÃ­do o definido por componente. |
| `--_button-vertical-indent` | Token leÃ­do o definido por componente. |
| `--_button-vertical-indent-outlined` | Token leÃ­do o definido por componente. |
| `--iswc-bg-soft` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border-soft` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-active` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--_sel` | Token leÃ­do o definido por componente. |
| `--iswc-button-selected-color` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-button-group> â€” Web Component (vanilla, zero dependencies).
> Agrupa botones relacionados en una unidad visual y, opcionalmente, gestiona
> quÃ© botÃ³n estÃ¡ seleccionado (control segmentado / toggle group).
> Atributos
>   label         string   a11y, anunciado por AT; no se muestra
>   orientation   horizontal | vertical            (default horizontal, reflected)
>   variant    joined | segmented | separated   (default joined, reflected)
>   select        none | single | multiple         (default none)
>   value         valor(es) seleccionados; en `multiple` separados por coma
>   pill          boolean  extremos redondeados en todo el grupo
>   stretch       boolean  los botones reparten el ancho disponible
>   allow-empty   boolean  en `single`, permite deseleccionar el activo
>   disabled      boolean  bloquea el grupo completo
> Slots
>   (default)  uno o mÃ¡s <iswc-button> (o <button> nativos)
> CSS Parts:  ::part(base)
> Eventos:    iswc-change { value, values }
> El valor de cada botÃ³n es su atributo `value`; si no lo tiene, se usa su
> texto y, en Ãºltimo caso, su Ã­ndice. El botÃ³n activo recibe el atributo
> `selected` y `aria-pressed`, que el CSS del grupo usa para pintarlo.
> Las variables --_button-*-radius y --_button-*-indent se inyectan en los
> hijos slotted; <iswc-button> las consume para fusionar bordes.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-button-group>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-pressed`, `aria-disabled`, `aria-label`, `aria-orientation`.

## Ejemplo avanzado

```html
<iswc-button-group variant="segmented" select="single">â€¦</iswc-button-group>
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

- [JavaScript](./button-group.ts)
- [CSS](./button-group.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./button-group.json)
