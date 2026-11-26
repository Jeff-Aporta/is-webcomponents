# 01 — El modelo de empresa (tenant)

## 1. Quien es quien

| Concepto | Tabla | Donde se toca |
| --- | --- | --- |
| Empresa (inquilino) | `crm_empresas` (`iempresa`, `codigo`, `nombre`, `nit`, `bactivo`, `jdata`) | Alta de la empresa y su configuracion |
| Miembros y rol por empresa | `crm_miembros` (`iempresa` + `iusuario`, `rol`) | Alta del equipo de la empresa |
| Canales de atencion | `canales` del plugin `atencion` de DER (`iempresa`, `canal`, `icuenta`, `modo`) | Numero de WhatsApp, bot de Telegram, modo del bot |
| Contactos | `crm_contactos` (`iempresa`, `nombre`, `telefono`, `jetiquetas`, ...) | Los carga la conversacion y los edita el equipo |
| Conversaciones | `crm_conversaciones`, `crm_participantes`, `crm_mensajes`, `crm_adjuntos` | Nucleo: no se toca |

Los roles validos son los de DER (`ROLES_CRM` en `03-plugins/crm/schemas.ts`):
`lector`, `auditor`, `agente`, `admin`, `propietario`. El rol es **por empresa**: la misma
persona puede ser `propietario` en una empresa y `agente` en otra.

## 2. Aislamiento: la empresa activa manda

- El front manda la empresa activa en la cabecera **`x-empresa`** (`CABECERA_EMPRESA` en
  `03-plugins/crm/schemas.ts` de DER).
- El API resuelve el contexto con `crm.contexto(iusuario, cabecera)` y **todas** las rutas de
  `api-crm/src/rutas.ts` consultan con ese `iempresa`.
- Con una sola empresa en la cuenta, la cabecera se puede omitir y se deduce; con varias, elegir
  empresa es parte del login (`api-crm/src/acceso.ts`).
- Regla del montaje: **ninguna** consulta nueva puede olvidar el filtro `iempresa`. Es la frontera
  entre clientes y no se negocia por empresa.

## 3. Lo que la empresa puede llevar en jdata

`crm_empresas.jdata` es JSON libre (`json`), asi que es el sitio natural para la configuracion del
tenant sin tocar el nucleo:

```json
{
  "catalogo": [ { "codigo": "pedido", "nombre": "Pedido", "campos": [], "estados": [], "transiciones": [] } ],
  "modulos": { "errores": false, "salud": false, "demo": false },
  "marca": { "titulo": "Pizzeria Aurora", "paleta": "casa" },
  "bot": { "tono": "cercano", "idioma": "es-CO" }
}
```

- Quien escribe y valida ese JSON es el API (Zod en `api-crm/src/schemas.ts`), no el front: el front
  lo pinta.
- Mientras un punto de configuracion no se lea de `jdata`, vive en codigo (ver
  [03-ui-textos-paleta-modulos.md](03-ui-textos-paleta-modulos.md)). Anotarlo como pendiente en la
  spec del area antes de improvisar.

## 4. Canales y modo del bot

- Canales del seed: `api-crm/src/seed.ts` -> `canalesDe(demo, phoneId)`. Cada fila trae
  `canal` (`whatsapp` o `telegram`), `icuenta`, `nombre`, `cuenta` y `modo`.
- `modo` es del producto: `auto` (el bot responde) o `entrenamiento` (el equipo responde y el bot
  aprende). Una empresa nueva arranca en `entrenamiento` por regla.
- Si `icuenta` empieza por `demo`, el front pinta los contactos como casos de ejemplo
  (`esCanalDeEjemplo` en `api-crm/src/extensiones.ts`). Los canales reales llevan el
  `phone_number_id` de Meta en `icuenta`.
- El perfil publico del numero (categoria, about, direccion) se edita por API, no aqui: ver
  `api-crm/src/perfil-empresa.ts` y `VERTICALES_META` en `api-crm/src/schemas.ts`.

## 5. Usuarios, roles y quien puede que

| Rol | Puede |
| --- | --- |
| `propietario` | Todo, incluido el perfil de la empresa y los cambios de rol |
| `admin` | Equipo, canales, grupos globales, perfil del negocio; no cambia al propietario |
| `agente` | Atiende conversaciones, mueve tiquetes, edita contactos |
| `auditor` | Ve errores y panel; no escribe en la operacion |
| `lector` | Solo lectura |

Reglas que ya aplica el nucleo y no se reimplementan por empresa: los roles de edicion del perfil son
`propietario` y `admin` (`ROLES_EDICION` en `perfil-empresa.ts`); el front oculta
`/errores` a quien no es auditor (`soloAuditor` en `core/rutas.ts`); los permisos finos son del
plugin `permissions` de DER.

## 6. Alta de una empresa (lo minimo)

1. Fila en `crm_empresas` y al menos un `propietario` en `crm_miembros`.
2. Usuario en el plugin `identity` de DER (`iusuario`, `nombre`, `email`, `telefono`).
3. Canal(es) en el plugin `atencion` de DER apuntando a la empresa.
4. `jdata` con `catalogo`, `modulos` y `marca`.
5. Comprobar el aislamiento: entrar con un usuario de OTRA empresa y verificar que no ve nada de esta
   (es el error clasico de un montaje).

## 7. Variables de entorno del API

Todas por entorno, nunca en el repo (`api-crm/main.ts` y `api-crm/src/schemas.ts` -> `Env`):

| Variable | Para que |
| --- | --- |
| `JWT_SECRET` | firma de la sesion (obligatoria en produccion) |
| `ADMIN_PASSWORD` | clave de administracion del ecosistema (no es la del dueno) |
| `CANAL_TOKEN` | token del canal de atencion (bot/API) |
| `DEMO_PASSWORD` | clave de los usuarios de demostracion (`DEMO=1`) |
| `WA_SERVICIO_URL`, `WA_ADMIN_TOKEN`, `WA_PHONE_ID` | servicio de WhatsApp: URL, token de administracion y numero por defecto |
| `ARCHIVOS_DIR` | carpeta de bytes de adjuntos y avatares |
| `VOZ_SERVICIO_URL`, `QWEN_STT_URL`, `QWEN_STT_KEY`, `QWEN_STT_MODEL`, `GROQ_STT_MODEL`, `STT_IDIOMA`, `STT_ESPERA_MS` | notas de voz y transcripcion |
| `GROQ_API_KEY_1..3`, `OPENROUTER_API_KEY`, `OPENROUTER2_API_KEY`, `DEEPSEEK_API_KEY` | herramienta de IA del compositor |
| `EMBEDDINGS_DB` | base aparte de embeddings (busqueda semantica) |
| `API_PUBLICA`, `PUERTO`, `DATA_DIR`, `WA_PHONE_PRUEBA` | URL publica, puerto (8431 por defecto), carpeta de la base y numero de pruebas |