---
tag: iswc-transfer
tags:
  - iswc-transfer
  - iswc-transfer-item
category: data
status: public
source: ./transfer.js
style: ./transfer.css
preview: ./transfer.json
---
# `<iswc-transfer>` / `<iswc-transfer-item>`

## Propósito

Doble lista de selección tipo Material/Ant. Mueve elementos entre
origen y destino con botones, click individual, filtro de búsqueda y
límite máximo configurable.

Este módulo registra `<iswc-transfer>`, `<iswc-transfer-item>`.

## Cuándo usarlo

Presentación, comparación, movimiento u organización de datos estructurados.

## Cuándo no usarlo

No reemplazar HTML semántico cuando contenido es estático y simple.

## Importación

```js
import './transfer.js';
```

## Ejemplo mínimo

```html
<iswc-transfer searchable>
<iswc-transfer-item value="a">Alpha</iswc-transfer-item>
<iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
<iswc-transfer-item value="c">Gamma</iswc-transfer-item>
…
</iswc-transfer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `source-title` | string/según contrato | Fuente define default/restricción. |
| `target-title` | string/según contrato | Fuente define default/restricción. |
| `searchable` | boolean | Fuente define default/restricción. |
| `without-buttons` | boolean | Fuente define default/restricción. |
| `without-headings` | boolean | Fuente define default/restricción. |
| `max-target` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `selected` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `values` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-transfer-change` | Evento personalizado del componente (transfer change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-transfer-change` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-transfer');
el.addEventListener('iswc-transfer-change', (e) => {
  console.log('iswc-transfer-change', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `pane` | Personalizable con `::part(pane)`. |
| `pane-head` | Personalizable con `::part(pane-head)`. |
| `title` | Personalizable con `::part(title)`. |
| `count` | Personalizable con `::part(count)`. |
| `search` | Personalizable con `::part(search)`. |
| `list` | Personalizable con `::part(list)`. |
| `controls` | Personalizable con `::part(controls)`. |
| `item` | Personalizable con `::part(item)`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--bg` | Token leído o definido por componente. |
| `--iswc-bg-2` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--muted` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--brand` | Token leído o definido por componente. |
| `--iswc-brand` | Token leído o definido por componente. |
| `--row-h` | Token leído o definido por componente. |
| `--iswc-bg` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-transfer> — Doble lista de selección (vanilla, zero dependencies).
> Mueve elementos entre una lista de origen y una lista de destino.
>   <iswc-transfer id="t1">
>     <iswc-transfer-item value="a">Alpha</iswc-transfer-item>
>     <iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
>   </iswc-transfer>
> Atributos <iswc-transfer>
>   source-title       string
>   target-title       string
>   searchable         boolean
>   without-buttons    boolean  — sin botones prev/next
>   without-headings   boolean
>   max-target         number   — máximo de items en target.
> Atributos <iswc-transfer-item>
>   value        string
>   disabled     boolean
> Slots
>   <iswc-transfer-item>
>     (default)   label.
> Eventos
>   iswc-transfer-change  detail: { item, source, target, values }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-transfer>`, `<iswc-transfer-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-multiselectable`, `aria-hidden`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-transfer searchable>
<iswc-transfer-item value="a">Alpha</iswc-transfer-item>
<iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
<iswc-transfer-item value="c">Gamma</iswc-transfer-item>
…
</iswc-transfer>
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

- [JavaScript](./transfer.js)
- [CSS](./transfer.css)
- [Índice de categoría](./LLM.md)
- [Preview](./transfer.json)
