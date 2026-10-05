/** Contrato src|content de la familia file-preview (S-FP1). */
export type FileSource =
  | { kind: 'empty' }
  | { kind: 'content'; content: string }
  | { kind: 'src'; src: string };

/** Si ambos llegan, gana content. */
export function resolveFileSource(
  src: string | null | undefined,
  content: string | null | undefined,
): FileSource {
  if (content != null && String(content) !== '') {
    return { kind: 'content', content: String(content) };
  }
  if (src != null && String(src) !== '') {
    return { kind: 'src', src: String(src) };
  }
  return { kind: 'empty' };
}

export async function loadText(source: FileSource): Promise<string> {
  if (source.kind === 'empty') return '';
  if (source.kind === 'content') return source.content;
  const r = await fetch(source.src);
  if (!r.ok) {
    const err = new Error(`fetch ${r.status}`) as Error & { reason: string };
    err.reason = 'fetch';
    throw err;
  }
  return r.text();
}

/** content: data-URL, base64 puro, o texto (UTF-8 bytes). */
export async function loadArrayBuffer(source: FileSource): Promise<ArrayBuffer> {
  if (source.kind === 'empty') return new ArrayBuffer(0);
  if (source.kind === 'content') {
    const c = source.content;
    if (c.startsWith('data:')) {
      const r = await fetch(c);
      return r.arrayBuffer();
    }
    try {
      const bin = atob(c);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    } catch {
      return new TextEncoder().encode(c).buffer;
    }
  }
  const r = await fetch(source.src);
  if (!r.ok) {
    const err = new Error(`fetch ${r.status}`) as Error & { reason: string };
    err.reason = 'fetch';
    throw err;
  }
  return r.arrayBuffer();
}

export function blobUrlFromBuffer(buf: ArrayBuffer, mime: string): string {
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}
