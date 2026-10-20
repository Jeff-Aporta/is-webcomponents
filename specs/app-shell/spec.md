# Spec — Armazón de aplicación (`app-shell`)

> Plantilla: [`../plantillas/spec.template.md`](../plantillas/spec.template.md). Diario: [`../lessons.md`](../lessons.md).

## Contexto

Las apps del ecosistema repetían el mismo armazón: barra superior fija con marca, pestañas y
sesión, y una vista que hace scroll debajo. Cada app lo reescribía acoplado a su backend. Este
dominio fija, sin conocer ningún backend, cuatro tags reutilizables por CDN:
`<iswc-app-shell>`, `<iswc-app-nav>`, `<iswc-login-dropdown>` y `<iswc-session-menu>`.
Todo lo que sea autenticar, guardar tokens o decidir rutas es de la app: los tags solo pintan y
emiten eventos.

## WHAT — comportamiento exigido

### S-AP1 La vista hace scroll; la página no

El shell ocupa exactamente el alto del viewport y el documento no tiene scroll propio. Con
contenido más alto que la vista, quien scrollea es la vista (`::part(main)`) y la barra sigue
visible arriba. Cada hijo de la vista crece para llenar el alto disponible; un hijo con
`height: 100%` llena la vista sin doble barra de scroll. La barra respeta las zonas seguras del
dispositivo (`env(safe-area-inset-*)`) para apps móviles (Capacitor).

### S-AP2 La marca lleva al inicio

Clic (o Enter) en la marca emite `iswc-brand-home { href }`, cancelable. Con `brand-href` la marca
es un enlace real (Ctrl/Cmd/clic medio abren donde el usuario pidió) y `preventDefault()` evita
la navegación; sin `brand-href` es un botón accesible (enfocable, Enter/Espacio). Su nombre
accesible incluye el texto de la marca.

### S-AP3 Responsive de la barra

Por debajo de 40rem, si hay logo, el texto de la marca no se muestra (el nombre accesible se
conserva) y la página no gana scroll horizontal.

### S-AP4 Barra lateral opcional

Contenido en el slot `sidebar` se ve junto a la vista en pantallas anchas. Por debajo de 40rem
deja de ocupar la vista, aparece un botón de menú en la barra y ese botón abre un cajón con el
mismo contenido. Sin contenido en `sidebar` no hay ni columna ni botón.

### S-AP5 Avisos opcionales

Con el atributo `toast` (su valor es el placement), `shell.toast(mensaje, opciones)` muestra el
aviso. Sin el atributo no hay contenedor de avisos.

### S-AP6 Pestañas accesibles

Cada fila de `<iswc-app-nav>` es un `tablist`; cada pestaña es un `tab` con `aria-selected` según
el `value` de su fila. Cada fila tiene una sola parada de Tab (la activa, o la primera visible).
Una pestaña con `hidden` no se ve.

### S-AP7 Teclado (APG, activación manual)

Flechas, Home y End mueven el foco entre las pestañas visibles de la fila (con vuelta) sin
seleccionar. Enter o Espacio seleccionan y emiten `iswc-nav-select { row, id, href }`.

### S-AP8 Selección cancelable

Clic en una pestaña emite `iswc-nav-select`. Si nadie llama `preventDefault()`, la pestaña queda
activa; si alguien lo llama, la selección no cambia (la app decide y reasigna `rows`). Una
pestaña con `href` sigue siendo un enlace para Ctrl/Cmd/clic medio.

### S-AP9 Filas secundarias dependientes

La primera fila es la primaria. Una fila secundaria con `parent` solo se ve cuando la primaria
tiene ese valor; sin `parent` se ve siempre.

### S-AP10 Repintado sin recrear

Reasignar `rows` con la misma estructura (mismos ids, textos, iconos y href) solo actualiza
activo y visibilidad: las pestañas e iconos son los mismos nodos. Así ningún `<iswc-icon>` se
destruye a media descarga (lo que cancelaba su SVG).

### S-AP11 Pestañas en pantalla estrecha

Por debajo de 40rem las pestañas con icono de la fila primaria se muestran solo como icono; su
nombre accesible no cambia.

### S-AP12 Un envío, un evento

Enviar usuario y contraseña desde `<iswc-login-dropdown>` (botón o Enter) emite **un único**
`iswc-login-submit { mode: 'password', username, password, remember, provider }`. El mismo
nombre de evento que `<iswc-login>`.

### S-AP13 Modo token

Con `modes="password token"` hay un selector de modo. En modo token, enviar vacío muestra un
error y no emite; con un token pegado emite `{ mode: 'token', token }` con el token sin espacios.

### S-AP14 Elección entre opciones

