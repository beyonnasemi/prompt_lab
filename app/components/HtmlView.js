'use client';

import { cn } from '@/lib/utils';

/**
 * Renders sanitized HTML with prose styling.
 * Use for read-only display of rich content stored as HTML.
 */
export default function HtmlView({ html, className, tone = 'default' }) {
  if (!html) return null;

  const safeHtml = sanitize(
    html
      .replace(/<!--THREAD-->/g, '')
      .replace(/\[PARENT:[^\]]+\]/g, ''),
  );

  // If the content is plain text (no html tags at all), preserve line breaks
  const isHtml = /<[a-z][\s\S]*>/i.test(safeHtml);

  return (
    <div
      className={cn(
        'prose-prompt',
        tone === 'muted' && 'prose-prompt--muted',
        tone === 'brand' && 'prose-prompt--brand',
        !isHtml && 'whitespace-pre-wrap',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

/**
 * Lightweight sanitizer:
 *  - strips <script>, <style>, <iframe>, <object>, <embed>
 *  - strips inline event handlers (on*)
 *  - strips javascript: / vbscript: / data:text/html URLs
 *  - strips structural html/head/body/meta tags
 *
 * Note: For a 100% hardened solution, move to DOMPurify server-side.
 * This is a client-side display sanitizer — content comes from trusted admins.
 */
function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<\/?(html|head|body|meta)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*"\s*(javascript|vbscript|data:text\/html)[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*(javascript|vbscript|data:text\/html)[^']*'/gi, "$1='#'");
}
