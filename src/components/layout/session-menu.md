---
tag: iswc-session-menu
tags:
  - iswc-session-menu
category: layout
status: public
source: ./session-menu.ts
style: ./session-menu.css
preview: ./session-menu.json
---
# `<iswc-session-menu>`

## Propósito

Sesión del usuario en la barra. Sin sesión muestra `<iswc-login-dropdown>`; con `logged` muestra
avatar + primer nombre y un menú con nombre completo, subtítulo (rol), items propios y "Cerrar
sesión". No conoce backend: emite `iswc-login-submit` e `iswc-logout` y la app decide.
Contrato WHAT: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md) (S-AP17…S-AP19).

## Cuándo usarlo

- En el slot `actions` de `<iswc-app-shell>`.
- Cualquier barra que alterna entre "Entrar" y "usuario conectado".

## Cuándo no usarlo

- Selector de cuentas múltiples: `<iswc-login mode="multi">`.

## Importación

```js
await L.load('iswc-session-menu');
```

Dentro de `<iswc-app-shell>` la paleta de marca se carga sola. Usado sin shell, pide la paleta
(`await L.loadPageStyles(['iswc-palettes-default'])`) o los botones quedan en la base neutra.
Iconos locales (sin api.iconify.design): ver `app-shell.md` → «Iconos sin depender de api.iconify.design».

## Ejemplo mínimo

```html
<iswc-session-menu id="sesion" slot="actions">
  <iswc-dropdown-item value="perfil">Mi perfil</iswc-dropdown-item>
</iswc-session-menu>
<script type="module">
  sesion.addEventListener('iswc-login-submit', async (e) => {
    sesion.loading = true;
    try {
      const u = await miApi.login(e.detail);
      sesion.logged = true;
      sesion.setAttribute('name', u.nombre);
      sesion.setAttribute('subtitle', u.rol);
    } catch (err) { sesion.error = err.message; }
    finally { sesion.loading = false; }
  });
  sesion.addEventListener('iswc-logout', () => { miApi.logout(); sesion.logged = false; });
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `logged` | boolean | Hay sesión. |
| `name` | string | Nombre completo (el disparador muestra el primer nombre; se oculta < 52rem). |
| `subtitle` | string | Línea secundaria del perfil (rol, empresa, correo…). |
| `avatar` | string | URL de la imagen; sin ella, iniciales de `name`. |
| `placement` | placement | Del menú de sesión (default `bottom-end`). |
| `logout-label` | string | Default "Cerrar sesión". |
| `label`, `heading`, `modes`, `remember` | — | Se pasan a `<iswc-login-dropdown>`. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `logged` | boolean | Atajo del atributo. |
| `error`, `loading`, `choices` | — | Del `<iswc-login-dropdown>` interno. |

### Slots

| Slot | Contenido |
| --- | --- |
| (default) | `<iswc-dropdown-item>` propios, entre el perfil y "Cerrar sesión". Solo con `logged`. |

### Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `iswc-login-submit` | ver `<iswc-login-dropdown>` | Envío del acceso (sin sesión). |
| `iswc-logout` | `{}` | Clic en "Cerrar sesión". |
| `iswc-select` | `{ item }` | Clic en un item propio. El de salida no se emite como `iswc-select`. |

### Métodos y propiedades públicas

| Método | Qué hace |
| --- | --- |
| `reset()` | `reset()` del acceso. |
| `show()` | Abre lo que la sesión ofrece: sin `logged`, el panel de acceso; con `logged`, el menú de sesión. |
| `hide()` | Cierra el acceso o el menú, el que esté abierto. |

### CSS parts

| Part | Nodo |
| --- | --- |
| `trigger`, `avatar`, `name` | Disparador con sesión. |
| `profile`, `profile-name`, `profile-subtitle` | Bloque de perfil del menú. |
| `logout` | Item "Cerrar sesión". |
| `login` | El `<iswc-login-dropdown>` (sin sesión). |

### Custom states

| State | Cuándo | Uso |
| --- | --- | --- |
| `logged` | Atributo `logged` | `iswc-session-menu:state(logged)` |

### CSS custom properties

| Variable | Default |
| --- | --- |
| `--iswc-session-menu-surface`, `--iswc-session-menu-border` | superficie y borde del menú |
| `--iswc-session-menu-radius`, `--iswc-session-menu-shadow` | radio y sombra |

## Comportamiento

- Los dos estados viven siempre en el shadow; `logged` solo conmuta visibilidad (no recrea iconos).
- Al pasar a `logged` el acceso se reinicia (sin contraseña residual).
- Todo en `em`: el `font-size` del contexto escala el chip y el menú.

## Dependencias y componentes relacionados

`<iswc-login-dropdown>`, `<iswc-dropdown>`, `<iswc-dropdown-item>`, `<iswc-avatar>`,
`<iswc-button>`, `<iswc-divider>`, `<iswc-icon>`. Va en `<iswc-app-shell>`.

## Accesibilidad

El disparador lleva `aria-label="Sesión de <name>"`; el menú hereda de `<iswc-dropdown>` flechas,
Escape y foco. "Cerrar sesión" usa `color="danger"`.

## Ejemplo avanzado

```html
<iswc-session-menu logged name="Ana María Pérez" subtitle="Administradora" avatar="/u/ana.png">
  <iswc-dropdown-item value="perfil"><iswc-icon slot="icon" icon="mdi:account"></iswc-icon>Mi perfil</iswc-dropdown-item>
  <iswc-dropdown-item value="ajustes">Ajustes</iswc-dropdown-item>
</iswc-session-menu>
```

## Errores comunes

- Pintar avatar y menú a mano en la app: usa `name`/`subtitle`/`avatar` y el slot.
- Esperar `iswc-select` del item de salida: es `iswc-logout`.

## Reglas para LLM

- El tag no lee tokens ni JWT: la app pone `logged`, `name` y `subtitle`.
- Items extra = `<iswc-dropdown-item>` en el slot; nada de HTML suelto.
- No acoples roles, "ver como" ni permisos de un backend: van como items propios.

## Fuentes

- `src/components/layout/session-menu.ts`, `session-menu.scss`.
- Spec: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md).
