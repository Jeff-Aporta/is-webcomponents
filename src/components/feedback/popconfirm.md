---
tag: iswc-popconfirm
tags:
  - iswc-popconfirm
category: feedback
status: public
source: ./popconfirm.ts
style: ./popconfirm.scss
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
| `for` | string | id del disparador; se busca en el mismo árbol (documento o shadow). El click abre o cierra. |
| `message` | string | Texto de la pregunta. Si cambia, el globo se actualiza. El slot `message` lo sustituye. |
| `placement` | `top` / `bottom` / `start` / `end` / `top-start` / `top-end` / `bottom-start` / `bottom-end` | Lado preferido (default `top`); si no cabe, voltea y se desplaza para quedar en pantalla. |
| `hide-arrow` | boolean | Oculta la flecha. |
| `open` | boolean | Controlado: presencia = visible. `show()` y `hide()` solo lo ponen y quitan. |
| `color` | intent | Color del botón de aceptar por defecto (default `brand`; `danger` para borrar). |
| `confirm-label` | string | Texto del botón de aceptar por defecto (default `Aceptar`). |
| `cancel-label` | string | Texto del botón de cancelar por defecto (default `Cancelar`). |

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

<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->

| Evento | detail | cancelable |
| --- | --- | --- |
| `iswc-popconfirm-show` | `{ trigger: HTMLElement \| null }` | no |
| `iswc-popconfirm-hide` | `{ trigger: HTMLElement \| null }` | no |
| `iswc-popconfirm-confirm` | `{ trigger: HTMLElement \| null }` | no |
| `iswc-popconfirm-cancel` | `{ trigger: HTMLElement \| null }` | no |

<!-- /eventos -->


| Evento | Descripción |
| --- | --- |
| `iswc-popconfirm-show` | Evento personalizado del componente (popconfirm show). |
| `iswc-popconfirm-hide` | Evento personalizado del componente (popconfirm hide). |
| `iswc-popconfirm-confirm` | Evento personalizado del componente (popconfirm confirm). |
| `iswc-popconfirm-cancel` | Evento personalizado del componente (popconfirm cancel). |


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

Vive en la capa superior (`popover="manual"`): se ve también sobre un `iswc-dialog`. Al abrir, el foco va a Cancelar; al cerrar vuelve a donde estaba. Cierra con Escape, con click fuera y con cualquiera de los dos botones. Todo lo que se ponga en los slots `confirm` y `cancel` dispara su evento al hacer click, sin atributos extra. Un mensaje largo se desplaza dentro del globo.

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

- [JavaScript](./popconfirm.ts)
- [CSS](./popconfirm.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./popconfirm.json)
