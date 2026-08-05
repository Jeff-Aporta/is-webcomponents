---
tag: is-tree
tags:
  - is-tree
  - is-tree-item
category: navigation
status: public
source: ./tree.js
style: ./tree.css
preview: ../../previews/navigation/is-tree.html
---
# `<is-tree>` / `<is-tree-item>`

## Propósito

Árbol jerárquico accesible: expansión, selección, navegación por teclado
(↑/↓/←/→/Home/End/Enter/Space), iconos por slot y selección
single | leaf | multiple | none.

Este módulo registra `<is-tree>`, `<is-tree-item>`.

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
<is-tree selection="single" expanded>
<is-tree-item>
<is-icon slot="icon" icon="mdi:folder"></is-icon>
Documentos
<is-tree-item>facturas-2024.pdf</is-tree-item>
</is-tree-item>
</is-tree>
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
| `is-tree-toggle` | sí | sí | sí | no |
| `is-tree-select` | sí | sí | sí | no |
| `is-tree-expand` | según cabecera | según cabecera | según cabecera | según cabecera |

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
| `--is-brand` | Token leído o definido por componente. |
| `--row-selected-bg` | Token leído o definido por componente. |
| `--row-selected-fg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-tree> + <is-tree-item> — Web Components (vanilla, zero dependencies).
> Árbol jerárquico con expansión, selección, checkboxes, navegación por teclado
> (Arrow, Home, End, Enter, Space) e iconos por slot.
>   <is-tree selection="leaf">
>     <is-tree-item expanded>
>       <is-icon slot="icon" icon="mdi:folder"></is-icon>
>       Documentos
>       <is-tree-item> … </is-tree-item>
>       <is-tree-item> … </is-tree-item>
>     </is-tree-item>
>   </is-tree>
> Atributos <is-tree>
>   selection  none | single | leaf | multiple (default 'single')
>   expanded   boolean — todos los nodos empiezan expandidos.
> Atributos <is-tree-item>
>   expanded         boolean
>   selected         boolean
>   disabled         boolean
>   has-children     boolean (si lo declaras, se ignoran los hijos declarados)
>   lazy             boolean — carga hijos bajo demanda.
> Slots
>   <is-tree-item>
>     (default)   label.
>     icon        icono a la izquierda.
>     expand-icon override del caret.
>     checkbox    override del checkbox.
> Eventos
>   is-tree-select    detail: { item, selected, selectedItems }
>   is-tree-expand    detail: { item, expanded }
>   is-tree-toggle    detail: { item, expanded }
> CSS Parts
>   is-tree: ::part(base) ::part(items)
>   is-tree-item: ::part(item) ::part(item-content) ::part(item-children) ::part(checkbox) ::part(expand-toggle)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-tree>`, `<is-tree-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-expanded`.

## Ejemplo avanzado

```html
<is-tree selection="single" expanded>
<is-tree-item>
<is-icon slot="icon" icon="mdi:folder"></is-icon>
Documentos
<is-tree-item>facturas-2024.pdf</is-tree-item>
</is-tree-item>
</is-tree>
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
- [Preview](../../previews/navigation/is-tree.html)
