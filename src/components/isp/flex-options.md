---
tag: is-flex-options
tags:
  - is-flex-options
category: isp
status: public
source: ./flex-options.js
style: ./flex-options.css
preview: ../../previews/isp/is-flex-options.json
---
# `<is-flex-options>`

## Propósito

Toolbar de acciones a partir de un array tipo ISP `FlexOptionsInput[]`.
Port de `FlexOptions.svelte` (ClientesIS). Pinta `<is-button>`,
`<is-check-icon-button>`, `<is-button-group>` y `<is-dropdown>` — no
reimplementa botones.

Este módulo registra `<is-flex-options>`.

## Cuándo usarlo

Fila de acciones (toolbar de árbol, tools de hover, menú compacto) cuyo
contrato ya es `{ icon, title, onClick, disabled, separator }` o grupos.

## Cuándo no usarlo

Un solo botón → `<is-button>`. Menú anclado con clic y Escape →
`<is-dropdown>` directo. No crear otra toolbar con `<button>` nativos.

## Importación

```js
import './flex-options.js';
```

## Ejemplo mínimo

```html
<is-flex-options id="opts"></is-flex-options>
<script type="module">
  document.getElementById('opts').actions = [
    { icon: 'mdi:plus', title: 'Agregar', onClick: () => {} },
    { icon: 'mdi:pencil', title: 'Editar', onClick: () => {} },
  ];
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `compact` | boolean | Sin label; solo icono. |
| `more-disabled` | boolean | Deshabilita el menú "más". |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `actions` | lectura/escritura | `FlexOptionsInput[]`. |
| `more` | lectura/escritura | Acciones del dropdown "más". |
| `compact` | lectura/escritura | Refleja el atributo. |
| `moreDisabled` | lectura/escritura | Refleja `more-disabled`. |

Cada action: `{ icon, title, label, onClick, disabled, color, separator }`
o toggle `{ checked, iconTrue, iconFalse }`. Un grupo es un array; entre
grupos se inserta separador.

### Slots

| Slot | Uso |
| --- | --- |
| — | No proyecta. Las acciones se pintan en shadow. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

Los clics corren `onClick` de cada spec. No hay evento propio.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| — | No declara métodos extra. |

### CSS parts

| Part | Uso |
| --- | --- |
| `toolbar` | Fila de acciones. |

### Custom states

No expone.

### CSS custom properties

No declara tokens propios; usa los de `<is-button>` / `<is-dropdown>`.

### Integración con formularios

No declara integración form-associated.

## Comportamiento

Si la firma de `actions`+`more` no cambia, no reconstruye el DOM (evita
flicker de upgrade de custom elements). `compact` omite el texto del botón.

## Dependencias y componentes relacionados

- [`../actions/button.md`](../actions/button.md)
- [`../actions/button-group.md`](../actions/button-group.md)
- [`../actions/dropdown.md`](../actions/dropdown.md)
- [`../actions/check-icon-button.md`](../actions/check-icon-button.md)
- [`float-card.md`](./float-card.md)

Tags del módulo: `<is-flex-options>`.

## Accesibilidad

`role="toolbar"` en el part `toolbar`. Cada acción hereda el `title` del spec.

## Ejemplo avanzado

```html
<is-flex-options id="tb" compact></is-flex-options>
<script type="module">
  const tb = document.getElementById('tb');
  tb.actions = [
    [{ icon: 'mdi:arrow-up', title: 'Subir', onClick: () => {} },
     { icon: 'mdi:arrow-down', title: 'Bajar', onClick: () => {} }],
    { icon: 'mdi:plus', title: 'Hijo', onClick: () => {} },
  ];
  tb.more = [{ icon: 'mdi:delete', title: 'Eliminar', color: 'danger', onClick: () => {} }];
</script>
```

## Errores comunes

- Recrear el elemento en cada hover: asignar `actions` una vez y togglear
  visibilidad en `<is-float-card open>`.
- Meter HTML de botones en light DOM: este tag pinta en shadow.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.
- No reinventar botón/dropdown: este tag ya los usa.

## Fuentes

- [JavaScript](./flex-options.js)
- [CSS](./flex-options.css)
- [Preview](../../previews/isp/is-flex-options.json)
