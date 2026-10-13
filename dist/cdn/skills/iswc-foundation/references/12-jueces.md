<!-- @vendor 2026-10-13T13:38:40.106Z Jeff-Aporta/is-webcomponents@local dist/cdn/skills/iswc-foundation/references/12-jueces.md -->
# Jueces de calidad: JEV y LLM (estándar entre apps)

Capa EXTRA de control de calidad para las pruebas de todas las apps del kit (ISS, ISW, el propio kit). La base de toda prueba es determinista. Los jueces solo refinan lo que un algoritmo no puede juzgar bien.

## Regla

1. **Primero lo simple.** Si una regex, un conteo, una estructura o un embedding local resuelven el criterio, se usa eso. El juez nunca reemplaza una aserción determinista: se suma.
2. **El juez es para lo abstracto.** Pertinencia de una respuesta, fidelidad de un resumen, calidad de un título, claridad de un mensaje de error, memoria entre turnos.
3. **Un juez caído es AVISO, nunca error.** Sin llave, sin saldo, key vencida, cuota o caída: la capa se salta con el motivo y la prueba sigue con lo determinista.
4. **Prueba exclusiva de juez:** si no hay juez, se SALTA con el motivo. Nunca queda en rojo.
5. **Cooldown de 24 h por llave.** Lo pone solo el fallo definitivo (saldo, key, cuota). Se reactiva a mano con `"cooldownHasta": -1`.
6. **Nunca en el entregable.** Los jueces viven en `tests/` (o `src-experimental`) de cada app. Lo que el sync copia a `_entregable` no los importa ni los nombra. Cada app tiene un guardián que lo verifica.

## Umbrales estándar

Una probabilidad de juez (0..1) se lee con `veredictoProbabilidad(p)`:

| p | Veredicto | Efecto |
|---|---|---|
| < 0,3 (`UMBRAL_RECHAZO`) | rechazo | la prueba falla |
| 0,3 a 0,5 | dudoso | solo aviso, nunca rojo |
| ≥ 0,5 (`UMBRAL_DUDA`) | cumple | pasa |

Un veredicto incierto nunca tumba el gate: el juez refina, no decide solo.

## Piezas del kit (`src/vendor-distributions/shared/testing/`, perfil `shared`: sin navegador, sirven a server y client)

| Archivo | Qué da |
|---|---|
| `semantica.ts` | Juez semántico DETERMINISTA (embeddings locales, sin red ni llaves): `semanticaDisponible`, `similitud`, `coincide`, `prefiere`, `masCercana` |
| `jueces.ts` | `preguntarJev`, `juzgarConLlm`, `capaOpcional`, `exigirJuez` |
| `test-cooldown.ts` | El cooldown de pruebas de siempre y, en el mismo sistema, el de llaves: `estadoLlave`, `marcarCooldown`, `COOLDOWN_LLAVE_MS` |
| `proveedores-llm.ts` | La pila de proveedores LLM (antes dentro de `stagehand.ts`) respeta el mismo cooldown; `elegirProveedorOpcional` no lanza |
| `../schemas.ts` | Contratos de todos (secciones `semantica`, `jueces`, `proveedores-llm`, `test-cooldown`; `vendor.ts` lo poda) |

### Tres capas de juicio, en este orden (todas opcionales, ninguna obligatoria)

1. **Lo simple primero**: igualdad, regex, `expect`/`eq` sobre lo observable. Determinista, sin dependencias.
2. **Semántica local** (`semantica.ts`): embeddings deterministas con `multilingual-e5-base` (ONNX cuantizado) vía
   `@huggingface/transformers` (devDependency del consumidor; en Deno `npm:@huggingface/transformers`). El modelo sale
   SOLO del cache de Hugging Face del equipo (`~/.cache/huggingface/hub`) o de `TEST_E5_MODEL_DIR`; **nunca se descarga**.
   Sin modelo, `semanticaDisponible()` es `false`, las funciones lanzan un error claro y la prueba que las use se
   salta con ese motivo (nunca verde por omisión). Umbrales calibrados (`UMBRAL_COINCIDE` 0,84; `MARGEN_PREFIERE` 0,02):
   `coincide` (umbral absoluto) y `prefiere` (contraste: la orientación deseada le gana a la contraria; la forma robusta
   para respuestas largas). Las orientaciones se escriben como textos PLAUSIBLES del asistente, nunca meta-descripciones.
   Calibración: ISS `tests/unit/74-semantica-what.test.ts` y kit `meta/semantica.test.ts` (se salta con motivo sin modelo).
