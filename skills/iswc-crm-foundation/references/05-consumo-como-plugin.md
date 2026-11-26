# 05 — Consumir el CRM como plugin del kit

El front del CRM no se copia: se **carga**. Publica un contrato `iswc-plugin/v1` y su propio
registrador, y cualquier app que ya use el kit lo monta con tres cosas: **un script, un tag y su JSON**.

## 1. Que publica el CRM

Todo en `front-crm/dist/cdn/` (lo escribe `deno task build`; no se edita a mano):

| Fichero | Que es |
| --- | --- |
| `plugin.json` | el **manifiesto**: `schema: iswc-plugin/v1`, `app`, `repo`, `prefijo`, `version`, `ruta` (carpeta del repo), `loader`, `kit{repo,sha}`, `tags` (tag -> `<ruta>.min.mjs?v=<hash>`), `deps` (chunks de cada tag) y `vistas` (vista -> tags) |
| `crmLoader.min.mjs` | el **registrador**: `iswcLoader.registerApp({...})` con los href propios y la carga de `crmLoader.deps.json`. Es lo que importa el enrutador |
| `js/components/crm/<tag>.min.mjs`, `view/<vista>/components/<tag>.min.mjs` | cada componente, con su CSS incrustado |

El manifiesto se genera en dos tiempos: `construirApp` (build del kit) escribe schema/repo/tags/deps
y `front-crm/src/utils/plugin-manifiesto.ts` le suma `version`, `ruta` y `vistas` desde
`src/js/kit-tags.ts`. Lo vigila `tests/plugin/plugin-manifiesto.test.ts`.

## 2. La app externa: script + tag + JSON

Estructura minima de la pagina:

```html
<!-- 1. import map solo si el consumo incluye modulos que importan zod -->
<script type="importmap">{"imports":{"zod":"https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<PIN_KIT>/dist/cdn/lib/zod.min.mjs"}}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<PIN_KIT>/dist/cdn/is-base.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<PIN_KIT>/dist/cdn/palettes.min.css">

<!-- 2. el tag del CRM (no se importa nada del CRM a mano) -->
<crm-legal></crm-legal>

<script type="module">
  // 1. el loader del KIT, fijado a un SHA
  await import(`https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<PIN_KIT>/dist/cdn/loader.min.mjs`);
  const L = globalThis.iswcLoader;

  // 2. el JSON de la app consumida: su manifiesto iswc-plugin/v1
  const manifiesto = await (await fetch(`<RAIZ_DEL_CRM>plugin.json`)).json();

  // 3. registrar el plugin (repo + SHA de 40 hex + prefijo) y cargar el tag
  const info = await L.loadPlugin({
    app: 'crm',
    repo: 'Jeff-Aporta/crm',
    sha: '<SHA40_DEL_COMMIT_PUBLICADO>',   // nunca @main, nunca un SHA corto
    prefijo: 'crm-',
    ruta: 'front-crm/dist/cdn/',           // el repo del CRM es un monorepo
    tags: ['crm-legal'],
  });
  await L.load('crm-legal');
</script>
```

- `loadPlugin` NO lee el `plugin.json`: dado repo + SHA + prefijo importa `crmLoader.min.mjs` de
  `gh/<repo>@<sha>/<ruta>`, y el registrador del CRM hace el resto. El manifiesto es para
  herramientas y para quien quiera listar `vistas` y `tags` sin cargar nada.
- `info` (lo que devuelve) trae `tags` registrados, `raiz` e `alias`
  (`{"@crm/": "<raiz>"}`) para disenar con imports.
- Los hijos del kit de cada componente (`iswc-card`, `iswc-icon`, ...) los pide el propio
  componente al loader al conectar: a la pagina no le toca enumerarlos.
- Los `crm-*` que nadie monta no se descargan: el loader es perezoso.

## 3. Ejemplo minimo real (en el repo del CRM)

`front-crm/examples/plugin-externo/index.html`:

- se sirve con `deno task serve` -> `http://127.0.0.1:4310/examples/plugin-externo/`;
- importa SOLO el loader del kit, lee `dist/cdn/plugin.json` (version y vistas) y
  `dist/cdn/build-stamp.json` (el SHA del build, para que el ejemplo no caduque), registra el plugin con
  `host` = la carpeta del build local y monta `<crm-legal>`;
- la propia pagina muestra el script completo y la ficha de lo cargado (app, version, sha, tags, vistas).

Para montar el CRM COMPLETO en otra app se hace lo mismo con `tags: ['crm-app']` (el shell) y se define
`window.CRM_API` antes del script, igual que en el `index.html` del CRM: el shell apunta al API y a
sus rutas.

## 4. Publicacion: lo que hoy limita el consumo directo

El contrato exige **repo publico + SHA** (jsDelivr `gh/<repo>@<sha>/...`). Hoy:

| Situacion | Que funciona |
| --- | --- |
| Repo privado (`Jeff-Aporta/crm` lo es) | **No** hay jsDelivr ni Pages de repo privado: se consume con `host` (una URL publica donde se sirva `front-crm/dist/cdn/`) o copiando ese `dist` al despliegue del consumidor |
| Repo publico | `loadPlugin({ repo, sha, prefijo, ruta: 'front-crm/dist/cdn/' })` a jsDelivr, sin mas |
| GitHub Pages (cuando el repo sea publico) | `host: 'https://jeff-aporta.github.io/crm/dist/cdn/'` (el `sha` se sigue pasando: es el contrato de reproducibilidad) |
| Desarrollo local | `host: 'http://127.0.0.1:4310/dist/cdn/'` |

Ojo con dos trampas del repo actual:

1. **Monorepo**: el build vive en `front-crm/dist/cdn/`, no en la raiz. Sin
   `ruta: 'front-crm/dist/cdn/'` (o un `host`) el enrutador pedira una carpeta que no existe.
2. **Requisitos del enrutador**: `sha` de 40 hex (no `@main`, no SHA corto), `prefijo` con guion
   final y distinto de `iswc-`, y **una sola version por app y por pagina**.

## 5. Reglas para cambiar el contrato

- `PLUGIN_VERSION` (`src/js/consts/plugin.ts`) se sube a mano cuando cambia algo que un consumidor
  usa (un tag, un atributo, una ruta). El cambio se anota en `specs/loader-plugin.md` del CRM.
- Un tag nuevo entra solo: `kit-tags.ts` -> build -> `plugin.json` + `crmLoader` + galeria.
  No se agrega a mano al manifiesto.
- El consumidor fija un SHA: el CRM puede publicar sin romper a nadie; para actualizar, el consumidor
  sube el SHA.