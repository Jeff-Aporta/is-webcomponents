// labs/iss-ayudascpia-flujos/eps-iss.mjs
// Endpoints del ISS que no tenían diagrama: para cada uno, la SECUENCIA pura (iswc-sequence-diagram)
// y la SECUENCIA ENRIQUECIDA (ruta ilustrada, iswc-flowchart insoft) con piezas reales del ISS.
// Los docs los muestran juntos en tabs (`---` + dos imágenes + `---`).
//
// Fuente de cada paso: el controller del EP (src/sources/020 Controllers/server) y el registro de
// rutas (src/functions/index.ts) del ISS, leídos el 2026-10-09.
//
// Uso: deno run -A --no-check labs/iss-ayudascpia-flujos/eps-iss.mjs [--iss]

import { escribir, ruta } from './rutas-ricas.mjs';

/**
 * Secuencia pura en el formato de los editables del ISS: todos los mensajes en `messages` (con su
 * paso) y los bloques como `fragments` (`alt`/`else`, `par`, `loop`) que agrupan ids de mensajes.
 */
function secuencia(meta, actors, componer) {
  const messages = [];
  const fragments = [];
  let abiertos = [];
  const m = (from, to, label, kind = 'sync') => {
    const id = `m${messages.length + 1}`;
    messages.push({ id, from, to, label, kind, step: messages.length + 1 });
    for (const f of abiertos) f.messages.push(id);
  };
  const bloque = (name, kind, condition, fn) => {
    const f = { id: `f${fragments.length + 1}`, name, kind, messages: [], condition };
    fragments.push(f);
    abiertos = [...abiertos, f];
    fn();
    abiertos = abiertos.filter((x) => x !== f);
  };
  const s = {
    m,
    r: (from, to, label) => m(from, to, label, 'reply'),
    self: (a, label) => m(a, a, label, 'self'),
    alt: (...ramas) => ramas.forEach(([cond, fn], i) => bloque(i ? 'else' : 'alt', 'alt', cond, fn)),
    par: (cond, fn) => bloque('par', 'par', cond, fn),
    loop: (cond, fn) => bloque('loop', 'loop', cond, fn),
  };
  componer(s);
  return {
    slug: meta.slug,
    module: meta.module,
    tag: 'iswc-sequence-diagram',
    script: 'diagrams/sequence-diagram.min.js',
    attrs: { 'diagram-style': 'insoft' },
    payload: { sequence: { title: meta.title, actors: actors.map(([id, label]) => ({ id, label, kind: 'participant' })), messages, fragments } },
  };
}

const EPS = [];
const par = (meta, actores, seq, rica) => {
  EPS.push(secuencia(meta, actores, seq));
  // Los carriles de la ruta son los mismos actores de la secuencia (mismos ids).
  EPS.push(ruta({ ...meta, lanes: actores.map(([id, label]) => ({ id, label })) }, rica));
};

// ════════════════════════════════════════ 010 · General ════════════════════════════════════════

