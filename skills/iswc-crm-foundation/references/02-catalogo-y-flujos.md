# 02 — Catalogo de tipos de tiquete, campos y flujos

El **tipo de tiquete** es lo que la empresa cambia de verdad: un pedido no es una reserva ni una
cita, pero los tres son tiquetes con la misma forma. El nucleo no sabe de verticales: sabe leer un
catalogo y obedecerlo.

## 1. Donde vive el catalogo

| Nivel | Donde | Que define |
| --- | --- | --- |
| Comun del ecosistema | Entidad `tks` de DER (`03-plugins/tks`: `tks_tks`) | La tabla del tiquete: `requerimiento`, `proposito`, `jtodo`, `estado`, `bfinalizado`, `fhcre`, `iusuario`, `jasignados` |
| De la empresa | `crm_empresas.jdata.catalogo` | Que tipos existen, sus campos, sus estados, sus transiciones, sus textos y sus tiempos |
| De la vertical (extension) | Tablas `crm_*` en `api-crm/src/extensiones.ts` | Solo si el tiquete necesita columnas propias que no caben en `jtodo` o en el JSON del tipo |

**(PENDIENTE)** hoy el unico nivel que ya existe en codigo es la entidad `tks` de DER; leer el
catalogo de `jdata` y pintar el tablero en el front esta pendiente (ver la tabla de pendientes de la
[SKILL.md](../SKILL.md#5-tiquetes-el-centro-de-la-capa-empresa)). El objeto de abajo es el contrato que se
implementa, no una funcionalidad terminada.

Orden de preferencia al montar una empresa:

1. **Cabe en `tks` + catalogo en `jdata`** -> eso es lo normal (restaurante, clinica, tienda).
2. **Necesita una tabla propia** (ej. reserva con habitacion y noches que se consultan mucho) -> tabla
   de extension con `iempresa`, `itk` y las columnas de negocio, siguiendo el patron de
   `extensiones.ts` (`exposed: false`, `security: true`, rutas en `rutas.ts`).
3. **Necesita otro tablero** (no es un tiquete) -> es producto nuevo: spec WHAT + pruebas + decision,
   no un cambio de empresa.

## 2. La forma del tipo de tiquete

Campos obligatorios de cada tipo del catalogo:

| Campo | Tipo | Para que |
| --- | --- | --- |
| `codigo` | texto, unico en la empresa, sin espacios | identificador estable (`pedido`, `reserva`, `cita`, `entrega`) |
| `nombre` | texto | como se llama en la interfaz ("Pedido", "Reserva de habitacion") |
| `titulo` | plantilla | linea de la tarjeta/lista (`Pedido de {cliente}`) |
| `campos` | lista | los datos del tiquete de ese tipo (seccion 3) |
| `estados` | lista | las columnas del flujo, la primera es el estado inicial |
| `transiciones` | lista | `de` -> `a` y quien puede hacerlo |
| `textos` | objeto | mensajes al crear, mover y cerrar |
| `slaMinutos` | objeto estado -> minutos | cuando se avisa que un tiquete se esta venciendo |
| `cierra` | booleano por estado | que estados cuentan como cerrado (`bfinalizado`) |

## 3. Campos: tipos permitidos y validacion

Tipos de campo base (los mismos en todas las verticales): `texto`, `textoLargo`, `entero`,
`decimal`, `fecha`, `hora`, `fechaHora`, `seleccion` (con `opciones`), `booleano`,
`moneda`, `telefono`, `direccion`, `referencia` (a un contacto o a otro tiquete).

Reglas:

- El campo lleva `id` (clave en el JSON del tiquete), `etiqueta`, `tipo`, `obligatorio` y las
  restricciones de su tipo (`min`, `max`, `largo`, `opciones`, `patron`).
- La validacion es **Zod del nucleo sobre el catalogo**, no el front: el front pinta lo que el catalogo
  dice, pero el API revalida (`api-crm/src/schemas.ts`). Un campo no declarado se rechaza.
- Los valores viven en el JSON del tiquete (`jtodo` o `jdatos`), nunca como columnas nuevas del
  nucleo.
- Los campos que la empresa necesita en el CONTACTO (no en el tiquete) van en `crm_contactos.jetiquetas`
  o en el `jdata` del contacto.

## 4. Flujos: estados, transiciones y cierre

- `estados[]`: `{ id, nombre, color, cierra? }`. `color` usa los colores del kit
  (`info`, `brand`, `success`, `warning`, `danger`, `neutral`) para que la interfaz no
  invente tokens.
- `transiciones[]`: `{ de, a, roles }`. Si una transicion no esta declarada, el API la rechaza
  aunque el usuario sea propietario: el flujo es del negocio, no del rol.
- `cierra: true` alimenta `bfinalizado` de `tks`. La configuracion del plugin de tiquetes de DER
  (`ZTksConfig`: `estadosFinalizados`, `permitirFinalizadoManual`) y el catalogo deben decir lo
  mismo; si no, el tiquete "cierra" para el API y sigue abierto en la vista.
- Los tiquetes no se borran: se cierran (`bactivo` es la baja logica).
- Avisos por tiempo (`slaMinutos`) se apoyan en las tareas del ecosistema
  (`declararTareas` en `api-crm/main.ts` y `03-plugins/common/tareas.ts` de DER). No se inventa
  un cron nuevo por empresa.

## 5. Desde donde se crea un tiquete (PENDIENTE el cableado en el CRM)

| Via | Como |
| --- | --- |
| El bot, al cerrar una conversacion | El motor de IA propone y el nucleo crea el tiquete con el tipo del catalogo (`api-crm/src/ia.ts`, `bot.ts`) |
| El equipo, desde el chat | Boton del componente de la vista (`view/chat/components/*.ts`) que manda tipo + campos |
| Otro sistema | Ruta de `api-crm/src/rutas.ts` con `security: true` y la cabecera `x-empresa` |
| Semilla de pruebas | `api-crm/src/seed.ts` (`DEMO=1`) con tiquetes de ejemplo del vertical |

## 6. Ejemplo minimo (clinica) — el objeto completo

```json
{
  "codigo": "cita",
  "nombre": "Cita",
  "titulo": "Cita de {cliente} con {profesional}",
  "campos": [
    { "id": "profesional", "etiqueta": "Profesional", "tipo": "seleccion", "opciones": ["Dra. Rojas", "Dr. Mesa"], "obligatorio": true },
    { "id": "fecha", "etiqueta": "Fecha", "tipo": "fecha", "obligatorio": true },
    { "id": "hora", "etiqueta": "Hora", "tipo": "hora", "obligatorio": true },
    { "id": "motivo", "etiqueta": "Motivo", "tipo": "textoLargo" },
    { "id": "sede", "etiqueta": "Sede", "tipo": "seleccion", "opciones": ["Centro", "Norte"] }
  ],
  "estados": [
    { "id": "SOLICITADA", "nombre": "Solicitada", "color": "info" },
    { "id": "CONFIRMADA", "nombre": "Confirmada", "color": "brand" },
    { "id": "ATENDIDA", "nombre": "Atendida", "color": "success", "cierra": true },
    { "id": "NO_ASISTIO", "nombre": "No asistio", "color": "danger", "cierra": true }
  ],
  "transiciones": [
    { "de": "SOLICITADA", "a": "CONFIRMADA", "roles": ["agente", "admin"] },
    { "de": "CONFIRMADA", "a": "ATENDIDA", "roles": ["agente", "admin"] },
    { "de": "CONFIRMADA", "a": "NO_ASISTIO", "roles": ["agente", "admin"] }
  ],
  "textos": {
    "creado": "Cita solicitada; te confirmamos por este chat",
    "CONFIRMADA": "Cita confirmada para {fecha} a las {hora}",
    "NO_ASISTIO": "No pudimos atender la cita; escribe para reagendar"
  },
  "slaMinutos": { "SOLICITADA": 120 }
}
```

Los otros tres verticales (restaurante, hotel, tienda) estan completos en
[04-verticales.md](04-verticales.md).