# src/ai — las herramientas de IA del kit

Las herramientas que el kit expone para trabajar con imagenes, texto y audio: OCR, traduccion,
texto a voz, limpieza, eliminacion de fondo, deteccion, emoji, incrustacion y embeddings.

## Que hay aqui

| Ruta | Que es |
|---|---|
| `herramientas.ts` | el catalogo de herramientas: nombre, que hacen y que motor usan |
| `motores.ts` | los motores (los que hacen el trabajo) y su catalogo |
| `motores/*.ts` | un motor por capacidad: `ocr`, `translate`, `tts`, `stt`, `clean`, `embed`, `image`, `remove-bg`, `detect`, `depth`, `classify`, `caption`, `emoji` |
| `descarga.ts` | como se pide el modelo y como se guarda en disco |
| `aplanado.ts`, `aplanado-ajuste.ts` | el texto plano que ve el modelo |
| `orden.ts` | como se ordena el trabajo del modelo |
| `vector-local.ts` | los vectores locales (la busqueda por significado) |
| `schemas/ai.schemas.ts` | los tipos del catalogo de herramientas |

## Las reglas

- Un motor **nunca** se importa desde el cierre de un componente: se pide por URL. Lo vigila el
  guardian `gobernanza/deps-json`.
- El modelo se descarga una vez y se cachea; a partir de ahi no se vuelve a pedir.
- Las URLs de los motores no llevan `?v=`.
- Los pesos del modelo (de los que habla `orden.ts`) se eligen por tamano, no por nombre.

## Antes de tocar algo de aqui

Lee `INDICE.md` y este archivo. La forma canonica de un motor esta en
`skills/iswc-foundation/references/` (el catalogo de herramientas y como se documenta).
