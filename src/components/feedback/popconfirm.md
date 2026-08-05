---
tag: is-popconfirm
tags:
  - is-popconfirm
category: feedback
status: public
source: ./popconfirm.js
style: ./popconfirm.css
preview: ../../previews/feedback/is-popconfirm.html
---
# `<is-popconfirm>`

## Propósito

Cuadro de confirmación rápido anclado a un botón. Sin modal, sin tapar
la pantalla. Perfecto para "¿Seguro que quieres borrar?" en línea.

Este módulo registra `<is-popconfirm>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './popconfirm.js';
```

## Ejemplo mínimo

```html
<is-button id="btnDelete">Borrar</is-button>
<is-popconfirm for="btnDelete" message="¿Seguro?">
<is-button slot="confirm" color="danger">Sí, borrar</is-button>
<is-button slot="cancel">Cancelar</is-button>
</is-popconfirm>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/según contrato | Fuente define default/restricción. |
| `message` | string/según contrato | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `hide-arrow` | boolean | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |
| `without-backdrop` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `placement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `message` | Contenido proyectado. |
| `cancel` | Contenido proyectado. |
| `confirm` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-popconfirm-show` | sí | sí | sí | no |
| `is-popconfirm-hide` | sí | sí | sí | no |
| `is-popconfirm-confirm` | sí | sí | sí | no |
| `is-popconfirm-cancel` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `arrow` | Personalizable con `::part(arrow)`. |
| `message` | Personalizable con `::part(message)`. |
| `actions` | Personalizable con `::part(actions)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--bg` | Token leído o definido por componente. |
| `--is-bg-2` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--brand` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--brand-fg` | Token leído o definido por componente. |
| `--is-brand-fg` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--is-danger` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-popconfirm> — Web Component (vanilla, zero dependencies).
> Cuadro de confirmación emergente anclado a un disparador. Sin modal de fondo.
>   <is-button id="trigger">Borrar</is-button>
>   <is-popconfirm for="trigger" message="¿Seguro?">
>     <is-button slot="confirm" color="danger">Sí</is-button>
>     <is-button slot="cancel">No</is-button>
>   </is-popconfirm>
> Atributos
>   for          string — id del trigger element.
>   message      string — texto principal.
>   placement    top | bottom | start | end | top-start | top-end | bottom-start | bottom-end (default 'top')
>   hide-arrow   boolean
>   open         boolean — controlado.
>   without-backdrop boolean
> Slots
>   confirm — slot del botón de confirmación.
>   cancel  — slot del botón de cancelar.
> Eventos
>   is-popconfirm-show  detail: { trigger }
>   is-popconfirm-hide  detail: { trigger }
>   is-popconfirm-confirm detail: { trigger }
>   is-popconfirm-cancel detail: { trigger }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-popconfirm>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`.

## Ejemplo avanzado

```html
<is-button id="btnDelete">Borrar</is-button>
<is-popconfirm for="btnDelete" message="¿Seguro?">
<is-button slot="confirm" color="danger">Sí, borrar</is-button>
<is-button slot="cancel">Cancelar</is-button>
</is-popconfirm>
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

- [JavaScript](./popconfirm.js)
- [CSS](./popconfirm.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-popconfirm.html)
