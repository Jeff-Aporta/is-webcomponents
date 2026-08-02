---
tag: is-details
tags:
  - is-details
category: layout
status: public
source: ./details.js
style: ./details.css
preview: ../../previews/layout/is-details.html
---
# `<is-details>`

## Propósito

Disclosure colapsable: muestra un resumen y, al expandir, el contenido. Equivalente
accesible al <details> nativo, con apariencias,
iconos, animaciones y comportamiento de accordion opcional.

Este módulo registra `<is-details>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size variants; escalar mediante font-size contextual y em.

## Importación

```js
import './details.js';
```

## Ejemplo mínimo

```html
<is-details summary="¿Qué es Insoft?">
Insoft es un ERP modular…
</is-details>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricción. |
| `summary` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `appearance` | string/según contrato | Fuente define default/restricción. |
| `icon-placement` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `summary` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `appearance` | lectura/escritura | Declarada por clase. |
| `iconPlacement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `summary` | Contenido proyectado. |
| `expand-icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | según cabecera | según cabecera | según cabecera | según cabecera |
| `is-after-show` | según cabecera | según cabecera | según cabecera | según cabecera |
| `is-hide` | según cabecera | según cabecera | según cabecera | según cabecera |
| `is-after-hide` | según cabecera | según cabecera | según cabecera | según cabecera |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |
| `toggle()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `header` | Personalizable con `::part(header)`. |
| `summary` | Personalizable con `::part(summary)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `content` | Personalizable con `::part(content)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--is-space-m` | Token leído o definido por componente. |
| `--_bg` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--_text` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--_header-bg` | Token leído o definido por componente. |
| `--_header-bg-hover` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-text-muted` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-details> — Web Component (vanilla, zero dependencies).
> Disclosure colapsable: muestra un resumen y, al expandir, el contenido.
> Equivalente a wa-details / <details>.
> Atributos
>   open             boolean — si está expandido (reflected)
>   summary          string  — texto del summary si no se usa el slot
>   name             string  — grupo accordion: si dos <is-details> comparten
>                             `name`, abrir uno cierra el resto
>   disabled         boolean
>   appearance       filled | outlined | filled-outlined | plain
>                    (default 'outlined', reflected)
>   icon-placement   start | end
>                    (default 'end', reflected)
> Slots
>   (default)         contenido principal
>   summary           summary propio (gana sobre el atributo summary)
>   expand-icon       icono de expandido
>   collapse-icon     icono de colapsado
> Métodos
>   show() / hide() / toggle()
> Eventos
>   is-show       detail: {} — antes de abrir (cancelable)
>   is-after-show detail: {} — tras la animación de apertura
>   is-hide       detail: {} — antes de cerrar (cancelable)
>   is-after-hide detail: {} — tras la animación de cierre
> CSS Parts: ::part(base) ::part(header) ::part(summary) ::part(icon) ::part(content)
> CSS custom properties
>   --spacing          espacio del header/contenido
>   --show-duration    duración de la animación de apertura
>   --hide-duration    duración de la animación de cierre

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-details>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-expanded`, `aria-hidden`, `aria-disabled`.

## Ejemplo avanzado

```html
<is-details appearance="filled" summary="…">…</is-details>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./details.js)
- [CSS](./details.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-details.html)
