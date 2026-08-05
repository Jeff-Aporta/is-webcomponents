---
tag: is-command-palette
tags:
  - is-command-palette
category: overlays
status: public
source: ./command-palette.js
style: ./command-palette.css
preview: ../../previews/overlays/is-command-palette.html
---
# `<is-command-palette>`

## Propósito

Paleta de comandos al estilo Cmd+K / Ctrl+K: busca y ejecuta comandos declarados en JSON.

Este módulo registra `<is-command-palette>`.

## Cuándo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## Cuándo no usarlo

Para diálogos/cajones genéricos usar `<is-dialog>` / `<is-drawer>` en layout.
No reinventar overlays si este módulo cubre el caso.

## Importación

```js
import './command-palette.js';
```

## Ejemplo mínimo

```html
<is-command-palette placeholder="Buscar…">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</is-command-palette>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `hotkey` | string | Default `mod+k`. Vacío desactiva. |
| `placeholder` | string | Texto del input. |
| `max-results` | string/según contrato | Tope de resultados (default 12). |
| `empty-text` | string | Texto sin resultados. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `commands` | solo lectura | Array cargado. |
| `results` | solo lectura | Resultados actuales. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el módulo lo declara). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-open` | sí | sí | sí | no |
| `is-close` | sí | sí | sí | no |
| `is-select` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `open()` | Método público declarado. |
| `close()` | Método público declarado. |
| `toggle()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `dialog` | Personalizable con `::part(dialog)`. |
| `panel` | Personalizable con `::part(panel)`. |
| `input` | Personalizable con `::part(input)`. |
| `results` | Personalizable con `::part(results)`. |
| `empty` | Personalizable con `::part(empty)`. |
| `footer` | Personalizable con `::part(footer)`. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-command-palette> — Cmd/Ctrl+K. Comandos vía JSON hijo; eventos is-open/is-close/is-select.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-command-palette>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<is-command-palette placeholder="Buscar…">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</is-command-palette>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./command-palette.js)
- [CSS](./command-palette.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/overlays/is-command-palette.html)
