---
tag: iswc-tree
tags:
  - iswc-tree
  - iswc-tree-item
category: navigation
status: public
source: ./tree.js
style: ./tree.css
preview: ./tree.json
---
# `<iswc-tree>` / `<iswc-tree-item>`

## Propósito

Árbol jerárquico accesible: expansión, selección, navegación por teclado
(↑/↓/←/→/Home/End/Enter/Space), iconos por slot y selección
single | leaf | multiple | none.

Este módulo registra `<iswc-tree>`, `<iswc-tree-item>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './tree.js';
```

## Ejemplo mínimo

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
| `selection` | string/según contrato | Fuente define default/restricción. |
| `expanded` | boolean | Fuente define default/restricción. |
| `selected` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `has-children` | boolean | Fuente define default/restricción. |
| `lazy` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-tree-toggle` | sí | sí | sí | no |
| `iswc-tree-select` | sí | sí | sí | no |
| `iswc-tree-expand` | según cabecera | según cabecera | según cabecera | según cabecera |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--indent` | Token leído o definido por componente. |
| `--row-pad-y` | Token leído o definido por componente. |
| `--row-pad-x` | Token leído o definido por componente. |
| `--row-hover` | Token leído o definido por componente. |
| `--iswc-brand` | Token leído o definido por componente. |
| `--row-selected-bg` | Token leído o definido por componente. |
| `--row-selected-fg` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-tree> + <iswc-tree-item> — Web Components (vanilla, zero dependencies).
> Árbol jerárquico con expansión, selección, checkboxes, navegación por teclado
> (Arrow, Home, End, Enter, Space) e iconos por slot.
>   <iswc-tree selection="leaf">
>     <iswc-tree-item expanded>
>       <iswc-icon slot="icon" icon="mdi:folder"></iswc-icon>
>       Documentos
>       <iswc-tree-item> … </iswc-tree-item>
>       <iswc-tree-item> … </iswc-tree-item>
>     </iswc-tree-item>
>   </iswc-tree>
> Atributos <iswc-tree>
>   selection  none | single | leaf | multiple (default 'single')
>   expanded   boolean — todos los nodos empiezan expandidos.
> Atributos <iswc-tree-item>
>   expanded         boolean
>   selected         boolean
>   disabled         boolean
>   has-children     boolean (si lo declaras, se ignoran los hijos declarados)
>   lazy             boolean — carga hijos bajo demanda.
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

Tags del módulo: `<iswc-tree>`, `<iswc-tree-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-expanded`.

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

- [JavaScript](./tree.js)
- [CSS](./tree.css)
- [Índice de categoría](./LLM.md)
- [Preview](./tree.json)
