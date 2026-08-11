import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("maintenance middleware matcher", () => {
  const source = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");
  const matcher = source.match(/matcher:\s*\[\s*[\r\n\s]*"([^"]+)"/)?.[1];

  if (!matcher) {
    throw new Error("middleware matcher was not found");
  }

  const matcherPattern = JSON.parse(`"${matcher}"`) as string;
  const matcherRegex = new RegExp(`^${matcherPattern}`);
  const matchesMiddleware = (pathname: string) => matcherRegex.test(pathname);

  it("does not use the catch-all matcher", () => {
    expect(source).not.toContain('matcher: ["/:path*"]');
  });

  it("excludes static asset requests from maintenance middleware", () => {
    expect(matchesMiddleware("/_next/static/chunks/app.js")).toBe(false);
    expect(matchesMiddleware("/_next/image")).toBe(false);
    expect(matchesMiddleware("/_next/image/url")).toBe(false);
    expect(matchesMiddleware("/images/logo.png")).toBe(false);
    expect(matchesMiddleware("/favicon.ico")).toBe(false);
    expect(matchesMiddleware("/robots.txt")).toBe(false);
    expect(matchesMiddleware("/sitemap.xml")).toBe(false);
    expect(matchesMiddleware("/icon.png")).toBe(false);
  });

  it("keeps pages, app APIs, auth APIs, and protected routes in middleware", () => {
    expect(matchesMiddleware("/")).toBe(true);
    expect(matchesMiddleware("/shop")).toBe(true);
    expect(matchesMiddleware("/account/orders")).toBe(true);
    expect(matchesMiddleware("/admin")).toBe(true);
    expect(matchesMiddleware("/api/products")).toBe(true);
    expect(matchesMiddleware("/api/auth/session")).toBe(true);
  });
});
