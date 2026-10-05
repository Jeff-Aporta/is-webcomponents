---
tag: iswc-pin-input
tags:
  - iswc-pin-input
category: forms
status: public
source: ./pin-input.ts
style: ./pin-input.css
preview: ./pin-input.json
---
# `<iswc-pin-input>`

## PropÃ³sito

Casillas para OTP / PIN de 3 a 8 dÃ­gitos. Auto-avance al escribir,
Backspace retrocede, pegar reparte todos los dÃ­gitos, navegaciÃ³n con
flechas y soporte para enmascarar el contenido.

Este mÃ³dulo registra `<iswc-pin-input>`.

## CuÃ¡ndo usarlo

Captura, selecciÃ³n y validaciÃ³n de valores compatibles con formularios.

## CuÃ¡ndo no usarlo

No duplicar validaciÃ³n, form association ni pickers shared.

## ImportaciÃ³n

```js
import './pin-input.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-pin-input length="6"></iswc-pin-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `length` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `mask` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `invalid` | boolean | Fuente define default/restricciÃ³n. |
| `placeholder` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `autocomplete` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-pin-change` | Evento personalizado del componente (pin change). |
| `iswc-pin-complete` | Evento personalizado del componente (pin complete). |
| `iswc-pin-invalid` | Evento personalizado del componente (pin invalid). |
| `iswc-otp` | Emitido al autocompletar el valor vÃ­a Web OTP (autocomplete="one-time-code"). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-pin-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-pin-complete` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-pin-invalid` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |
| `iswc-otp` | `{ code }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-pin-input');
el.addEventListener('iswc-pin-change', (e) => {
  console.log('iswc-pin-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `reset()` | MÃ©todo pÃºblico declarado. |
| `focus()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `cells` | Personalizable con `::part(cells)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--cell-size` | Token leÃ­do o definido por componente. |
| `--gap` | Token leÃ­do o definido por componente. |
| `--bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--danger` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-pin-input> â€” Web Component (vanilla, zero dependencies).
> Casillas para OTP / PIN de 4 a 6 dÃ­gitos. Auto-avance al escribir, Backspace
> retrocede, pegar distribuye todos los dÃ­gitos, focus automÃ¡tico.
>   <iswc-pin-input length="6" required></iswc-pin-input>
> Atributos
>   length       number  (3-8, default 6)
>   type         number | text   (default 'number')
>   mask         boolean â€” si true, muestra asteriscos.
>   disabled     boolean
>   invalid      boolean
>   placeholder  string â€” carÃ¡cter para casillas vacÃ­as.
>   autocomplete one-time-code | numeric
> Slots
>   (default)  â€” hijos ignorados (este componente es self-contained).
> Eventos
>   iswc-pin-change  detail: { value, index }
>   iswc-pin-complete detail: { value }
>   iswc-pin-invalid detail: { value }
> API
>   .value         string
>   .reset()       void
>   .focus()       void
>
> Web OTP: con `autocomplete` `one-time-code` (default) rellena las casillas y emite `iswc-otp`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/web-otp.js`](../_shared/web-otp.js)

Tags del mÃ³dulo: `<iswc-pin-input>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-pin-input length="6"></iswc-pin-input>
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

- [JavaScript](./pin-input.ts)
- [CSS](./pin-input.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./pin-input.json)
