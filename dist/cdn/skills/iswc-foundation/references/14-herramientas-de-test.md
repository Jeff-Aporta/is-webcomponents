<!-- @vendor 2026-10-14T00:35:24.801Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-foundation/references/14-herramientas-de-test.md -->
# 14 — Herramientas de test: qué usar y cuándo (guía para agentes)

Fuente única para ISS, ISW, el kit y toda app iswc. Las apps NO copian este texto: enlazan aquí desde
su `AGENTS.md` y su spec de pruebas, y solo agregan lo propio (rutas, ids, credenciales de prueba).
Fijado por Jeff el 2026-10-13.

## 1. Principios (WHAT)

1. **La app es una caja negra.** Un test sabe QUÉ debe hacer y QUÉ debe responder; nunca CÓMO lo hace.
   No inspecciona SQL, orden de validaciones, módulos internos ni DOM privado de un componente.
2. **Specs: WHAT primero.** Se destilan los WHAT (comportamiento observable, códigos, invariantes de datos).
   Los HOW se escriben lo más débiles posible (**HOW WEAK**). Solo son **HOW STRONG** los contratos o
   definiciones estrictas de tecnología/arquitectura que hay que respetar (rutas inmutables del portal,
   formato de un pin, perfil de vendor, nombre de una columna heredada del stack). Cada sección de una
   spec dice de cuál de los tres es.
3. **Cobertura por lluvia de ideas.** Antes de escribir tests de un área se corre `/deep-test-proposals`
   (o su equivalente: lista de QUÉ debe pasar y QUÉ no, por actor, por entrada y por error) sobre TODO lo
   testeable, y se cubre completo. Siempre más WHAT que HOW.
4. **Todo con cooldown, por test atómico.** Ningún procedimiento de salud corre fuera del runner común
   del kit ([07](07-pruebas-y-gate.md)): verde de 1 min = 24 h sin repetirse (x1440), un rojo corre
   siempre, memoria en `.tmp/test-cooldown.json` por id de test (nunca por lote ni por archivo). La
   única puerta es `test:all` y es exactamente lo que ejecuta el sync al entregable.
5. **Los jueces son opcionales.** Embeddings, JEV y LLM refinan donde traen ventaja real y ayudan a
   expresar un WHAT con semántica en vez de con regex/hardcode. Nunca son obligatorios, nunca
   reemplazan lo determinista cuando lo determinista basta, y un juez caído es aviso o salto, no rojo.

## 2. Qué herramienta para qué

| Qué se prueba | Herramienta | Nunca |
| --- | --- | --- |
| API, datos, flujos de negocio (e2e sin UI) | **Controllers client/server** de la app (`T*Client`, `T*Controller`, fachada tipada con sus Zod) | `fetch` a mano, SQL crudo, `pg` directo |
| Patches de BD / datos de prueba | **Controllers server** (`fundar`, `actualizarParcial`, `insertBatch`…) y la operación tipada `esquema` | archivos `.sql`, `ALTER` a mano, clones de tablas |
| UI / UX (vistas, componentes, recorridos) | **Stagehand** (npm) o **e2e de navegador** (Playwright puro); `enSombra` para shadow DOM | credenciales en `act()`/`extract()`, `act()` dentro del gate |
| Dominio puro (`utils/`, `core/`, `lib/`) | importar el módulo **publicado** (`dist/cdn/…`) | importar `src/` interno de otro paquete |
| Estructura (anatomía, pines, tokens, vendor) | guardianes de fuente declarados `categoria: 'how'` | guardianes que fijen HOW débiles (p. ej. el verbo HTTP cuando la ruta sirve varios) |
| Pertinencia / orientación de una respuesta (texto) | **Juez semántico** `semantica.ts` (embeddings locales `multilingual-e5-base`, determinista) | comparar por `includes` de palabras clave |
| Juicio abstracto (fidelidad, claridad, memoria entre turnos) | **JEV** (`preguntarJev`) y luego **LLM** (`juzgarConLlm`, pila MiniMax/DeepSeek…) | juez como única aserción cuando hay forma determinista |
| Cobertura de rutas / endpoints | cruce de lo registrado por el host con lo ejercitado (gate) | lista mantenida a mano |

