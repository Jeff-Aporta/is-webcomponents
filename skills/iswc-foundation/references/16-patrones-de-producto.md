# 16 — Patrones de producto (lo que el CRM enseño al kit)

Referencia de la skill [`iswc-foundation`](../SKILL.md). No es doctrina del kit: son **patrones de UI que ya existen
en una app real** (el CRM del estudio, `Jeff-Aporta/crm`) y que se repiten en cualquier app de producto. Cada uno
tiene su componente de referencia para copiar la forma, no para reinventarla.

> Cuando el kit absorba uno de estos patrones como componente `iswc-*`, esta referencia se reemplaza por el md del
> componente. Mientras tanto, se copia el patrón **con los tokens y los helpers del kit**.

## 1. Adjuntar NUNCA envia (tira de pendientes encima del campo)

El error clasico: elegir un archivo lo manda de una. El patron: lo elegido entra a una **tira de pendientes ENCIMA
del textarea** (miniatura/nombre, tamano, estado de subida, X para quitarlo), se sube en paralelo mientras se sigue
escribiendo y **el mensaje sale solo al pulsar Enviar**.

- Referencia: `front-crm/view/chat/components/crm-chat-compositor.ts` (tipo `Pendiente`) y `crm-chat-adjuntos.ts`
  (pegar/arrastrar **solo anuncian** con un evento; no suben ni envian).
- Claves: un `id` local por pendiente, `estado: 'subiendo'|'listo'|'error'`, la `url` local (objectURL) liberada al
  quitar, y no perder la tira en los repintados (`parcial()`).
- Si el chat se cierra con pendientes, **avisar** de que se pierden (ya subidos, no enviados).

## 2. La cita vive ENCIMA del textarea

Responder citando sin ensuciar el campo: un bloque de cita arriba (autor + resumen + X) y el compositor manda el
`ireply`. La cita la pinta la burbuja del mensaje destino, no el campo.

- Referencia: `crm-chat-compositor` (`props.cita` → `div.cita`) + `crm-chat-mensaje` (`props.citado`).
- Evento de ida (`crm-chat-citar`) en la burbuja y de vuelta (`crm-chat-cita-quitada`) en el compositor.

## 3. Acciones de fila al HOVER (y siempre visibles en tacto)

Las acciones secundarias de una burbuja o fila no gastan espacio: aparecen al pasar el raton. **Pero** en tacto no hay
hover, asi que la accion importante (reportar la respuesta del bot) se queda **siempre visible**.

```scss
.burbuja .acciones { opacity: 0; transition: opacity .12s; }
.burbuja:hover .acciones,
.burbuja:focus-within .acciones { opacity: 1; }
@media (hover: none) { .burbuja .acciones { opacity: 1; } }   /* tacto: siempre */
```

- Referencia: `crm-chat-mensaje.scss` (y el comentario del boton «Reportar», que no se esconde).

## 4. Presentador de adjuntos (lightbox accesible por tipo)

Un solo componente que abre cualquier adjunto a pantalla completa y **decide por tipo**: imagen (zoom, girar,
arrastrar con zoom), video (controles), audio (reproductor grande + transcripcion al lado) y documento (PDF embebido;
Word/Excel/ZIP no se intentan pintar: abrir en pestaña o descargar, con aviso de la app).

- Reglas: `role="dialog"` + `aria-modal`, Escape cierra, flechas navegan, foco atrapado mientras esta abierto y
  **devuelto al origen** al cerrar; `preload="metadata"` para no bajar el video entero; en movil se prefiere
  descargar y abrir con la app del sistema.
- Referencia: `front-crm/view/chat/components/crm-chat-presentador.ts`.

## 5. Asas de split (columnas con ancho recordado)

Tres columnas de verdad (lista | conversacion | detalle) con **asa arrastrable** entre la lista y la conversacion, y
otra para el panel de detalle cuando se abre como columna. El ancho vive en una **variable CSS** del contenedor y se
recuerda en `localStorage`; el asa respeta minimos de cada columna y se reajusta al cambiar de tamaño.

```ts
// utils/split.ts del CRM: crearDivisor({ contenedor, columna, variable: '--ancho-bandeja',
//   min, max, minLibre, reserva, clave, clase, etiqueta }) → { reajustar(), destruir() }
```

