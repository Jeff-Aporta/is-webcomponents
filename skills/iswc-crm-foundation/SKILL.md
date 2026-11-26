---
name: iswc-crm-foundation
description: >-
  Como ADAPTAR el CRM (api-crm + front-crm sobre DER) a cada TIPO DE EMPRESA (tenant):
  catalogo de tipos de tiquete, campos, flujos, textos, paleta, modulos visibles y seed.
  Usar al montar el CRM en una empresa nueva (restaurante, hotel, clinica, tienda), al
  cambiar lo particular de una empresa ya montada, al dar soporte particular ("esta empresa
  no usa tal cosa", "necesita estos estados") y al decidir si un cambio vive en la capa de
  la empresa o sube al nucleo del producto. No es la skill del estandar de apps (esa es
  iswc-foundation) ni la del catalogo de componentes del kit (esa es iswc-base).
---

# iswc-crm-foundation — el CRM por tipo de empresa

El CRM es **un solo producto multiempresa**. No se fork-ea por cliente: cada empresa (tenant) es una
fila de `crm_empresas` con su catalogo, sus campos, sus flujos, sus textos, su paleta y sus modulos. Esta
skill dice, punto por punto, **que se cambia** y **que no se toca**, con el fichero real donde vive
cada cosa.

Regla de oro: **si el cambio se puede escribir como dato, va en la capa de la empresa** (fila, `jdata`,
seed, catalogo). Solo si cambia el COMPORTAMIENTO del producto se sube al nucleo, y entonces se
prueba con `deno task test:all` en api-crm y en front-crm.

## 1. Cuando usar esta skill

| Situacion | Usar |
| --- | --- |
| Montar el CRM en una empresa nueva (onboarding) | esta skill, seccion 7 + [checklist](references/06-onboarding-checklist.md) |
| Cambiar el catalogo de tipos de tiquete, sus campos o su flujo | [02-catalogo-y-flujos.md](references/02-catalogo-y-flujos.md) |
| Cambiar textos, paleta, marca o modulos visibles de una empresa | [03-ui-textos-paleta-modulos.md](references/03-ui-textos-paleta-modulos.md) |
| Un ejemplo completo por vertical (restaurante, hotel, clinica, tienda) | [04-verticales.md](references/04-verticales.md) |
| Montar el CRM como plugin dentro de OTRA app (script + tag + JSON) | [05-consumo-como-plugin.md](references/05-consumo-como-plugin.md) |
| Crear componentes, vistas, demos o tocar pines del kit | skill `iswc-foundation` |
| Elegir un componente `iswc-*` en vez de reinventarlo | skill `iswc-base` (catalogo) |

## 2. Las tres capas

| Capa | Que es | Quien la cambia | Donde vive |
| --- | --- | --- | --- |
| **Kit iswc** | Los `iswc-*` (botones, campos, dialogos, tablas, toasts, iconos), tokens y paletas | Nadie desde el CRM: se actualiza el pin | `is-webcomponents` (CDN con SHA) |
| **Nucleo CRM** | Conversacion multiagente, acceso (usuario/clave y WhatsApp OTP), contactos, panel, errores, salud, legal, tiempo real, adjuntos, IA | El equipo del producto, con `test:all` | `api-crm/` y `front-crm/` |
| **Capa de la empresa** | Catalogo de tipos de tiquete, campos, flujos, textos, paleta, modulos visibles, usuarios/roles, canales, seed | El equipo de soporte, empresa por empresa | Filas de la empresa, `seed.ts`, extensiones propias del API y textos del front |

## 3. Que se cambia (lo particular de cada empresa)

| # | Punto | Donde vive hoy | Como se cambia |
| --- | --- | --- | --- |
| 1 | **Empresa (tenant), canales y roles** | `api-crm/src/seed.ts` (`EMPRESA_BASE`, `empresasDe`, `canalesDe`, `DEMO_USUARIOS`); `crm_empresas.jdata`; `crm_miembros.rol` (`lector`, `auditor`, `agente`, `admin`, `propietario`) | Se da de alta la empresa y sus miembros; lo propio del negocio va en `jdata` (JSON sin esquema fijo). Detalle: [01-modelo-tenant.md](references/01-modelo-tenant.md) |
| 2 | **Catalogo de tipos de tiquete** | `crm_empresas.jdata.catalogo` (o tabla de extension, patron `api-crm/src/extensiones.ts`); entidad generica de DER `tks` si el tablero es el mismo | Se declaran los tipos con su codigo, nombre, campos y flujo. Detalle: [02](references/02-catalogo-y-flujos.md) |
| 3 | **Campos** (por vertical y por tipo) | `catalogo[].campos` en `jdata`; `crm_contactos.jetiquetas` y `jdata` para lo del cliente | Zod del contexto de la empresa en `api-crm/src/schemas.ts` y render en el componente de la vista |
| 4 | **Flujos** (estados, transiciones, cierre, tiempos) | `catalogo[].estados` y `catalogo[].transiciones`; en el nucleo, `bfinalizado` del tiquete (DER `tks`) | Estados como datos de la empresa; quien puede mover cada transicion lo decide el rol |
| 5 | **Textos** | `front-crm/src/js/core/rutas.ts` (titulo/descripcion de cada vista), textos de cada componente en `view/<vista>/components/*.ts`, legal en `view/legal/utils/documentos.ts`, prompt del bot en `api-crm/src/bot.ts` | Se cambian las cadenas; si una empresa necesita otro idioma o otro nombre de modulo, va aqui, no en el kit |
| 6 | **Paleta y marca** | `front-crm/src/js/core/palette.ts` (paleta por canal), tokens `--iswc-*` en `src/styles/_tokens.scss`, marca en `index.html` + `manifest.webmanifest` + `deno.json` -> `iswc.host` | La paleta de canal es del producto; la marca de la empresa es del despliegue. Detalle: [03](references/03-ui-textos-paleta-modulos.md) |
| 7 | **Modulos visibles** | `front-crm/src/js/core/rutas.ts` (`VISTAS`: `enPanel`, `soloAuditor`, `soloEscritura`) | Una empresa que no usa un modulo lo oculta ahi; si el "que se ve" tiene que ser dato por tenant, se mueve a `jdata.modulos` (pendiente) |
| 8 | **Seed y datos de ejemplo** | `api-crm/src/seed.ts` (`sembrarBase`, `sembrarDemo`), `DEMO=1` en `api-crm/main.ts` | El seed base crea empresa, canales, dueno y tablas; el demo crea casos de ejemplo por vertical |
| 9 | **Perfil del negocio (Meta)** | `api-crm/src/perfil-empresa.ts` y `VERTICALES_META` en `api-crm/src/schemas.ts` | Categoria/vertical del numero, about, direccion, sitios: se edita por API, no en codigo |
| 10 | **Legal del SaaS** | `view/legal/utils/documentos.ts` (`VERSION_LEGAL`, `ACTUALIZADO_LEGAL`, `CONTACTO_LEGAL`, `CONTACTO_DATOS`) y `view/legal/components/crm-legal.ts` | Version, fecha y contactos son datos; el texto de cada documento es de la empresa duena del SaaS |

## 4. Que NO se toca (el nucleo)

Estas piezas son del producto y **no se personalizan por empresa**; si un cliente las necesita
distintas, es una decision de producto, no de soporte:

- **Aislamiento por empresa**: cabecera `x-empresa`, `contexto()` del plugin `crm` de DER, `crm_miembros` y todas las rutas de `api-crm/src/rutas.ts`. Tocar esto rompe la separacion entre clientes.
- **Acceso**: `api-crm/src/acceso.ts`, OTP por WhatsApp, bloqueo por intentos (`penalizacion.ts`), sesion y token.
- **Conversacion**: bandeja, mensajes, adjuntos, multimedia, tiempo real (`ws.ts`), presentador, citas, grupos, observaciones, modo manual.
- **Contactos y prospectos**: `contactos-auto.ts`, `prospectos.ts`, perfiles y marcas de prueba.
- **Panel, busqueda y resumenes**: `metricas.ts`, `rutas-metricas.ts`, `busqueda.ts`, `resumenes.ts`, `embeddings.ts`.
- **Salud y errores**: `monitor.ts`, `errores` (DER) y los componentes `crm-salud` / `crm-errores`.
- **Plomeria del front**: `src/js/kit-tags.ts` (registro unico de tags), `src/js/base/`, `src/utils/build.ts`, el loader/plugin (`crmLoader.min.mjs`, `plugin.json`), `src/vendor/` y los pines del kit.
- **DER**: `03-plugins/{identity,permissions,atencion,canal,mensajes,archivos,notificaciones,reacciones,calificaciones,embeddings,errores}`. Se consumen por CDN con SHA; no se copian ni se editan desde el CRM.
- **Contratos del ecosistema**: `iswc-plugin/v1`, un SHA de 40 hex en toda la app, `?v=` por contenido, cero `@main`.

Si un cambio toca esta lista, se sube al nucleo con su spec WHAT y su prueba, y **todas las
empresas** se benefician (o se rompen) a la vez: por eso no se hace por cliente.

## 5. TIQUETES: el centro de la capa empresa

Un **tipo de tiquete** es la unidad que cambia entre empresas: un pedido (restaurante), una reserva
de habitacion (hotel), una cita (clinica), una entrega (tienda). Todos comparten la misma forma;
cambian los DATOS (campos, estados, textos, tiempos), no el codigo.

| Tipo de empresa | Su tiquete | Lo que lo define |
| --- | --- | --- |
| Restaurante | **pedido** (producto, cantidad, direccion, hora prometida) | flujo RECIBIDO -> EN_COCINA -> EN_RUTA -> ENTREGADO, con SLA por estado |
| Hotel | **reserva de habitacion** (habitacion, noches, personas, tarifa) | flujo CONSULTA -> PRE_RESERVA -> CONFIRMADA -> EN_CASA -> CHECK_OUT, con regla de no doble reserva |
| Clinica | **cita** (profesional, fecha, hora, sede) | flujo SOLICITADA -> CONFIRMADA -> ATENDIDA / NO_ASISTIO, sin historia clinica |
| Tienda | **entrega** (guia, transportadora, franja, direccion) | flujo ALISTAMIENTO -> DESPACHADA -> EN_REPARTO -> ENTREGADA / DEVUELTA |

Como se adapta cada uno (catalogo completo, campos, flujos, textos y seed) esta en
[04-verticales.md](references/04-verticales.md). La forma del objeto y donde se valida, en
[02-catalogo-y-flujos.md](references/02-catalogo-y-flujos.md). Lo que todavia no existe en el codigo va marcado
como **(PENDIENTE)** y no se presenta como hecho.

La forma del tiquete:

```json
{
  "codigo": "pedido",
  "nombre": "Pedido",
  "titulo": "Pedido de {cliente}",
  "campos": [
    { "id": "producto", "etiqueta": "Producto", "tipo": "texto", "obligatorio": true },
    { "id": "cantidad", "etiqueta": "Cantidad", "tipo": "entero", "min": 1 },
    { "id": "direccion", "etiqueta": "Direccion de entrega", "tipo": "texto", "largo": 200 },
    { "id": "hora", "etiqueta": "Hora prometida", "tipo": "hora" }
  ],
  "estados": [
    { "id": "RECIBIDO", "nombre": "Recibido", "color": "info" },
    { "id": "EN_COCINA", "nombre": "En cocina", "color": "warning" },
    { "id": "EN_RUTA", "nombre": "En ruta", "color": "brand" },
    { "id": "ENTREGADO", "nombre": "Entregado", "color": "success", "cierra": true }
  ],
  "transiciones": [
    { "de": "RECIBIDO", "a": "EN_COCINA", "roles": ["agente", "admin"] },
    { "de": "EN_COCINA", "a": "EN_RUTA", "roles": ["agente", "admin"] },
    { "de": "EN_RUTA", "a": "ENTREGADO", "roles": ["agente", "admin", "propietario"] }
  ],
  "textos": { "creado": "Pedido recibido", "cerrado": "Pedido entregado" },
  "slaMinutos": { "EN_COCINA": 20, "EN_RUTA": 40 }
}
```

- Ese objeto es **dato de la empresa** (`crm_empresas.jdata.catalogo`); el codigo que lo lee, lo valida
  (Zod) y lo pinta es del nucleo.
- La entidad generica de DER `tks` (`tks_tks`: `requerimiento`, `proposito`, `jtodo`, `estado`,
  `bfinalizado`, `jasignados`) es el tablero comun: si el flujo de la empresa cabe en ella, se usa
  tal cual y solo se le cambia el catalogo; si necesita tablas propias, se hace una extension como
  `api-crm/src/extensiones.ts` (tablas `crm_*` sin CRUD publicado, siempre con `iempresa`).
- **Estado hoy (importante, no vender humo)**: la entidad generica `tks` ya existe en DER
  (`03-plugins/tks`) y el catalogo es la forma acordada para la capa de la empresa, pero el cableado en
  el CRM todavia no esta, asi que va marcado como **(PENDIENTE)** en toda esta skill:

  | (PENDIENTE) | Que falta | Donde se resuelve |
  | --- | --- | --- |
  | Catalogo en la empresa | leer `crm_empresas.jdata.catalogo` y validarlo con Zod | `api-crm/src/schemas.ts` |
  | Tablero de tiquetes | vista + componente `crm-tiquetes` (4 archivos), tag en `kit-tags.ts`, demo | `front-crm/view/<vista>/` |
  | Tiquete desde el chat | que el bot lo proponga al cerrar la conversacion y el equipo lo confirme | `api-crm/src/ia.ts`, `bot.ts` |
  | Modulos por tenant | mover los modulos visibles de codigo a `jdata.modulos` | `front-crm/src/js/core/rutas.ts` |

  Mientras esten pendientes, el catalogo se documenta y la configuracion se deja lista (`jdata`), y el
  codigo que falta se trata como producto (spec WHAT + prueba + gate), nunca como un parche por empresa.
- Reglas: un tipo de tiquete NUNCA cambia el esquema de las tablas del nucleo; los campos variables
  van en el JSON (`jdatos`) validados por el Zod del tipo; y todo tiquete lleva `iempresa`.

## 6. Verticales

Cada vertical es una **configuracion completa**, no un fork: catalogo, campos, flujo, textos, paleta,
modulos visibles, roles y seed. Los cuatro ejemplos completos (restaurante con pedidos, hotel con
reservas de habitaciones, clinica con citas, tienda con entregas) estan en
[04-verticales.md](references/04-verticales.md).

## 7. Montar el CRM en una empresa nueva (resumen)

1. **Tenant**: alta de la empresa (codigo, nombre, NIT) y su `jdata` con el catalogo y los modulos.
2. **Canales**: WhatsApp/Telegram de la empresa (`canalesDe`), modo del bot (`auto` o `entrenamiento`) y perfil del negocio.
3. **Usuarios y roles**: propietario, admin, agentes, auditor/lector segun el contrato de soporte.
4. **Catalogo**: tipos de tiquete del vertical con campos y flujo (seccion 5).
5. **Textos y marca**: nombres de los modulos, mensajes, paleta, titulo e icono.
6. **Modulos visibles**: que vistas entran al riel para esa empresa.
7. **Seed**: datos de ejemplo del vertical (`DEMO=1` solo en pruebas) y seed base para produccion.
8. **Verificacion**: [checklist](references/06-onboarding-checklist.md) + `deno task test:all` en api-crm y front-crm.

La lista de verificacion detallada, con el criterio de "esta listo", esta en
[references/06-onboarding-checklist.md](references/06-onboarding-checklist.md).

## 8. Consumo como plugin del kit (para montar el CRM dentro de otra app)

El front del CRM publica su contrato `iswc-plugin/v1` en `front-crm/dist/cdn/plugin.json`
(manifiesto con `tags`, `deps`, `version` y `vistas`) y su registrador
`crmLoader.min.mjs`. Cualquier app que cargue el loader del kit puede montar los `crm-*` sin
copiar codigo. Como se hace (script + tag + JSON), con un ejemplo minimo real y las limitaciones de
un repo privado, esta en [05-consumo-como-plugin.md](references/05-consumo-como-plugin.md).

## 9. Verificacion (hecho = ...)

- `deno task test:all` en `api-crm` y en `front-crm` en verde.
- `deno task check` (typecheck) sin errores nuevos.
- El catalogo de la empresa cabe en el contrato de la seccion 5 y toda fila de tiquete lleva `iempresa`.
- Ningun fichero de la lista "que NO se toca" aparece en el diff del montaje.
- El gate del kit (`deno task typecheck` y `deno task test`) sigue igual que antes.

## 10. Mapa de referencias

| Tema | Referencia |
| --- | --- |
| Tenant, canales, usuarios, roles, aislamiento, datos por empresa | [01-modelo-tenant.md](references/01-modelo-tenant.md) |
| Catalogo de tipos de tiquete, campos, flujos y la entidad `tks` de DER | [02-catalogo-y-flujos.md](references/02-catalogo-y-flujos.md) |
| Textos, paleta, marca y modulos visibles | [03-ui-textos-paleta-modulos.md](references/03-ui-textos-paleta-modulos.md) |
| Un ejemplo completo por vertical: restaurante, hotel, clinica, tienda | [04-verticales.md](references/04-verticales.md) |
| Consumo del CRM como plugin del kit desde una app externa | [05-consumo-como-plugin.md](references/05-consumo-como-plugin.md) |
| Lista de verificacion de un onboarding nuevo | [06-onboarding-checklist.md](references/06-onboarding-checklist.md) |

Las reglas de este repositorio (componentes de 4 archivos, registro unico de tags, pines, gates)
siguen siendo las de la skill `iswc-foundation`: esta skill solo anade la capa "por empresa".
