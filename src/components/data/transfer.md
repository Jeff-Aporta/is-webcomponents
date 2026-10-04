---
tag: iswc-transfer
tags:
  - iswc-transfer
  - iswc-transfer-item
category: data
status: public
source: ./transfer.ts
style: ./transfer.css
preview: ./transfer.json
---
# `<iswc-transfer>` / `<iswc-transfer-item>`

## PropÃ³sito

Doble lista de selecciÃ³n tipo Material/Ant. Mueve elementos entre
origen y destino con botones, click individual, filtro de bÃºsqueda y
lÃ­mite mÃ¡ximo configurable.

Este mÃ³dulo registra `<iswc-transfer>`, `<iswc-transfer-item>`.

## CuÃ¡ndo usarlo

PresentaciÃ³n, comparaciÃ³n, movimiento u organizaciÃ³n de datos estructurados.

## CuÃ¡ndo no usarlo

No reemplazar HTML semÃ¡ntico cuando contenido es estÃ¡tico y simple.

## ImportaciÃ³n

```js
import './transfer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-transfer searchable>
<iswc-transfer-item value="a">Alpha</iswc-transfer-item>
<iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
<iswc-transfer-item value="c">Gamma</iswc-transfer-item>
â€¦
</iswc-transfer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `source-title` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `target-title` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `searchable` | boolean | Fuente define default/restricciÃ³n. |
| `without-buttons` | boolean | Fuente define default/restricciÃ³n. |
| `without-headings` | boolean | Fuente define default/restricciÃ³n. |
| `max-target` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `selected` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `values` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-transfer-change` | Evento personalizado del componente (transfer change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-transfer-change` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-transfer');
el.addEventListener('iswc-transfer-change', (e) => {
  console.log('iswc-transfer-change', e.detail);
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
| `--bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--muted` | Token leÃ­do o definido por componente. |
| `--border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--row-h` | Token leÃ­do o definido por componente. |
| `--iswc-bg` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-transfer> â€” Doble lista de selecciÃ³n (vanilla, zero dependencies).
> Mueve elementos entre una lista de origen y una lista de destino.
>   <iswc-transfer id="t1">
>     <iswc-transfer-item value="a">Alpha</iswc-transfer-item>
>     <iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
>   </iswc-transfer>
> Atributos <iswc-transfer>
>   source-title       string
>   target-title       string
>   searchable         boolean
>   without-buttons    boolean  â€” sin botones prev/next
>   without-headings   boolean
>   max-target         number   â€” mÃ¡ximo de items en target.
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

Tags del mÃ³dulo: `<iswc-transfer>`, `<iswc-transfer-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-multiselectable`, `aria-hidden`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-transfer searchable>
<iswc-transfer-item value="a">Alpha</iswc-transfer-item>
<iswc-transfer-item value="b" selected>Beta</iswc-transfer-item>
<iswc-transfer-item value="c">Gamma</iswc-transfer-item>
â€¦
</iswc-transfer>
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

- [JavaScript](./transfer.ts)
- [CSS](./transfer.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./transfer.json)