// GET|POST /permisos · GET /permisos/{filtro} — bootstrap del front: qué puede hacer la sesión.
par({ slug: 'permisos-sesion', module: '010-General', title: 'Permisos de la sesión (/permisos)' },
  [['C', 'Portal / ISW'], ['P', 'ISS · TPermissionsController'], ['D', 'PostgreSQL · seg_*']],
  (s) => {
    s.m('C', 'P', 'GET|POST /permisos (body opcional { irol })');
    s.self('P', 'verifica el JWT');
    s.alt(
      ['sin token, inválido o vencido', () => s.r('P', 'C', '{ irol: USR, perms: {} } · con irol pedido: 401')],
      ['token válido', () => {
        s.m('P', 'D', 'dueño del grupo PATYIA (seg_grupos, caché 90 s)');
        s.m('P', 'D', 'rol vigente del contacto (seg_rolescontacto)');
        s.self('P', 'irol pedido: exige capacidad auditoría (401) y que el rol exista (400)');
        s.m('P', 'D', 'filas de USR y del rol (seg_accionesxrol)');
        s.r('P', 'C', '{ irol, perms, roles, roleSwitch, username }');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-permisos', 'C');
    b.clase('ctl', 'perm', 'P', 'app');
    b.paso('jwt', 'Verifica el JWT (HS384)', 'P', 'mdi:key-chain-variant');
    b.decision('d1', '¿Token válido?', 'P');
    b.paso('anon', 'Anónimo: USR sin permisos (si pidió irol, 401)', 'P', 'mdi:incognito');
    b.paso('owner', 'Dueño del grupo PATYIA (caché 90 s)', 'P', 'mdi:domain');
    b.tabla('tgr', 'seg_grupos', 'D');
    b.paso('rol', 'Rol vigente del contacto (bprincipal primero)', 'P', 'mdi:shield-account-outline');
    b.tabla('trc', 'seg_rolescontacto', 'D', ['itercero', 'igrupo', 'irol', 'icontacto', 'ffinal', 'bprincipal']);
    b.decision('d2', '¿Pide simular otro rol?', 'P');
    b.paso('sw', 'Exige capacidad auditoría (401) y que el rol exista (400)', 'P', 'mdi:account-switch-outline');
    b.tabla('trol', 'seg_roles', 'D');
    b.paso('perms', 'Permisos efectivos: USR sin lo del rol, más lo del rol', 'P', 'mdi:scale-balance');
    b.tabla('tacc', 'seg_accionesxrol', 'D', ['itercero', 'isysrecurso', 'iaccion', 'irol', 'valor']);
    b.paso('ok', '{ irol, perms, roles, roleSwitch, username }', 'P', 'mdi:reply-outline');
    b.fin('fin', 'P');
    b.flujo('api', 'ctl', 'GET|POST /permisos');
    b.cadena('ctl', 'jwt', 'd1');
    b.flujo('d1', 'anon', 'no');
    b.flujo('d1', 'owner', 'sí');
    b.uso('owner', 'tgr', 'SELECT');
    b.cadena('owner', 'rol', 'd2');
    b.uso('rol', 'trc', 'SELECT');
    b.flujo('d2', 'sw', 'sí');
    b.flujo('d2', 'perms', 'no');
    b.uso('sw', 'trol', 'SELECT');
    b.flujo('sw', 'perms');
    b.uso('perms', 'tacc', 'SELECT');
    b.cadena('perms', 'ok', 'fin');
    b.flujo('anon', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET|PUT /sistema/cfg · /docs/cfg — configuración en caliente (patyia_sys_values).
par({ slug: 'configuracion-cfg', module: '010-General', title: 'Configuración en caliente (CFG)' },
  [['C', 'Consola / ISW'], ['S', 'ISS · TSysValueController'], ['P', 'PostgreSQL']],
  (s) => {
    s.self('S', 'la puerta SEG decide por el id CFG:/<ruta> (sistema → runtime, docs → doc)');
    s.alt(
      ['GET <ruta>/cfg', () => {
        s.m('C', 'S', 'GET /sistema/cfg · /docs/cfg');
        s.m('S', 'P', 'lee la fila (sin fila: sus defaults, nunca 404)');
        s.r('S', 'C', '{ isystemkey, jvalue (texto JSON), fhultact }');
      }],
      ['PUT <ruta>/cfg', () => {
        s.m('C', 'S', 'PUT … { jvalue: fragmento }');
        s.self('S', 'push parcial validado con el schema de la clave (400); null quita una clave');
        s.m('S', 'P', 'guarda la fila');
        s.r('S', 'C', 'la fila vigente');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-config', 'C', ['GET|PUT /sistema/cfg', 'GET|PUT /docs/cfg']);
    b.clase('ctl', 'sys', 'S', 'app');
    b.clase('pojo', 'm_sys', 'S', 'leaf');
    b.paso('seg', 'Puerta SEG: el id CFG:/<ruta> elige la fila (runtime o doc)', 'S', 'mdi:shield-check-outline');
    b.decision('d1', '¿Lee o escribe?', 'S');
    b.paso('lee', 'Lee la fila; si no existe, sus defaults', 'S', 'mdi:database-search-outline');
    b.paso('push', 'Push parcial validado con el schema de la clave (400)', 'S', 'mdi:code-json');
    b.paso('guarda', 'Guarda la fila; el próximo uso ya la ve', 'S', 'mdi:content-save-outline');
    b.tabla('tsys', 'patyia_sys_values', 'P');
    b.paso('ok', '{ isystemkey, jvalue, fhultact }', 'S', 'mdi:reply-outline');
    b.fin('fin', 'S');
    b.flujo('api', 'ctl', 'GET|PUT <ruta>/cfg');
    b.uso('ctl', 'pojo', '«uses»');
    b.cadena('ctl', 'seg', 'd1');
    b.flujo('d1', 'lee', 'GET');
    b.flujo('d1', 'push', 'PUT');
    b.uso('lee', 'tsys', 'SELECT');
    b.flujo('push', 'guarda');
    b.uso('guarda', 'tsys', 'UPDATE');
    b.flujo('lee', 'ok');
    b.flujo('guarda', 'ok');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET|PUT /proveedor/{iproveedor} · GET|PUT /proveedor/{iproveedor}/cfg.
par({ slug: 'configuracion-proveedor', module: '010-General', title: 'Proveedor del modelo (/proveedor)' },
  [['C', 'Consola / ISW'], ['V', 'ISS · TProviderController'], ['P', 'PostgreSQL'], ['O', 'OpenAI']],
  (s) => {
    s.alt(
      ['GET /proveedor/{iproveedor}', () => {
        s.m('V', 'P', 'lee la fila (404 si no existe)');
        s.r('V', 'C', 'fila con los secretos de jcuenta enmascarados');
      }],
      ['PUT /proveedor/{iproveedor}', () => {
        s.self('V', 'body estricto (400); merge sobre la fila: un secreto enmascarado no pisa el real');
        s.m('V', 'P', 'guarda solo las columnas que cambian');
        s.r('V', 'C', 'fila con la cuenta enmascarada');
      }],
      ['GET|PUT /proveedor/{iproveedor}/cfg', () => {
        s.self('V', 'solo OPENAI, activo en patyia_providers (400)');
        s.m('V', 'P', 'fila OPENAI de patyia_sys_values (PUT: push parcial)');
        s.m('V', 'O', 'modelos de la cuenta (caché 90 s)');
        s.r('V', 'C', 'configuración + modelos disponibles y no disponibles');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-config', 'C', ['GET|PUT /proveedor/{iproveedor}', 'GET|PUT /proveedor/{iproveedor}/cfg']);
    b.clase('ctl', 'prov', 'V', 'app');
    b.clase('pojo', 'm_prov', 'V', 'leaf');
    b.decision('d1', '¿Qué pide?', 'V');
    b.paso('get', 'Lee la fila (404) y enmascara los secretos de jcuenta', 'V', 'mdi:eye-off-outline');
    b.paso('put', 'Merge sobre la fila: un secreto enmascarado no pisa el real', 'V', 'mdi:merge');
    b.paso('cfg', 'Configuración OPENAI y modelos verificados en la cuenta', 'V', 'mdi:robot-outline');
    b.tabla('tprov', 'patyia_providers', 'P');
    b.tabla('tsys', 'patyia_sys_values', 'P');
    b.componente('ai', 'openai-chat', 'O');
    b.paso('ok', 'Respuesta con la cuenta siempre enmascarada', 'V', 'mdi:reply-outline');
    b.fin('fin', 'V');
    b.flujo('api', 'ctl', 'petición con token');
    b.uso('ctl', 'pojo', '«uses»');
    b.flujo('ctl', 'd1');
    b.flujo('d1', 'get', 'GET');
    b.flujo('d1', 'put', 'PUT');
    b.flujo('d1', 'cfg', '…/cfg');
    b.uso('get', 'tprov', 'SELECT');
    b.uso('put', 'tprov', 'UPSERT');
    b.uso('cfg', 'tsys', 'SELECT · UPDATE');
    b.uso('cfg', 'ai', 'modelos');
    for (const x of ['get', 'put', 'cfg']) b.flujo(x, 'ok');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET|POST|PUT /tdconsulta — catálogo de instrucciones (árbol 1, 1.x, 9999.x).
par({ slug: 'configuracion-tdconsulta', module: '010-General', title: 'Catálogo de instrucciones (/tdconsulta)' },
  [['C', 'Consola'], ['T', 'ISS · TTdConsultationController'], ['P', 'PostgreSQL']],
  (s) => {
    s.alt(
      ['GET /tdconsulta', () => {
        s.m('C', 'T', 'GET /tdconsulta');
        s.m('T', 'P', 'todo el catálogo, activo o no');
        s.r('T', 'C', '{ key, storage, rows, canEdit }');
      }],
      ['POST (crear) · PUT (guardar)', () => {
        s.m('C', 'T', 'POST|PUT /tdconsulta');
        s.self('T', 'PK en mayúsculas, ruta d(.d)*, instrucción no vacía (400)');
        s.self('T', 'crear: la PK no existe y sus ancestros sí (7.1 exige 7)');
        s.self('T', 'jconfig y jpermisos: push parcial sobre lo vigente (schema estricto)');
        s.m('T', 'P', 'INSERT o UPDATE con auditoría de la sesión (nombre único: 400)');
        s.r('T', 'C', '{ ok, key, updatedBy, mode, itdconsulta }');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-config', 'C', ['GET|POST|PUT /tdconsulta']);
    b.clase('ctl', 'td', 'T', 'app');
    b.clase('pojo', 'm_td', 'T', 'leaf');
    b.decision('d1', '¿Lee o escribe?', 'T');
    b.paso('lista', 'Todo el catálogo con canEdit para la consola', 'T', 'mdi:file-tree-outline');
    b.paso('valida', 'PK en mayúsculas, ruta d(.d)*, instrucción no vacía (400)', 'T', 'mdi:form-textbox');
    b.decision('d2', '¿Crea?', 'T');
    b.paso('anc', 'La PK no existe y todos sus ancestros sí (400)', 'T', 'mdi:family-tree');
    b.paso('push', 'jconfig y jpermisos: push parcial sobre lo vigente', 'T', 'mdi:code-json');
    b.paso('guarda', 'Guarda con la auditoría de la sesión', 'T', 'mdi:content-save-outline');
    b.tabla('ttd', 'patyia_tdconsultas', 'P');
    b.paso('ok', '{ ok, key, updatedBy, mode, itdconsulta }', 'T', 'mdi:reply-outline');
    b.fin('fin', 'T');
    b.nota('n-op', 'guarda', 'Los operativos 9999.x no se borran desde la consola');
    b.flujo('api', 'ctl', 'petición con token');
    b.uso('ctl', 'pojo', '«uses»');
    b.flujo('ctl', 'd1');
    b.flujo('d1', 'lista', 'GET');
    b.flujo('d1', 'valida', 'POST · PUT');
    b.uso('lista', 'ttd', 'SELECT');
    b.flujo('valida', 'd2');
    b.flujo('d2', 'anc', 'sí');
    b.flujo('d2', 'push', 'no');
    b.uso('anc', 'ttd', 'SELECT');
    b.flujo('anc', 'push');
    b.flujo('push', 'guarda');
    b.uso('guarda', 'ttd', 'INSERT · UPDATE');
    b.flujo('guarda', 'ok');
    b.flujo('lista', 'fin');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// POST /archivo — imagen o audio al bucket R2 con variantes.
par({ slug: 'archivo-subida', module: '010-General', title: 'Subida de archivos (POST /archivo)' },
  [['C', 'Portal / app'], ['F', 'ISS · TFileStorageController'], ['P', 'PostgreSQL'], ['R', 'Cloudflare R2']],
  (s) => {
    s.m('C', 'F', 'POST /archivo (dataUrl | base64 | url, mime, iconversacion?)');
    s.self('F', 'body estricto (400); JWT y SEG ya los resolvió la puerta');
    s.self('F', 'resuelve los bytes: decodifica o descarga');
    s.m('F', 'P', 'cuenta de almacenamiento (gen_almacenamientos; sin cuenta: 503)');
    s.alt(
      ['imagen (hasta 5 MB)', () => {
        s.self('F', 'variantes thumb, med y original (jpeg, lado máximo 1280)');
        s.m('F', 'R', 'sube los tres objetos');
      }],
      ['audio (hasta 25 MB)', () => {
        s.self('F', 'duración por ffprobe');
        s.m('F', 'R', 'sube el original');
      }],
    );
    s.m('F', 'P', 'ifile = seq_patyia_ifile en base 36; registra el archivo');
    s.r('F', 'C', '{ ifile, jfile (variantes con URL firmada 7 días), fhcre }');
  },
  (b) => {
    b.componente('api', 'grp-ops', 'C', ['POST /archivo']);
    b.clase('ctl', 'file', 'F', 'app');
    b.clase('alm', 'alm', 'F', 'service');
    b.paso('val', 'Body estricto (400); JWT y SEG ya resueltos por la puerta', 'F', 'mdi:shield-check-outline');
    b.paso('bytes', 'Resuelve los bytes: decodifica o descarga', 'F', 'mdi:download-outline');
    b.paso('cuenta', 'Cuenta de almacenamiento (sin cuenta: 503)', 'F', 'mdi:key-outline');
    b.tabla('talm', 'gen_almacenamientos', 'P');
    b.decision('d1', '¿Imagen o audio?', 'F');
    b.paso('img', 'Variantes thumb, med y original (jpeg, lado máx. 1280)', 'F', 'mdi:image-multiple-outline');
    b.paso('aud', 'Duración por ffprobe; solo el original', 'F', 'mdi:waveform');
    b.componente('r2', 'r2-bucket', 'R');
    b.paso('reg', 'ifile en base 36 y registro del archivo', 'F', 'mdi:database-plus-outline');
    b.tabla('tfile', 'patyia_files_storage', 'P');
    b.paso('ok', '{ ifile, jfile, fhcre } con URLs firmadas (7 días)', 'F', 'mdi:reply-outline');
    b.fin('fin', 'F');
    b.flujo('api', 'ctl', 'POST /archivo');
    b.uso('ctl', 'alm', '«uses»');
    b.cadena('ctl', 'val', 'bytes', 'cuenta', 'd1');
    b.uso('cuenta', 'talm', 'SELECT');
    b.flujo('d1', 'img', 'imagen');
    b.flujo('d1', 'aud', 'audio');
    b.uso('img', 'r2', 'PUT ×3');
    b.uso('aud', 'r2', 'PUT');
    b.flujo('img', 'reg');
    b.flujo('aud', 'reg');
    b.uso('reg', 'tfile', 'INSERT');
    b.cadena('reg', 'ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET /info — salud del servidor (pública, siempre 200).
par({ slug: 'operacion-info', module: '010-General', title: 'Salud del servidor (GET /info)' },
  [['C', 'Monitor / agente'], ['I', 'ISS · TInfoController'], ['P', 'PostgreSQL'], ['G', 'GeoIP']],
  (s) => {
    s.m('C', 'I', 'GET /info (pública, sin JWT)');
    s.par('lecturas en paralelo; cada una puede fallar sola', () => {
      s.m('I', 'P', 'SELECT 1 con tiempo de conexión');
      s.m('I', 'P', '¿hay errores abiertos en la bandeja?');
      s.m('I', 'P', 'registro de parches (patchdb)');
      s.m('I', 'G', 'ubicación del servidor');
    });
    s.r('I', 'C', '200 siempre: versión, sello, BD, parches, runner, erroresPorAtender');
  },
  (b) => {
    b.componente('api', 'grp-ops', 'C', ['GET /info']);
    b.clase('ctl', 'info', 'I', 'app');
    b.barra('fork', 'I');
    b.paso('db', 'SELECT 1 con tiempo de conexión', 'I', 'mdi:database-clock-outline');
    b.paso('err', '¿Hay errores abiertos en la bandeja?', 'I', 'mdi:inbox-outline');
    b.paso('pat', 'Parches aplicados, fallidos y el último', 'I', 'mdi:database-cog-outline');
    b.paso('geo', 'Ubicación del servidor', 'I', 'mdi:map-marker-outline');
    b.barra('join', 'I');
    b.tabla('terr', 'patyia_errores', 'P', ['ierror', 'batendido']);
    b.tabla('tsys', 'patyia_sys_values', 'P');
    b.paso('ok', '200 siempre: versión, sello, BD, parches, runner, erroresPorAtender', 'I', 'mdi:heart-pulse');
    b.fin('fin', 'I');
    b.flujo('api', 'ctl', 'GET /info');
    b.flujo('ctl', 'fork');
    for (const x of ['db', 'err', 'pat', 'geo']) { b.flujo('fork', x); b.flujo(x, 'join'); }
    b.uso('err', 'terr', 'SELECT');
    b.uso('pat', 'tsys', 'SELECT');
    b.cadena('join', 'ok', 'fin');
    b.nota('n-200', 'ok', 'Un fallo de una lectura queda en su campo; nunca 5xx');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET /cdn/{file} · GET /docs — entregables públicos sin sobre.
par({ slug: 'operacion-cdn-docs', module: '010-General', title: 'SDK y visor de documentación (/cdn, /docs)' },
  [['C', 'Navegador / SDK'], ['K', 'ISS · TCdnController'], ['S', 'ISS · TSysValueController'], ['P', 'PostgreSQL']],
  (s) => {
    s.alt(
      ['GET /cdn/{file}', () => {
        s.m('C', 'K', 'GET /cdn/{file} (pública, sin sobre)');
        s.self('K', 'sin file: 400; front.ts: une front.ts y front.md (503 si no se ha generado)');
        s.r('K', 'C', 'front.ts con su Content-Type · cualquier otro archivo: 404');
      }],
      ['GET /docs', () => {
        s.m('C', 'S', 'GET /docs (?v=json | md | routes)');
        s.m('S', 'P', 'fila doc de patyia_sys_values (routes: ids SEG del registro)');
        s.r('S', 'C', 'html · json · md (503 si la fila no está)');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-ops', 'C', ['GET /cdn/{file}', 'GET /docs']);
    b.clase('kcdn', 'cdn', 'K', 'app');
    b.clase('ksys', 'sys', 'S', 'app');
    b.decision('d1', '¿Qué pide?', 'K');
    b.paso('front', 'front.ts: une el bundle y su documentación (503 si falta)', 'K', 'mdi:language-typescript');
    b.paso('otro', 'Otro archivo: 404 explícito', 'K', 'mdi:file-cancel-outline');
    b.paso('doc', 'Lee la fila doc (routes: ids SEG del registro)', 'S', 'mdi:book-open-variant');
    b.tabla('tsys', 'patyia_sys_values', 'P');
    b.paso('ok', 'Archivo o documento con su propio Content-Type', 'K', 'mdi:reply-outline');
    b.fin('fin', 'K');
    b.flujo('api', 'd1', 'GET (pública)');
    b.flujo('d1', 'front', '/cdn/front.ts');
    b.flujo('d1', 'otro', '/cdn/otro');
    b.flujo('d1', 'doc', '/docs');
    b.uso('front', 'kcdn', '«uses»');
    b.uso('doc', 'ksys', '«uses»');
    b.uso('doc', 'tsys', 'SELECT');
    for (const x of ['front', 'otro', 'doc']) b.flujo(x, 'ok');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta sin sobre');
  });

// POST /error · GET /errores · DELETE /errores — la bandeja vista desde sus rutas.
par({ slug: 'bandeja-rutas', module: '010-General', title: 'Rutas de la bandeja de errores' },
  [['C', 'Front / agente'], ['E', 'ISS · TErrorController'], ['P', 'PostgreSQL']],
  (s) => {
    s.alt(
      ['POST /error', () => {
        s.m('C', 'E', 'POST /error (reporte)');
        s.self('E', 'normaliza dominio, contexto, referencia y resumen; censura MD5 y JWT; tope de tamaño');
        s.m('E', 'P', 'INSERT … ON CONFLICT por referencia abierta');
        s.r('E', 'C', 'la fila nueva o la abierta con esa referencia');
      }],
      ['GET /errores', () => {
        s.m('C', 'E', 'GET /errores');
        s.m('E', 'P', 'las abiertas, más antiguas primero');
        s.r('E', 'C', 'lista + instructivo de la bandeja');
      }],
      ['DELETE /errores', () => {
        s.m('C', 'E', 'DELETE /errores [{ ierror }, …]');
        s.m('E', 'P', 'borra el lote: atender es borrar');
        s.r('E', 'C', 'ok');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-ops', 'C', ['POST /error', 'GET|DELETE /errores']);
    b.clase('ctl', 'err', 'E', 'app');
    b.clase('pojo', 'm_err', 'E', 'leaf');
    b.decision('d1', '¿Qué ruta?', 'E');
    b.paso('norm', 'Normaliza el reporte y censura secretos; tope de tamaño', 'E', 'mdi:eye-off-outline');
    b.paso('ins', 'Registra o devuelve la abierta con esa referencia', 'E', 'mdi:database-plus-outline');
    b.paso('lst', 'Las abiertas, más antiguas primero, con el instructivo', 'E', 'mdi:inbox-outline');
    b.paso('del', 'Borra el lote: atender es borrar', 'E', 'mdi:delete-sweep-outline');
    b.tabla('terr', 'patyia_errores', 'P', ['ierror', 'jerror', 'fhcre', 'referencia', 'resumen']);
    b.paso('ok', 'Respuesta', 'E', 'mdi:reply-outline');
    b.fin('fin', 'E');
    b.flujo('api', 'ctl', 'petición');
    b.uso('ctl', 'pojo', '«uses»');
    b.flujo('ctl', 'd1');
    b.flujo('d1', 'norm', 'POST /error');
    b.flujo('d1', 'lst', 'GET /errores');
    b.flujo('d1', 'del', 'DELETE /errores');
    b.flujo('norm', 'ins');
    b.uso('ins', 'terr', 'INSERT');
    b.uso('lst', 'terr', 'SELECT');
    b.uso('del', 'terr', 'DELETE');
    for (const x of ['ins', 'lst', 'del']) b.flujo(x, 'ok');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// ════════════════════════════════════ 020 · Conversaciones ═════════════════════════════════════

// GET /conversacion/{iconversacion} · GET /conversacion/{iconversacion}/logs.
par({ slug: 'conversacion-detalle', module: '020-Conversaciones', title: 'Detalle e historial de una conversación' },
  [['C', 'Portal'], ['T', 'ISS · TConversacionController'], ['P', 'PostgreSQL']],
  (s) => {
    s.alt(
      ['GET /conversacion/{iconversacion}', () => {
        s.m('C', 'T', 'GET /conversacion/{iconversacion}');
        s.m('T', 'P', 'lee la fila con sus calificados y tiquetes (404)');
        s.self('T', 'alcance por fila: dueño, auditor o bautoriza_visualizacion (401)');
        s.m('T', 'P', 'dueño y vencida la inactividad: la cierra');
        s.r('T', 'C', 'fila + detalle (mensajes calificados, tiquete)');
      }],
      ['GET /conversacion/{iconversacion}/logs', () => {
        s.m('C', 'T', 'GET /conversacion/{iconversacion}/logs');
        s.self('T', 'mismo acceso que el detalle (de otros: capacidad logsAjenos)');
        s.m('T', 'P', 'historial de la conversación');
        s.r('T', 'C', 'mensajes con meta (adjuntos enmascarados) + convLog ordenado');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-conv-portal', 'C', ['GET /conversacion/{iconversacion}', 'GET /conversacion/{iconversacion}/logs']);
    b.clase('ctl', 'conv', 'T', 'app');
    b.clase('pojo', 'm_conv', 'T', 'leaf');
    b.paso('lee', 'Lee la conversación (404)', 'T', 'mdi:database-search-outline');
    b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itercero', 'icontacto', 'itdestado', 'bautoriza_visualizacion', 'fhultact']);
    b.decision('d1', '¿Dueño, auditor o visualización autorizada?', 'T');
    b.paso('e401', '401', 'T', 'mdi:account-cancel-outline');
    b.decision('d2', '¿Detalle o historial?', 'T');
    b.paso('cierra', 'Si es el dueño y venció la inactividad, la cierra', 'T', 'mdi:archive-lock-outline');
    b.paso('det', 'Fila + mensajes calificados y tiquete', 'T', 'mdi:card-text-outline');
    b.tabla('tmsg', 'patyia_mensajescalificados', 'P');
    b.tabla('ttiq', 'patyia_tiquetesconversacion', 'P');
    b.paso('log', 'Historial con meta y convLog ordenado (de otros: logsAjenos)', 'T', 'mdi:history');
    b.tabla('tlog', 'patyia_conversacion_log', 'P');
    b.fin('fin', 'T');
    b.flujo('api', 'ctl', 'petición con token');
    b.uso('ctl', 'pojo', '«uses»');
    b.cadena('ctl', 'lee', 'd1');
    b.uso('lee', 'tconv', 'SELECT');
    b.flujo('d1', 'e401', 'no');
    b.flujo('d1', 'd2', 'sí');
    b.flujo('d2', 'cierra', 'detalle');
    b.flujo('d2', 'log', '…/logs');
    b.uso('cierra', 'tconv', 'UPDATE');
    b.flujo('cierra', 'det');
    b.uso('det', 'tmsg', 'SELECT');
    b.uso('det', 'ttiq', 'SELECT');
    b.uso('log', 'tlog', 'SELECT');
    for (const x of ['e401', 'det', 'log']) b.flujo(x, 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET /conversaciones · GET /conversaciones/{filtro}.
par({ slug: 'conversacion-listado', module: '020-Conversaciones', title: 'Listados de conversaciones' },
  [['C', 'Portal / consola'], ['T', 'ISS · TConversacionController'], ['P', 'PostgreSQL']],
  (s) => {
    s.alt(
      ['GET /conversaciones', () => {
        s.m('C', 'T', 'GET /conversaciones');
        s.self('T', 'body estricto, searchColumn de la lista blanca (400); limit de 1 a 200');
        s.m('T', 'P', 'las propias del token');
        s.r('T', 'C', '{ pagina, qregistros, totalpaginas, totalregistros, datos }');
      }],
      ['GET /conversaciones/{filtro}', () => {
        s.m('C', 'T', 'GET /conversaciones/{filtro}');
        s.self('T', 'puerta SEG QUERY:/conversaciones (auditoría)');
        s.m('T', 'P', 'filtro, orden y paginación (agrupar = tercero: por tercero y contacto)');
        s.r('T', 'C', 'la misma lista paginada');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-conversacion', 'C', ['GET /conversaciones', 'GET /conversaciones/{filtro}']);
    b.clase('ctl', 'conv', 'T', 'app');
    b.decision('d1', '¿Con filtro?', 'T');
    b.paso('val', 'Body estricto y searchColumn de la lista blanca (400); limit de 1 a 200', 'T', 'mdi:form-textbox');
    b.paso('prop', 'Las conversaciones propias del token', 'T', 'mdi:account-outline');
    b.paso('seg', 'Puerta SEG QUERY:/conversaciones (auditoría)', 'T', 'mdi:shield-account-outline');
    b.decision('d2', '¿agrupar = tercero?', 'T');
    b.paso('grp', 'Agrupa por tercero y contacto', 'T', 'mdi:account-group-outline');
    b.paso('flt', 'Filtro, orden y paginación; otros dueños solo con auditoría', 'T', 'mdi:filter-outline');
    b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itercero', 'icontacto', 'titulo', 'itdestado', 'fhultact']);
    b.paso('ok', '{ pagina, qregistros, totalpaginas, totalregistros, datos }', 'T', 'mdi:format-list-numbered');
    b.fin('fin', 'T');
    b.flujo('api', 'ctl', 'petición con token');
    b.flujo('ctl', 'd1');
    b.flujo('d1', 'val', 'no');
    b.flujo('d1', 'seg', 'sí');
    b.flujo('val', 'prop');
    b.uso('prop', 'tconv', 'SELECT');
    b.flujo('seg', 'd2');
    b.flujo('d2', 'grp', 'sí');
    b.flujo('d2', 'flt', 'no');
    b.uso('grp', 'tconv', 'SELECT');
    b.uso('flt', 'tconv', 'SELECT');
    for (const x of ['prop', 'grp', 'flt']) b.flujo(x, 'ok');
    b.flujo('ok', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// DELETE /conversacion/{iconversacion} — baja lógica.
par({ slug: 'conversacion-borrado', module: '020-Conversaciones', title: 'Borrado de una conversación' },
  [['C', 'Portal'], ['T', 'ISS · TConversacionController'], ['P', 'PostgreSQL']],
  (s) => {
    s.m('C', 'T', 'DELETE /conversacion/{iconversacion}');
    s.self('T', 'PK de la ruta válida (400); JWT y SEG Eliminar');
    s.m('T', 'P', 'lee la fila (404)');
    s.self('T', 'dueño estricto (401)');
    s.m('T', 'P', 'itdestado = 2: baja lógica, la fila no se borra');
    s.r('T', 'C', 'la fila releída');
  },
  (b) => {
    b.componente('api', 'grp-conv-portal', 'C', ['DELETE /conversacion/{iconversacion}']);
    b.clase('ctl', 'conv', 'T', 'app');
    b.paso('val', 'PK válida (400); JWT y SEG «Eliminar»', 'T', 'mdi:shield-check-outline');
    b.paso('lee', 'Lee la fila (404)', 'T', 'mdi:database-search-outline');
    b.decision('d1', '¿Es el dueño estricto?', 'T');
    b.paso('e401', '401', 'T', 'mdi:account-cancel-outline');
    b.paso('baja', 'Baja lógica: itdestado = 2 (la fila no se borra)', 'T', 'mdi:archive-remove-outline');
    b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itercero', 'icontacto', 'itdestado']);
    b.paso('ok', 'La fila releída', 'T', 'mdi:reply-outline');
    b.fin('fin', 'T');
    b.flujo('api', 'ctl', 'DELETE');
    b.cadena('ctl', 'val', 'lee', 'd1');
    b.uso('lee', 'tconv', 'SELECT');
    b.flujo('d1', 'e401', 'no');
    b.flujo('d1', 'baja', 'sí');
    b.uso('baja', 'tconv', 'UPDATE');
    b.cadena('baja', 'ok', 'fin');
    b.flujo('e401', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

// GET /resumen_conversacion/{iconversacion} — resumen para soporte.
par({ slug: 'conversacion-resumen', module: '020-Conversaciones', title: 'Resumen para soporte' },
  [['C', 'Soporte'], ['T', 'ISS · TConversacionController'], ['P', 'PostgreSQL'], ['O', 'OpenAI']],
  (s) => {
    s.m('C', 'T', 'GET /resumen_conversacion/{iconversacion}');
    s.m('T', 'P', 'lee la conversación: mismas reglas de lectura que el detalle');
    s.m('T', 'P', 'últimos maxMensajesHistorial mensajes visibles');
    s.alt(
      ['sin mensajes', () => s.r('T', 'C', '400')],
      ['con mensajes', () => {
        s.m('T', 'O', 'operativo 9999.2, sin streaming');
        s.r('T', 'C', 'resumen + engine, model, tokens y latencia (texto por defecto si el proveedor falla)');
      }],
    );
  },
  (b) => {
    b.componente('api', 'grp-conv-portal', 'C', ['GET /resumen_conversacion/{iconversacion}']);
    b.clase('ctl', 'conv', 'T', 'app');
    b.paso('lee', 'Lee la conversación con las reglas de lectura del detalle', 'T', 'mdi:database-search-outline');
    b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itercero', 'icontacto', 'bautoriza_visualizacion']);
    b.paso('hist', 'Últimos maxMensajesHistorial mensajes visibles', 'T', 'mdi:history');
    b.tabla('tlog', 'patyia_conversacion_log', 'P');
    b.decision('d1', '¿Tiene mensajes?', 'T');
    b.paso('e400', '400', 'T', 'mdi:message-off-outline');
    b.paso('ia', 'Operativo 9999.2, sin streaming', 'T', 'mdi:robot-outline');
    b.componente('ai', 'openai-chat', 'O');
    b.paso('ok', 'Resumen con engine, model, tokens y latencia', 'T', 'mdi:text-box-check-outline');
    b.nota('n-def', 'ok', 'Si el proveedor falla: 200 con un texto por defecto');
    b.fin('fin', 'T');
    b.flujo('api', 'ctl', 'GET');
    b.cadena('ctl', 'lee', 'hist', 'd1');
    b.uso('lee', 'tconv', 'SELECT');
    b.uso('hist', 'tlog', 'SELECT');
    b.flujo('d1', 'e400', 'no');
    b.flujo('d1', 'ia', 'sí');
    b.uso('ia', 'ai', 'Responses');
    b.cadena('ia', 'ok', 'fin');
    b.flujo('e400', 'fin');
    b.flujo('fin', 'api', 'respuesta');
  });

await escribir(EPS);
console.log(`${EPS.length} editables (${EPS.length / 2} EP con secuencia y secuencia enriquecida)`);
