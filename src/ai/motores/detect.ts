/** detect.ts — motor de la herramienta `detect`. El modelo nombra en inglés las 80 clases de COCO. */
import { ObjectDetector } from 'runonweb/detect';
import type { Crear } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';

const CLASES: Record<string, string> = { person: 'persona', bicycle: 'bicicleta', car: 'carro', motorcycle: 'moto', airplane: 'avión', bus: 'bus', train: 'tren', truck: 'camión', boat: 'bote', 'traffic light': 'semáforo', 'fire hydrant': 'hidrante', 'stop sign': 'señal de pare', 'parking meter': 'parquímetro', bench: 'banca', bird: 'pájaro', cat: 'gato', dog: 'perro', horse: 'caballo', sheep: 'oveja', cow: 'vaca', elephant: 'elefante', bear: 'oso', zebra: 'cebra', giraffe: 'jirafa', backpack: 'morral', umbrella: 'paraguas', handbag: 'bolso', tie: 'corbata', suitcase: 'maleta', frisbee: 'frisbee', skis: 'esquís', snowboard: 'tabla de nieve', 'sports ball': 'balón', kite: 'cometa', 'baseball bat': 'bate', 'baseball glove': 'guante de béisbol', skateboard: 'patineta', surfboard: 'tabla de surf', 'tennis racket': 'raqueta', bottle: 'botella', 'wine glass': 'copa', cup: 'taza', fork: 'tenedor', knife: 'cuchillo', spoon: 'cuchara', bowl: 'tazón', banana: 'banano', apple: 'manzana', sandwich: 'sándwich', orange: 'naranja', broccoli: 'brócoli', carrot: 'zanahoria', 'hot dog': 'perro caliente', pizza: 'pizza', donut: 'dona', cake: 'torta', chair: 'silla', couch: 'sofá', 'potted plant': 'planta', bed: 'cama', 'dining table': 'mesa', toilet: 'inodoro', tv: 'televisor', laptop: 'portátil', mouse: 'ratón', remote: 'control remoto', keyboard: 'teclado', 'cell phone': 'celular', microwave: 'microondas', oven: 'horno', toaster: 'tostadora', sink: 'lavaplatos', refrigerator: 'nevera', book: 'libro', clock: 'reloj', vase: 'florero', scissors: 'tijeras', 'teddy bear': 'oso de peluche', 'hair drier': 'secador', toothbrush: 'cepillo de dientes' };

export const crear: Crear = async (_o, alProgreso) => {
  const m = new ObjectDetector({ normalized: true, threshold: 0.5, onProgress: alProgreso });
  await m.load();
  return {
    ejecutar: async (e) => ({ cajas: (await m.detect(e as Blob)).map((d) => ({ etiqueta: CLASES[d.label] ?? d.label, puntaje: d.score, ...d.box })) }),
    liberar: () => m.dispose(),
  };
};
