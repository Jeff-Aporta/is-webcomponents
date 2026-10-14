// semantica.test.ts — calibración del juez semántico determinista (src/vendor-distributions/shared/testing/semantica.ts),
// réplica de la calibración 74 del ISS (`tests/unit/74-semantica-what.test.ts`). SIN RED: si el modelo
// `multilingual-e5-base` no está en el equipo, se SALTA con motivo (nunca verde por omisión).
//   S1 el modelo carga sin red; el mismo texto da 1; `semanticaDisponible` acompaña.
//   S2 pares relacionados (español, dominio ContaPyme) quedan >= UMBRAL_COINCIDE.
//   S3 pares NO relacionados quedan por debajo del umbral, con separación real (>= 0,03).
//   S4 `prefiere` separa orientaciones (respuesta útil vs rechazo vs aclaración) con margen; una meta-descripción no separa.
//   S5 `masCercana` clasifica respuestas típicas del asistente.
//   S6 `TEST_E5_MODEL_DIR` sin `config.json` se ignora (cae al cache de Hugging Face) y el motivo del salto es claro.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { coincide, MARGEN_PREFIERE, masCercana, MOTIVO_SIN_MODELO, prefiere, semanticaDisponible, similitud, ubicacionModelo, UMBRAL_COINCIDE } from '../../../vendor-distributions/shared/testing/semantica.ts';

const disponible = semanticaDisponible();
const motivo = disponible ? '' : ` [SALTADA: ${MOTIVO_SIN_MODELO}]`;

const RELACIONADOS: Array<[string, string]> = [
  ['¿Cómo configuro la facturación electrónica?', 'Para configurar la facturación electrónica entre a Configuración > DIAN y registre el certificado.'],
  ['¿De qué color es la imagen?', 'La imagen es completamente roja.'],
  ['La conversación está cerrada', 'No puede continuar porque la conversación se encuentra cerrada o eliminada'],
  ['No entendí la nota de audio, ¿me la escribes?', 'La única nota de audio no la pude entender. ¿Me la escribes en texto?'],
  ['explica cómo crear un tercero', 'para registrar un cliente nuevo vaya al módulo de terceros y pulse Nuevo'],
  ['¿cómo liquido la nómina?', 'La nómina se liquida desde el módulo de Nómina: cree el periodo, cargue novedades y liquide.'],
];
const NO_RELACIONADOS: Array<[string, string]> = [
  ['¿Cómo configuro la facturación electrónica?', 'El clima de hoy está soleado en Bogotá.'],
  ['¿De qué color es la imagen?', 'La nómina se liquida cada quincena.'],
  ['La conversación está cerrada', 'Hola, ¿en qué te puedo ayudar hoy?'],
  ['explica cómo crear un tercero', 'el inventario se valora por promedio ponderado'],
  ['¿cómo liquido la nómina?', 'Te recomiendo revisar el certificado digital de la DIAN para facturar.'],
];

Deno.test({
  name: `semantica: S1-S5 calibración del verificador e5 local (umbrales de los tests QA)${motivo}`,
  ignore: !disponible,
  async fn() {
    const t0 = Date.now();
    const s0 = await similitud('hola', 'hola');
    assert(Date.now() - t0 < 60_000 && s0 >= 0.999, `S1 carga + primer embedding: ${Date.now() - t0} ms, sim=${s0}`);

    const rel = await Promise.all(RELACIONADOS.map(async ([a, b]) => ({ a, sim: (await coincide(a, b)).sim })));
    const minRel = Math.min(...rel.map((r) => r.sim));
    assert(rel.every((r) => r.sim >= UMBRAL_COINCIDE), `S2 relacionados >= ${UMBRAL_COINCIDE}: ${JSON.stringify(rel)}`);
    const no = await Promise.all(NO_RELACIONADOS.map(async ([a, b]) => ({ a, sim: (await coincide(a, b)).sim })));
    const maxNo = Math.max(...no.map((r) => r.sim));
    assert(no.every((r) => r.sim < UMBRAL_COINCIDE), `S3 no relacionados < ${UMBRAL_COINCIDE}: ${JSON.stringify(no)}`);
    assert(minRel - maxNo >= 0.03, `S3 separación real: minRel=${minRel} maxNo=${maxNo}`);

    const respuestaUtil = 'Para activar la facturación electrónica en ContaPyme debes ir a Configuración, pestaña DIAN, cargar el certificado digital, registrar la resolución y habilitar el envío. Luego prueba con una factura de ejemplo.';
    const rechazo = 'Lo siento, no puedo ayudarte con eso. Esa consulta no corresponde a los módulos de ContaPyme.';
    const pedirRepetir = 'No logré entender tu mensaje, ¿podrías repetirlo con más detalle?';
    // Las orientaciones se escriben como TEXTOS PLAUSIBLES del asistente (ejemplares), no como meta-descripciones.
    const ORIENTACION = {
      guia: 'Para hacerlo en ContaPyme ve al módulo correspondiente, abre la opción indicada y sigue estos pasos: primero, segundo y tercero.',
      rechazo: 'Lo siento, no puedo ayudarte con esa consulta porque no corresponde a ContaPyme.',
      aclaracion: 'No entendí bien tu pregunta, ¿me la puedes repetir o dar más detalles?',
      color: 'La imagen es de un solo color: rojo.',
    };
    const p1 = await prefiere(respuestaUtil, ORIENTACION.guia, [ORIENTACION.rechazo, ORIENTACION.aclaracion]);
    assert(p1.ok, `S4 respuesta útil → guía (margen >= ${MARGEN_PREFIERE}): ${JSON.stringify(p1)}`);
    const p2 = await prefiere(rechazo, ORIENTACION.rechazo, ORIENTACION.guia);
    assert(p2.ok, `S4 rechazo → rechazo: ${JSON.stringify(p2)}`);
    const p3 = await prefiere(pedirRepetir, ORIENTACION.aclaracion, ORIENTACION.guia);
    assert(p3.ok, `S4 pedir que repita → aclaración: ${JSON.stringify(p3)}`);
    const meta = await prefiere(rechazo, 'rechaza la consulta por estar fuera de alcance', 'explica paso a paso cómo configurar la facturación electrónica');
    assert(!meta.ok, `S4 (evidencia) una meta-descripción NO separa, por eso se usan ejemplares: ${JSON.stringify(meta)}`);

    assertEquals((await masCercana(respuestaUtil, ORIENTACION)).clave, 'guia', 'S5 respuesta útil → guía');
    assertEquals((await masCercana(rechazo, ORIENTACION)).clave, 'rechazo', 'S5 rechazo → rechazo');
    assertEquals((await masCercana('La imagen adjunta es un cuadrado de color rojo.', ORIENTACION)).clave, 'color', 'S5 imagen roja → color');
  },
});

Deno.test('semantica: S6 una TEST_E5_MODEL_DIR sin modelo se ignora y el motivo del salto es claro (nunca se descarga)', () => {
  const vacia = Deno.makeTempDirSync({ prefix: 'sin-modelo-' });
  assertEquals(ubicacionModelo({ TEST_E5_MODEL_DIR: vacia }), ubicacionModelo({}), 'una carpeta sin config.json no es un modelo: se cae al cache (o null)');
  assert(/multilingual-e5-base/.test(MOTIVO_SIN_MODELO) && /nunca se descarga/.test(MOTIVO_SIN_MODELO), MOTIVO_SIN_MODELO);
  assertEquals(typeof disponible, 'boolean');
});
