// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("preserves the formatting allowed in product descriptions", () => {
    const html = "<p>Meet <strong>Rex</strong><br><em>Limited edition</em></p>";

    expect(sanitizeHtml(html)).toBe(
      "<p>Meet <strong>Rex</strong><br><em>Limited edition</em></p>"
    );
  });

  it("removes dangerous tags and attributes before rendering", () => {
    const html =
      '<p onclick="alert(1)">Safe <strong onmouseover="alert(2)">copy</strong></p>' +
      '<script>alert(3)</script><img src="x" onerror="alert(4)">';

    expect(sanitizeHtml(html)).toBe("<p>Safe <strong>copy</strong></p>");
  });
});
