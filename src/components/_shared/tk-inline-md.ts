import { replaceIconTokensWeb } from './tk-icon-inline.js';
import { richTextInline, richTextEsc } from './tk-rich-text.js';

function esc(s: string | number | null | undefined): string {
  return richTextEsc(s);
}

function codeChipWeb(text: string): string {
  return `<code class="tk-inline-code">${text}</code>`;
}

function applyInlineMdPlainWeb(plain: string): string {
  let s = esc(plain);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+)`/g, (_m: string, code: string) => codeChipWeb(code));
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="tk-inline-link">$1</a>');
  return s;
}

function applyInlineMdWeb(plain: string): string {
  return replaceIconTokensWeb(plain, applyInlineMdPlainWeb, {});
}

/** Igual que inlineMd, con `<code class="tk-inline-code">` para el driver JSX. */
export function inlineMdWeb(raw: string | null | undefined): string {
  return richTextInline(raw, applyInlineMdWeb);
}