3. **JEV / LLM** (`jueces.ts`): red, llaves, cooldown de 24 h; refinan, no deciden solos.

### JEV (TypeSafe)

`preguntarJev(o, texto, preguntas)` hace `POST {baseUrl}/systemone` con `Authorization: Bearer <apiKey>`. Hay tres tipos de pregunta:

- `noul`: sí o no, con probabilidad de 0 a 1 (`{ type: 'noul', instructions }`).
- `choice`: una opción de varias (`{ type: 'choice', instructions, criteria: { clave: 'descripción' } }`).
- `score`: escala ordinal (`{ type: 'score', instructions, criteria: ['bajo', 'medio', 'alto'] }`).

En una sola llamada caben varias preguntas.

### Juez LLM

`juzgarConLlm(o, instrucciones, texto)` recorre la pila de proveedores en orden (MiniMax, DeepSeek…), salta los que están en cooldown y devuelve el primer JSON válido. Limpia los bloques `<think>`.

### Veredicto

Los dos devuelven `{ evaluado: true, respuestas, juez }` o `{ evaluado: false, motivo }`. Ninguno lanza. Para estrechar el tipo, use `'respuestas' in v` o `'motivo' in v`: sirve también en consumidores sin `strictNullChecks`.

## Archivo de llaves (fuera de todo repo)

`C:/ContaPyme/Personal/stagehand-keys.json`:

```json
{
  "proveedores": [
    { "nombre": "minimax", "apiKey": "…", "model": "MiniMax-M3", "baseUrl": "https://api.minimax.io/v1" },
    { "nombre": "deepseek", "apiKey": "…", "model": "deepseek-chat", "baseUrl": "https://api.deepseek.com/v1", "cooldownHasta": "2026-10-13T12:00:00.000Z" }
  ],
  "jev": { "apiKey": "…", "model": "jev-latest", "baseUrl": "https://api.typesafe.ai/v1" }
}
```

Reactivar una llave después de recargar saldo o cambiar la key: `"cooldownHasta": -1`.

## Vendor (estrategia de distribución)

Cada app baja estos archivos con su `vendor.ts` (pin por fecha ISO). Compiten el checkout local del kit (`"local"` en su `vendor.json`) y el HEAD remoto, y gana el más reciente. Así cada app toma la última versión del kit en cuanto existe, local o publicada.

| App | Destino | Adaptador |
|---|---|---|
| ISS | `tests/.audit/ISU/` | `tests/_shared/jueces.ts` (`probabilidadJuez`) |
| ISW | `tests/vendor/is-webcomponents/tools/` (nunca `src/`: va al entregable) | `tests/e2e/lib/jueces.ts` (`probabilidadJuez`) |

Los imports relativos viajan juntos: `jueces.ts` necesita `test-cooldown.ts`, `proveedores-llm.ts` (ambos de `shared/testing/`) y el `schemas.ts` único (que `vendor.ts` poda a `comun`, `jueces`, `proveedores-llm`, `test-cooldown`); `semantica.ts` solo necesita `schemas.ts` (sección `semantica`). Ya no necesita `stagehand.ts`: un server (ISS) vendoriza los jueces sin nada de `client/`.

## Uso típico (adaptador de la app)

```ts
const p = await probabilidadJuez(ctx, 'resumen', resumen, 'El resumen describe la conversación sin inventar datos');
if (p !== null) expect('resumen (juez) fiel a la conversación', p >= 0.5, `p=${p.toFixed(2)}`);
```

El adaptador prueba JEV primero y el LLM de respaldo. Sin ninguno, deja el aviso `[capa juez <nombre>] saltada: <motivo>` y devuelve `null`.

## Guardianes

- Kit `src/utils/health/meta/jueces.test.ts`: J1-J7 (sin llave, JEV OK, sin saldo con cooldown, `-1` reactiva, pila LLM con cooldown, capa y salto, Stagehand con cooldown); `meta/semantica.test.ts`: S1-S6 (calibración e5, salto con motivo sin modelo).
- ISS `tests/health/95-jueces-fuera-del-entregable-what.test.ts` e ISW `tests/plataforma/jueces-fuera-del-entregable.test.ts`: nada entregable importa o cita los jueces.
