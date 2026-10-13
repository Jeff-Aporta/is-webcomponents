<!-- @vendor 2026-10-13T13:41:30.061Z Jeff-Aporta/is-webcomponents@local dist/cdn/skills/iswc-foundation/references/11-stagehand.md -->
# 11 — Stagehand compartido: proveedores LLM, generador con fallback y destino por protocolo

Guía para agentes que escriben o corren e2e de UI en un front del kit (ISW, ISS y los que vengan).
Todo lo genérico vive en el kit: el controlador en `vendor-distributions/client/testing/stagehand.ts` (perfil `client`)
y la pila de proveedores LLM en `vendor-distributions/shared/testing/proveedores-llm.ts` (perfil `shared`: la usan
también los jueces de un server, sin navegador); sus contratos son las secciones `stagehand` y `proveedores-llm` del
`shared/schemas.ts` único (que `vendor.ts` poda a esas secciones);
el consumidor pone solo lo suyo: dónde están las keys, las URLs de sus destinos, el JWT de la sonda y
cómo fija el destino desde su UI. Sin dependencia dura de `@browserbasehq/stagehand`: son funciones
puras + `fetch`, y el consumidor pasa el generador a `Stagehand.create`.

## Qué se vendoriza

| Archivo | Hacia (sugerido) |
| --- | --- |
| `dist/cdn/vendor-distributions/client/testing/stagehand.ts` | `tests/e2e/ISU/stagehand.ts` |
| `dist/cdn/vendor-distributions/shared/testing/proveedores-llm.ts` | `tests/e2e/ISU/proveedores-llm.ts` |
| `dist/cdn/vendor-distributions/shared/testing/test-cooldown.ts` | `tests/e2e/ISU/test-cooldown.ts` |
| `dist/cdn/vendor-distributions/shared/schemas.ts` (podado a `comun`, `stagehand`, `proveedores-llm`, `test-cooldown`) | `tests/e2e/ISU/schemas.ts` |

El consumidor declara `"perfil": "client"`. `stagehand.ts` importa `../../shared/testing/…`; al aplanar en `ISU/`,
`vendor.ts` reescribe esas rutas a `./…`. `stagehand.ts` reexporta la pila de proveedores (`leerProveedoresDeArchivo`,
`elegirProveedor`, `elegirProveedorOpcional`, `evaluarSondaLlm`…); quien solo necesita la pila (sin generador ni
destino) importa `proveedores-llm.ts` directamente y no vendoriza `stagehand.ts`.
`doc` de todos en `vendor.json`: `skills/iswc-foundation/references/11-stagehand.md`. Necesita el `zod`
del consumidor (como `obj.ts`).

## 1. Keys: array de proveedores FUERA del repo

Un JSON fuera del repo (en el workspace personal, junto a `secrets.json`; nunca versionado):

```json
{
  "proveedores": [
    { "nombre": "deepseek", "apiKey": "sk-…", "model": "deepseek-chat", "baseUrl": "https://api.deepseek.com/v1" },
    { "nombre": "openai",   "apiKey": "sk-…", "model": "gpt-4o-mini" },
    { "nombre": "minimax",  "apiKey": "…",    "model": "MiniMax-M3", "baseUrl": "https://api.minimax.io/v1",
      "extra": { "thinking": { "type": "disabled" } } }
  ]
}
```

- El ORDEN es la prioridad. Todo proveedor es OpenAI-compatible: `POST {baseUrl}/chat/completions`
  con `Bearer apiKey`. `baseUrl` por defecto es OpenAI; `extra` son campos que el proveedor exige en
  el cuerpo (MiniMax: `thinking` desactivado).
- `leerProveedoresDeArchivo(ruta)` lo lee tolerante (ausente/corrupto → `[]`; sin `apiKey`/`model` se
  descarta; `nombre` repetido se descarta). El consumidor puede sumar más con `validarProveedores([...])`
  (p. ej. una key que ya tenía en `secrets.json`).

## 2. Barrido previo y cache (`elegirProveedor`)

Antes de abrir el navegador, una sonda mínima (completion de 8 tokens, timeout 20 s) a cada proveedor
en orden; se queda con el PRIMERO funcional. Se salta, con su causa: 401/403 (key rechazada), 402
(sin saldo), 429 (cuota), `insufficient balance`/`quota`/`credit` en el mensaje, respuesta vacía, sin
respuesta (red/timeout). Sin ninguno funcional lanza con TODAS las causas: la batería queda en rojo
con el informe, nunca en verde sin probar.

- Cache del elegido en `rutaCache` (JSON `{ nombre, ts }`, TTL 30 min, `ttlMs` configurable), para
  que cada archivo e2e (cada proceso) no repita la sonda.
- `E2E_LLM_PROVEEDOR=<nombre>` fuerza uno (sin sondar). `E2E_LLM_BARRIDO=1` ignora la cache y barre.
- Devuelve `{ proveedor, origen: 'forzado'|'cache'|'barrido', sondas, orden }`. `orden` es la pila
  para el generador: el elegido primero, después los demás que el barrido no descartó.

