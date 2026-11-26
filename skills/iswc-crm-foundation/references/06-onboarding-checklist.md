# 06 — Lista de verificacion de un onboarding

Se corre entera antes de decir "montado". Cada punto dice **que** se comprueba y **como** se ve que
esta bien.

## A. Tenant y acceso

- [ ] Empresa dada de alta en `crm_empresas` con `codigo` unico, `nombre`, `nit` y `jdata` con
      `catalogo`, `modulos` y `marca`.
- [ ] Al menos un `propietario` en `crm_miembros` y el usuario existe en el plugin `identity` de DER.
- [ ] Login por usuario y clave **y** login por telefono con codigo de WhatsApp: los dos entran a la
      empresa correcta.
- [ ] Con un usuario de OTRA empresa no se ve nada de esta (aislamiento por `x-empresa`).
- [ ] Roles repartidos segun el contrato de soporte (`propietario`, `admin`, `agente`, `auditor`, `lector`).
- [ ] Contrasenas de demostracion cambiadas o usuario demo desactivado.

## B. Canales

- [ ] Canal(es) de WhatsApp/Telegram de la empresa en el plugin `atencion` de DER, con `modo` correcto
      (`entrenamiento` al arrancar).
- [ ] Perfil del negocio completo: about, direccion, correo, sitios, foto y **vertical** de Meta
      (`VERTICALES_META`).
- [ ] Un mensaje real entra por el canal y aparece en la bandeja del CRM.
- [ ] El bot responde o queda en manual segun lo acordado (`modo-manual` por chat).

## C. Catalogo de tipos de tiquete

- [ ] Los tipos del vertical estan en `api-crm/../jdata.catalogo` con `codigo`, `nombre`, `titulo`, `campos`,
      `estados`, `transiciones` y `textos`.
- [ ] Cada campo tiene tipo valido y sus restricciones; los obligatorios estan marcados.
- [ ] El primer estado es el inicial y los estados de cierre coinciden con `estadosFinalizados` del
      plugin de tiquetes.
- [ ] Cada transicion dice sus roles; no hay estados huerfanos (sin entrada o sin salida salvo los de cierre).
- [ ] El API rechaza un tiquete con un campo que el catalogo no declara (validacion Zod del nucleo).
- [ ] Si el vertical necesita tabla propia, es una extension con `iempresa` y `itk` (patron
      `api-crm/src/extensiones.ts`), no columnas nuevas del nucleo.

## D. Textos, paleta y modulos

- [ ] `rutas.ts` (`VISTAS`) dice lo que la empresa llama a cada modulo, y la lista `RUTAS` de
      `index.html` coincide (si se agrego o quito una vista).
- [ ] Los textos de los tiquetes (creado, movido, cerrado) estan en el catalogo.
- [ ] Paleta: `data-palette` del despliegue y, si hay marca obligatoria, la paleta del kit; ningun color
      fuera de tokens `--iswc-*`.
- [ ] Los modulos que la empresa no usa estan fuera del riel (`enPanel: false` o `soloAuditor`).
- [ ] Legal: `VERSION_LEGAL` y `ACTUALIZADO_LEGAL` al dia y contactos correctos
      (`view/legal/utils/documentos.ts`).
- [ ] Titulo, `application-name` y `manifest.webmanifest` con el nombre de la empresa.

## E. Datos y seed

- [ ] Seed base de produccion: empresa, canales, propietario y tablas (sin usuarios ni contactos de demo).
- [ ] `DEMO=1` solo en entornos de prueba, con datos de ejemplo del vertical.
- [ ] Datos de demostracion identificables como de ejemplo (canal `demo-*` o marca de prueba).
- [ ] Retencion de datos configurada (`retencion.ts`) segun lo pactado.
- [ ] Adjuntos y avatares: `ARCHIVOS_DIR` con respaldo; la base con su respaldo.

## F. Variables de entorno

- [ ] `JWT_SECRET`, `ADMIN_PASSWORD`, `CANAL_TOKEN` propios de esta empresa (no los de prueba).
- [ ] Servicio de WhatsApp: `WA_SERVICIO_URL`, `WA_ADMIN_TOKEN`, `WA_PHONE_ID`.
- [ ] Transcripcion/IA solo si el contrato las incluye; si faltan, el CRM lo dice y no inventa.
- [ ] `API_PUBLICA`, `PUERTO`, `DATA_DIR` y `EMBEDDINGS_DB` segun el despliegue.
- [ ] Nada de secretos en el repo ni en capturas.

## G. Plugin y despliegue

- [ ] `deno task build` y `dist/cdn/plugin.json` con `version`, `ruta` y `vistas` (lo prueba
      `tests/plugin/plugin-manifiesto.test.ts`).
- [ ] Si el CRM se monta en otra app: `loadPlugin` con `sha` de 40 hex y `ruta` o `host`
      correctos (ver [05](05-consumo-como-plugin.md)).
- [ ] `window.CRM_API` del front apunta al API publico con TLS valido.
- [ ] Pines del kit en un solo SHA de 40 hex (`deno task pin` limpio).

## H. Gates y cierre

- [ ] `deno task test:all` en `api-crm` en verde.
- [ ] `deno task test:all` en `front-crm` en verde.
- [ ] `deno task typecheck` y `deno task test` del kit sin empeorar el baseline.
- [ ] Un recorrido de punta a punta por el vertical: mensaje del cliente -> tiquete -> cambio de estado ->
      cierre, con un usuario de cada rol.
- [ ] El diff del montaje NO toca ningun fichero de la lista "que NO se toca" de la
      [SKILL.md](../SKILL.md#4-que-no-se-toca-el-nucleo).
- [ ] Queda anotado, en la spec del area de la empresa, que configuraciones siguen en codigo (lo que
      todavia no se lee de `jdata`).