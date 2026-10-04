---
tag: iswc-tag
tags:
  - iswc-tag
category: feedback
status: public
source: ./tag.ts
style: ./tag.css
preview: ./tag.json
---
# `<iswc-tag>`

## PropÃ³sito

Etiqueta interactiva con colores y botÃ³n de quitar opcional. Escala con font-size del contexto.

Este mÃ³dulo registra `<iswc-tag>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './tag.js';
```

## Ejemplo mÃ­nimo

```html
<span style="font-size:1.25rem">
<iswc-tag pill>Grande</iswc-tag>
</span>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `pill` | boolean | Fuente define default/restricciÃ³n. |
| `with-remove` | boolean | Fuente define default/restricciÃ³n. |
| `remove-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `withRemove` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-remove` | Emitido al eliminar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-remove` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-tag');
el.addEventListener('iswc-remove', (e) => {
  console.log('iswc-remove', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `tag` | Personalizable con `::part(tag)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |
| `remove-button` | Personalizable con `::part(remove-button)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--_text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-700` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-tag> â€” Web Component (vanilla).
> Similar a iswc-badge; default variant filled-outlined, color brand.
> Escala con font-size del contexto (mÃ©tricas en em).
> Atributos
>   color       brand | neutral | info | success | warning | danger (default brand)
>   variant    accent | filled | outlined | filled-outlined (default filled-outlined)
>   pill          boolean
>   with-remove   boolean â€” muestra botÃ³n de quitar
>   remove-label  string â€” aria-label del botÃ³n (default Quitar)
> Eventos
>   iswc-remove  â€” click en botÃ³n quitar (bubbles, composed)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-tag>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<span style="font-size:1.25rem">
<iswc-tag pill>Grande</iswc-tag>
</span>
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

- [JavaScript](./tag.ts)
- [CSS](./tag.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./tag.json)
