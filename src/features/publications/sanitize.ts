import sanitizeHtml from "sanitize-html";

export function safeContent(content: string) {
  return sanitizeHtml(content, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote", "code", "pre", "a"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https"], allowProtocolRelative: false,
  });
}
export function excerpt(content: string) {
  // Decode text entities without ever returning executable markup to the browser.
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim().slice(0, 240);
}
