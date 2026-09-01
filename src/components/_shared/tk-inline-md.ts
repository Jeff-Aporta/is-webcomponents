import { replaceIconTokensWeb } from './tk-icon-inline.js';
import { richTextInline, richTextEsc } from './tk-rich-text.js';

function esc(s) {
  return richTextEsc(s);
}

function codeChipWeb(text: string) {
  return `<code class="tk-inline-code">${text}</code>`;
}

function applyInlineMdPlainWeb(plain) {
  let s = esc(plain);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`]+)`/g, (_m, code) => codeChipWeb(code));
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="tk-inline-link">$1</a>');
  return s;
}

function applyInlineMdWeb(plain) {
  return replaceIconTokensWeb(plain, applyInlineMdPlainWeb);
}

/** Igual que inlineMd, con `<code class="tk-inline-code">` para el driver JSX. */
export function inlineMdWeb(raw) {
  return richTextInline(raw, applyInlineMdWeb);
}
