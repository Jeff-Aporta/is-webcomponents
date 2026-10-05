---
tag: iswc-tree
tags:
  - iswc-tree
  - iswc-tree-item
category: navigation
status: public
source: ./tree.ts
style: ./tree.css
preview: ./tree.json
---
# `<iswc-tree>` / `<iswc-tree-item>`

## PropÃ³sito

Ãrbol jerÃ¡rquico accesible: expansiÃ³n, selecciÃ³n, navegaciÃ³n por teclado
(â†‘/â†“/â†/â†’/Home/End/Enter/Space), iconos por slot y selecciÃ³n
single | leaf | multiple | none.

Este mÃ³dulo registra `<iswc-tree>`, `<iswc-tree-item>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './tree.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-tree selection="single" expanded>
<iswc-tree-item>
<iswc-icon slot="icon" icon="mdi:folder"></iswc-icon>
Documentos
<iswc-tree-item>facturas-2024.pdf</iswc-tree-item>
</iswc-tree-item>
</iswc-tree>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `selection` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `expanded` | boolean | Fuente define default/restricciÃ³n. |
| `selected` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `has-children` | boolean | Fuente define default/restricciÃ³n. |
| `lazy` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `selection` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `expand-icon` | Contenido proyectado. |
| `checkbox` | Contenido proyectado. |
| `icon` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-tree-toggle` | Evento personalizado del componente (tree toggle). |
| `iswc-tree-select` | Evento personalizado del componente (tree select). |
| `iswc-tree-expand` | Evento personalizado del componente (tree expand). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-tree-toggle` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-tree-select` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-tree-expand` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-tree');
el.addEventListener('iswc-tree-toggle', (e) => {
  console.log('iswc-tree-toggle', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `items` | Personalizable con `::part(items)`. |
| `item` | Personalizable con `::part(item)`. |
| `expand-toggle` | Personalizable con `::part(expand-toggle)`. |
| `checkbox` | Personalizable con `::part(checkbox)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `item-content` | Personalizable con `::part(item-content)`. |
| `item-children` | Personalizable con `::part(item-children)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--indent` | Token leÃ­do o definido por componente. |
| `--row-pad-y` | Token leÃ­do o definido por componente. |
| `--row-pad-x` | Token leÃ­do o definido por componente. |
| `--row-hover` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--row-selected-bg` | Token leÃ­do o definido por componente. |
| `--row-selected-fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-tree> + <iswc-tree-item> â€” Web Components (vanilla, zero dependencies).
> Ãrbol jerÃ¡rquico con expansiÃ³n, selecciÃ³n, checkboxes, navegaciÃ³n por teclado
> (Arrow, Home, End, Enter, Space) e iconos por slot.
>   <iswc-tree selection="leaf">
>     <iswc-tree-item expanded>
>       <iswc-icon slot="icon" icon="mdi:folder"></iswc-icon>
>       Documentos
>       <iswc-tree-item> â€¦ </iswc-tree-item>
>       <iswc-tree-item> â€¦ </iswc-tree-item>
>     </iswc-tree-item>
>   </iswc-tree>
> Atributos <iswc-tree>
>   selection  none | single | leaf | multiple (default 'single')
>   expanded   boolean â€” todos los nodos empiezan expandidos.
> Atributos <iswc-tree-item>
>   expanded         boolean
>   selected         boolean
>   disabled         boolean
>   has-children     boolean (si lo declaras, se ignoran los hijos declarados)
>   lazy             boolean â€” carga hijos bajo demanda.
> Slots
>   <iswc-tree-item>
>     (default)   label.
>     icon        icono a la izquierda.
>     expand-icon override del caret.
>     checkbox    override del checkbox.
> Eventos
>   iswc-tree-select    detail: { item, selected, selectedItems }
>   iswc-tree-expand    detail: { item, expanded }
>   iswc-tree-toggle    detail: { item, expanded }
> CSS Parts
>   iswc-tree: ::part(base) ::part(items)
>   iswc-tree-item: ::part(item) ::part(item-content) ::part(item-children) ::part(checkbox) ::part(expand-toggle)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-tree>`, `<iswc-tree-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-expanded`.

## Ejemplo avanzado

```html
<iswc-tree selection="single" expanded>
<iswc-tree-item>
<iswc-icon slot="icon" icon="mdi:folder"></iswc-icon>
Documentos
<iswc-tree-item>facturas-2024.pdf</iswc-tree-item>
</iswc-tree-item>
</iswc-tree>
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

- [JavaScript](./tree.ts)
- [CSS](./tree.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./tree.json)
