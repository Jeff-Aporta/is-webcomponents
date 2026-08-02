---
tag: is-main
tags:
  - is-main
category: layout
status: public
source: ./main.js
style: ./main.css
preview: ../../previews/layout/is-main.html
---
# `<is-main>`

## Propósito

Contenedor scrollable equivalente a <main>.
La persistencia de scroll es opt-in estricta: requiere
remember-scroll y storage-key.

Este módulo registra `<is-main>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './main.js';
```

## Ejemplo mínimo

```html
<is-main class="main" remember-scroll storage-key="docs-mi-vista">
…
</is-main>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `remember-scroll` | boolean | Fuente define default/restricción. |
| `storage-key` | string/según contrato | Fuente define default/restricción. |
| `scroll-ttl` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `rememberScroll` | lectura/escritura | Declarada por clase. |
| `storageKey` | lectura/escritura | Declarada por clase. |
| `scrollTtl` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `clearRememberedScroll()` | Método público declarado. |
| `saveScroll()` | Método público declarado. |
| `restoreScroll()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-main> — contenedor scrollable tipo <main>.
> Remember-scroll es OPT-IN estricto: hace falta
>   remember-scroll  +  storage-key="…"
> Sin ambos → no lee ni escribe localStorage.
> Attrs
>   remember-scroll   boolean — activa persistencia (default: off)
>   storage-key       string  — id único bajo is-components.is-main
>   scroll-ttl        number  — ms de validez (default: 3600000 = 1h)
> Methods: scrollToTop(), clearRememberedScroll(), saveScroll(), restoreScroll()
> Restore solo en reload / back_forward. Navegación fresca (p. ej. cambio
> de componente en la galería vía iframe.src) arranca en top.

## Dependencias y componentes relacionados

- [`../_shared/prefs.js`](../_shared/prefs.js)

Tags del módulo: `<is-main>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-main class="main" remember-scroll storage-key="docs-mi-vista">
…
</is-main>
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

- [JavaScript](./main.js)
- [CSS](./main.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-main.html)
