# 04 — Un ejemplo completo por vertical

Cada vertical de abajo es la **misma app** con otra configuracion: no hay ramas, ni repos por cliente,
ni componentes nuevos.

> **(PENDIENTE)** los catalogos de estos ejemplos son la configuracion OBJETIVO (el contrato de la capa
> empresa). La entidad de tiquetes de DER ya existe, pero el CRM todavia no lee el catalogo ni pinta el
> tablero: al montar una empresa hoy se deja el catalogo escrito y validado, y el cableado se toma como
> producto pendiente (ver [SKILL.md](../SKILL.md#5-tiquetes-el-centro-de-la-capa-empresa)). No se promete al
> cliente lo que aun no esta. Lo que cambia siempre es: catalogo de tipos de tiquete, campos, flujo, textos,
paleta de marca, modulos visibles, roles y seed.

Antes de empezar: [01-modelo-tenant.md](01-modelo-tenant.md) (tenant y roles) y
[02-catalogo-y-flujos.md](02-catalogo-y-flujos.md) (forma del tipo de tiquete).

Resumen comparado:

| | Restaurante | Hotel | Clinica | Tienda |
| --- | --- | --- | --- | --- |
| Tiquete | Pedido | Reserva de habitacion | Cita | Entrega |
| Se dispara por | mensaje de WhatsApp con el pedido | consulta de disponibilidad | solicitud de turno | compra o despacho |
| Dato que manda | producto + direccion + hora | habitacion + noches + personas | profesional + fecha + hora | guia + transportadora + franja |
| Cierre | entregado | check-out | atendida / no asistio | entregada / devuelta |
| Modulo extra que se apaga | `dashboard` si no mide | `errores` si no hay auditor | `errores` | `salud` si no hay soporte |
| Paleta de marca | calida (propia del cliente) | sobria | clinica | comercial |

## 1. Restaurante — pedidos

**Tenant**: `codigo: "pizzeria-aurora"`, nombre comercial, NIT, un canal de WhatsApp y uno de
Telegram; bot en `entrenamiento` las dos primeras semanas.

**Catalogo** (`jdata.catalogo`): un tipo `pedido`.

```json
{
  "codigo": "pedido",
  "nombre": "Pedido",
  "titulo": "Pedido de {cliente}",
  "campos": [
    { "id": "producto", "etiqueta": "Producto", "tipo": "texto", "obligatorio": true },
    { "id": "cantidad", "etiqueta": "Cantidad", "tipo": "entero", "min": 1, "obligatorio": true },
    { "id": "adicionales", "etiqueta": "Adicionales", "tipo": "seleccion", "opciones": ["Queso", "Tocineta", "Ninguno"] },
    { "id": "direccion", "etiqueta": "Direccion de entrega", "tipo": "direccion", "largo": 200, "obligatorio": true },
    { "id": "telefono", "etiqueta": "Telefono", "tipo": "telefono" },
    { "id": "hora", "etiqueta": "Hora prometida", "tipo": "hora" },
    { "id": "pago", "etiqueta": "Forma de pago", "tipo": "seleccion", "opciones": ["Efectivo", "Transferencia", "Contra entrega"] }
  ],
  "estados": [
    { "id": "RECIBIDO", "nombre": "Recibido", "color": "info" },
    { "id": "EN_COCINA", "nombre": "En cocina", "color": "warning" },
    { "id": "EN_RUTA", "nombre": "En ruta", "color": "brand" },
    { "id": "ENTREGADO", "nombre": "Entregado", "color": "success", "cierra": true },
    { "id": "CANCELADO", "nombre": "Cancelado", "color": "danger", "cierra": true }
  ],
  "transiciones": [
    { "de": "RECIBIDO", "a": "EN_COCINA", "roles": ["agente", "admin"] },
    { "de": "RECIBIDO", "a": "CANCELADO", "roles": ["agente", "admin"] },
    { "de": "EN_COCINA", "a": "EN_RUTA", "roles": ["agente", "admin"] },
    { "de": "EN_RUTA", "a": "ENTREGADO", "roles": ["agente", "admin"] }
  ],
  "textos": {
    "creado": "Pedido recibido. Te avisamos cuando salga",
    "EN_COCINA": "Tu pedido esta en cocina",
    "EN_RUTA": "Tu pedido va en camino",
    "ENTREGADO": "Pedido entregado. Gracias",
    "CANCELADO": "Pedido cancelado"
  },
  "slaMinutos": { "EN_COCINA": 20, "EN_RUTA": 40 }
}
```

**Modulos visibles**: `chat` (bandeja), `dashboard` si el cliente mide ventas del dia; `errores` y
`salud` apagados (`enPanel: false`) si el soporte no es parte del contrato.

**Textos**: titulo del riel "Conversaciones" sigue igual; la vista `contactos` se puede rotular
"Clientes" en `rutas.ts` para esta empresa.

**Paleta**: la calida del cliente como `data-palette` propia del despliegue (nueva paleta del kit si
es obligatoria la marca); el canal WhatsApp conserva la suya.

**Roles**: `propietario` (dueno), 2 `agente` (cocina y domicilios), un `admin` de turno.

**Seed** (`DEMO=1`): 3 pedidos en estados distintos y un cliente recurrente con direccion.

## 2. Hotel — reservas de habitaciones

**Tenant**: `codigo: "hotel-marea"`; canales: WhatsApp (recepcion) y Telegram (equipo interno).

**Catalogo**: tipo `reserva`. Necesita columnas de negocio que se consultan mucho (habitacion,
noches), asi que va en una tabla de extension `crm_reservas` con `iempresa`, `itk`, `habitacion`,
`noches`, `personas`, `fhentrada`, `fhsalida` (patron de `extensiones.ts`), y el resto del
catalogo en `jdata`.

```json
{
  "codigo": "reserva",
  "nombre": "Reserva de habitacion",
  "titulo": "Reserva {habitacion} de {cliente}",
  "campos": [
    { "id": "habitacion", "etiqueta": "Habitacion", "tipo": "seleccion", "opciones": ["101", "102", "201", "202", "Suite"], "obligatorio": true },
    { "id": "personas", "etiqueta": "Personas", "tipo": "entero", "min": 1, "max": 6, "obligatorio": true },
    { "id": "fhentrada", "etiqueta": "Entrada", "tipo": "fecha", "obligatorio": true },
    { "id": "fhsalida", "etiqueta": "Salida", "tipo": "fecha", "obligatorio": true },
    { "id": "noches", "etiqueta": "Noches", "tipo": "entero", "min": 1 },
    { "id": "tarifa", "etiqueta": "Tarifa por noche", "tipo": "moneda" },
    { "id": "notas", "etiqueta": "Peticiones especiales", "tipo": "textoLargo" }
  ],
  "estados": [
    { "id": "CONSULTA", "nombre": "Consulta", "color": "info" },
    { "id": "PRE_RESERVA", "nombre": "Pre-reserva", "color": "warning" },
    { "id": "CONFIRMADA", "nombre": "Confirmada", "color": "brand" },
    { "id": "EN_CASA", "nombre": "En casa (check-in)", "color": "success" },
    { "id": "CHECK_OUT", "nombre": "Check-out", "color": "neutral", "cierra": true },
    { "id": "CANCELADA", "nombre": "Cancelada", "color": "danger", "cierra": true },
    { "id": "NO_SHOW", "nombre": "No se presento", "color": "danger", "cierra": true }
  ],
  "transiciones": [
    { "de": "CONSULTA", "a": "PRE_RESERVA", "roles": ["agente", "admin"] },
    { "de": "PRE_RESERVA", "a": "CONFIRMADA", "roles": ["agente", "admin"] },
    { "de": "PRE_RESERVA", "a": "CANCELADA", "roles": ["agente", "admin"] },
    { "de": "CONFIRMADA", "a": "EN_CASA", "roles": ["agente", "admin"] },
    { "de": "CONFIRMADA", "a": "NO_SHOW", "roles": ["admin", "propietario"] },
    { "de": "EN_CASA", "a": "CHECK_OUT", "roles": ["agente", "admin"] }
  ],
  "textos": {
    "creado": "Recibimos tu consulta; te confirmamos disponibilidad",
    "CONFIRMADA": "Reserva confirmada para {fhentrada}",
    "EN_CASA": "Bienvenido, tu habitacion esta lista",
    "CHECK_OUT": "Gracias por tu visita",
    "NO_SHOW": "No tuvimos tu llegada; la reserva se libero"
  },
  "slaMinutos": { "CONSULTA": 30, "PRE_RESERVA": 720 }
}
```

**Modulos visibles**: `chat`, `contactos` (huespedes), `dashboard` (ocupacion y consultas). Sin
`errores` si no hay auditor.

**Roles**: `propietario`, `admin` (jefe de recepcion), `agente` por turno, `lector` para el
contador.

**Regla de negocio propia**: no hay dos reservas activas para la misma habitacion y rango de fechas: se
valida en la ruta del API (nucleo de la extension), no en el front.

**Seed**: habitaciones del hotel, 2 reservas confirmadas y 1 consulta sin responder.

## 3. Clinica — citas

**Tenant**: `codigo: "clinica-santa-fe"`; un WhatsApp por sede si hay varias sedes (un canal por
sede, todos de la misma empresa).

**Catalogo**: tipo `cita` (ver el objeto completo en
[02-catalogo-y-flujos.md](02-catalogo-y-flujos.md#6-ejemplo-minimo-clinica--el-objeto-completo)).

**Modulos visibles**: `chat`, `contactos` (pacientes), `dashboard` (citas y asistencia), `errores`
solo si la clinica contrata soporte.

**Roles**: `propietario` (direccion medica), `admin` (coordinacion), `agente` (recepcion),
`auditor` (auditoria de calidad), `lector` (convenios).

**Datos sensibles**: el CRM no guarda historia clinica. La cita guarda lo minimo (profesional, fecha,
motivo general). La historia clinica es de otro sistema: si el cliente la pide, es un proyecto aparte,
nunca un campo mas en el catalogo.

**Textos**: "cita" siempre, nunca "pedido"; el mensaje de confirmacion incluye fecha, hora y sede.

**Seed**: 2 profesionales, 3 citas (solicitada, confirmada, atendida).

## 4. Tienda — entregas

**Tenant**: `codigo: "tienda-norte"`; WhatsApp de ventas y Telegram del equipo de despacho.

**Catalogo**: tipo `entrega` con los datos del envio; el pedido comercial vive en el sistema de
facturacion del cliente y aqui solo se sigue la entrega.

```json
{
  "codigo": "entrega",
  "nombre": "Entrega",
  "titulo": "Entrega {guia} de {cliente}",
  "campos": [
    { "id": "guia", "etiqueta": "Numero de guia", "tipo": "texto", "patron": "^[A-Z0-9-]{6,20}$", "obligatorio": true },
    { "id": "transportadora", "etiqueta": "Transportadora", "tipo": "seleccion", "opciones": ["Propia", "Servientrega", "Envia", "Interrapidisimo"], "obligatorio": true },
    { "id": "franja", "etiqueta": "Franja de entrega", "tipo": "seleccion", "opciones": ["Manana", "Tarde", "Noche"] },
    { "id": "direccion", "etiqueta": "Direccion", "tipo": "direccion", "obligatorio": true },
    { "id": "referencia", "etiqueta": "Punto de referencia", "tipo": "textoLargo" },
    { "id": "novedad", "etiqueta": "Novedad", "tipo": "seleccion", "opciones": ["Ninguna", "Direccion errada", "Nadie recibe", "Reagendada"] }
  ],
  "estados": [
    { "id": "ALISTAMIENTO", "nombre": "En alistamiento", "color": "info" },
    { "id": "DESPACHADA", "nombre": "Despachada", "color": "brand" },
    { "id": "EN_REPARTO", "nombre": "En reparto", "color": "warning" },
    { "id": "ENTREGADA", "nombre": "Entregada", "color": "success", "cierra": true },
    { "id": "DEVUELTA", "nombre": "Devuelta", "color": "danger", "cierra": true }
  ],
  "transiciones": [
    { "de": "ALISTAMIENTO", "a": "DESPACHADA", "roles": ["agente", "admin"] },
    { "de": "DESPACHADA", "a": "EN_REPARTO", "roles": ["agente", "admin"] },
    { "de": "EN_REPARTO", "a": "ENTREGADA", "roles": ["agente", "admin"] },
    { "de": "EN_REPARTO", "a": "DEVUELTA", "roles": ["admin", "propietario"] }
  ],
  "textos": {
    "creado": "Tu pedido esta en alistamiento",
    "DESPACHADA": "Tu pedido salio del almacen",
    "EN_REPARTO": "Tu pedido va en reparto",
    "ENTREGADA": "Entregado. Gracias por comprar",
    "DEVUELTA": "No pudimos entregar; te escribimos para reagendar"
  },
  "slaMinutos": { "ALISTAMIENTO": 240, "EN_REPARTO": 480 }
}
```

**Modulos visibles**: `chat`, `contactos` (compradores), `dashboard` (entregas y novedades). `salud`
solo si el cliente contrata monitoreo.

**Roles**: `propietario`, `admin` (jefe de despacho), `agente` (reparto y atencion).

**Seed**: 4 entregas (una por estado), 2 con novedad.

## 5. Lo que comparten los cuatro montajes

- El mismo nucleo, el mismo kit, el mismo gate. Ninguna vertical agrega componentes `iswc-*`.
- El catalogo va en `jdata`; los campos y el flujo son datos; los textos por empresa son datos.
- Lo unico que puede necesitar codigo nuevo es una **tabla de extension** (patron `extensiones.ts`) o una
  **regla de negocio** en la ruta (ej. no doble reserva). Eso se trata como producto: spec + prueba.
- La lista de verificacion de [06-onboarding-checklist.md](06-onboarding-checklist.md) se corre entera
  en cada vertical antes de decir "montado".