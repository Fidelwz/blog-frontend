export function textToHtml(value: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return value.trim().split(/\n\s*\n/).filter(Boolean).map(p => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join("");
}
export function hasRichFormatting(html: string): boolean {
  return /<(?!\/?p\s*>|br\s*\/?>)[^>]+>/i.test(html) || /&(?!(?:amp|lt|gt|quot|#39);)/.test(html);
}
export function htmlToText(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<\/?p>/gi, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
}