- Referencia: `front-crm/view/chat/utils/split.ts` y su uso en `crm-chat.ts`.
- En pantalla angosta no hay asas: una columna a la vez con «volver».

## 6. El rol del equipo se pinta como etiqueta, nunca pegado al nombre

Quien escribe del equipo lleva su **rol interno en MAYUSCULAS** como `badge` al lado del nombre (ROOT, ADMN, AUDT,
AGNT), con el rol largo en el `title`. El nombre va limpio. Los clientes finales no llevan etiqueta.

- Referencia: `crm-chat-mensaje.ts` (`data-rol`) y `crm-chat-conversacion.ts` (cabecera).

## 7. Grupos/filtros como barra horizontal con desborde

Carpetas de una lista (estilo Telegram): **barra horizontal** que hace scroll si no caben, un boton para abrir la
lista completa y acciones por grupo (crear, renombrar, borrar, marcar global). Los fijos («Todos», «Archivados») no se
borran.

- Referencia: `crm-chat-bandeja.ts` (seccion de grupos) + `GET /api/grupos`.
- Accesibilidad: `role="tablist"`, `aria-pressed`/`data-activo` en cada grupo, contador visible.

## 8. Campana de notificaciones: permiso + centro

Avisar por el navegador **y** guardar lo recibido en un **centro** (aunque no se muestre la notificacion). El panel de
la campana pide permiso, tiene un interruptor por categoria, «marcar leidas» y cada fila abre su destino.

- Referencia: `front-crm/src/js/core/notificaciones.ts` + `src/js/components/crm/crm-app.ts` (campana) + `sw.js`.
- Nunca se promete un aviso que no se puede dar: si el navegador lo bloquea, se dice tal cual.

## 9. «Quien esta viendo esto» (presencia)

La cabecera del detalle puede mostrar **quien mas lo esta viendo ahora** (ojo + numero + nombres). El componente no
inventa la presencia: la recibe por props/WebSocket y la oculta cuando el unico que lo ve es uno mismo, para no meter
ruido.

- Referencia: `crm-chat-conversacion.ts` (`data-presencia`) y el canal en vivo `src/js/core/ws.ts`.

## 10. Historial largo: scroll infinito con tope y boton

Al llegar arriba se cargan paginas anteriores **solas las 3 primeras veces**; a partir de ahi aparece «Cargar mas». El
scroll se mantiene estable al insertar arriba (se mide la distancia al fondo antes y se recoloca) y el sondeo no toca
lo que el usuario esta escribiendo.

- Referencia: `crm-chat-conversacion.ts` (`#alScroll`, `#anteriores`, `parcial`).

## 11. El detalle como tercera columna o cajon

Con ancho hay tres columnas; por debajo del corte el detalle es un **cajon** sobre el contenido y las columnas se
alternan con «volver». Los cortes son `matchMedia` (no media queries escondidas en el SCSS) para que el TS tambien
sepa en que modo esta.

- Referencia: `crm-chat.ts` (`MEDIO_ANGOSTO`, `MEDIO_TRES_COLUMNAS`).

## 12. Partes CSS con nombre estable

Cada componente publica lo que el anfitrion puede reestilar con `part="<nombre>"` (una por bloque principal:
`chat`, `bandeja`, `conversacion`, `compositor`, `burbuja`, `presentador`...). El estilo interno usa tokens
`--iswc-*`, nunca colores a pelo.

## 13. Estados de verdad: vacio, cargando y error

Toda lista tiene sus tres estados visibles y distintos (`iswc-empty-state` con `estado="cargando"`, un mensaje de
vacio que explica que hacer, y el error con su texto del servidor). Nunca una lista vacia sin explicacion.

## Como usar esta referencia

1. Antes de inventar un comportamiento de producto, mira si ya existe en el CRM y copia **la forma**, no el codigo.
2. Si toca crear un componente del kit a partir del patron, eso es otra tarea (`build-component`), con su `.md`,
   `.json` de demo y prueba de contrato.
3. Si el patron cambia en el CRM, actualiza esta referencia (y el INDICE del kit cuando el md se versione:
   `deno task indice`).
