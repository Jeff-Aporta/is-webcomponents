/**
 * Behavior migrado desde HTML inline de is-context-menu.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface CustomEventWithDetail<T = unknown> extends Event {
  detail?: T;
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  if (!log) return;
  const append = (line: string): void => {
    log.textContent = line + '\n' + (log.textContent ?? '');
    log.scrollTop = 0;
  };
  document.querySelectorAll<HTMLElement>('is-context-menu').forEach((m: HTMLElement) => {
    m.addEventListener('is-select', (e: Event) => {
      const detail = (e as CustomEventWithDetail<{ value?: string }>).detail;
      append(`[${new Date().toLocaleTimeString()}] ${detail?.value ?? ''}`);
    });
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
