---
tag: iswc-popconfirm
tags:
  - iswc-popconfirm
category: feedback
status: public
source: ./popconfirm.js
style: ./popconfirm.css
preview: ./popconfirm.json
---
# `<iswc-popconfirm>`

## Propósito

Cuadro de confirmación rápido anclado a un botón. Sin modal, sin tapar
la pantalla. Perfecto para "¿Seguro que quieres borrar?" en línea.

Este módulo registra `<iswc-popconfirm>`.

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
<iswc-button id="btnDelete">Borrar</iswc-button>
<iswc-popconfirm for="btnDelete" message="¿Seguro?">
<iswc-button slot="confirm" color="danger">Sí, borrar</iswc-button>
<iswc-button slot="cancel">Cancelar</iswc-button>
</iswc-popconfirm>
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


| Evento | Descripción |
| --- | --- |
| `iswc-popconfirm-show` | Evento personalizado del componente (popconfirm show). |
| `iswc-popconfirm-hide` | Evento personalizado del componente (popconfirm hide). |
| `iswc-popconfirm-confirm` | Evento personalizado del componente (popconfirm confirm). |
| `iswc-popconfirm-cancel` | Evento personalizado del componente (popconfirm cancel). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-popconfirm-show` | sí | sí | sí | no |
| `iswc-popconfirm-hide` | sí | sí | sí | no |
| `iswc-popconfirm-confirm` | sí | sí | sí | no |
| `iswc-popconfirm-cancel` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-popconfirm');
el.addEventListener('iswc-popconfirm-show', (e) => {
  console.log('iswc-popconfirm-show', e.detail);
});
```

</details>

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
| `--iswc-bg-elev` | Fondo del panel (vía `--bg`). |
| `--iswc-text` | Color de texto (vía `--fg`). |
| `--iswc-border` | Borde del panel (vía `--border`). |
| `--iswc-brand` | Color de marca (vía `--brand`). |
| `--iswc-brand-fg` | Texto sobre el color de marca (vía `--brand-fg`). |
| `--iswc-danger` | Tono destructivo (vía `--danger`). |

Los botones por defecto de los slots `confirm` / `cancel` son `<iswc-button>`:
su color y apariencia se controlan desde el propio botón, no desde aquí.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-popconfirm> — Web Component (vanilla, zero dependencies).
> Cuadro de confirmación emergente anclado a un disparador. Sin modal de fondo.
>   <iswc-button id="trigger">Borrar</iswc-button>
>   <iswc-popconfirm for="trigger" message="¿Seguro?">
>     <iswc-button slot="confirm" color="danger">Sí</iswc-button>
>     <iswc-button slot="cancel">No</iswc-button>
>   </iswc-popconfirm>
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
>   iswc-popconfirm-show  detail: { trigger }
>   iswc-popconfirm-hide  detail: { trigger }
>   iswc-popconfirm-confirm detail: { trigger }
>   iswc-popconfirm-cancel detail: { trigger }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-popconfirm>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`.

## Ejemplo avanzado

```html
<iswc-button id="btnDelete">Borrar</iswc-button>
<iswc-popconfirm for="btnDelete" message="¿Seguro?">
<iswc-button slot="confirm" color="danger">Sí, borrar</iswc-button>
<iswc-button slot="cancel">Cancelar</iswc-button>
</iswc-popconfirm>
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
- [Preview](./popconfirm.json)