Asignar `choices = [{ id, label, icon? }]` (p. ej. empresas de un usuario multi-empresa) muestra
la lista en lugar del formulario. Elegir una opción emite otro `iswc-login-submit` con las
credenciales del envío anterior más `choice`. "Volver" regresa al formulario.

### S-AP15 Carga, error y reinicio

Con `loading` no se reenvía. `error` se muestra visible en el panel. `reset()` deja el acceso como
nuevo: sin error, sin carga, sin opciones, contraseña y token vacíos y el panel cerrado.

### S-AP16 Sin red ni almacenamiento de credenciales

Ninguno de los cuatro tags hace peticiones de datos ni guarda credenciales o tokens: al enviar no
sale ninguna petición (salvo recursos estáticos del kit) y la contraseña no aparece en
`localStorage`, `sessionStorage` ni cookies. `remember` solo viaja como booleano en el evento;
qué hacer con él lo decide la app.

### S-AP17 Sesión cerrada

`<iswc-session-menu>` sin `logged` ofrece el acceso de `<iswc-login-dropdown>`; su
`iswc-login-submit` llega al documento una sola vez. `error`, `loading`, `choices` y `reset()` del
session-menu actúan sobre ese acceso.

### S-AP18 Sesión abierta

Con `logged` se ve el avatar (imagen o iniciales) y el primer nombre; el menú muestra el nombre
completo (`name`), el subtítulo (`subtitle`, p. ej. el rol) y los items propios del slot.

### S-AP19 Salida e items propios

"Cerrar sesión" emite `iswc-logout {}`. Un item propio emite `iswc-select { item }` (el de
`<iswc-dropdown>`); el item de salida no se filtra como `iswc-select`.

### S-AP20 Atributos declarados antes de cargar el kit

Una app puede escribir los atributos en el HTML (`heading`, `error`, `compact`, `logged`, `name`,
`rows`, `brand`, `toast`…) antes de cargar el kit con el loader. Al registrarse los tags no aparece
ningún error en la consola y el estado que piden esos atributos es el que se ve (título, error,
sesión, pestañas, marca), sin que la app tenga que esperar a que el tag esté definido para
ponerlos.

### S-AP21 Espaciado sin tokens de la app

Con solo el kit (sin que la app defina ninguna variable de espaciado), las superficies del kit
tienen espacio interior: el cuerpo de `<iswc-card>` y el panel de `<iswc-login>` no quedan pegados
al borde.

### S-AP22 Color de marca por defecto

Una página con el shell que no eligió paleta muestra los controles de acento (p. ej. el botón
"Entrar") con el color de marca por defecto, no en gris neutro. Si la página ya eligió paleta
(`data-palette` en `<html>`) o define su propio color de marca, el shell no la cambia; con
`no-default-palette` el shell deja la base neutra.

> El WHAT no nombra archivos ni funciones internas: los guardianes entran por los tags publicados.

## HOW — solo si es contrato

**HOW débil:** el login de contraseña reusa `<iswc-login compact>`; el anclaje reusa
`<iswc-dropdown>`; el cajón móvil reusa `<iswc-drawer>`. Los guardianes prueban el bundle
publicado (`dist/cdn`), así que requieren `deno task build` previo.

**HOW fuerte:**

| Pieza | Contrato congelado | Por qué es contrato |
|---|---|---|
| Nombres de tag y eventos | `iswc-app-shell`, `iswc-app-nav`, `iswc-login-dropdown`, `iswc-session-menu`; `iswc-brand-home`, `iswc-nav-select`, `iswc-login-submit`, `iswc-logout` | Las apps los consumen por CDN fijado a SHA |
| Forma de `rows` y `choices` | `{ id, label?, value?, parent?, tabs: [{ id, label, icon?, href?, hidden?, disabled? }] }`, `[{ id, label, icon? }]` | Lo serializan las apps |

## Aceptación

| Caso (WHAT) | Resultado observable | Guardián |
|---|---|---|
| S-AP1…S-AP5 | geometría y eventos del shell | `tests/componentes/app-shell.test.ts` |
| S-AP6…S-AP11 | roles, teclado, eventos y nodos de `<iswc-app-nav>` | `tests/componentes/app-shell.test.ts` |
| S-AP12…S-AP16 | eventos, red y storage de `<iswc-login-dropdown>` | `tests/componentes/app-shell.test.ts` |
| S-AP17…S-AP19 | estados y eventos de `<iswc-session-menu>` | `tests/componentes/app-shell.test.ts` |
| S-AP20…S-AP22 | consola, estado aplicado, padding y color de marca al adoptar el kit por loader | `tests/componentes/app-shell.test.ts` |
