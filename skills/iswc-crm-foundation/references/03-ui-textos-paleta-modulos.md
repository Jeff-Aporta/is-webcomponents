# 03 — Textos, paleta, marca y modulos visibles

## 1. Textos

| Que texto | Donde vive | Ojo |
| --- | --- | --- |
| Titulo y descripcion de cada vista (riel, pestana, metadatos) | `front-crm/src/js/core/rutas.ts` -> `VISTAS` (`titulo`, `descripcion`) | La descripcion tambien la usa `scripts/serve.ts` para el `<title>`; si cambia, cambia en los dos |
| Titulo y descripcion de las paginas sueltas (`/legal`, `/demo`) | `rutas.ts` -> `PAGINAS_SUELTAS` y `view/<vista>/index.html` | Son paginas fuera del shell |
| Cadenas dentro de un componente (botones, avisos, vacios) | El propio `view/<vista>/components/<tag>.ts` (y `src/js/components/crm/`) | No hay i18n: la cadena va donde se pinta. Si la empresa necesita otro idioma, es un cambio de producto |
| Documentos legales (version, fecha, contactos, textos) | `view/legal/utils/documentos.ts` (`VERSION_LEGAL`, `ACTUALIZADO_LEGAL`, `CONTACTO_LEGAL`, `CONTACTO_DATOS`, `DOCUMENTOS`) y `view/legal/components/crm-legal.ts` | Subir `VERSION_LEGAL` y `ACTUALIZADO_LEGAL` es parte del cierre de un montaje |
| Nombre de la app en el manifiesto PWA y titulo del documento | `index.html` (`<title>`, `application-name`, `theme-color`) y `manifest.webmanifest` (`name`, `short_name`, `description`) | Cambia por despliegue, no por empresa dentro del mismo despliegue |
| Prompt y tono del bot | `api-crm/src/bot.ts` | Es del nucleo; el tono por empresa se configura, no se hardcodea |
| Mensajes que manda el bot al crear/mover un tiquete | `catalogo[].textos` (ver [02](02-catalogo-y-flujos.md)) | Aqui si es dato por empresa |

## 2. Paleta

Tres niveles, de mas global a mas local:

1. **Paletas del kit**: `data-palette` en `<html>` (`delfin` por defecto, `whatsapp`, `telegram`). Vienen
   de `palettes.min.css` del kit y no se editan desde el CRM.
2. **Paleta por canal** (producto): `front-crm/src/js/core/palette.ts` -> `PALETTE_POR_CANAL` y
   `PALETTE_CASA`. Al abrir una conversacion la app se pinta con la paleta de su canal (`aplicarPaletteDeCanal`)
   y al volver a la bandeja recupera la de casa. Si la empresa suma un canal nuevo con identidad propia,
   se agrega a ese mapa; no se toca ningun componente.
3. **Marca de la empresa** (despliegue): `<html data-palette="`...`" data-theme="`...`">` en `index.html`,
   `theme-color` y los iconos de `assets/iconos/`. Los colores SIEMPRE por tokens `--iswc-*`;
   `src/styles/_tokens.scss` solo trae espaciado, radios y tipografia (los colores no se escriben ahi).
4. **Fuente**: se define en `:root` como `--iswc-font-sans` (`_tokens.scss` -> `$pila-cuerpo`) y
   NUNCA dentro de `[data-palette="`...`"]`: si el token viviera en la paleta, al cambiarla la fuente caeria
   a la serif del navegador.

Regla: un montaje nuevo NO inventa colores. Si la marca del cliente es obligatoria, se propone una
paleta nueva en el kit (`palettes`) y se pide su SHA; en el CRM solo se elige.

## 3. Modulos visibles (riel y rutas)

- La lista viva es `front-crm/src/js/core/rutas.ts` -> `VISTAS`. Cada entrada declara `id`, `ruta`, `titulo`,
  `descripcion`, `icono`, `tag` y los filtros: `enPanel: false` (no entra al riel), `soloAuditor`
  (solo lo ve el auditor), `soloEscritura`.
- **Ojo fino**: `index.html` lleva una lista `RUTAS` en el script plano del `<base>` y la usa para saber
  en que carpeta vive la app. Si se agrega o quita una vista, hay que tocar **las dos**: `VISTAS` y
  `RUTAS` de `index.html`. Es el olvido mas comun de un montaje.
- Un modulo que la empresa no usa se oculta con `enPanel: false` (o se quita del riel); la vista sigue
  existiendo por URL, asi que no se rompen enlaces ni el `404.html`.
- Una vista nueva de verdad (componente + vista + demo + ficha) es trabajo del estandar:
  `iswc-foundation`, no de un montaje.
- El "que se ve" por empresa como dato (`jdata.modulos`) es una mejora pendiente: hasta que exista, se
  hace en codigo y se anota en la spec del area.

## 4. Perfil del negocio (lo que ve el cliente final en WhatsApp)

- `api-crm/src/perfil-empresa.ts`: `GET/PUT /api/empresa/perfil`. Resuelve el canal de WhatsApp de la
  empresa activa, exige rol `propietario` o `admin` para escribir y delega en el servicio de WhatsApp.
- La **vertical** (categoria de Meta) se elige de `VERTICALES_META` en `api-crm/src/schemas.ts`; es un
  dato, no codigo. El nombre para mostrar (`verified_name`) es de solo lectura: lo cambia Meta.
- El montaje de una empresa incluye dejar ese perfil completo: about, direccion, correo, sitios y foto.

## 5. Lo que NO se toca de la interfaz

- Los componentes `iswc-*` (kit) y las fichas/demos de cada `crm-*`: se usan, no se personalizan por
  cliente.
- `src/js/kit-tags.ts` (registro unico de tags) y `src/js/base/`: son el esqueleto de la app.
- El shell (`crm-app`), la bandeja (`crm-chat`) y el panel (`crm-dashboard`): su logica es del nucleo.
  Cambiarles el contenido por empresa es una configuracion (texto, campo, paleta), no un fork del componente.