## 3. Generador para Stagehand (`crearGenerador`)

```ts
const control = crearGenerador(eleccion.orden, { reintentos: 3, timeoutMs: 120_000 });
const stagehand = await Stagehand.create({ browser, model: { generate: control.generate } });
```

- Pide el esquema (`responseFormat.schema`) dentro del system prompt y normaliza la respuesta
  (`normalizarJson`: quita cercos ```json```, extrae el primer objeto/array balanceado si hay prosa
  alrededor); devuelve `{ role, content, outputFormat: 'json_schema', structuredContent, usage }`.
- Bloques `text`/`image`/`tool_result` de Stagehand → partes OpenAI (`text` / `image_url` data URL).
- **Round-robin con fallback durante la corrida**: la petición va al proveedor actual; ante 429/5xx
  o JSON no parseable reintenta (`reintentos`, con espera creciente); si el fallo es definitivo
  (saldo, key, cuota) o persiste, marca el proveedor caído (`reposoMs`, 5 min) y pasa al siguiente
  **sin tumbar el test**; el siguiente queda como actual. Sin ninguno, error con todas las causas
  (incluidas las de los caídos antes). `control.estado()` dice el actual y los caídos.

## 4. Destino de pruebas por protocolo (`resolverDestino`)

El kit decide; el consumidor describe. Lista de destinos en orden de preferencia, cada uno con su
sonda inyectable:

```ts
const destinos = [
  { id: 'staging', sondear: () => sondaContrato(URLS.staging, jwtQa) },
  { id: 'local',   sondear: () => sondaContrato(URLS.local, jwtQa) },
];
const ctx = await resolverDestino({ destinos, preferido: destinoPreferido(process.env.E2E_DESTINO, ['local', 'staging'], 'staging', { prod: 'production' }) });
// ctx = { destino: 'local', motivo: 'staging falla (/api/sistema/cfg HTTP 500) → protocolo: probar contra local', sondas }
```

- El preferido va primero (si no está en la lista es error); si su sonda pasa, es el destino; si no,
  el siguiente de la lista, con `motivo`; una sonda que lanza cuenta como fallida. Sin ninguno
  funcional: error con las causas.
- **Una vez por proceso**: `const destino = unaVezPorProceso(() => resolverDestino({...}))` y
  `await destino.obtener()` donde haga falta (`olvidar()` solo en tests).
- Lo que queda en el consumidor: las URLs por destino, el JWT de la sonda (`/api/info` +
  `/api/sistema/cfg` en el ISS), y **fijar el destino DESDE LA UI del front** (el chip «Cambiar
  destino» de `<paty-iss-target>` en ISW: `establecerContextoIss(page, ctx.destino)`); nunca a mano
  en `localStorage` salvo la sesión QA inyectada.

## 5. Integración con el sistema común de pruebas

`prepararStagehand` junta 2 + 3 + 4 para el `antes` de `definirPruebas` (07-pruebas-y-gate.md):

```ts
// tests/e2e/lib/stagehand.ts del consumidor
import { leerProveedoresDeArchivo, prepararStagehand, unaVezPorProceso } from './ISU/stagehand.ts';
export const sh = unaVezPorProceso(() => prepararStagehand({
  proveedores: leerProveedoresDeArchivo(RUTA_KEYS),       // fuera del repo
  destinos, preferido,
  rutaCache: '.tmp/stagehand-proveedor.json',
}));

// tests/e2e/10.login.test.ts
export default definirPruebas([...], {
  antes: async () => {
    const { generate, contexto } = await sh.obtener();
    stagehand = await Stagehand.create({ browser, model: { generate } });
    await establecerDestinoDesdeLaUi(page, contexto.destino);
  },
});
```

Cada archivo de pruebas corre en su proceso (`correrPruebas({ aislar })`), así que «una vez por
proceso» = una vez por archivo; la cache del barrido evita repetir la sonda entre archivos. El
cooldown (`test-cooldown.ts`) sigue aplicando por prueba: un e2e verde no se repite hasta vencer.

## Variables

| Variable | Efecto |
| --- | --- |
| `E2E_LLM_PROVEEDOR=<nombre>` | fuerza ese proveedor (sin barrido); si no está en la lista, error |
| `E2E_LLM_BARRIDO=1` | ignora la cache y barre de nuevo |
| `E2E_DESTINO=<id>` (o la del consumidor) | destino preferido; el kit lo normaliza con `destinoPreferido` |

## Guardianes

`src/utils/health/meta/stagehand.test.ts` (fetch simulado): lista/orden, causas de la sonda, barrido,
forzado, cache/TTL, esquema en el prompt + normalización, fallback/round-robin/reposo, destino por
protocolo y memo por proceso.

## Jueces opcionales y cooldown de llaves

La pila de proveedores respeta el cooldown de 24 h por llave (`test-cooldown.ts`) y `elegirProveedorOpcional` no lanza: sin proveedor, el consumidor sigue en modo determinista. Los jueces de calidad (JEV y LLM) y su estándar están en [12-jueces.md](12-jueces.md).