## 3. Las capas de refinación, en orden

Siempre de la más barata y determinista a la más cara:

1. **Determinista simple**: estructura, códigos, Zod del contrato, conteos, regex de forma.
2. **Semántica local** (`shared/testing/semantica.ts`, perfil shared): `coincide(texto, deseado)`,
   `prefiere(texto, deseado, contrario)`, `masCercana(texto, opciones)`. Modelo `Xenova/multilingual-e5-base`
   (ONNX q8) desde la caché de Hugging Face del equipo o `TEST_E5_MODEL_DIR`; nunca descarga. Sin modelo
   el test se salta con motivo. Orientaciones = textos PLAUSIBLES del asistente, nunca meta-descripciones.
   Calibración viva: ISS `tests/unit/74-semantica-what.test.ts`.
3. **JEV** (TypeSafe): `noul` (sí/no con probabilidad), `choice`, `score`. Umbrales de
   [12-jueces.md](12-jueces.md): p < 0,3 rechazo, 0,3–0,5 aviso, ≥ 0,5 cumple.
4. **LLM** (MiniMax y la pila de [11-stagehand.md](11-stagehand.md)): misma lectura de probabilidad, mismo
   cooldown de 24 h por llave. `capaOpcional` nunca pone rojo por caída; `exigirJuez` solo en pruebas
   que son exclusivamente de juez (se saltan sin juez).

Dónde SÍ conviene un juez: respuestas conversacionales, títulos generados, resúmenes, mensajes de error
al usuario, memoria entre turnos, calidad de adjuntos (imagen/audio). Dónde NO: códigos HTTP, formas
Zod, permisos, conteos, orden de listas, fechas.

## 4. Piezas del kit (lo que cada app vendoriza)

| Pieza | Perfil | Qué da |
| --- | --- | --- |
| `shared/testing/pruebas.ts` | shared | runner común (lista por archivo, cooldown por test, reintento, aislamiento por proceso) |
| `shared/testing/test-cooldown.ts` | shared | cooldown x1440 de tests y de llaves; cola |
| `shared/testing/semantica.ts` | shared | juez semántico determinista (embeddings locales) |
| `shared/testing/jueces.ts` | shared | JEV, juez LLM, `capaOpcional`, `exigirJuez`, umbrales |
| `shared/testing/proveedores-llm.ts` | shared | pila de proveedores LLM con cooldown de llaves |
| `client/testing/stagehand.ts` | client | Stagehand con generador y fallback, destino por protocolo |
| `shared/schemas.ts` | shared | todos los Zod de lo anterior, por secciones; el vendor poda lo que la app no usa |
| `shared/tools/vendor.ts`, `pin-update.mjs` | shared | distribución y pines ([06](06-pines-y-vendor.md)) |

Todo lo de jueces vive en `tests/` (o `src-experimental/`) de la app: nunca llega al entregable
(guardián en cada app).

## 5. Checklist al crear o auditar un test

- [ ] ¿Está escrito como WHAT (qué entra, qué sale, qué no debe pasar)? ¿El nombre lleva su `[W-*]`?
- [ ] ¿Usa el controller/fachada tipada y los Zod del contrato, sin `as any`/`as unknown`?
- [ ] ¿Si toca UI, va por Stagehand/navegador sin credenciales en el LLM?
- [ ] ¿Si toca datos, los crea y limpia por controller en `finally`?
- [ ] ¿La aserción principal es determinista? ¿Un juez (semántica → JEV → LLM) la haría más fiel al WHAT?
- [ ] ¿Corre dentro del runner común (cooldown por test, reintento) y aparece en `test:all`?
- [ ] ¿La spec clasifica lo que el test fija como WHAT / HOW WEAK / HOW STRONG?
