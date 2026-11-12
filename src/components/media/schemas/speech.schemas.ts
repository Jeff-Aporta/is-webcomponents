// @contexto INDICE.md · src/components/media/README.md
/**
 * speech.ts — Tipos del subset de Web Speech API que usa `<iswc-speech>`.
 *
 * La API no está disponible de forma uniforme en `lib.dom.d.ts`; estos
 * contratos viven en el schema para que el constructor y sus consumidores
 * compartan exactamente el mismo modelo.
 */

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

export interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

export interface SpeechRecognitionConstructorBag {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type SpeechEventos = { 'iswc-error': { message: string }; 'iswc-result': { transcript: string; isFinal: boolean }; 'iswc-speak-end': undefined };
