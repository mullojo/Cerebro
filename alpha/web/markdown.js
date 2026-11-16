import { Marked } from 'https://esm.sh/marked@17.0.6';
import DOMPurify from 'https://esm.sh/dompurify@3.4.17';

const parser = new Marked({ gfm: true, breaks: false });
const cache = new Map();
const options = {
  ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'ul', 'ol', 'li',
    'blockquote', 'pre', 'code', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input'],
  ALLOWED_ATTR: ['href', 'title', 'start', 'colspan', 'rowspan', 'type', 'checked', 'disabled'],
  // Preserve the project's conversation references, as well as ordinary safe links.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|chatgpt-conversation):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'INPUT') {
    // Markdown task lists only; no editable controls can come from note HTML.
    node.setAttribute('type', 'checkbox'); node.setAttribute('disabled', '');
  }
  if (node.tagName === 'A' && /^https?:\/\//i.test(node.getAttribute('href') || '')) {
    node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(source = '') {
  const text = String(source);
  if (cache.has(text)) return cache.get(text);
  const html = DOMPurify.sanitize(parser.parse(text), options);
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(text, html);
  return html;
}

export function markdownText(source = '') {
  // Detached sanitized fragment: card summaries remain plain Vue-escaped text.
  return DOMPurify.sanitize(renderMarkdown(source), { ...options, RETURN_DOM_FRAGMENT: true })
    .textContent.replace(/\s+/g, ' ').trim();
}
