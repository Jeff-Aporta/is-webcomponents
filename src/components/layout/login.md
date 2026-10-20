---
tag: iswc-login
tags:
  - iswc-login
category: layout
status: public
source: ./login.ts
style: ./login.css
preview: ./login.json
---
# `<iswc-login>`

## Propósito

Puerta de acceso reutilizable para cualquier app del kit. Resuelve de una sola pieza el
inicio de sesión **single** y **multi-cuenta**, el **cambio de contraseña**, el **cierre global
de sesiones** y la **auditoría visible** (IP, dispositivo, SO, navegador y último acceso por sesión).

No valida credenciales ni habla con la API: emite eventos y deja que el host decida. Así el mismo
componente sirve para DER, para un IdP propio o para una demo.

Este módulo registra `<iswc-login>`.

## Cuándo usarlo

- Login de una app iswc con uno o varios proveedores.
- Selector de cuentas simultáneas (paridad con el cambio de cuenta de Facebook/Instagram).
- Panel de seguridad de la cuenta: cambiar contraseña y revisar/cerrar sesiones activas.

## Cuándo no usarlo

- Para un formulario de registro completo: componer `<iswc-form>` con los campos.
- Para autenticación embebida en un iframe de terceros: no hay soporte de postMessage.
- No dupliques validación de credenciales aquí: pertenece al server.

## Importación

```js
import './login.js';
```

## Ejemplo mínimo

```html
<iswc-login
  heading="Iniciar sesión"
  provider="ContaPyme"
  show-password
  allow-logout-all
></iswc-login>

<script type="module">
  const el = document.querySelector('iswc-login');
  el.addEventListener('iswc-login-submit', async (e) => {
    el.busy = true;
    const { username, password, remember } = e.detail;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuario: username, password, remember }),
      });
      if (!res.ok) throw new Error('Credenciales inválidas');
    } catch (err) {
      el.setAttribute('error', err.message);
    } finally {
      el.busy = false;
    }
  });
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `mode` | `single` \| `multi` | Default `single`. En `multi` aparece el selector de cuentas. |
| `provider` | string | Nombre del proveedor por defecto. |
| `providers` | JSON | `[{ id, name }]`; si hay más de uno se muestra `<iswc-select>`. |
| `heading` | string | Título del panel. |
| `subtitle` | string | Texto secundario. |
| `selected` | string | Id de la cuenta activa (reflejado). |
| `remember` | boolean | Estado inicial de "Recordar". |
| `busy` | boolean | Bloquea el submit y muestra "Entrando…". |
| `disabled` | boolean | Deshabilita los controles. |
| `error` | string | Mensaje en `<iswc-callout color="danger">`. |
| `notice` | string | Mensaje en `<iswc-callout color="brand">`. |
| `show-password` | boolean | Muestra "Cambiar contraseña". |
| `allow-logout-all` | boolean | Muestra "Cerrar en todos los dispositivos". |
| `allow-add-account` | boolean | Muestra "Añadir cuenta" en modo multi. |
| `compact` | boolean | Sin cabecera, pie, "¿Olvidaste…?" ni marco: para incrustarlo en otro contenedor (lo usa `<iswc-login-dropdown>`). |
| `password-toggle` | boolean | Botón para mostrar/ocultar la contraseña. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `accounts` | lectura/escritura | `LoginAccount[]` = `{ id, name?, email?, avatar?, provider?, lastUsed? }`. |
| `sessions` | lectura/escritura | `LoginSession[]` = `{ id, ip?, device?, os?, browser?, lastAccess?, current? }`. |
| `selected` | lectura/escritura | Atajo de `selected`. |
| `remember` | lectura/escritura | Atajo del atributo. |
| `busy` | lectura/escritura | Atajo del atributo. |
| `mode` | lectura/escritura | Atajo del atributo. |

#### Métodos

| Método | Qué hace |
| --- | --- |
| `openSessions()` / `closeSessions()` | Abre o cierra el diálogo de sesiones. Emite `iswc-sessions-refresh` al abrir. |
| `openPassword()` / `closePassword()` | Abre o cierra el diálogo de cambio de contraseña. |
| `toast(msg, color?)` | Usa el `<iswc-toast>` interno. |
| `focus()` | Enfoca el campo de usuario. |
| `reset()` | Vacía la contraseña y las marcas de error de los campos (conserva el usuario). |

### Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `iswc-login-submit` | `{ username, password, remember, provider }` | Submit válido (botón Entrar o Enter en usuario/contraseña). |
| `iswc-account-select` | `{ account }` | Se elige una cuenta en modo multi. |
| `iswc-add-account` | `{}` | Clic en "Añadir cuenta". |
| `iswc-remove-account` | `{ account }` | Clic en "Quitar". |
| `iswc-logout-all` | `{}` | Clic en "Cerrar en todos los dispositivos". |
| `iswc-password-change` | `{ current, next }` | Guardar en el diálogo de contraseña (valida mínimo 8 y coincidencia). |
| `iswc-sessions-refresh` | `{}` | Abrir el diálogo o pulsar "Actualizar". |
| `iswc-session-revoke` | `{ sessionId }` | Cerrar una sesión concreta. |
| `iswc-remember-change` | `{ remember }` | Cambia la casilla. |
| `iswc-forgot` | `{ username }` | Clic en "¿Olvidaste tu contraseña?". |

### Slots

| Slot | Contenido |
| --- | --- |
| `footer` | Acciones extra al pie del panel. |

### CSS Parts

| Part | Elemento |
| --- | --- |
| `panel` | Tarjeta contenedora |
| `header` / `heading` / `subtitle` | Cabecera |
| `avatar` | Avatar de la cuenta activa |
| `accounts` | Panel de cuentas |
| `form` | Formulario |
| `footer` | Pie |
| `toast` | Contenedor de toasts |

### Custom states

`data-mode="single|multi"` y `data-busy="true|false"` en el host.

## Accesibilidad

- La cabecera usa `h2`; el panel respeta el orden de tabulación natural.
- Las filas de cuenta son `role="button"` con `tabindex="0"` y foco visible.
- Los errores viajan en `<iswc-callout>` (role status del propio componente) y además en `error-text` de cada `<iswc-input>`.
- Los diálogos usan `<iswc-dialog>` (focus-trap, Escape y restauración de foco nativos del kit).
