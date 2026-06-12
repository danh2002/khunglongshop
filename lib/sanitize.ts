import DOMPurify from "dompurify";

const FORBIDDEN_TAGS = [
  "script",
  "img",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "link",
  "meta",
  "style",
];

const FORBIDDEN_ATTRIBUTES = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
  "onreset",
  "onselect",
  "onkeydown",
  "onkeyup",
  "onkeypress",
];

export function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      FORBID_TAGS: FORBIDDEN_TAGS,
      FORBID_ATTR: FORBIDDEN_ATTRIBUTES
    });
  }
  
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;");
}

export function sanitizeHtml(text: string | null | undefined): string {
  if (!text) return "";
  
  if (typeof window !== "undefined") {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "b", "i"],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      FORBID_TAGS: FORBIDDEN_TAGS,
      FORBID_ATTR: FORBIDDEN_ATTRIBUTES
    });
  }
  
  return text.replace(/<[^>]*>/g, "");
}
